// Đăng nhập, phiên, phân quyền và quản lý tài khoản (chỉ dùng module crypto của Node).
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { db, getTaskOwnerInfo } from './db.js';

const COOKIE_NAME = 'phien_dang_nhap';
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;

// Lỗi có mã HTTP rõ ràng (server.js đọc error.status)
function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Bọc handler đồng bộ: mọi lỗi chuyển sang bộ xử lý lỗi chung
export const handle = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
  } catch (error) {
    next(error);
  }
};

// ===== Đọc file .env (không dùng thư viện dotenv) =====

// Nạp backend/.env nếu có; biến môi trường thật của hệ điều hành được ưu tiên
export function loadEnv() {
  try {
    process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'));
  } catch {
    // Không có file .env thì dùng giá trị mặc định
  }
}

// ===== Mật khẩu =====

// Băm mật khẩu bằng scrypt: 'scrypt$<muối hex>$<băm hex>'
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

// So sánh mật khẩu với bản băm đã lưu (timingSafeEqual)
export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Bản băm giả để tên không tồn tại vẫn tốn thời gian như tên có thật
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString('hex'));

export function validateUsername(name) {
  if (typeof name !== 'string' || !USERNAME_PATTERN.test(name)) {
    throw fail(400, 'Tên đăng nhập gồm 3-50 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang');
  }
  return name;
}

// minLength mặc định 8; mật khẩu tạm do admin đặt (tạo/đặt lại tài khoản) chỉ cần 4 vì người dùng bị ép đổi ngay lần đăng nhập đầu
export function validatePassword(password, minLength = 8) {
  if (typeof password !== 'string' || password.length < minLength) throw fail(400, `Mật khẩu tối thiểu ${minLength} ký tự`);
  if (password.length > 200) throw fail(400, 'Mật khẩu tối đa 200 ký tự');
  return password;
}

// Tạo tài khoản admin mặc định từ .env khi bảng users còn trống (gọi lúc khởi động server)
export function ensureDefaultAdmin() {
  loadEnv();
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return false;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin@123';
  try {
    validateUsername(username);
    validatePassword(password);
  } catch (error) {
    throw new Error(`ADMIN_USERNAME/ADMIN_PASSWORD trong .env không hợp lệ: ${error.message}`);
  }
  db.prepare("INSERT INTO users (ten_dang_nhap, mat_khau, vai_tro, bat_buoc_doi_mat_khau) VALUES (?, ?, 'admin', 1)")
    .run(username, hashPassword(password));
  console.log(`Da tao tai khoan admin mac dinh "${username}" (bat buoc doi mat khau o lan dang nhap dau).`);
  return true;
}

// ===== Phiên đăng nhập =====

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

// Đọc giá trị một cookie từ header
function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

// Tạo phiên mới, đặt cookie; ghi nhớ = 30 ngày, không ghi nhớ = 12 giờ (cookie phiên)
function createSession(req, res, userId, remember) {
  db.prepare("DELETE FROM sessions WHERE het_han <= datetime('now','localtime')").run();
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT INTO sessions (ma_bam, user_id, ghi_nho, het_han) VALUES (?, ?, ?, datetime('now','localtime', ?))")
    .run(sha256(token), userId, remember ? 1 : 0, remember ? '+30 days' : '+12 hours');
  const maxAge = remember ? '; Max-Age=2592000' : '';
  // Thêm Secure khi yêu cầu đến qua HTTPS (sau proxy cần bật TRUST_PROXY để req.secure đúng)
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${maxAge}${secure}`);
}

// Xóa cookie phiên
function clearCookie(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${req.secure ? '; Secure' : ''}`);
}

// Tìm người dùng theo cookie phiên (null nếu không có/hết hạn)
function findUserBySession(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  return db.prepare(`SELECT u.id, u.ten_dang_nhap, u.vai_tro, u.bat_buoc_doi_mat_khau, s.ghi_nho, s.ma_bam
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.ma_bam = ? AND s.het_han > datetime('now','localtime')`).get(sha256(token)) ?? null;
}

// Middleware: bắt buộc đăng nhập
export function requireLogin(req, res, next) {
  const user = findUserBySession(req);
  if (!user) return next(fail(401, 'Chưa đăng nhập hoặc phiên đã hết hạn'));
  req.user = { id: user.id, ten_dang_nhap: user.ten_dang_nhap, vai_tro: user.vai_tro, ghi_nho: user.ghi_nho, bat_buoc_doi_mat_khau: user.bat_buoc_doi_mat_khau, session: user.ma_bam };
  return next();
}

// Middleware: đang bị ép đổi mật khẩu thì chặn mọi API (trừ các API /api/auth/*)
export function enforcePasswordChange(req, res, next) {
  if (req.user.bat_buoc_doi_mat_khau) return next(fail(403, 'Bạn cần đổi mật khẩu trước khi tiếp tục'));
  return next();
}

// Bảng duy nhất các API chỉ dành cho admin: [danh sách method hoặc null = mọi method, mẫu đường dẫn]
const WRITE = ['POST', 'PUT', 'DELETE'];
const ADMIN_ONLY_RULES = [
  [['PUT'], /^\/tasks\/\d+\/owner$/],
  [null, /^\/deleted-tasks(\/|$)/],
  [WRITE, /^\/statuses(\/|$)/],
  [WRITE, /^\/data-items(\/|$)/],
  [['PUT'], /^\/checklist-templates$/],
  [['POST'], /^\/checklist-templates\/apply$/],
  [null, /^\/users(\/|$)/],
];

// Middleware: chặn người dùng thường gọi API quản trị
export function enforceRoles(req, res, next) {
  const adminOnly = ADMIN_ONLY_RULES.some(([methods, pattern]) => (!methods || methods.includes(req.method)) && pattern.test(req.path));
  if (adminOnly && req.user.vai_tro !== 'admin') return next(fail(403, 'Bạn không có quyền thực hiện thao tác này (cần quản trị viên)'));
  return next();
}

// Phạm vi task: undefined = admin thấy tất cả, số = chỉ task của người đó
export function getOwnerScope(req) {
  return req.user.vai_tro === 'admin' ? undefined : req.user.id;
}

// Kiểm tra quyền với một task; không tồn tại hoặc không thuộc người dùng đều trả 404
export function assertTaskAccess(req, taskId) {
  const info = getTaskOwnerInfo(taskId);
  if (!info || (req.user.vai_tro !== 'admin' && info.nguoi_tao_id !== req.user.id)) throw fail(404, 'Không tìm thấy task');
  return info;
}

// ===== Giới hạn đăng nhập sai (bộ đếm trong bộ nhớ) =====

const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map(); // khóa -> { count, since, lockedUntil }

// Ghi nhận một lần sai cho khóa; trả true nếu vượt giới hạn
function recordFailure(key, limit) {
  const now = Date.now();
  let entry = failures.get(key);
  if (!entry || now - entry.since > WINDOW_MS) entry = { count: 0, since: now, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count > limit) entry.lockedUntil = now + WINDOW_MS;
  failures.set(key, entry);
  return entry.count > limit;
}

// Khóa đang bị khóa hay không
function isLocked(key) {
  const entry = failures.get(key);
  return Boolean(entry && entry.lockedUntil > Date.now());
}

// ===== API xác thực (công khai) =====

export const authRouter = express.Router();

// Máy chủ chính mình (loopback) mới được tạo tài khoản đầu tiên
function isLoopback(req) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
}

const publicUser = (user) => ({ ten_dang_nhap: user.ten_dang_nhap, vai_tro: user.vai_tro, bat_buoc_doi_mat_khau: Boolean(user.bat_buoc_doi_mat_khau) });

authRouter.get('/me', handle((req, res) => {
  const user = findUserBySession(req);
  const needsSetup = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
  res.json({ user: user ? publicUser(user) : null, needs_setup: needsSetup, can_setup: needsSetup && isLoopback(req) });
}));

authRouter.post('/setup', handle((req, res) => {
  const body = req.body ?? {};
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0 || !isLoopback(req)) {
    throw fail(403, 'Không thể tạo tài khoản đầu tiên ở đây');
  }
  validateUsername(body.ten_dang_nhap);
  validatePassword(body.mat_khau);
  const result = db.prepare("INSERT INTO users (ten_dang_nhap, mat_khau, vai_tro) VALUES (?, ?, 'admin')").run(body.ten_dang_nhap, hashPassword(body.mat_khau));
  createSession(req, res, Number(result.lastInsertRowid), Boolean(body.ghi_nho));
  res.status(201).json({ user: { ten_dang_nhap: body.ten_dang_nhap, vai_tro: 'admin', bat_buoc_doi_mat_khau: false } });
}));

authRouter.post('/login', handle((req, res) => {
  const body = req.body ?? {};
  const name = typeof body.ten_dang_nhap === 'string' ? body.ten_dang_nhap.trim() : '';
  const password = typeof body.mat_khau === 'string' ? body.mat_khau : '';
  // req.ip là IP khách thật khi bật TRUST_PROXY (sau proxy Coolify), không thì là IP kết nối trực tiếp
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  const pairKey = `${ip}|${name.toLowerCase()}`;
  const tooMany = 'Đăng nhập sai quá nhiều lần, hãy thử lại sau 15 phút';
  if (isLocked(pairKey) || isLocked(`ip|${ip}`)) throw fail(429, tooMany);

  const user = name ? db.prepare('SELECT * FROM users WHERE ten_dang_nhap = ? COLLATE NOCASE').get(name) : undefined;
  // Tên không tồn tại vẫn băm mật khẩu giả để thời gian phản hồi như nhau
  const ok = verifyPassword(password, user ? user.mat_khau : DUMMY_HASH) && Boolean(user);
  if (!ok) {
    const pairLocked = recordFailure(pairKey, 5);
    const ipLocked = recordFailure(`ip|${ip}`, 30);
    throw fail(pairLocked || ipLocked ? 429 : 401, pairLocked || ipLocked ? tooMany : 'Sai tên đăng nhập hoặc mật khẩu');
  }
  failures.delete(pairKey);
  createSession(req, res, user.id, Boolean(body.ghi_nho));
  res.json({ user: publicUser(user) });
}));

authRouter.post('/logout', handle((req, res) => {
  const token = readCookie(req, COOKIE_NAME);
  if (token) db.prepare('DELETE FROM sessions WHERE ma_bam = ?').run(sha256(token));
  clearCookie(req, res);
  res.json({ ok: true });
}));

// Đổi mật khẩu của chính mình; đây là API duy nhất dùng được khi đang bị ép đổi mật khẩu
authRouter.post('/password', requireLogin, handle((req, res) => {
  const { mat_khau_cu: oldPassword, mat_khau_moi: newPassword } = req.body ?? {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (typeof oldPassword !== 'string' || !verifyPassword(oldPassword, user.mat_khau)) throw fail(400, 'Mật khẩu hiện tại không đúng');
  validatePassword(newPassword);
  if (newPassword === oldPassword) throw fail(400, 'Mật khẩu mới phải khác mật khẩu hiện tại');
  db.transaction(() => {
    db.prepare('UPDATE users SET mat_khau = ?, bat_buoc_doi_mat_khau = 0 WHERE id = ?').run(hashPassword(newPassword), user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND ma_bam <> ?').run(user.id, req.user.session);
  })();
  res.json({ ok: true });
}));

// ===== Quản lý tài khoản (chỉ admin, do enforceRoles chặn) =====

export const usersRouter = express.Router();

// Kiểm tra id trên URL
function parseUserId(req) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw fail(400, 'id không hợp lệ');
  return id;
}

// Số admin hiện có
const countAdmins = () => db.prepare("SELECT COUNT(*) AS n FROM users WHERE vai_tro = 'admin'").get().n;

usersRouter.get('/', handle((req, res) => {
  const items = db.prepare(`SELECT u.id, u.ten_dang_nhap, u.vai_tro, u.bat_buoc_doi_mat_khau, u.tao_luc,
    (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.het_han > datetime('now','localtime')) AS so_phien
    FROM users u ORDER BY u.id`).all();
  res.json({ items });
}));

usersRouter.post('/', handle((req, res) => {
  const body = req.body ?? {};
  validateUsername(body.ten_dang_nhap);
  validatePassword(body.mat_khau, 4);
  const role = body.vai_tro ?? 'user';
  if (!['admin', 'user'].includes(role)) throw fail(400, 'vai_tro phải là admin hoặc user');
  if (db.prepare('SELECT 1 FROM users WHERE ten_dang_nhap = ? COLLATE NOCASE').get(body.ten_dang_nhap)) throw fail(400, 'Tên đăng nhập đã tồn tại');
  // Tài khoản mới tạo phải tự đổi mật khẩu ở lần đăng nhập đầu
  const result = db.prepare('INSERT INTO users (ten_dang_nhap, mat_khau, vai_tro, bat_buoc_doi_mat_khau) VALUES (?, ?, ?, 1)')
    .run(body.ten_dang_nhap, hashPassword(body.mat_khau), role);
  res.status(201).json(db.prepare('SELECT id, ten_dang_nhap, vai_tro, bat_buoc_doi_mat_khau, tao_luc FROM users WHERE id = ?').get(Number(result.lastInsertRowid)));
}));

usersRouter.put('/:id', handle((req, res) => {
  const id = parseUserId(req);
  const body = req.body ?? {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw fail(404, 'Không tìm thấy tài khoản');
  db.transaction(() => {
    if (body.vai_tro !== undefined) {
      if (!['admin', 'user'].includes(body.vai_tro)) throw fail(400, 'vai_tro phải là admin hoặc user');
      if (user.vai_tro === 'admin' && body.vai_tro !== 'admin' && countAdmins() <= 1) throw fail(400, 'Phải còn ít nhất một quản trị viên');
      db.prepare('UPDATE users SET vai_tro = ? WHERE id = ?').run(body.vai_tro, id);
    }
    if (body.mat_khau !== undefined) {
      validatePassword(body.mat_khau, 4);
      // Đặt lại mật khẩu: đăng xuất mọi nơi và ép đổi mật khẩu ở lần đăng nhập kế tiếp
      db.prepare('UPDATE users SET mat_khau = ?, bat_buoc_doi_mat_khau = 1 WHERE id = ?').run(hashPassword(body.mat_khau), id);
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    }
  })();
  res.json(db.prepare('SELECT id, ten_dang_nhap, vai_tro, bat_buoc_doi_mat_khau, tao_luc FROM users WHERE id = ?').get(id));
}));

usersRouter.delete('/:id', handle((req, res) => {
  const id = parseUserId(req);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) throw fail(404, 'Không tìm thấy tài khoản');
  if (id === req.user.id) throw fail(400, 'Không thể tự xóa tài khoản đang đăng nhập');
  if (user.vai_tro === 'admin' && countAdmins() <= 1) throw fail(400, 'Phải còn ít nhất một quản trị viên');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.status(204).end();
}));

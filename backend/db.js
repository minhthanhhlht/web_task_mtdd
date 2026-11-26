// Lớp database: mở SQLite, tạo bảng, nạp dữ liệu mặc định, migration và mọi hàm truy vấn/ghi dữ liệu.
import Database from 'better-sqlite3';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRichNote, noteToPlainText, sanitizeNote } from './noteHtml.js';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));

// ===== Hằng số dữ liệu mặc định =====

// 18 trạng thái task mặc định: [tên, màu, la_hoan_thanh, yeu_cau_hoan_tat]
const DEFAULT_STATUSES = [
  ['OPEN', 'gray', 0, 0], ['TO DO', 'gray', 0, 0], ['Assign to BRSE', 'purple', 0, 0],
  ['IN PROGRESS', 'blue', 0, 0], ['IN DEVELOPMENT', 'blue', 0, 0], ['IN DESIG', 'blue', 0, 0],
  ['IN DESIGNER CHECKING', 'orange', 0, 0], ['IN DESIGNER TEST', 'orange', 0, 0], ['IN FUNC TEST', 'orange', 0, 0],
  ['IN GDCF REVIEW', 'orange', 0, 0], ['IN GDCF TEST', 'orange', 0, 0], ['IN CUSTOMER TEST', 'orange', 0, 0],
  ['IN 3rd TEST', 'orange', 0, 0], ['IN REPORTER CHECKING', 'orange', 0, 0], ['Checking TM/TE', 'purple', 0, 0],
  ['REOPEN', 'red', 0, 0], ['CLOSED', 'green', 1, 1], ['CANCELED', 'gray', 1, 0],
];

// 11 mục mẫu checklist mặc định
const DEFAULT_TEMPLATE_ITEMS = [
  'Comment nhận task trên Pwire',
  'Assign to me trên Pwire',
  'Note task lên file quản lý Task: Innotek_Task Management & Monitoring',
  'Điền đầy đủ thông tin ở file quản lý: Innotek_Task Management & Monitoring',
  'Tạo group cho Task(HQ, team QA, người VNB). Mẫu: (VNB) CR_CO_PP000017-XXXXXX',
  'Tuân thủ coding convention, naming rule, chuẩn test case',
  'Up test case lên Pwire',
  'Điền CTS trước khi chuyển status trên Pwire',
  'Comment thông báo (dev done, CTS, object...) vào Pwire',
  'Cập nhật status task vào file quản lý: Innotek_Task Management & Monitoring',
  'Cập nhật tiến độ đến khi CLOSED',
];

export const STATUS_COLORS = ['gray', 'blue', 'orange', 'purple', 'green', 'red', 'yellow'];
// Các nhóm dữ liệu danh mục; taskColumn = cột task đang dùng giá trị của nhóm
export const DATA_GROUPS = [{ key: 'dev', label: 'Dev', taskColumn: 'dev_cross_check' }];
const TASK_CODE_PATTERN = /^PP000017-\d+$/;

// id nội bộ của task = số sau PP000017- (null nếu không đúng mẫu hoặc không phải số nguyên dương an toàn)
function taskIdFromCode(code) {
  const match = /^PP000017-(\d+)$/i.exec(String(code).trim());
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
// Cột task được phép sửa qua PUT (không có nguoi_tao_id)
const EDITABLE_TASK_COLUMNS = ['ma_task', 'ten', 'ngay_nhan', 'deadline', 'nguoi_giao', 'tien_do', 'trang_thai', 'ghi_chu', 'link_test_case', 'dev_cross_check', 'dev_hoan_thanh_thuc_te'];
// Nhãn tiếng Việt của từng trường và nhóm nhật ký
const FIELD_LABELS = {
  ma_task: ['Số Pwire', 'task'], ten: ['Tên task', 'task'], ngay_nhan: ['Ngày giờ nhận', 'task'],
  deadline: ['Deadline', 'task'], dev_hoan_thanh_thuc_te: ['Thực tế dev hoàn thành', 'task'],
  nguoi_giao: ['Người giao', 'task'], link_test_case: ['Link Pwire', 'task'], dev_cross_check: ['Dev Cross check', 'task'],
  tien_do: ['Tiến độ', 'tien_do'], trang_thai: ['Trạng thái', 'tien_do'], ghi_chu: ['Ghi chú', 'tien_do'],
};

// ===== Người thực hiện thay đổi =====

// Tên đăng nhập của người đang gọi API; server đặt qua actorStorage.run() cho mỗi yêu cầu, lệnh chạy tay (seed, backup) thì là null
export const actorStorage = new AsyncLocalStorage();
function currentActor() {
  return actorStorage.getStore() ?? null;
}

// ===== Lỗi nghiệp vụ =====

// Lỗi dữ liệu sai → server trả 400
function invalid(message) {
  const error = new Error(message);
  error.invalid = true;
  return error;
}

// Lỗi không tìm thấy → server trả 404
function notFound(message) {
  const error = new Error(message);
  error.notFound = true;
  return error;
}

// ===== Mở database và tạo bảng =====

// Đường dẫn database: biến môi trường DB_PATH (dùng khi chạy Docker/Coolify, trỏ vào thư mục lưu bền), mặc định backend/tasks.db
export const DB_FILE = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(BACKEND_DIR, 'tasks.db');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
export const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(BACKEND_DIR, 'schema.sql'), 'utf8'));

// Thêm cột còn thiếu cho DB cũ (migration an toàn, không xóa dữ liệu)
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
addColumnIfMissing('progress_log', 'cap_nhat_luc', 'TEXT');
addColumnIfMissing('tasks', 'dev_cross_check', "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing('tasks', 'dev_hoan_thanh_thuc_te', 'TEXT');
addColumnIfMissing('tasks', 'nguoi_tao_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
addColumnIfMissing('users', 'vai_tro', "TEXT NOT NULL DEFAULT 'user'");
addColumnIfMissing('users', 'bat_buoc_doi_mat_khau', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('task_history', 'nguoi_thay_doi', 'TEXT');
addColumnIfMissing('tasks', 'xoa_luc', 'TEXT');
addColumnIfMissing('tasks', 'nguoi_xoa', 'TEXT');
// DB cũ chưa có admin nào: tài khoản id nhỏ nhất thành admin
if (!db.prepare("SELECT 1 FROM users WHERE vai_tro = 'admin'").get()) {
  db.exec("UPDATE users SET vai_tro = 'admin' WHERE id = (SELECT MIN(id) FROM users)");
}

// Migration user_version 4: id nội bộ của task = số sau PP000017- (task không có số hợp lệ hoặc bị trùng số giữ một id mới ở cuối dãy)
if (db.pragma('user_version', { simple: true }) < 4) {
  db.transaction(() => {
    db.pragma('defer_foreign_keys = ON');
    const rows = db.prepare('SELECT id, ma_task FROM tasks ORDER BY id').all();
    // Bước 1: dời mọi id sang số âm để các id đích không đụng nhau
    for (const table of ['checklist_items', 'issues', 'progress_log', 'task_history']) db.exec(`UPDATE ${table} SET task_id = -task_id`);
    db.exec('UPDATE tasks SET id = -id');
    // Bước 2: gán id đích; số bị trùng hoặc không hợp lệ nhận id mới lớn hơn mọi id đã dùng
    const claimed = new Set();
    const plan = rows.map((row) => {
      const target = taskIdFromCode(row.ma_task);
      if (target !== null && !claimed.has(target)) { claimed.add(target); return { old: row.id, next: target }; }
      return { old: row.id, next: null };
    });
    let spare = Math.max(0, ...claimed, ...rows.map((r) => r.id));
    for (const item of plan) if (item.next === null) item.next = ++spare;
    for (const item of plan) {
      for (const table of ['checklist_items', 'issues', 'progress_log', 'task_history']) {
        db.prepare(`UPDATE ${table} SET task_id = ? WHERE task_id = ?`).run(item.next, -item.old);
      }
      db.prepare('UPDATE tasks SET id = ? WHERE id = ?').run(item.next, -item.old);
    }
    db.pragma('user_version = 4');
  })();
}

// Nạp trạng thái và mẫu checklist mặc định khi bảng còn trống
db.transaction(() => {
  if (db.prepare('SELECT COUNT(*) AS n FROM task_statuses').get().n === 0) {
    const insert = db.prepare('INSERT INTO task_statuses (ten, mau, la_hoan_thanh, yeu_cau_hoan_tat, thu_tu) VALUES (?, ?, ?, ?, ?)');
    DEFAULT_STATUSES.forEach(([ten, mau, done, need], index) => insert.run(ten, mau, done, need, index + 1));
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM checklist_templates').get().n === 0) {
    const insert = db.prepare('INSERT INTO checklist_templates (ten_muc, thu_tu) VALUES (?, ?)');
    DEFAULT_TEMPLATE_ITEMS.forEach((name, index) => insert.run(name, index + 1));
  }
})();

// ===== Hàm kiểm tra dữ liệu dùng chung =====

// Kiểm tra id số nguyên dương
function parsePositiveInt(value, message) {
  if (!Number.isSafeInteger(value) || value <= 0) throw invalid(message);
  return value;
}

// Kiểm tra và chuẩn hóa ngày giờ về 'YYYY-MM-DD HH:mm' (nhận cả 'YYYY-MM-DD' = 00:00)
function normalizeDateTime(value, field) {
  const message = `${field} phải có dạng YYYY-MM-DD HH:mm`;
  if (typeof value !== 'string') throw invalid(message);
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(value.trim());
  if (!match) throw invalid(message);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const hour = Number(match[4] ?? 0);
  const minute = Number(match[5] ?? 0);
  const date = new Date(Date.UTC(year, month - 1, day));
  const realDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!realDate || hour > 23 || minute > 59) throw invalid(message);
  return `${match[1]}-${match[2]}-${match[3]} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Kiểm tra chuỗi bắt buộc có độ dài tối đa
function requireText(value, field, max) {
  if (typeof value !== 'string' || !value.trim()) throw invalid(`${field} không được để trống`);
  if (value.trim().length > max) throw invalid(`${field} tối đa ${max} ký tự`);
  return value.trim();
}

// Thoát ký tự đặc biệt của LIKE
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Tìm trạng thái theo tên (không phân biệt hoa thường)
function findStatus(name) {
  if (typeof name !== 'string') return undefined;
  return db.prepare('SELECT * FROM task_statuses WHERE ten = ? COLLATE NOCASE').get(name.trim());
}

// Ghi một dòng nhật ký thay đổi (gọi trong transaction của thao tác chính)
function addHistory(taskId, type, field, oldValue, newValue, description) {
  db.prepare('INSERT INTO task_history (task_id, loai, truong, gia_tri_cu, gia_tri_moi, mo_ta, nguoi_thay_doi) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(taskId, type, field, oldValue, newValue, description, currentActor());
}

// Rút gọn chuỗi cho nhật ký
function clip(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

// Định dạng giá trị hiển thị trong nhật ký
function formatHistoryValue(field, value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (field === 'ghi_chu') text = noteToPlainText(text);
  if (text === '') return '(trống)';
  if (field === 'tien_do') text += '%';
  return clip(text, 500);
}

// ===== Truy vấn task =====

// Câu SELECT task kèm số liệu checklist, lần cập nhật cuối và tên PIC
const TASK_SELECT = `
  SELECT t.*,
    (SELECT COUNT(*) FROM checklist_items c WHERE c.task_id = t.id AND c.da_xong = 1) AS checklist_da_xong,
    (SELECT COUNT(*) FROM checklist_items c WHERE c.task_id = t.id) AS checklist_tong,
    (SELECT MAX(ngay) FROM progress_log p WHERE p.task_id = t.id) AS ngay_cap_nhat_cuoi,
    (SELECT cap_nhat_luc FROM progress_log p WHERE p.task_id = t.id ORDER BY ngay DESC LIMIT 1) AS gio_cap_nhat_cuoi,
    u.ten_dang_nhap AS chu_so_huu
  FROM tasks t LEFT JOIN users u ON u.id = t.nguoi_tao_id`;

// Biểu thức sắp xếp cho từng khóa sort (khóa đầu tiên đưa giá trị trống xuống cuối)
const SORT_EXPRESSIONS = {
  chu_so_huu: ['chu_so_huu COLLATE NOCASE'],
  ma_task: ['CAST(substr(ma_task, 10) AS INTEGER)', 'ma_task COLLATE NOCASE'],
  ten: ['ten COLLATE NOCASE'],
  link_test_case: ["NULLIF(link_test_case, '')"],
  nguoi_giao: ['nguoi_giao COLLATE NOCASE'],
  deadline: ['deadline'],
  tien_do: ['tien_do'],
  trang_thai: ['(SELECT thu_tu FROM task_statuses s WHERE s.ten = trang_thai)'],
  checklist: ['(checklist_da_xong * 1.0 / NULLIF(checklist_tong, 0))'],
  cap_nhat: ['gio_cap_nhat_cuoi'],
  xoa_luc: ['xoa_luc'],
  nguoi_xoa: ['nguoi_xoa COLLATE NOCASE'],
};

// Chuẩn hóa một dòng task trả về danh sách: ghi chú HTML đổi thành chữ thuần ngắn
function toListItem(row) {
  const rich = isRichNote(row.ghi_chu);
  return { ...row, ghi_chu_rich: rich, ghi_chu: rich ? noteToPlainText(row.ghi_chu).slice(0, 500) : row.ghi_chu };
}

// Dựng mệnh đề WHERE + tham số dùng chung cho danh sách task, checklist và xuất CSV
function buildTaskFilter({ ownerId, status, q, archived, notUpdated, deleted }) {
  const where = [];
  const params = [];
  const completed = 'SELECT ten FROM task_statuses WHERE la_hoan_thanh = 1';
  if (deleted) {
    // Trang "Task đã xóa": chỉ task xóa mềm, không phân biệt hoàn thành hay chưa
    where.push('t.xoa_luc IS NOT NULL');
  } else {
    where.push('t.xoa_luc IS NULL');
    where.push(archived ? `t.trang_thai IN (${completed})` : `t.trang_thai NOT IN (${completed})`);
  }
  if (ownerId !== undefined) { where.push('t.nguoi_tao_id = ?'); params.push(ownerId); }
  if (status) { where.push('t.trang_thai = ? COLLATE NOCASE'); params.push(status); }
  if (notUpdated) where.push("NOT EXISTS (SELECT 1 FROM progress_log p WHERE p.task_id = t.id AND p.ngay = date('now','localtime'))");
  if (q) {
    const columns = ['t.ma_task', 't.ten', 't.link_test_case', 't.nguoi_giao', 't.dev_cross_check', 't.ghi_chu', 'u.ten_dang_nhap'];
    where.push(`(${columns.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
    for (let i = 0; i < columns.length; i += 1) params.push(`%${escapeLike(q)}%`);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

// Danh sách task có lọc, tìm, sắp xếp, phân trang
export function listTasks(options) {
  const { sort, dir, page, limit } = options;
  const filter = buildTaskFilter(options);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM tasks t LEFT JOIN users u ON u.id = t.nguoi_tao_id ${filter.sql}`).get(...filter.params).n;
  let orderBy = 'id DESC';
  if (sort) {
    const [first, ...rest] = SORT_EXPRESSIONS[sort];
    const direction = dir === 'desc' ? 'DESC' : 'ASC';
    orderBy = [`(${first}) IS NULL`, `${first} ${direction}`, ...rest.map((e) => `${e} ${direction}`), 'id DESC'].join(', ');
  }
  const rows = db.prepare(`SELECT * FROM (${TASK_SELECT} ${filter.sql}) ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...filter.params, limit, (page - 1) * limit);
  return { items: rows.map(toListItem), total };
}

// Khóa sort hợp lệ hay không
export function isValidSort(sort) {
  return Object.prototype.hasOwnProperty.call(SORT_EXPRESSIONS, sort);
}

// Danh sách task kèm các mục checklist (cho trang Checklist)
export function listChecklists(options) {
  const result = listTasks({ ...options, sort: undefined });
  if (result.items.length === 0) return result;
  const ids = result.items.map((t) => t.id);
  const items = db.prepare(`SELECT * FROM checklist_items WHERE task_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).all(...ids);
  const byTask = new Map(ids.map((id) => [id, []]));
  items.forEach((item) => byTask.get(item.task_id).push(item));
  return { total: result.total, items: result.items.map((t) => ({ ...t, checklist_items: byTask.get(t.id) })) };
}

// Lấy chủ sở hữu của một task (dùng cho kiểm tra quyền); undefined nếu không tồn tại
export function getTaskOwnerInfo(taskId) {
  return db.prepare('SELECT id, nguoi_tao_id FROM tasks WHERE id = ? AND xoa_luc IS NULL').get(taskId);
}

// Lấy task của một mục checklist / vấn đề
export function getChecklistItemTaskId(itemId) {
  return db.prepare('SELECT task_id FROM checklist_items WHERE id = ?').get(itemId)?.task_id;
}
export function getIssueTaskId(issueId) {
  return db.prepare('SELECT task_id FROM issues WHERE id = ?').get(issueId)?.task_id;
}

// Chi tiết một task đầy đủ (ghi chú HTML đầy đủ, checklist, vấn đề, tiến độ)
export function getTask(id) {
  const task = db.prepare(`${TASK_SELECT} WHERE t.id = ? AND t.xoa_luc IS NULL`).get(id);
  if (!task) throw notFound('Không tìm thấy task');
  return {
    ...task,
    ghi_chu_rich: isRichNote(task.ghi_chu),
    checklist_items: db.prepare('SELECT * FROM checklist_items WHERE task_id = ? ORDER BY id').all(id),
    issues: db.prepare('SELECT * FROM issues WHERE task_id = ? ORDER BY id DESC').all(id),
    progress_log: db.prepare('SELECT * FROM progress_log WHERE task_id = ? ORDER BY ngay DESC').all(id),
  };
}

// Task kèm số liệu nhưng không kèm danh sách con (dùng sau khi tạo/sửa)
function getTaskWithCounts(id) {
  const task = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(id);
  return { ...task, ghi_chu_rich: isRichNote(task.ghi_chu) };
}

// Nhật ký thay đổi của task, mới nhất trước
export function getTaskHistory(taskId, page, limit) {
  const total = db.prepare('SELECT COUNT(*) AS n FROM task_history WHERE task_id = ?').get(taskId).n;
  const items = db.prepare('SELECT id, thoi_gian, loai, truong, gia_tri_cu, gia_tri_moi, mo_ta, nguoi_thay_doi FROM task_history WHERE task_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(taskId, limit, (page - 1) * limit);
  return { items, total };
}

// ===== Kiểm tra và ghi task =====

// Kiểm tra từng trường gửi lên; trả về object các cột đã chuẩn hóa. existing = null khi tạo mới
function normalizeTaskInput(body, existing, ownerId) {
  const out = {};
  const isCreate = !existing;
  if (isCreate) {
    for (const field of ['ma_task', 'ten', 'ngay_nhan', 'nguoi_giao']) {
      if (body[field] === undefined || body[field] === null || body[field] === '') throw invalid(`${field} là bắt buộc`);
    }
  }
  const has = (field) => body[field] !== undefined;

  if (has('ma_task')) {
    const code = requireText(body.ma_task, 'ma_task', 500);
    // Tạo mới luôn kiểm tra định dạng; sửa chỉ kiểm tra khi giá trị bị đổi
    if (isCreate || code !== existing.ma_task) {
      if (!TASK_CODE_PATTERN.test(code) || taskIdFromCode(code) === null) throw invalid('Số Pwire phải bắt đầu bằng PP000017- và sau dấu - chỉ gồm chữ số, ví dụ PP000017-205779');
      // Số Pwire duy nhất toàn hệ thống (id nội bộ = số sau tiền tố), kể cả task đã xóa mềm
      const duplicate = db.prepare('SELECT xoa_luc FROM tasks WHERE (ma_task = ? COLLATE NOCASE OR id = ?) AND id <> ?')
        .get(code, taskIdFromCode(code), existing?.id ?? 0);
      if (duplicate) {
        throw invalid(duplicate.xoa_luc ? 'Số Pwire đã tồn tại trong mục Task đã xóa (nhờ quản trị viên khôi phục hoặc xóa vĩnh viễn)' : 'Số Pwire đã tồn tại');
      }
    }
    out.ma_task = code;
  }
  if (has('ten')) out.ten = requireText(body.ten, 'ten', 500);
  if (has('nguoi_giao')) out.nguoi_giao = requireText(body.nguoi_giao, 'nguoi_giao', 200);
  if (has('ngay_nhan')) out.ngay_nhan = normalizeDateTime(body.ngay_nhan, 'ngay_nhan');
  for (const field of ['deadline', 'dev_hoan_thanh_thuc_te']) {
    if (has(field)) out[field] = body[field] === '' || body[field] === null ? null : normalizeDateTime(body[field], field);
  }
  if (has('tien_do')) {
    if (!Number.isInteger(body.tien_do) || body.tien_do < 0 || body.tien_do > 100) throw invalid('tien_do phải là số nguyên từ 0 đến 100');
    out.tien_do = body.tien_do;
  }
  if (has('trang_thai')) {
    const status = findStatus(body.trang_thai);
    if (!status) throw invalid('trang_thai không hợp lệ');
    out.trang_thai = status.ten;
  }
  if (has('link_test_case')) {
    const link = body.link_test_case === null ? '' : body.link_test_case;
    if (typeof link !== 'string' || link.trim().length > 2000) throw invalid('Link Pwire tối đa 2000 ký tự');
    const trimmed = link.trim();
    if (trimmed && (isCreate || trimmed !== existing.link_test_case) && !/^https?:\/\/\S+$/i.test(trimmed)) {
      throw invalid('Link Pwire phải là địa chỉ bắt đầu bằng http:// hoặc https://');
    }
    out.link_test_case = trimmed;
  }
  if (has('dev_cross_check')) {
    const dev = body.dev_cross_check === null ? '' : body.dev_cross_check;
    if (typeof dev !== 'string') throw invalid('dev_cross_check không hợp lệ');
    if (dev.trim() === '') out.dev_cross_check = '';
    else {
      const item = db.prepare("SELECT ten FROM data_items WHERE nhom = 'dev' AND ten = ? COLLATE NOCASE").get(dev.trim());
      if (!item) throw invalid('dev_cross_check không có trong danh sách Dev');
      out.dev_cross_check = item.ten;
    }
  }
  if (has('ghi_chu')) out.ghi_chu = normalizeNote(body.ghi_chu);
  return out;
}

// Kiểm tra ghi chú (chuỗi ≤ 8.000.000 ký tự) rồi lọc HTML
function normalizeNote(value) {
  const note = value === null ? '' : value;
  if (typeof note !== 'string') throw invalid('ghi_chu phải là chuỗi');
  if (note.length > 8000000) throw invalid('ghi_chu quá dài (tối đa 8.000.000 ký tự)');
  return sanitizeNote(note);
}

// Luật 5.2: chuyển sang trạng thái yêu cầu hoàn tất thì phải 100% và tick hết checklist
function assertCompletionRule(taskId, status, progress, prefix = '') {
  if (!status.yeu_cau_hoan_tat) return;
  if (progress !== 100) throw invalid(`${prefix}Chưa thể chuyển sang ${status.ten}: tiến độ phải là 100% (hiện tại ${progress}%)`);
  const left = db.prepare('SELECT COUNT(*) AS n FROM checklist_items WHERE task_id = ? AND da_xong = 0').get(taskId).n;
  if (left > 0) throw invalid(`${prefix}Chưa thể chuyển sang ${status.ten}: còn ${left} mục checklist chưa tick`);
}

// Ghi (hoặc ghi đè) dòng tiến độ của hôm nay
function upsertProgressToday(taskId, progress, statusName, note) {
  db.prepare(`
    INSERT INTO progress_log (task_id, ngay, tien_do, trang_thai, ghi_chu, cap_nhat_luc)
    VALUES (?, date('now','localtime'), ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(task_id, ngay) DO UPDATE SET tien_do = excluded.tien_do, trang_thai = excluded.trang_thai,
      ghi_chu = excluded.ghi_chu, cap_nhat_luc = excluded.cap_nhat_luc`)
    .run(taskId, progress, statusName, noteToPlainText(note).slice(0, 2000));
}

// Hai giá trị coi là bằng nhau nếu cùng rỗng (null và '' như nhau)
function sameValue(a, b) {
  return (a ?? '') === (b ?? '');
}

// Tạo task mới cùng checklist từ mẫu và nhật ký, trong một transaction
export const createTask = db.transaction((body, ownerId) => {
  const data = normalizeTaskInput(body, null, ownerId);
  const firstStatus = db.prepare('SELECT ten FROM task_statuses ORDER BY thu_tu, id LIMIT 1').get();
  if (!firstStatus) throw invalid('Chưa có trạng thái nào');
  const row = {
    ma_task: data.ma_task, ten: data.ten, ngay_nhan: data.ngay_nhan, deadline: data.deadline ?? null,
    nguoi_giao: data.nguoi_giao, tien_do: 0, trang_thai: firstStatus.ten, ghi_chu: data.ghi_chu ?? '',
    link_test_case: data.link_test_case ?? '', dev_hoan_thanh_thuc_te: data.dev_hoan_thanh_thuc_te ?? null,
    dev_cross_check: data.dev_cross_check ?? '', nguoi_tao_id: ownerId,
  };
  // id nội bộ = số sau PP000017- (đã kiểm tra không trùng ở normalizeTaskInput)
  const taskId = taskIdFromCode(data.ma_task);
  db.prepare(`INSERT INTO tasks (id, ma_task, ten, ngay_nhan, deadline, nguoi_giao, tien_do, trang_thai, ghi_chu, link_test_case,
    dev_hoan_thanh_thuc_te, dev_cross_check, nguoi_tao_id) VALUES (@id, @ma_task, @ten, @ngay_nhan, @deadline, @nguoi_giao, @tien_do, @trang_thai,
    @ghi_chu, @link_test_case, @dev_hoan_thanh_thuc_te, @dev_cross_check, @nguoi_tao_id)`).run({ ...row, id: taskId });
  db.prepare('INSERT INTO checklist_items (task_id, ten_muc) SELECT ?, ten_muc FROM checklist_templates ORDER BY thu_tu, id').run(taskId);
  addHistory(taskId, 'task', null, null, null, 'Tạo task');
  return getTaskWithCounts(taskId);
});

// Sửa task: kiểm tra, luật hoàn tất, cập nhật, nhật ký, tiến độ hôm nay (một transaction)
export const updateTask = db.transaction((id, body) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND xoa_luc IS NULL').get(id);
  if (!existing) throw notFound('Không tìm thấy task');
  const data = normalizeTaskInput(Object.fromEntries(Object.entries(body).filter(([k]) => EDITABLE_TASK_COLUMNS.includes(k))), existing, existing.nguoi_tao_id);
  if (Object.keys(data).length === 0) throw invalid('Không có trường nào để sửa');

  const nextProgress = data.tien_do ?? existing.tien_do;
  const nextStatusName = data.trang_thai ?? existing.trang_thai;
  const statusChanged = nextStatusName.toLowerCase() !== existing.trang_thai.toLowerCase();
  if (statusChanged || data.tien_do !== undefined && data.tien_do !== existing.tien_do) {
    assertCompletionRule(id, findStatus(nextStatusName), nextProgress);
  }

  // Đổi Số Pwire thì id nội bộ đổi theo: dời các bảng con sang id mới (hoãn kiểm tra khóa ngoại tới lúc commit)
  let taskId = id;
  if (data.ma_task !== undefined && data.ma_task !== existing.ma_task) {
    const newId = taskIdFromCode(data.ma_task);
    if (newId !== id) {
      db.pragma('defer_foreign_keys = ON');
      for (const table of ['checklist_items', 'issues', 'progress_log', 'task_history']) {
        db.prepare(`UPDATE ${table} SET task_id = ? WHERE task_id = ?`).run(newId, id);
      }
      db.prepare('UPDATE tasks SET id = ? WHERE id = ?').run(newId, id);
      taskId = newId;
    }
  }

  const changed = Object.keys(data).filter((field) => !sameValue(data[field], existing[field]));
  const sets = Object.keys(data).map((field) => `${field} = @${field}`);
  db.prepare(`UPDATE tasks SET ${sets.join(', ')}, cap_nhat_luc = datetime('now','localtime') WHERE id = @id`).run({ ...data, id: taskId });

  for (const field of changed) {
    const [label, type] = FIELD_LABELS[field];
    const oldText = formatHistoryValue(field, existing[field]);
    const newText = formatHistoryValue(field, data[field]);
    addHistory(taskId, type, label, oldText, newText, `${label}: ${oldText} → ${newText}`);
  }
  if (changed.includes('tien_do')) {
    upsertProgressToday(taskId, nextProgress, nextStatusName, data.ghi_chu ?? existing.ghi_chu);
  }
  return getTaskWithCounts(taskId);
});

// Xóa mềm task: giữ nguyên dữ liệu, chỉ đánh dấu giờ xóa và người xóa (admin khôi phục được ở trang Task đã xóa)
export const deleteTask = db.transaction((id) => {
  if (!db.prepare('SELECT 1 FROM tasks WHERE id = ? AND xoa_luc IS NULL').get(id)) throw notFound('Không tìm thấy task');
  db.prepare("UPDATE tasks SET xoa_luc = datetime('now','localtime'), nguoi_xoa = ? WHERE id = ?").run(currentActor(), id);
  addHistory(id, 'task', null, null, null, 'Xóa task');
});

// Khôi phục task đã xóa mềm (chỉ admin gọi)
export const restoreTask = db.transaction((id) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND xoa_luc IS NOT NULL').get(id);
  if (!task) throw notFound('Không tìm thấy task đã xóa');
  // Số Pwire duy nhất toàn hệ thống nên không thể trùng task khác
  db.prepare("UPDATE tasks SET xoa_luc = NULL, nguoi_xoa = NULL, cap_nhat_luc = datetime('now','localtime') WHERE id = ?").run(id);
  addHistory(id, 'task', null, null, null, 'Khôi phục task');
  return getTaskWithCounts(id);
});

// Xóa vĩnh viễn một task đã xóa mềm (checklist, vấn đề, tiến độ, nhật ký xóa theo ON DELETE CASCADE); task còn hoạt động thì không xóa được
export function purgeTask(id) {
  if (db.prepare('DELETE FROM tasks WHERE id = ? AND xoa_luc IS NOT NULL').run(id).changes === 0) throw notFound('Không tìm thấy task đã xóa');
}

// Chuyển PIC (chủ sở hữu) của task sang tài khoản khác
export const transferTask = db.transaction((id, newOwnerId) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND xoa_luc IS NULL').get(id);
  if (!task) throw notFound('Không tìm thấy task');
  const target = Number.isSafeInteger(newOwnerId) ? db.prepare('SELECT id, ten_dang_nhap FROM users WHERE id = ?').get(newOwnerId) : undefined;
  if (!target) throw invalid('Tài khoản nhận task không tồn tại');
  if (task.nguoi_tao_id === target.id) throw invalid('Task đã thuộc tài khoản này');
  let oldName = '(chưa có PIC)';
  if (task.nguoi_tao_id !== null) oldName = db.prepare('SELECT ten_dang_nhap FROM users WHERE id = ?').get(task.nguoi_tao_id)?.ten_dang_nhap ?? '(đã xóa)';
  db.prepare("UPDATE tasks SET nguoi_tao_id = ?, cap_nhat_luc = datetime('now','localtime') WHERE id = ?").run(target.id, id);
  addHistory(id, 'task', 'PIC', oldName, target.ten_dang_nhap, `PIC: ${oldName} → ${target.ten_dang_nhap}`);
  return getTaskWithCounts(id);
});

// ===== Checklist =====

// Tick / bỏ tick một mục checklist
export const setChecklistItem = db.transaction((itemId, done) => {
  const item = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(itemId);
  if (!item) throw notFound('Không tìm thấy mục checklist');
  const value = done ? 1 : 0;
  if (item.da_xong === value) return item;
  db.prepare("UPDATE checklist_items SET da_xong = ?, xong_luc = CASE WHEN ? = 1 THEN datetime('now','localtime') ELSE NULL END WHERE id = ?").run(value, value, itemId);
  addHistory(item.task_id, 'checklist', null, null, null, `${value ? 'Tick' : 'Bỏ tick'} checklist: ${item.ten_muc}`);
  return db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(itemId);
});

// Tick / bỏ tick tất cả mục của một task bằng một lệnh
export const setAllChecklist = db.transaction((taskId, done) => {
  const value = done ? 1 : 0;
  const count = db.prepare('SELECT COUNT(*) AS n FROM checklist_items WHERE task_id = ? AND da_xong = ?').get(taskId, 1 - value).n;
  db.prepare("UPDATE checklist_items SET da_xong = ?, xong_luc = CASE WHEN ? = 1 THEN datetime('now','localtime') ELSE NULL END WHERE task_id = ? AND da_xong = ?")
    .run(value, value, taskId, 1 - value);
  if (count > 0) addHistory(taskId, 'checklist', null, null, null, `${value ? 'Tick' : 'Bỏ tick'} tất cả checklist (${count} mục)`);
  return { items: db.prepare('SELECT * FROM checklist_items WHERE task_id = ? ORDER BY id').all(taskId) };
});

// ===== Vấn đề QnA / Process =====

const ISSUE_TYPES = ['QnA', 'Process'];
const ISSUE_STATUSES = ['Mở', 'Đã xử lý'];

// Thêm vấn đề cho task
export const addIssue = db.transaction((taskId, body) => {
  if (!ISSUE_TYPES.includes(body.loai)) throw invalid('loai phải là QnA hoặc Process');
  const reason = requireText(body.ly_do, 'ly_do', 5000);
  const related = body.nguoi_lien_quan == null ? '' : body.nguoi_lien_quan;
  if (typeof related !== 'string' || related.trim().length > 500) throw invalid('nguoi_lien_quan tối đa 500 ký tự');
  const result = db.prepare('INSERT INTO issues (task_id, loai, ly_do, nguoi_lien_quan) VALUES (?, ?, ?, ?)').run(taskId, body.loai, reason, related.trim());
  addHistory(taskId, 'van_de', null, null, null, `Thêm vấn đề ${body.loai}: ${clip(reason, 80)}`);
  return db.prepare('SELECT * FROM issues WHERE id = ?').get(Number(result.lastInsertRowid));
});

// Sửa một phần vấn đề, ghi nhật ký từng trường đổi
export const updateIssue = db.transaction((issueId, body) => {
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId);
  if (!issue) throw notFound('Không tìm thấy vấn đề');
  const next = {};
  if (body.loai !== undefined) {
    if (!ISSUE_TYPES.includes(body.loai)) throw invalid('loai phải là QnA hoặc Process');
    next.loai = body.loai;
  }
  if (body.ly_do !== undefined) next.ly_do = requireText(body.ly_do, 'ly_do', 5000);
  if (body.nguoi_lien_quan !== undefined) {
    if (typeof body.nguoi_lien_quan !== 'string' || body.nguoi_lien_quan.trim().length > 500) throw invalid('nguoi_lien_quan tối đa 500 ký tự');
    next.nguoi_lien_quan = body.nguoi_lien_quan.trim();
  }
  if (body.trang_thai !== undefined) {
    if (!ISSUE_STATUSES.includes(body.trang_thai)) throw invalid('trang_thai phải là Mở hoặc Đã xử lý');
    next.trang_thai = body.trang_thai;
  }
  if (Object.keys(next).length === 0) throw invalid('Không có trường nào để sửa');
  const labels = { loai: 'Loại', ly_do: 'Lý do', nguoi_lien_quan: 'Người liên quan', trang_thai: 'Trạng thái' };
  db.prepare(`UPDATE issues SET ${Object.keys(next).map((f) => `${f} = @${f}`).join(', ')} WHERE id = @id`).run({ ...next, id: issueId });
  for (const field of Object.keys(next)) {
    if (next[field] === issue[field]) continue;
    addHistory(issue.task_id, 'van_de', `Vấn đề: ${labels[field]}`, issue[field], next[field],
      `Vấn đề ${issue.loai} "${clip(issue.ly_do, 40)}" - ${labels[field]}: ${clip(issue[field], 80) || '(trống)'} → ${clip(next[field], 80) || '(trống)'}`);
  }
  return db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId);
});

// Xóa vấn đề
export const deleteIssue = db.transaction((issueId) => {
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId);
  if (!issue) throw notFound('Không tìm thấy vấn đề');
  db.prepare('DELETE FROM issues WHERE id = ?').run(issueId);
  addHistory(issue.task_id, 'van_de', null, null, null, `Xóa vấn đề ${issue.loai}: ${clip(issue.ly_do, 80)}`);
});

// ===== Mẫu checklist =====

export function getTemplates() {
  return { items: db.prepare('SELECT id, ten_muc, thu_tu FROM checklist_templates ORDER BY thu_tu, id').all() };
}

// Thay toàn bộ mẫu checklist (không đổi task đã có)
export const saveTemplates = db.transaction((items) => {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw invalid('Mẫu checklist phải có từ 1 đến 50 mục');
  const names = items.map((item) => requireText(item?.ten_muc, 'ten_muc', 500));
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) throw invalid('Tên mục checklist không được trùng nhau');
  db.prepare('DELETE FROM checklist_templates').run();
  const insert = db.prepare('INSERT INTO checklist_templates (ten_muc, thu_tu) VALUES (?, ?)');
  names.forEach((name, index) => insert.run(name, index + 1));
  return getTemplates();
});

// Áp dụng mẫu: GHI ĐÈ checklist của task chưa hoàn thành, giữ tick các mục trùng tên
export const applyTemplates = db.transaction((body) => {
  const completed = 'SELECT ten FROM task_statuses WHERE la_hoan_thanh = 1';
  let ids;
  let skipped = 0; // số task đã hoàn thành bị bỏ qua khi chọn đích danh
  if (body.all === true) {
    ids = db.prepare(`SELECT id FROM tasks WHERE xoa_luc IS NULL AND trang_thai NOT IN (${completed})`).all().map((r) => r.id);
  } else {
    const list = body.task_ids;
    if (!Array.isArray(list) || list.length === 0) throw invalid('Hãy chọn tất cả hoặc ít nhất một task');
    if (list.length > 5000) throw invalid('Tối đa 5000 task mỗi lần');
    const unique = [...new Set(list)];
    unique.forEach((id) => parsePositiveInt(id, 'task_ids phải là số nguyên dương'));
    const found = db.prepare(`SELECT id, trang_thai FROM tasks WHERE xoa_luc IS NULL AND id IN (${unique.map(() => '?').join(',')})`).all(...unique);
    if (found.length !== unique.length) throw notFound('Có task không tồn tại');
    const doneNames = new Set(db.prepare(completed).all().map((r) => r.ten.toLowerCase()));
    ids = found.filter((t) => !doneNames.has(t.trang_thai.toLowerCase())).map((t) => t.id);
    skipped = unique.length - ids.length;
  }
  const template = db.prepare('SELECT ten_muc FROM checklist_templates ORDER BY thu_tu, id').all().map((r) => r.ten_muc);
  const result = { tasks: ids.length, tasks_thay_doi: 0, muc_them: 0, muc_xoa: 0, tasks_bo_qua: skipped };
  const insert = db.prepare('INSERT INTO checklist_items (task_id, ten_muc, da_xong, xong_luc) VALUES (?, ?, ?, ?)');
  for (const id of ids) {
    const current = db.prepare('SELECT * FROM checklist_items WHERE task_id = ? ORDER BY id').all(id);
    if (current.length === template.length && current.every((c, i) => c.ten_muc === template[i])) continue;
    const keep = new Map();
    current.forEach((c) => { if (!keep.has(c.ten_muc)) keep.set(c.ten_muc, c); });
    const added = template.filter((name) => !keep.has(name)).length;
    const removed = current.length - template.filter((name) => keep.has(name)).length;
    db.prepare('DELETE FROM checklist_items WHERE task_id = ?').run(id);
    template.forEach((name) => {
      const old = keep.get(name);
      insert.run(id, name, old ? old.da_xong : 0, old ? old.xong_luc : null);
    });
    addHistory(id, 'checklist', null, null, null, `Ghi đè checklist theo mẫu (thêm ${added}, xóa ${removed} mục)`);
    result.tasks_thay_doi += 1;
    result.muc_them += added;
    result.muc_xoa += removed;
  }
  return result;
});

// ===== Trạng thái task =====

export function listStatuses() {
  return { items: db.prepare('SELECT s.*, (SELECT COUNT(*) FROM tasks t WHERE t.trang_thai = s.ten) AS so_task FROM task_statuses s ORDER BY s.thu_tu, s.id').all() };
}

// Kiểm tra cờ boolean tùy chọn
function optionalFlag(value, field, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw invalid(`${field} phải là true hoặc false`);
  return value ? 1 : 0;
}

export function createStatus(body) {
  const name = requireText(body.ten, 'ten', 100);
  const color = body.mau ?? 'gray';
  if (!STATUS_COLORS.includes(color)) throw invalid('mau không hợp lệ');
  const done = optionalFlag(body.la_hoan_thanh, 'la_hoan_thanh', 0);
  const need = optionalFlag(body.yeu_cau_hoan_tat, 'yeu_cau_hoan_tat', 0);
  if (findStatus(name)) throw invalid('Trạng thái đã tồn tại');
  const next = db.prepare('SELECT COALESCE(MAX(thu_tu), 0) + 1 AS n FROM task_statuses').get().n;
  const result = db.prepare('INSERT INTO task_statuses (ten, mau, la_hoan_thanh, yeu_cau_hoan_tat, thu_tu) VALUES (?, ?, ?, ?, ?)').run(name, color, done, need, next);
  return listStatuses().items.find((s) => s.id === Number(result.lastInsertRowid));
}

// Sửa trạng thái; đổi tên thì task và progress_log đang dùng tên cũ đổi theo
export const updateStatus = db.transaction((id, body) => {
  const status = db.prepare('SELECT * FROM task_statuses WHERE id = ?').get(id);
  if (!status) throw notFound('Không tìm thấy trạng thái');
  const next = { ...status };
  if (body.ten !== undefined) {
    next.ten = requireText(body.ten, 'ten', 100);
    const clash = findStatus(next.ten);
    if (clash && clash.id !== id) throw invalid('Trạng thái đã tồn tại');
  }
  if (body.mau !== undefined) {
    if (!STATUS_COLORS.includes(body.mau)) throw invalid('mau không hợp lệ');
    next.mau = body.mau;
  }
  next.la_hoan_thanh = optionalFlag(body.la_hoan_thanh, 'la_hoan_thanh', status.la_hoan_thanh);
  next.yeu_cau_hoan_tat = optionalFlag(body.yeu_cau_hoan_tat, 'yeu_cau_hoan_tat', status.yeu_cau_hoan_tat);
  if (next.ten !== status.ten) {
    // Ghi nhật ký cho task bị ảnh hưởng trước khi đổi tên
    db.prepare(`INSERT INTO task_history (task_id, loai, truong, gia_tri_cu, gia_tri_moi, mo_ta, nguoi_thay_doi)
      SELECT id, 'tien_do', 'Trạng thái', trang_thai, ?, 'Trạng thái: ' || trang_thai || ' → ' || ?, ? FROM tasks WHERE trang_thai = ? COLLATE NOCASE`)
      .run(next.ten, next.ten, currentActor(), status.ten);
    db.prepare('UPDATE tasks SET trang_thai = ? WHERE trang_thai = ? COLLATE NOCASE').run(next.ten, status.ten);
    db.prepare('UPDATE progress_log SET trang_thai = ? WHERE trang_thai = ? COLLATE NOCASE').run(next.ten, status.ten);
  }
  db.prepare('UPDATE task_statuses SET ten = ?, mau = ?, la_hoan_thanh = ?, yeu_cau_hoan_tat = ? WHERE id = ?')
    .run(next.ten, next.mau, next.la_hoan_thanh, next.yeu_cau_hoan_tat, id);
  return listStatuses().items.find((s) => s.id === id);
});

// Đổi thứ tự một dòng trong bảng có cột thu_tu (hướng -1 lên, 1 xuống); trả true nếu có đổi
function moveRow(table, id, direction, scopeSql, scopeParams) {
  if (direction !== -1 && direction !== 1) throw invalid('huong phải là -1 hoặc 1');
  const rows = db.prepare(`SELECT id FROM ${table} ${scopeSql} ORDER BY thu_tu, id`).all(...scopeParams);
  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) throw notFound('Không tìm thấy mục cần di chuyển');
  const target = index + direction;
  if (target < 0 || target >= rows.length) return;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  const update = db.prepare(`UPDATE ${table} SET thu_tu = ? WHERE id = ?`);
  rows.forEach((row, i) => update.run(i + 1, row.id));
}

export const moveStatus = db.transaction((id, direction) => {
  moveRow('task_statuses', id, direction, '', []);
  return listStatuses();
});

export function deleteStatus(id) {
  const status = listStatuses().items.find((s) => s.id === id);
  if (!status) throw notFound('Không tìm thấy trạng thái');
  if (status.so_task > 0) throw invalid(`Không thể xóa: còn ${status.so_task} task đang dùng trạng thái này`);
  if (db.prepare('SELECT COUNT(*) AS n FROM task_statuses').get().n <= 1) throw invalid('Không thể xóa trạng thái cuối cùng');
  db.prepare('DELETE FROM task_statuses WHERE id = ?').run(id);
}

// ===== Danh mục dữ liệu (Dev…) =====

// Số task đang dùng một mục dữ liệu
function countItemUsage(group, name) {
  if (!group.taskColumn) return 0;
  return db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ${group.taskColumn} = ? COLLATE NOCASE`).get(name).n;
}

export function listDataGroups() {
  return {
    groups: DATA_GROUPS.map((group) => ({
      key: group.key,
      label: group.label,
      items: db.prepare('SELECT id, nhom, ten, thu_tu FROM data_items WHERE nhom = ? ORDER BY thu_tu, id').all(group.key)
        .map((item) => ({ ...item, so_task: countItemUsage(group, item.ten) })),
    })),
  };
}

// Tìm nhóm dữ liệu hợp lệ
function requireGroup(key) {
  const group = DATA_GROUPS.find((g) => g.key === key);
  if (!group) throw invalid('nhom không hợp lệ');
  return group;
}

export function createDataItem(body) {
  const group = requireGroup(body.nhom);
  const name = requireText(body.ten, 'ten', 200);
  if (db.prepare('SELECT 1 FROM data_items WHERE nhom = ? AND ten = ? COLLATE NOCASE').get(group.key, name)) throw invalid('Tên đã tồn tại trong nhóm');
  const next = db.prepare('SELECT COALESCE(MAX(thu_tu), 0) + 1 AS n FROM data_items WHERE nhom = ?').get(group.key).n;
  const result = db.prepare('INSERT INTO data_items (nhom, ten, thu_tu) VALUES (?, ?, ?)').run(group.key, name, next);
  return db.prepare('SELECT id, nhom, ten, thu_tu FROM data_items WHERE id = ?').get(Number(result.lastInsertRowid));
}

// Thêm nhiều mục một lúc, bỏ qua tên đã có
export const createDataItemsBulk = db.transaction((body) => {
  const group = requireGroup(body.nhom);
  if (!Array.isArray(body.ten_list) || body.ten_list.length < 1 || body.ten_list.length > 500) throw invalid('ten_list phải có từ 1 đến 500 tên');
  let added = 0;
  let skipped = 0;
  for (const raw of body.ten_list) {
    const name = requireText(raw, 'ten', 200);
    if (db.prepare('SELECT 1 FROM data_items WHERE nhom = ? AND ten = ? COLLATE NOCASE').get(group.key, name)) { skipped += 1; continue; }
    const next = db.prepare('SELECT COALESCE(MAX(thu_tu), 0) + 1 AS n FROM data_items WHERE nhom = ?').get(group.key).n;
    db.prepare('INSERT INTO data_items (nhom, ten, thu_tu) VALUES (?, ?, ?)').run(group.key, name, next);
    added += 1;
  }
  return { added, skipped };
});

// Đổi tên mục; task đang dùng tên cũ đổi theo và ghi nhật ký
export const updateDataItem = db.transaction((id, body) => {
  const item = db.prepare('SELECT * FROM data_items WHERE id = ?').get(id);
  if (!item) throw notFound('Không tìm thấy mục dữ liệu');
  const group = requireGroup(item.nhom);
  const name = requireText(body.ten, 'ten', 200);
  const clash = db.prepare('SELECT id FROM data_items WHERE nhom = ? AND ten = ? COLLATE NOCASE').get(item.nhom, name);
  if (clash && clash.id !== id) throw invalid('Tên đã tồn tại trong nhóm');
  if (group.taskColumn && name !== item.ten) {
    const label = FIELD_LABELS[group.taskColumn][0];
    db.prepare(`INSERT INTO task_history (task_id, loai, truong, gia_tri_cu, gia_tri_moi, mo_ta, nguoi_thay_doi)
      SELECT id, 'task', ?, ?, ?, ? || ': ' || ? || ' → ' || ?, ? FROM tasks WHERE ${group.taskColumn} = ? COLLATE NOCASE`)
      .run(label, item.ten, name, label, item.ten, name, currentActor(), item.ten);
    db.prepare(`UPDATE tasks SET ${group.taskColumn} = ? WHERE ${group.taskColumn} = ? COLLATE NOCASE`).run(name, item.ten);
  }
  db.prepare('UPDATE data_items SET ten = ? WHERE id = ?').run(name, id);
  return db.prepare('SELECT id, nhom, ten, thu_tu FROM data_items WHERE id = ?').get(id);
});

export const moveDataItem = db.transaction((id, direction) => {
  const item = db.prepare('SELECT nhom FROM data_items WHERE id = ?').get(id);
  if (!item) throw notFound('Không tìm thấy mục dữ liệu');
  moveRow('data_items', id, direction, 'WHERE nhom = ?', [item.nhom]);
  return listDataGroups();
});

export function deleteDataItem(id) {
  const item = db.prepare('SELECT * FROM data_items WHERE id = ?').get(id);
  if (!item) throw notFound('Không tìm thấy mục dữ liệu');
  const used = countItemUsage(requireGroup(item.nhom), item.ten);
  if (used > 0) throw invalid(`Không thể xóa: còn ${used} task đang dùng mục này`);
  db.prepare('DELETE FROM data_items WHERE id = ?').run(id);
}

// ===== Cập nhật tiến độ hàng loạt (EOD) =====

export const saveEod = db.transaction((items) => {
  if (!Array.isArray(items) || items.length === 0) throw invalid('items phải là mảng không rỗng');
  const seen = new Set();
  for (const item of items) {
    parsePositiveInt(item?.task_id, 'task_id phải là số nguyên dương');
    if (seen.has(item.task_id)) throw invalid('task_id bị lặp');
    seen.add(item.task_id);
  }
  for (const item of items) {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND xoa_luc IS NULL').get(item.task_id);
    if (!task) throw notFound('Không tìm thấy task');
    const prefix = `Task ${task.ma_task}: `;
    if (!Number.isInteger(item.tien_do) || item.tien_do < 0 || item.tien_do > 100) throw invalid(`${prefix}tien_do phải là số nguyên từ 0 đến 100`);
    const status = findStatus(item.trang_thai);
    if (!status) throw invalid(`${prefix}trang_thai không hợp lệ`);
    // ghi_chu không gửi (undefined) thì giữ nguyên ghi chú hiện tại
    const note = item.ghi_chu === undefined ? task.ghi_chu : normalizeNote(item.ghi_chu);
    assertCompletionRule(task.id, status, item.tien_do, prefix);

    const next = { tien_do: item.tien_do, trang_thai: status.ten, ghi_chu: note };
    const changed = Object.keys(next).filter((field) => !sameValue(next[field], task[field]));
    db.prepare("UPDATE tasks SET tien_do = ?, trang_thai = ?, ghi_chu = ?, cap_nhat_luc = datetime('now','localtime') WHERE id = ?")
      .run(next.tien_do, next.trang_thai, next.ghi_chu, task.id);
    upsertProgressToday(task.id, next.tien_do, next.trang_thai, note);
    for (const field of changed) {
      const [label, type] = FIELD_LABELS[field];
      const oldText = formatHistoryValue(field, task[field]);
      const newText = formatHistoryValue(field, next[field]);
      addHistory(task.id, type, label, oldText, newText, `${label}: ${oldText} → ${newText}`);
    }
    if (changed.length === 0) {
      addHistory(task.id, 'tien_do', null, null, null, `Xác nhận không đổi (tiến độ ${task.tien_do}%, trạng thái ${task.trang_thai})`);
    }
  }
  return { saved: items.length };
});

// ===== Xuất CSV =====

// Toàn bộ task (mọi trạng thái) để xuất CSV; ownerId undefined = tất cả
export function listTasksForExport(ownerId) {
  const where = ownerId === undefined ? 'WHERE t.xoa_luc IS NULL' : 'WHERE t.xoa_luc IS NULL AND t.nguoi_tao_id = ?';
  const params = ownerId === undefined ? [] : [ownerId];
  return db.prepare(`${TASK_SELECT} ${where} ORDER BY t.id`).all(...params);
}

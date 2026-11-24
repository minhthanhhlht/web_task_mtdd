// Tạo tài khoản hoặc đặt lại mật khẩu từ cửa sổ lệnh: npm run create-user -- <tên> [--admin|--user]
import readline from 'node:readline';
import { db } from './db.js';
import { hashPassword, validatePassword, validateUsername } from './auth.js';

// Đọc stdin bằng một readline duy nhất có hàng đợi để không mất dòng khi nhập qua ống
const rl = readline.createInterface({ input: process.stdin, terminal: false });
const queue = [];
const waiters = [];
rl.on('line', (line) => (waiters.length ? waiters.shift()(line) : queue.push(line)));
rl.on('close', () => waiters.splice(0).forEach((resolve) => resolve('')));

// Hỏi một dòng (mật khẩu không được hiện lại trên màn hình khi nhập thật)
function ask(question) {
  process.stdout.write(question);
  return new Promise((resolve) => (queue.length ? resolve(queue.shift()) : waiters.push(resolve)));
}

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const flagRole = args.includes('--admin') ? 'admin' : args.includes('--user') ? 'user' : null;

try {
  if (!name) throw new Error('Cach dung: npm run create-user -- <ten> [--admin|--user]');
  validateUsername(name);
  const existing = db.prepare('SELECT * FROM users WHERE ten_dang_nhap = ? COLLATE NOCASE').get(name);
  if (existing) {
    const answer = (await ask(`Tai khoan "${name}" da co. Dat lai mat khau? (y/N): `)).trim().toLowerCase();
    if (answer !== 'y') { console.log('Khong thay doi gi.'); process.exit(0); }
  }
  const password = validatePassword(await ask('Mat khau moi (it nhat 8 ky tu): '));
  if (existing) {
    // Đặt lại mật khẩu: đăng xuất mọi nơi và ép đổi mật khẩu ở lần đăng nhập kế tiếp
    db.prepare('UPDATE users SET mat_khau = ?, bat_buoc_doi_mat_khau = 1, vai_tro = ? WHERE id = ?').run(hashPassword(password), flagRole ?? existing.vai_tro, existing.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    console.log(`Da dat lai mat khau cho "${name}".`);
  } else {
    const isFirst = db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0;
    const role = flagRole ?? (isFirst ? 'admin' : 'user');
    db.prepare('INSERT INTO users (ten_dang_nhap, mat_khau, vai_tro, bat_buoc_doi_mat_khau) VALUES (?, ?, ?, 1)').run(name, hashPassword(password), role);
    console.log(`Da tao tai khoan "${name}" (${role}).`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
rl.close();

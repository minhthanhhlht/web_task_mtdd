// Sao lưu database: tạo, liệt kê, tải, xóa các file backups/tasks_<YYYY-MM-DD_HHmm>.db (dùng chung cho lệnh backup.js và API quản trị).
import fs from 'node:fs';
import path from 'node:path';
import { db, DB_FILE } from './db.js';

// Thư mục sao lưu nằm cạnh file database (volume lưu bền khi chạy Docker)
export const BACKUP_DIR = path.join(path.dirname(DB_FILE), 'backups');

// Tên file hợp lệ (có hoặc không có giờ phút); chặn mọi ký tự đường dẫn để không đọc/xóa file ngoài thư mục sao lưu
const BACKUP_NAME = /^tasks_\d{4}-\d{2}-\d{2}(?:_\d{4})?\.db$/;

// Lỗi 404 theo quy ước của server (cờ notFound)
function notFound(message) {
  const error = new Error(message);
  error.notFound = true;
  return error;
}

// Thông tin một file sao lưu: tên, dung lượng (byte), giờ tạo 'YYYY-MM-DD HH:mm:ss'
function describe(name) {
  const stat = fs.statSync(path.join(BACKUP_DIR, name));
  return { ten: name, kich_thuoc: stat.size, tao_luc: `${stat.mtime.toLocaleDateString('sv-SE')} ${stat.mtime.toLocaleTimeString('sv-SE')}`, _mtime: stat.mtimeMs };
}

// Tạo bản sao lưu mới bằng API backup của better-sqlite3 (nhất quán kể cả khi đang có người dùng); cùng phút thì ghi đè
export async function createBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const now = new Date();
  const stamp = `${now.toLocaleDateString('sv-SE')}_${now.toLocaleTimeString('sv-SE').slice(0, 5).replace(':', '')}`;
  const name = `tasks_${stamp}.db`;
  await db.backup(path.join(BACKUP_DIR, name));
  const { _mtime, ...info } = describe(name);
  return info;
}

// Danh sách file sao lưu, mới nhất trước
export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter((name) => BACKUP_NAME.test(name))
    .map(describe)
    .sort((a, b) => b._mtime - a._mtime)
    .map(({ _mtime, ...info }) => info);
}

// Đường dẫn đầy đủ của một file sao lưu; tên sai hoặc không có file thì 404
export function backupPath(name) {
  if (typeof name !== 'string' || !BACKUP_NAME.test(name)) throw notFound('Không tìm thấy bản sao lưu');
  const full = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(full)) throw notFound('Không tìm thấy bản sao lưu');
  return full;
}

// Xóa một file sao lưu
export function deleteBackup(name) {
  fs.unlinkSync(backupPath(name));
}

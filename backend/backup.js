// Sao lưu database ra backups/tasks_<YYYY-MM-DD_HHmm>.db (mỗi lần chạy một file, chạy nhiều lần trong ngày không ghi đè nhau).
// Dùng cho lệnh tay và lịch tự động (Coolify Scheduled Tasks); logic nằm ở backups.js.
import path from 'node:path';
import { BACKUP_DIR, createBackup } from './backups.js';

const info = await createBackup();
console.log(`Da sao luu vao ${path.join(BACKUP_DIR, info.ten)}`);

// Sao lưu database ra backups/tasks_<YYYY-MM-DD>.db (ghi đè trong cùng ngày).
import fs from 'node:fs';
import path from 'node:path';
import { db, DB_FILE } from './db.js';

// Thư mục sao lưu nằm cạnh file database (volume lưu bền khi chạy Docker)
const dir = path.join(path.dirname(DB_FILE), 'backups');
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `tasks_${new Date().toLocaleDateString('sv-SE')}.db`);

// Dùng API backup của better-sqlite3 để bản sao nhất quán
await db.backup(target);
console.log(`Da sao luu vao ${target}`);

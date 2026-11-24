// Dữ liệu khởi tạo riêng của người dùng (danh sách Dev, mẫu checklist) đọc từ backend/seed-data.json.
// File này nằm ngoài git (.gitignore) nên tên người thật không đi vào mã nguồn.
//   - Server tự gọi seedDevIfEmpty() lúc khởi động: chỉ nạp nhóm Dev khi nhóm còn trống.
//   - Lệnh tay: npm run seed [-- --checklist]  → thêm các tên Dev còn thiếu; kèm --checklist thì thay mẫu checklist.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
// File seed: biến môi trường SEED_FILE hoặc backend/seed-data.json
const SEED_FILE = process.env.SEED_FILE ? path.resolve(process.env.SEED_FILE) : path.join(BACKEND_DIR, 'seed-data.json');

// Đọc và kiểm tra file seed; trả null nếu không có file
function loadSeedData() {
  if (!fs.existsSync(SEED_FILE)) return null;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  } catch {
    throw new Error('seed-data.json khong phai JSON hop le');
  }
  // Chuẩn hóa một danh sách chuỗi: bỏ ô rỗng, cắt khoảng trắng, kiểm tra độ dài
  const clean = (list, field, max) => {
    if (list === undefined) return [];
    if (!Array.isArray(list)) throw new Error(`seed-data.json: "${field}" phai la mang chuoi`);
    return list.map((item) => {
      if (typeof item !== 'string') throw new Error(`seed-data.json: "${field}" co gia tri khong phai chuoi`);
      const text = item.trim();
      if (text.length > max) throw new Error(`seed-data.json: "${field}" co muc dai qua ${max} ky tu`);
      return text;
    }).filter(Boolean);
  };
  return { dev: clean(data.dev, 'dev', 200), checklist: clean(data.checklist, 'checklist', 500) };
}

// Thêm các tên Dev chưa có (không phân biệt hoa thường), giữ thứ tự trong file; trả số tên đã thêm
function addDevNames(names) {
  const exists = db.prepare("SELECT 1 FROM data_items WHERE nhom = 'dev' AND ten = ? COLLATE NOCASE");
  const insert = db.prepare("INSERT INTO data_items (nhom, ten, thu_tu) VALUES ('dev', ?, ?)");
  return db.transaction(() => {
    let next = db.prepare("SELECT COALESCE(MAX(thu_tu), 0) AS n FROM data_items WHERE nhom = 'dev'").get().n;
    let added = 0;
    for (const name of names) {
      if (exists.get(name)) continue;
      next += 1;
      insert.run(name, next);
      added += 1;
    }
    return added;
  })();
}

// Thay toàn bộ mẫu checklist (không đổi checklist của task đã có, giống nút Lưu mẫu ở giao diện)
function replaceChecklistTemplate(items) {
  if (items.length < 1 || items.length > 50) throw new Error('seed-data.json: checklist phai co tu 1 den 50 muc');
  if (new Set(items.map((i) => i.toLowerCase())).size !== items.length) throw new Error('seed-data.json: checklist co muc trung nhau');
  db.transaction(() => {
    db.prepare('DELETE FROM checklist_templates').run();
    const insert = db.prepare('INSERT INTO checklist_templates (ten_muc, thu_tu) VALUES (?, ?)');
    items.forEach((name, index) => insert.run(name, index + 1));
  })();
}

// Gọi lúc khởi động server: nhóm Dev còn trống và có file seed thì nạp danh sách Dev
export function seedDevIfEmpty() {
  const data = loadSeedData();
  if (!data || data.dev.length === 0) return 0;
  if (db.prepare("SELECT COUNT(*) AS n FROM data_items WHERE nhom = 'dev'").get().n > 0) return 0;
  const added = addDevNames(data.dev);
  if (added > 0) console.log(`Da nap ${added} ten Dev tu seed-data.json.`);
  return added;
}

// Chạy bằng lệnh: npm run seed [-- --checklist]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const data = loadSeedData();
    if (!data) throw new Error('Khong thay backend/seed-data.json (xem seed-data.example.json)');
    console.log(`Dev: them ${addDevNames(data.dev)} ten moi (bo qua ten da co).`);
    if (process.argv.includes('--checklist')) {
      replaceChecklistTemplate(data.checklist);
      console.log(`Checklist: da thay mau bang ${data.checklist.length} muc (task da co khong doi; dung "Ap dung mau" o giao dien neu can).`);
    } else {
      console.log('Checklist: khong doi (them --checklist de thay mau).');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

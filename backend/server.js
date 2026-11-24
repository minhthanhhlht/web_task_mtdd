// Máy chủ Express: API quản lý task + phục vụ giao diện đã build (frontend/dist).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import * as store from './db.js';
import {
  assertTaskAccess, authRouter, enforcePasswordChange, enforceRoles, ensureDefaultAdmin, getOwnerScope, handle,
  requireLogin, usersRouter,
} from './auth.js';
import { noteToPlainText } from './noteHtml.js';
import { seedDevIfEmpty } from './seed.js';

const PORT = 6021;
const HOST = '0.0.0.0';
const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(BACKEND_DIR, '..', 'frontend', 'dist');

// Tạo tài khoản admin mặc định từ .env nếu chưa có tài khoản nào
ensureDefaultAdmin();
// Nạp danh sách Dev từ seed-data.json (nếu có) khi nhóm Dev còn trống
seedDevIfEmpty();

const app = express();
app.disable('x-powered-by');
// Sau reverse proxy (Coolify/Traefik): đặt TRUST_PROXY=1 để lấy IP thật và biết yêu cầu đi qua HTTPS
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.use(express.json({ limit: '12mb' }));

// ===== Hàm tiện ích đọc tham số =====

// Lỗi 400 nhanh gọn
function bad(message) {
  const error = new Error(message);
  error.invalid = true;
  return error;
}

// id trên URL phải là số nguyên dương
function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw bad('id không hợp lệ');
  return id;
}

// Body phải là object
function getBody(req) {
  if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) throw bad('Dữ liệu gửi lên phải là object');
  return req.body;
}

// Đọc page/limit từ query (mặc định 1/50, limit 1..200)
function parsePaging(query, defaultLimit = 50) {
  let page = 1;
  let limit = defaultLimit;
  if (query.page !== undefined) {
    page = Number(query.page);
    if (!Number.isSafeInteger(page) || page < 1) throw bad('page không hợp lệ');
  }
  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw bad('limit phải từ 1 đến 200');
  }
  return { page, limit };
}

// Đọc cờ 0/1 từ query
function parseFlag(value, name) {
  if (value === undefined) return false;
  if (value !== '0' && value !== '1') throw bad(`${name} phải là 0 hoặc 1`);
  return value === '1';
}

// Đọc các tham số lọc dùng chung cho danh sách task và checklist
function parseTaskQuery(req) {
  const { page, limit } = parsePaging(req.query);
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const status = typeof req.query.trang_thai === 'string' ? req.query.trang_thai.trim() : '';
  return {
    ownerId: getOwnerScope(req), status, q, page, limit,
    archived: parseFlag(req.query.archived, 'archived'),
    notUpdated: parseFlag(req.query.chua_cap_nhat, 'chua_cap_nhat'),
  };
}

// ===== Xác thực và phân quyền =====

app.use('/api/auth', authRouter);
app.use('/api', requireLogin, enforcePasswordChange, enforceRoles);
app.use('/api/users', usersRouter);

// ===== Task =====

app.get('/api/tasks', handle((req, res) => {
  const options = parseTaskQuery(req);
  if (req.query.sort !== undefined) {
    if (!store.isValidSort(req.query.sort)) throw bad('sort không hợp lệ');
    if (req.query.dir !== undefined && !['asc', 'desc'].includes(req.query.dir)) throw bad('dir phải là asc hoặc desc');
    options.sort = req.query.sort;
    options.dir = req.query.dir ?? 'asc';
  }
  res.json(store.listTasks(options));
}));

app.get('/api/checklists', handle((req, res) => {
  res.json(store.listChecklists(parseTaskQuery(req)));
}));

app.post('/api/tasks', handle((req, res) => {
  res.status(201).json(store.createTask(getBody(req), req.user.id));
}));

app.get('/api/tasks/:id', handle((req, res) => {
  const id = parseId(req.params.id);
  assertTaskAccess(req, id);
  res.json(store.getTask(id));
}));

app.get('/api/tasks/:id/history', handle((req, res) => {
  const id = parseId(req.params.id);
  assertTaskAccess(req, id);
  const { page, limit } = parsePaging(req.query);
  res.json(store.getTaskHistory(id, page, limit));
}));

app.put('/api/tasks/:id/owner', handle((req, res) => {
  const id = parseId(req.params.id);
  res.json(store.transferTask(id, getBody(req).user_id));
}));

app.put('/api/tasks/:id/checklist', handle((req, res) => {
  const id = parseId(req.params.id);
  assertTaskAccess(req, id);
  const { da_xong: done } = getBody(req);
  if (![true, false, 0, 1].includes(done)) throw bad('da_xong phải là true hoặc false');
  res.json(store.setAllChecklist(id, Boolean(done)));
}));

app.put('/api/tasks/:id', handle((req, res) => {
  const id = parseId(req.params.id);
  assertTaskAccess(req, id);
  res.json(store.updateTask(id, getBody(req)));
}));

app.delete('/api/tasks/:id', handle((req, res) => {
  const id = parseId(req.params.id);
  assertTaskAccess(req, id);
  store.deleteTask(id);
  res.status(204).end();
}));

// ===== Checklist và vấn đề =====

app.put('/api/checklist/:id', handle((req, res) => {
  const id = parseId(req.params.id);
  const taskId = store.getChecklistItemTaskId(id);
  if (taskId === undefined) throw Object.assign(new Error('Không tìm thấy mục checklist'), { notFound: true });
  assertTaskAccess(req, taskId);
  const { da_xong: done } = getBody(req);
  if (![true, false, 0, 1].includes(done)) throw bad('da_xong phải là true hoặc false');
  res.json(store.setChecklistItem(id, Boolean(done)));
}));

app.post('/api/tasks/:id/issues', handle((req, res) => {
  const id = parseId(req.params.id);
  assertTaskAccess(req, id);
  res.status(201).json(store.addIssue(id, getBody(req)));
}));

app.put('/api/issues/:id', handle((req, res) => {
  const id = parseId(req.params.id);
  const taskId = store.getIssueTaskId(id);
  if (taskId === undefined) throw Object.assign(new Error('Không tìm thấy vấn đề'), { notFound: true });
  assertTaskAccess(req, taskId);
  res.json(store.updateIssue(id, getBody(req)));
}));

app.delete('/api/issues/:id', handle((req, res) => {
  const id = parseId(req.params.id);
  const taskId = store.getIssueTaskId(id);
  if (taskId === undefined) throw Object.assign(new Error('Không tìm thấy vấn đề'), { notFound: true });
  assertTaskAccess(req, taskId);
  store.deleteIssue(id);
  res.status(204).end();
}));

app.get('/api/checklist-templates', handle((req, res) => res.json(store.getTemplates())));
app.put('/api/checklist-templates', handle((req, res) => res.json(store.saveTemplates(getBody(req).items))));
app.post('/api/checklist-templates/apply', handle((req, res) => res.json(store.applyTemplates(getBody(req)))));

// ===== Trạng thái và danh mục dữ liệu =====

app.get('/api/statuses', handle((req, res) => res.json(store.listStatuses())));
app.post('/api/statuses', handle((req, res) => res.status(201).json(store.createStatus(getBody(req)))));
app.put('/api/statuses/:id/move', handle((req, res) => res.json(store.moveStatus(parseId(req.params.id), getBody(req).huong))));
app.put('/api/statuses/:id', handle((req, res) => res.json(store.updateStatus(parseId(req.params.id), getBody(req)))));
app.delete('/api/statuses/:id', handle((req, res) => {
  store.deleteStatus(parseId(req.params.id));
  res.status(204).end();
}));

app.get('/api/data-groups', handle((req, res) => res.json(store.listDataGroups())));
app.post('/api/data-items/bulk', handle((req, res) => res.status(201).json(store.createDataItemsBulk(getBody(req)))));
app.post('/api/data-items', handle((req, res) => res.status(201).json(store.createDataItem(getBody(req)))));
app.put('/api/data-items/:id/move', handle((req, res) => res.json(store.moveDataItem(parseId(req.params.id), getBody(req).huong))));
app.put('/api/data-items/:id', handle((req, res) => res.json(store.updateDataItem(parseId(req.params.id), getBody(req)))));
app.delete('/api/data-items/:id', handle((req, res) => {
  store.deleteDataItem(parseId(req.params.id));
  res.status(204).end();
}));

// ===== Cập nhật tiến độ hàng loạt =====

app.post('/api/eod', handle((req, res) => {
  const { items } = getBody(req);
  // Kiểm tra quyền mọi task TRƯỚC khi lưu
  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (Number.isSafeInteger(item?.task_id) && item.task_id > 0) assertTaskAccess(req, item.task_id);
    });
  }
  res.json(store.saveEod(items));
}));

// ===== Xuất CSV =====

// Bọc một ô CSV: nháy kép nhân đôi, chống công thức Excel
function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

app.get('/api/export', handle((req, res) => {
  const columns = ['ma_task', 'ten', 'ngay_nhan', 'deadline', 'dev_hoan_thanh_thuc_te', 'nguoi_giao', 'dev_cross_check', 'tien_do',
    'trang_thai', 'ghi_chu', 'link_test_case', 'checklist_da_xong', 'checklist_tong', 'tao_luc', 'cap_nhat_luc'];
  const rows = store.listTasksForExport(getOwnerScope(req));
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c === 'ghi_chu' ? noteToPlainText(row.ghi_chu) : row[c])).join(','));
  }
  const today = new Date().toLocaleDateString('sv-SE');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tasks_${today}.csv"`);
  res.send(`﻿${lines.join('\r\n')}\r\n`);
}));

// API không khớp
app.use('/api', (req, res) => res.status(404).json({ error: 'Không tìm thấy API' }));

// ===== Phục vụ giao diện đã build =====

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

// ===== Bộ xử lý lỗi chung =====

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON không hợp lệ' });
  if (error.type === 'entity.too.large') return res.status(400).json({ error: 'Dữ liệu quá lớn' });
  let status = 500;
  if (error.status) status = error.status;
  else if (error.invalid) status = 400;
  else if (error.notFound) status = 404;
  if (status === 500) {
    // Chỉ ghi mã lỗi ra log, không lộ chi tiết và không ghi dữ liệu task
    console.error('Loi server:', error.code ?? error.name);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
  return res.status(status).json({ error: error.message });
});

app.listen(PORT, HOST, () => {
  console.log(`Server dang chay tai http://127.0.0.1:${PORT}`);
});

// Hook PreToolUse: khi sửa file giao diện (frontend/src), nhắc Claude gọi skill evon:ui-ux (một lần mỗi phiên).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Đọc JSON hook gửi qua stdin
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let input = {};
try { input = JSON.parse(raw); } catch { /* không có dữ liệu thì coi như phiên lạ */ }

// Mỗi phiên chỉ nhắc một lần: đánh dấu bằng file tạm theo session_id
const sessionId = String(input.session_id ?? 'unknown').replace(/[^\w-]/g, '');
const marker = path.join(os.tmpdir(), `evon-ui-reminded-${sessionId}`);
if (fs.existsSync(marker)) process.exit(0);
fs.writeFileSync(marker, new Date().toISOString());

const message = [
  'NHẮC UI/UX (quy tắc dự án, CLAUDE.md): bạn sắp sửa file giao diện trong frontend/src.',
  'Nếu trong phiên này chưa gọi skill `evon:ui-ux` (công cụ Skill) thì gọi ngay trước khi sửa tiếp, rồi làm theo quy tắc của skill',
  'cùng mục 7.6 của PROJECT_SPEC.md và mục "UI/UX theo evondevKit" của .claude/rules/RULES.md (token màu, hằng số nút/ô nhập/thẻ/bảng, bo góc, icon SVG, không emoji).',
  'Giữ nguyên tính năng. Sửa xong thì build frontend và kiểm tra trực quan bằng trình duyệt trước khi báo xong.',
].join(' ');

console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: message } }));

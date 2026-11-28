# PROJECT_SPEC.md — Đặc tả đầy đủ để dựng lại dự án "Web quản lý task cá nhân"

> **Đọc file này như đọc đề bài.** Mục tiêu: một AI chỉ cần file này (và không có mã nguồn gốc) là dựng lại được ứng dụng có **cùng hành vi, cùng cấu trúc database, cùng API, cùng giao diện và luồng thao tác**. Không thể bảo đảm giống từng ký tự mã nguồn, nhưng mọi quy tắc nghiệp vụ, tên cột, tên field, thông báo lỗi, hằng số, thứ tự màn hình… đều được ghi ở đây. Chỗ nào file này ghi **MUST** là bắt buộc giữ đúng; **NOTE** là giải thích thêm.
>
> Nhật ký lịch sử phát triển (vì sao có từng thứ) nằm ở `WORKLOG.md`; mô tả vận hành ngắn gọn ở `README.md`; quy tắc code ở `.claude/rules/RULES.md`. File này là bản **tổng hợp tự đủ** của các thứ đó ở trạng thái hiện tại.
>
> *(File này được chép lại từ 18 ảnh chụp màn hình. Một số chỗ ảnh mờ/lóa — các chỗ đó có đánh dấu `[?]` để người code đối chiếu lại với bản gốc nếu cần.)*

---

## 0. Cách làm khi dựng lại (thứ tự đề xuất)

1. Tạo cấu trúc thư mục + `package.json` (mục 2).
2. Viết `backend/schema.sql` và `backend/db.js` (mục 4) — gồm migration, dữ liệu mặc định, hàm truy vấn, nhật ký thay đổi.
3. Viết `backend/noteHtml.js`, `backend/auth.js`, `backend/server.js` (mục 5–6).
4. Viết frontend theo mục 7 (providers → api.js → constants → components → pages).
5. Viết `start.bat`, `backup.js`, `create-user.js` (mục 9).
6. Chạy bộ kiểm tra chấp nhận ở mục 10.

Mọi lời gọi SQL **MUST** dùng tham số `?` (chỉ riêng tên cột/biểu thức lấy từ danh sách cố định trong code mới được ghép vào câu SQL).

---

## 1. Tổng quan và ràng buộc

- Web quản lý task của một nhóm nhỏ, chạy trên **một máy** (Windows), mở cho các máy cùng mạng nội bộ truy cập. Có đăng nhập tài khoản/mật khẩu, hai vai trò `admin` / `user`. Không đồng bộ cloud, không làm bản di động (chỉ cần chạy tốt trên máy tính; có responsive cơ bản).
- Giao diện, thông báo, label: **tiếng Việt**. Tên biến/hàm/hằng/component/props/file code: **tiếng Anh**. Tên bảng, cột database và field JSON của API: **tiếng Việt không dấu `snake_case`** (ví dụ `ma_task`, `tien_do`, `trang_thai`). Giá trị cố định giữ tiếng Việt (`'Mở'`, `'Đã xử lý'`).
- Mỗi đoạn code có ý nghĩa đều có **comment tiếng Việt** 1–2 dòng nói mục đích (đầu file, mỗi hàm, mỗi component, mỗi nhóm hằng, mỗi câu SQL, mỗi bước kiểm tra).
- **Công nghệ cố định, không thêm thư viện khác:**

| Lớp | Công nghệ |
| --- | --- |
| Backend | Node.js LTS ≥ 20, Express 5, better-sqlite3 (module ESM, `"type": "module"`) |
| Database | SQLite, một file `backend/tasks.db` |
| Frontend | React 19, react-router-dom 7, Vite, `@vitejs/plugin-react`; giao diện dựng bằng **Astryx** (`@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex`, giấy phép MIT) cùng Tailwind CSS 4 (`@tailwindcss/vite`) cho bố cục; icon từ `lucide-react` |
| Ngôn ngữ | JavaScript (không TypeScript, không ORM). Giao diện dùng component của Astryx thay vì tự viết; không thêm thư viện UI/icon/date-picker khác ngoài Astryx và `lucide-react` (đã là phụ thuộc của theme Astryx). Trình soạn ghi chú vẫn tự viết (xem 7.4) |

- Đăng nhập chỉ dùng module `crypto` của Node (scrypt, SHA-256, randomBytes).
- **Cấm** `window.confirm / prompt / alert`: dùng `useDialog` (AlertDialog/Dialog của Astryx) và `useToast` (Toast của Astryx).
- **Cấm** viết CSS component riêng. File CSS duy nhất `frontend/src/index.css` chỉ khai báo thứ tự `@layer` và nạp CSS của Astryx cùng cầu nối Tailwind (xem 7.6); màu, bo góc, đổ bóng, cỡ chữ đều lấy từ token của Astryx, bố cục dùng utility Tailwind.
- Mọi lời gọi API nằm trong `frontend/src/api.js`; component không gọi `fetch`.
- Mọi lời gọi API ở giao diện phải hiển thị trạng thái đang tải và lỗi.
- Danh sách phân trang/lọc/tìm/sắp xếp **do backend làm**, không lọc cả nghìn dòng ở trình duyệt.
- Server nghe `0.0.0.0:6021` (HTTP thường). Không đổi cổng/địa chỉ.

---

## 2. Cấu trúc thư mục và cấu hình

```
dashboard_personal/
  README.md  WORKLOG.md  PLAN.md  PROJECT_SPEC.md  start.bat  .gitignore
  backend/.env  backend/.env.example   (.env chứa tài khoản admin mặc định, KHÔNG commit)
  backend/seed.js  backend/seed-data.example.json  backend/seed-data.json   (seed-data.json chứa danh sách Dev thật + mẫu checklist riêng, KHÔNG commit)
  .claude/rules/RULES.md   .claude/settings.json
  backend/
    package.json  schema.sql  db.js  server.js  auth.js  noteHtml.js  backup.js  create-user.js
    tasks.db            (tự tạo, không commit)    backups/ (không commit)
  frontend/
    package.json  vite.config.js  index.html
    src/
      main.jsx  App.jsx  index.css  astryx-themes.js (sinh bởi `astryx theme add`)  api.js  constants.js  reportStatus.js  noteHtml.js
      useDataItems.js  usePageSize.js  useReportSummary.js
      pages/        TaskList TaskNew TaskDetail EndOfDay Archive Checklist StatusManager DataManager DeletedTasks Accounts Login ForceChangePassword
      components/   ApplyTemplatePanel AuthContext AuthGate ChecklistBox ChecklistOverview ChecklistTemplateEditor
                    DataTable DialogContext IssueForm IssueRow Pagination PasswordField PicTransfer ProgressBar
                    PwireLink RequireAdmin RichNoteEditor RouterLink RowMenu SelectAllCheckbox StateMessage StatusBadge
                    StatusContext TaskForm TaskHistory TaskListView TaskPicker TaskStats Toast UserChip
```

- `.gitignore`: `tasks.db`, `tasks.db-*`, `node_modules`, `dist`, `backend/backups`, `.env`, `backend/seed-data.json`.
- `backend/.env` (đọc bằng `process.loadEnvFile()` có sẵn của Node ≥ 20.12, bọc `try/catch` nếu thiếu file; **không** thêm thư viện `dotenv`):
  ```
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD=admin@123
  ```
  `backend/.env.example` có đúng hai khóa này (commit được, để người khác biết cần khai báo gì). Biến môi trường thật của hệ điều hành, nếu có, được ưu tiên hơn file.
- `backend/package.json`: scripts `start` (`node server.js`), `backup` (`node backup.js`), `create-user` (`node create-user.js`); dependencies `better-sqlite3 ^13`, `express ^5`.
- `frontend/package.json`: scripts `dev` (`vite`), `build` (`vite build`), `preview`; dependencies `react ^19`, `react-dom ^19`, `react-router-dom ^7`, `@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`, `@stylexjs/stylex ^0.19`, `lucide-react`; devDependencies `@tailwindcss/vite ^4`, `@vitejs/plugin-react`, `tailwindcss ^4`, `vite`. Phiên bản Astryx ghim cùng nhau (hiện 0.7.17). Không cần plugin StyleX cho Vite vì dùng stylesheet dựng sẵn của Astryx.
- `frontend/vite.config.js`: plugins `[react(), tailwindcss()]`; `server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:6021' } }`.
- `frontend/index.html`: `<html lang="vi">`, title `Quản lý task`, `<body class="bg-background text-foreground">`, `<div id="root">`, script `/src/main.jsx`.
- Sau `npm run build` Express phục vụ luôn `frontend/dist` (static + mọi đường dẫn không phải `/api/` trả `index.html` để React Router xử lý).

---

## 3. Dữ liệu mặc định (hằng số)

**Trạng thái task (18, theo thứ tự; trạng thái đầu tiên là mặc định của task mới):**

| # | Tên | Màu | la_hoan_thanh | yeu_cau_hoan_tat |
| --- | --- | --- | --- | --- |
| 1 | OPEN | gray | 0 | 0 |
| 2 | TO DO | gray | 0 | 0 |
| 3 | Assign to BRSE | purple | 0 | 0 |
| 4 | IN PROGRESS | blue | 0 | 0 |
| 5 | IN DEVELOPMENT | blue | 0 | 0 |
| 6 | IN DESIG | blue | 0 | 0 |
| 7 | IN DESIGNER CHECKING | orange | 0 | 0 |
| 8 | IN DESIGNER TEST | orange | 0 | 0 |
| 9 | IN FUNC TEST | orange | 0 | 0 |
| 10 | IN GDCF REVIEW | orange | 0 | 0 |
| 11 | IN GDCF TEST | orange | 0 | 0 |
| 12 | IN CUSTOMER TEST | orange | 0 | 0 |
| 13 | IN 3rd TEST | orange | 0 | 0 |
| 14 | IN REPORTER CHECKING | orange | 0 | 0 |
| 15 | Checking TM/TE | purple | 0 | 0 |
| 16 | REOPEN *(giữ nguyên chính tả này)* | red | 0 | 0 |
| 17 | CLOSED | green | **1** | **1** |
| 18 | CANCELED | gray | **1** | 0 |

Màu cho phép: `gray, blue, orange, purple, green, red, yellow`. Nhãn trạng thái là `Badge` của Astryx (`STATUS_COLOR_OPTIONS` ánh xạ màu → `variant`): gray `neutral`, blue `blue`, orange `orange`, purple `purple`, green `green`, red `red`, yellow `yellow`. Nhãn tiếng Việt: Xám, Xanh dương, Cam, Tím, Xanh lá, Đỏ, Vàng.

**Mẫu checklist mặc định (11 mục, nạp vào `checklist_templates` khi bảng còn trống):**
1. Comment nhận task trên Pwire
2. Assign to me trên Pwire
3. Note task lên file quản lý Task: Innotek_Task Management & Monitoring
4. Điền đầy đủ thông tin ở file quản lý: Innotek_Task Management & Monitoring
5. Tạo group cho Task(HQ, team QA, người VNB). Mẫu: (VNB) CR_CO_PP000017-XXXXXX
6. Tuân thủ coding convention, naming rule, chuẩn test case
7. Up test case lên Pwire
8. Điền CTS trước khi chuyển status trên Pwire
9. Comment thông báo (dev done, CTS, object...) vào Pwire
10. Cập nhật status task vào file quản lý: Innotek_Task Management & Monitoring
11. Cập nhật tiến độ đến khi CLOSED

**Khác:** loại vấn đề `QnA`, `Process`; trạng thái vấn đề `Mở`, `Đã xử lý`; `DATA_GROUPS = [{ key: 'dev', label: 'Dev', taskColumn: 'dev_cross_check' }]`; Số Pwire tiền tố `PP000017-`; người giao mặc định điền sẵn `Ngo Hai Nhu`; giờ chốt cập nhật tiến độ `16:30`; `PAGE_SIZE = 10` (mặc định mọi bảng/danh sách ở giao diện, kể cả TaskPicker, quản lý trạng thái, quản lý data; người dùng đổi được bằng ô "Số … /trang", API vẫn mặc định `limit` 50); `PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200]`; `limit` tối đa 200.

**Nâng cấp từ bản cũ (chỉ cần nếu có DB cũ; DB mới không cần):** `Mới→OPEN`, `Đang làm→IN PROGRESS`, `Đang xử lý→IN PROGRESS`, `Chờ dev→IN DEVELOPMENT`, `Chờ QnA→Assign to BRSE`, `Done→CLOSED`.

---

## 4. Database (SQLite)

### 4.1 Schema — `backend/schema.sql`
(nguồn duy nhất; `CREATE TABLE IF NOT EXISTS`, bắt đầu bằng `PRAGMA foreign_keys = ON;`)

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,         -- id nội bộ = số sau PP000017- của ma_task (ví dụ PP000017-236702 → id 236702), tự đặt lúc tạo, đổi theo khi sửa Số Pwire
  ma_task TEXT NOT NULL,                       -- hiển thị là "Số Pwire"
  ten TEXT NOT NULL,
  ngay_nhan TEXT NOT NULL,                     -- 'YYYY-MM-DD HH:mm' (dữ liệu cũ có thể chỉ 'YYYY-MM-DD')
  deadline TEXT,                               -- như trên, có thể NULL
  nguoi_giao TEXT NOT NULL,
  tien_do INTEGER NOT NULL DEFAULT 0 CHECK (tien_do BETWEEN 0 AND 100),
  trang_thai TEXT NOT NULL,                    -- tên một dòng task_statuses (kiểm tra ở backend, KHÔNG có CHECK)
  ghi_chu TEXT NOT NULL DEFAULT '',            -- HTML đã lọc (xem 6.8) hoặc chữ thuần cũ
  link_test_case TEXT NOT NULL DEFAULT '',     -- hiển thị là "Link Pwire"
  dev_hoan_thanh_thuc_te TEXT,                 -- 'YYYY-MM-DD HH:mm' hoặc NULL
  dev_cross_check TEXT NOT NULL DEFAULT '',    -- tên Dev (nhóm Dev ở data_items) hoặc ''
  tao_luc TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  cap_nhat_luc TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  nguoi_tao_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- PIC / chủ sở hữu; NULL = chỉ admin thấy
  xoa_luc TEXT,                                -- xóa mềm: giờ xóa; NULL = task còn hoạt động
  nguoi_xoa TEXT                               -- tên đăng nhập người xóa (chụp lại lúc xóa)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  ten_muc TEXT NOT NULL,
  da_xong INTEGER NOT NULL DEFAULT 0 CHECK (da_xong IN (0,1)),
  xong_luc TEXT                                -- giờ tick; NULL nếu chưa
);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  loai TEXT NOT NULL CHECK (loai IN ('QnA','Process')),
  ngay_gio TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  ly_do TEXT NOT NULL,
  nguoi_lien_quan TEXT NOT NULL DEFAULT '',
  trang_thai TEXT NOT NULL DEFAULT 'Mở' CHECK (trang_thai IN ('Mở','Đã xử lý'))
);

CREATE TABLE IF NOT EXISTS progress_log (       -- mỗi task một dòng mỗi ngày, lưu lại trong ngày thì ghi đè
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  ngay TEXT NOT NULL,                           -- 'YYYY-MM-DD'
  tien_do INTEGER NOT NULL,
  trang_thai TEXT NOT NULL,
  ghi_chu TEXT NOT NULL DEFAULT '',             -- LUÔN chữ thuần, tối đa 2000 ký tự
  cap_nhat_luc TEXT,                            -- 'YYYY-MM-DD HH:mm:ss'; bản ghi cũ có thể NULL
  UNIQUE (task_id, ngay)
);

CREATE TABLE IF NOT EXISTS checklist_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_muc TEXT NOT NULL UNIQUE,
  thu_tu INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS task_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten TEXT NOT NULL UNIQUE COLLATE NOCASE,
  mau TEXT NOT NULL DEFAULT 'gray',
  la_hoan_thanh INTEGER NOT NULL DEFAULT 0 CHECK (la_hoan_thanh IN (0,1)),
  yeu_cau_hoan_tat INTEGER NOT NULL DEFAULT 0 CHECK (yeu_cau_hoan_tat IN (0,1)),
  thu_tu INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS data_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nhom TEXT NOT NULL,
  ten TEXT NOT NULL COLLATE NOCASE,
  thu_tu INTEGER NOT NULL,
  UNIQUE (nhom, ten)
);

CREATE TABLE IF NOT EXISTS task_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  thoi_gian TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  loai TEXT NOT NULL CHECK (loai IN ('task','tien_do','checklist','van_de')),
  truong TEXT, gia_tri_cu TEXT, gia_tri_moi TEXT,
  mo_ta TEXT NOT NULL,
  nguoi_thay_doi TEXT                           -- tên đăng nhập người thực hiện (chụp lại lúc ghi); NULL nếu không rõ
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_dang_nhap TEXT NOT NULL UNIQUE COLLATE NOCASE,
  mat_khau TEXT NOT NULL,                       -- 'scrypt$<muối hex>$<băm hex>'
  vai_tro TEXT NOT NULL DEFAULT 'user' CHECK (vai_tro IN ('admin','user')),
  bat_buoc_doi_mat_khau INTEGER NOT NULL DEFAULT 0 CHECK (bat_buoc_doi_mat_khau IN (0,1)),  -- 1 = phải đổi mật khẩu trước khi dùng
  tao_luc TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_bam TEXT NOT NULL UNIQUE,                  -- SHA-256 hex của mã phiên
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ghi_nho INTEGER NOT NULL DEFAULT 0 CHECK (ghi_nho IN (0,1)),
  tao_luc TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  het_han TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_trang_thai ON tasks(trang_thai);
CREATE INDEX IF NOT EXISTS idx_checklist_task ON checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_issues_task ON issues(task_id);
CREATE INDEX IF NOT EXISTS idx_progress_log_ngay ON progress_log(ngay);
CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id, id);
```

### 4.2 Khởi tạo trong `db.js`

1. `new Database(path.join(BACKEND_DIR, 'tasks.db'))`, `db.pragma('foreign_keys = ON')`, chạy `schema.sql`.
2. Seed: nếu `task_statuses` rỗng → nạp 18 trạng thái (mục 3). Nếu `checklist_templates` rỗng → nạp 11 mục (mục 3, `thu_tu` từ 1).
2b. **Tài khoản admin mặc định từ `.env`:** nạp `.env`, đọc `ADMIN_USERNAME` (mặc định `admin`) và `ADMIN_PASSWORD` (mặc định `admin@123`). Nếu bảng `users` **rỗng** → tạo một tài khoản `vai_tro = 'admin'`, **`bat_buoc_doi_mat_khau = 1`** với thông tin đó (mật khẩu băm scrypt như mục 6.1, qua cùng hàm băm của `auth.js`; áp dụng đúng quy tắc tên 3–50 ký tự và mật khẩu ≥ 8 ký tự, sai thì dừng server với thông báo rõ). Nếu `users` đã có dữ liệu thì **không** tạo lại và **không** ghi đè mật khẩu (đổi mật khẩu qua giao diện hoặc `create-user.js`). Không bao giờ ghi mật khẩu ra log.
2c. **Dữ liệu riêng từ `backend/seed-data.json` (không commit):** file JSON `{ "dev": ["tên", …], "checklist": ["mục", …] }` (mẫu ở `seed-data.example.json`). Lúc khởi động server gọi `seedDevIfEmpty()` (`backend/seed.js`): nếu có file và nhóm `dev` của `data_items` **còn trống** thì nạp các tên theo thứ tự trong file; nhóm đã có dữ liệu thì không đụng. Lệnh tay `npm run seed` thêm các tên Dev còn thiếu (không phân biệt hoa thường); `npm run seed -- --checklist` thay **mẫu** checklist bằng mục `checklist` của file (không đổi checklist của task đã có, giống nút Lưu mẫu). Checklist mặc định của DB mới vẫn lấy từ mục 3 khi không dùng lệnh này. File sai định dạng thì báo lỗi rõ, không ghi gì.
3. Migration an toàn cho DB cũ (nếu dựng mới hoàn toàn có thể bỏ qua, nhưng nên giữ): thêm cột nếu thiếu — `progress_log.cap_nhat_luc`, `tasks.dev_cross_check`, `tasks.dev_hoan_thanh_thuc_te`, `tasks.nguoi_tao_id`, `users.vai_tro` (DB cũ: tài khoản id nhỏ nhất thành admin), `users.bat_buoc_doi_mat_khau` (DB cũ: mặc định 0, không ép ai). Dùng `PRAGMA user_version` (2 = trạng thái động: dựng lại bảng `tasks` bỏ CHECK trạng thái cũ; 3 = dựng lại bảng `task_history` từ dữ liệu cũ). **Không bao giờ xóa `tasks.db`** để đổi cấu trúc.
4. Mọi hàm ghi nhiều bảng chạy trong `db.transaction`.

### 4.3 Quy tắc dữ liệu

- Ngày giờ lưu `YYYY-MM-DD HH:mm` (giờ local); thời điểm hệ thống ghi dùng `datetime('now','localtime')`.
- Task mới: trạng thái = trạng thái đầu tiên theo `thu_tu`; `tien_do = 0`; sao chép các mục của `checklist_templates` thành `checklist_items` (chưa tick) trong **cùng transaction**; ghi nhật ký "Tạo task".
- **Xóa task là xóa mềm:** `DELETE /api/tasks/:id` chỉ đặt `xoa_luc` (giờ hiện tại) và `nguoi_xoa` (tên đăng nhập), ghi nhật ký `Xóa task`; checklist, vấn đề, `progress_log`, `task_history` giữ nguyên. Task đã xóa **không xuất hiện** ở danh sách, checklist, CSV, mẫu checklist (áp dụng), cập nhật tiến độ, và mọi API theo id (chi tiết, sửa, lịch sử, checklist, vấn đề, `/api/eod`, chuyển PIC) trả 404 như không tồn tại. Số Pwire duy nhất toàn hệ thống **kể cả task đã xóa mềm** (muốn tạo lại phải khôi phục hoặc xóa vĩnh viễn task cũ). Trạng thái và Dev đang được task đã xóa dùng vẫn bị coi là đang dùng (không xóa được) để khôi phục không bị mồ côi. Khôi phục xem 6.9.
- `EDITABLE_TASK_COLUMNS` (whitelist cho PUT): `ma_task, ten, ngay_nhan, deadline, nguoi_giao, tien_do, trang_thai, ghi_chu, link_test_case, dev_cross_check, dev_hoan_thanh_thuc_te`. **Không** có `nguoi_tao_id`.

---

## 5. Backend — hành vi chung

- `express.json({ limit: '12mb' })`; `app.disable('x-powered-by')`.
- Lỗi luôn dạng `{ "error": "mô tả ngắn" }`: `400` dữ liệu sai/thiếu, `401` chưa đăng nhập, `403` thiếu quyền, `404` không thấy, `429` đăng nhập sai quá nhiều, `500` lỗi server (chỉ ghi `error.code ?? error.name` ra log, không lộ chi tiết, không ghi dữ liệu task vào log). JSON hỏng → 400 `JSON không hợp lệ`; body quá lớn → 400 `Dữ liệu quá lớn`. Đường dẫn `/api/...` không khớp → 404 `Không tìm thấy API`. Lỗi từ lớp database dùng cờ `error.invalid` (→ 400) và `error.notFound` (→ 404).
- `parseId`: id URL phải là số nguyên dương (an toàn), không thì 400 `id không hợp lệ`.
- Body phải là object (`getBody`).
- **Thứ tự middleware:** `app.use('/api/auth', authRouter)` → `app.use('/api', requireLogin, enforcePasswordChange, enforceRoles)` → `app.use('/api/users', usersRouter)` → các route khác.
- **Phân trang:** `page` mặc định 1 (số nguyên ≥ 1), `limit` mặc định 50, `1..200`, sai → 400 `page không hợp lệ` / `limit phải từ 1 đến 200`.

### 5.1 Kiểm tra dữ liệu task

- `ma_task` (Số Pwire): bắt buộc, chuỗi, ≤ 500; **tạo mới luôn** phải khớp `/^PP000017-\d+$/`, nếu không → 400 `Số Pwire phải bắt đầu bằng PP000017- và sau dấu - chỉ gồm chữ số, ví dụ PP000017-205779`. **Sửa** chỉ kiểm tra định dạng + trùng khi giá trị bị **đổi** (task cũ sai định dạng vẫn sửa được trường khác).
- **id nội bộ = số sau `PP000017-`** (số nguyên dương an toàn; `PP000017-0` không hợp lệ; số có số 0 đứng đầu cùng một id). Trùng Số Pwire (không phân biệt hoa thường) hoặc trùng id với **bất kỳ task nào** (mọi chủ sở hữu, kể cả đã xóa mềm) → 400 `Số Pwire đã tồn tại` (task đã xóa: `Số Pwire đã tồn tại trong mục Task đã xóa (nhờ quản trị viên khôi phục hoặc xóa vĩnh viễn)`); frontend nhận diện tiền tố `Số Pwire đã tồn tại`, hiện lỗi dưới ô. **Sửa Số Pwire** thì id đổi theo (dời `checklist_items`, `issues`, `progress_log`, `task_history` sang id mới trong cùng transaction, `PRAGMA defer_foreign_keys = ON`) và API trả task với id mới; giao diện chi tiết chuyển sang `/tasks/<id mới>`. Migration `user_version 4`: task cũ đổi id theo số Pwire; task không có số hợp lệ hoặc bị trùng số nhận id mới lớn hơn mọi id đang dùng.
- `ten` bắt buộc ≤ 500; `nguoi_giao` bắt buộc ≤ 200; `ngay_nhan` bắt buộc dạng `YYYY-MM-DD HH:mm` (nhận cả `YYYY-MM-DD` = 00:00), phải là ngày giờ có thật (loại 2026-02-31, 25:00) → 400 `ngay_nhan phải có dạng YYYY-MM-DD HH:mm`.
- `deadline`, `dev_hoan_thanh_thuc_te`: tùy chọn; `''`/`null` → lưu NULL; có giá trị thì phải hợp lệ như trên (`<field> phải có dạng YYYY-MM-DD HH:mm`).
- `tien_do`: số nguyên 0–100. `trang_thai`: phải có trong `task_statuses` (so khớp không phân biệt hoa thường), lưu **đúng tên chuẩn**.
- `link_test_case`: tùy chọn ≤ 2000; có giá trị thì phải là URL `http://` hoặc `https://` (`Link Pwire phải là địa chỉ bắt đầu bằng http:// hoặc https://`); tạo mới luôn kiểm tra, sửa chỉ kiểm tra khi link đổi; lưu bản đã `trim`.
- `dev_cross_check`: `''`/null → `''`; có giá trị thì phải có trong nhóm `dev` của `data_items` (không phân biệt hoa thường) và lưu tên chuẩn, không thì 400 `dev_cross_check không có trong danh sách Dev`.
- `ghi_chu`: chuỗi, ≤ 8.000.000 ký tự, **luôn qua `sanitizeNote`** (6.8) trước khi lưu.
- PUT chỉ nhận cột trong whitelist; không có trường nào → 400 `Không có trường nào để sửa`. Mỗi lần sửa cập nhật `cap_nhat_luc`.

### 5.2 Luật "trạng thái yêu cầu hoàn tất"

Khi chuyển task sang trạng thái có `yeu_cau_hoan_tat = 1` (mặc định `CLOSED`): tiến độ (giá trị gửi lên, hoặc hiện tại nếu không gửi) **phải = 100** và **mọi mục checklist phải đã tick**, nếu không → 400 và **không lưu gì**:
- `Chưa thể chuyển sang CLOSED: tiến độ phải là 100% (hiện tại 90%)`
- `Chưa thể chuyển sang CLOSED: còn N mục checklist chưa tick`

Áp dụng cho `PUT /api/tasks/:id` và `POST /api/eod` (ở eod thông báo có thêm tiền tố `Task <ma_task>: ` và cả lần lưu bị hoàn tác).

### 5.3 Phân quyền và chủ sở hữu (PIC)

- `requireLogin`: đọc cookie `phien_dang_nhap`, tra phiên theo SHA-256, gán `req.user = { id, ten_dang_nhap, vai_tro, ghi_nho, bat_buoc_doi_mat_khau }` (vai trò và cờ đọc từ DB mỗi request). Không có → 401 `Chưa đăng nhập hoặc phiên đã hết hạn`.
- **Ép đổi mật khẩu (`enforcePasswordChange`, chạy ngay sau `requireLogin`, trước `enforceRoles`):** nếu `req.user.bat_buoc_doi_mat_khau = 1` thì **mọi** API dưới `/api` đều trả **403** `Bạn cần đổi mật khẩu trước khi tiếp tục`, **trừ** `POST /api/auth/password` (và các API `/api/auth/*` công khai: `me`, `logout`). Chặn ở backend, không chỉ ở giao diện.
- `ADMIN_ONLY_RULES` (một bảng duy nhất trong `auth.js`, `enforceRoles` trả 403 `Bạn không có quyền thực hiện thao tác này (cần quản trị viên)`):
  - `PUT /tasks/:id/owner`
  - mọi method `/deleted-tasks…`
  - `POST|PUT|DELETE /statuses…`
  - `POST|PUT|DELETE /data-items…`
  - `PUT /checklist-templates` và `POST /checklist-templates/apply`
  - mọi method `/users…`
- **Phạm vi task:** `getOwnerScope(req)` = `undefined` nếu admin (thấy tất cả) hoặc `req.user.id` nếu user. `assertTaskAccess(req, taskId)`: task không tồn tại **hoặc** không thuộc user (admin luôn được) → **404** `Không tìm thấy task` (không lộ việc tồn tại). Áp dụng cho: danh sách, checklists, tạo (gán `nguoi_tao_id = req.user.id`), chi tiết, lịch sử, sửa, xóa, tick từng mục (tra task từ mục), tick tất cả, thêm/sửa/xóa vấn đề (tra task từ vấn đề), `/api/eod` (kiểm tra mọi `task_id` **trước** khi lưu), xuất CSV (chỉ task của mình).
- Danh sách trạng thái, danh sách Dev, mẫu checklist: đọc được bởi mọi người, dùng chung.
- **Chuyển PIC** (`transferTask`, transaction): task không tồn tại → 404; tài khoản đích không tồn tại → 400 `Tài khoản nhận task không tồn tại`; đã là PIC → 400 `Task đã thuộc tài khoản này`; cập nhật `nguoi_tao_id` + `cap_nhat_luc`; nhật ký `PIC: <cũ> → <mới>` (cũ có thể `(chưa có PIC)` / `(đã xóa)`), trường `PIC`. Trả task.

---

## 6. Backend — API đầy đủ

Định dạng ngày giờ trong JSON: `YYYY-MM-DD HH:mm` (task) hoặc `YYYY-MM-DD HH:mm:ss` (do database ghi). Xóa thành công trả `204` không nội dung.

### 6.1 Xác thực (`/api/auth/*`, công khai)

| API | Hành vi |
| --- | --- |
| `GET /api/auth/me` | Luôn 200: `{ user: { ten_dang_nhap, vai_tro, bat_buoc_doi_mat_khau: boolean } \| null, needs_setup: boolean (chưa có tài khoản nào), can_setup: boolean (needs_setup và yêu cầu đến từ 127.0.0.1/::1) }` |
| `POST /api/auth/setup` | `{ ten_dang_nhap, mat_khau, ghi_nho }`. Do admin mặc định đã được tạo từ `.env` lúc khởi động (mục 4.2 bước 2b) nên bình thường `needs_setup = false` và API này trả 403; giữ lại làm đường dự phòng. Chỉ khi chưa có tài khoản nào **và** từ loopback (không thì 403). Tạo tài khoản **admin** + đăng nhập (đặt cookie). Trả 201 + `{ user }` |
| `POST /api/auth/login` | `{ ten_dang_nhap, mat_khau, ghi_nho }`. Sai → 401 `Sai tên đăng nhập hoặc mật khẩu` (một câu duy nhất; tên không tồn tại vẫn băm một mật khẩu giả để thời gian như nhau). Giới hạn: > 5 lần sai cho mỗi cặp (địa chỉ, tên) hoặc > 30 lần cho một địa chỉ trong 15 phút → 429, khóa 15 phút (bộ đếm trong bộ nhớ). Đúng → cookie + `{ user }` |
| `POST /api/auth/logout` | Xóa phiên + cookie |
| `POST /api/auth/password` | `{ mat_khau_cu, mat_khau_moi }` (cần đăng nhập); đúng mật khẩu cũ mới đổi; **mật khẩu mới phải khác mật khẩu cũ** (400 `Mật khẩu mới phải khác mật khẩu hiện tại`); thành công thì đặt `bat_buoc_doi_mat_khau = 0`; xóa mọi phiên khác của tài khoản, giữ phiên hiện tại. Đây là API duy nhất (ngoài `me`, `logout`) dùng được khi đang bị ép đổi mật khẩu |

Quy tắc: tên đăng nhập `/^[A-Za-z0-9._-]{3,50}$/` (lỗi: `Tên đăng nhập gồm 3-50 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang`), mật khẩu 8–200 ký tự (`Mật khẩu tối thiểu 8 ký tự` / `Mật khẩu tối đa 200 ký tự`), **trừ mật khẩu tạm do admin đặt** (tạo tài khoản `POST /api/users`, đặt lại `PUT /api/users/:id`) chỉ cần tối thiểu 4 ký tự (`Mật khẩu tối thiểu 4 ký tự`) vì người dùng bị ép đổi ngay ở lần đăng nhập đầu, mật khẩu mới họ chọn vẫn phải ≥ 8 và khác mật khẩu cũ. Mật khẩu: `scrypt` (salt `randomBytes(16)`, key 64 byte) lưu `scrypt$<salt hex>$<hash hex>`, so sánh `timingSafeEqual`. Phiên: mã `randomBytes(32)` hex trong cookie `phien_dang_nhap=<mã>; Path=/; HttpOnly; SameSite=Lax` (+ `Max-Age=2592000` nếu ghi nhớ; không ghi nhớ thì cookie phiên). DB chỉ lưu SHA-256 hex. Hạn phiên ở server: ghi nhớ `+30 days`, không `+12 hours`; mỗi lần tạo phiên dọn phiên hết hạn.

### 6.2 Quản lý tài khoản (`/api/users`, chỉ admin)

- `GET` → `{ items: [{ id, ten_dang_nhap, vai_tro, tao_luc, so_phien }] }` (không có mật khẩu).
- `POST` `{ ten_dang_nhap, mat_khau, vai_tro }` (vai trò `admin|user`, mặc định `user`) → 201; trùng tên → 400. Tài khoản mới tạo có `bat_buoc_doi_mat_khau = 1` (admin biết mật khẩu ban đầu nên người dùng phải tự đổi).
- `PUT /:id` `{ vai_tro?, mat_khau? }`: hạ quyền admin cuối cùng → 400; đặt lại mật khẩu → tài khoản bị đăng xuất mọi nơi và `bat_buoc_doi_mat_khau = 1`. `GET` trả thêm `bat_buoc_doi_mat_khau`.
- `DELETE /:id` → 204; tự xóa mình hoặc xóa admin cuối cùng → 400 (`Không thể tự xóa tài khoản đang đăng nhập`). Luôn còn ≥ 1 admin. Task của tài khoản bị xóa thành `nguoi_tao_id = NULL`.

### 6.3 Task

**`GET /api/tasks`** — query: `trang_thai`, `q`, `page`, `limit`, `archived` (`0|1`, sai → 400), `chua_cap_nhat` (`0|1`), `sort`, `dir`. Trả `{ items, total }`.
- Mặc định chỉ task **chưa hoàn thành** (`trang_thai NOT IN (tên các trạng thái la_hoan_thanh=1)`); `archived=1` chỉ task hoàn thành.
- `q`: `LIKE %q%` (thoát `\ % _`, `ESCAPE '\'`, không phân biệt hoa thường) trên `ma_task, ten, link_test_case, nguoi_giao, dev_cross_check, ghi_chu` và tên đăng nhập của PIC.
- `chua_cap_nhat=1`: chỉ task chưa có dòng `progress_log` của `date('now','localtime')`.
- User thường chỉ thấy task `nguoi_tao_id = mình`.
- Mỗi item = `tasks.*` + `checklist_da_xong`, `checklist_tong`, `ngay_cap_nhat_cuoi` (`MAX(progress_log.ngay)`), `gio_cap_nhat_cuoi` (`cap_nhat_luc` của dòng ngày lớn nhất), `chu_so_huu` (tên đăng nhập PIC hoặc null), `ghi_chu_rich` (boolean). Nếu ghi chú là HTML thì `ghi_chu` trong **danh sách** được thay bằng bản chữ thuần cắt 500 ký tự (không trả HTML/ảnh nặng).
- **Sắp xếp** (`sort` + `dir=asc|desc`, `sort` sai → 400 `sort không hợp lệ`, `dir` sai → 400 `dir phải là asc hoặc desc`): bao truy vấn con rồi `ORDER BY (expr1) IS NULL, expr1 dir, expr2 dir…, id DESC` (giá trị trống luôn ở cuối; cùng giá trị thì task mới hơn trước). Khóa → biểu thức:
  - `chu_so_huu` → `chu_so_huu COLLATE NOCASE`
  - `ma_task` → `CAST(substr(ma_task,10) AS INTEGER)`, `ma_task COLLATE NOCASE`
  - `ten` → `ten COLLATE NOCASE`
  - `link_test_case` → `NULLIF(link_test_case,'')`
  - `nguoi_giao` → `nguoi_giao COLLATE NOCASE`
  - `deadline`; `tien_do`
  - `trang_thai` → `(SELECT thu_tu FROM task_statuses s WHERE s.ten = trang_thai)`
  - `checklist` → `(checklist_da_xong*1.0/NULLIF(checklist_tong,0))`
  - `cap_nhat` → `gio_cap_nhat_cuoi`
  - Không có `sort` → `ORDER BY id DESC`.

**`GET /api/checklists`** — cùng query/phân trang/phạm vi như `GET /api/tasks`; mỗi task thêm `checklist_items` (lấy một câu truy vấn cho cả trang).

**`POST /api/tasks`** — bắt buộc `ma_task, ten, ngay_nhan, nguoi_giao` (5.1); trả **201** task + counts.

**`GET /api/tasks/:id`** — task + counts + `checklist_items` (ORDER BY id), `issues` (ORDER BY id DESC), `progress_log` (ORDER BY ngay DESC), `chu_so_huu`, `ghi_chu` đầy đủ (HTML).

**`PUT /api/tasks/:id`** — 5.1 + 5.2. Trong **một transaction**: cập nhật; ghi nhật ký từng trường **thực sự đổi** (so `null` và `''` là như nhau); nếu `tien_do` đổi thì **upsert `progress_log` hôm nay** (`tien_do, trang_thai, ghi_chu` chữ thuần, `cap_nhat_luc = now`) để nhãn "Cập nhật" đổi theo. Chỉ đổi ghi chú/trạng thái mà không đổi tiến độ thì **không** ghi progress_log.

**`PUT /api/tasks/:id/owner`** — chuyển PIC (5.3).

**`DELETE /api/tasks/:id`** — 204 (user chỉ xóa task của mình; admin mọi task).

**`GET /api/tasks/:id/history`** — `{ items, total }`, phân trang (mặc định limit 50), mới nhất trước (`ORDER BY id DESC`). Item: `{ id, thoi_gian, loai, truong, gia_tri_cu, gia_tri_moi, mo_ta, nguoi_thay_doi }`.

### 6.4 Checklist, vấn đề, mẫu

- `PUT /api/checklist/:id` `{ da_xong: true|false|0|1 }` (sai → 400 `da_xong phải là true hoặc false`): tick ghi `xong_luc = now`, bỏ tick `NULL`; nhật ký `Tick checklist: <ten_muc>` / `Bỏ tick checklist: <ten_muc>` (chỉ khi đổi).
- `PUT /api/tasks/:id/checklist` `{ da_xong }`: tick/bỏ tick **tất cả** bằng một lệnh, mục đã ở trạng thái đích giữ nguyên `xong_luc`; nhật ký `Tick tất cả checklist (N mục)` / `Bỏ tick tất cả checklist (N mục)` (chỉ khi N>0); trả `{ items }`.
- `POST /api/tasks/:id/issues` `{ loai, ly_do, nguoi_lien_quan? }`: `loai ∈ QnA|Process` (`loai phải là QnA hoặc Process`), `ly_do` bắt buộc ≤ 5000, `nguoi_lien_quan` ≤ 500; server ghi `ngay_gio`; trả 201; nhật ký `Thêm vấn đề <loai>: <lý do rút gọn 80>`.
- `PUT /api/issues/:id`: một phần các trường `loai, ly_do (không rỗng), nguoi_lien_quan, trang_thai (Mở|Đã xử lý)`; `ngay_gio` không đổi; nhật ký từng trường đổi: `Vấn đề <loai> "<lý do rút gọn 40>" - <Loại|Lý do|Người liên quan|Trạng thái>: <cũ> → <mới>` (trường `Vấn đề: <nhãn>`).
- `DELETE /api/issues/:id` → 204; nhật ký `Xóa vấn đề <loai>: <lý do>`.
- `GET /api/checklist-templates` → `{ items: [{ id, ten_muc, thu_tu }] }`.
- `PUT /api/checklist-templates` (admin) `{ items: [{ ten_muc }] }` (theo thứ tự; 1–50 mục, mỗi tên không rỗng, ≤ 500, không trùng nhau; thay toàn bộ mẫu; **không đổi task đã có**); trả `{ items }`.
- `POST /api/checklist-templates/apply` (admin) `{ all: true }` hoặc `{ task_ids: [...] }` (≤ 5000, số nguyên dương, loại trùng; thiếu → 400 `Hãy chọn tất cả hoặc ít nhất một task`): **GHI ĐÈ** checklist của task **chưa hoàn thành** (task hoàn thành bị bỏ qua kể cả khi chọn đích danh): với mỗi task, nếu danh sách tên mục đã đúng y như mẫu (cùng thứ tự) thì bỏ qua; ngược lại xóa hết mục cũ rồi chèn theo thứ tự mẫu, mục trùng tên giữ `da_xong`/`xong_luc`. Nhật ký `Ghi đè checklist theo mẫu (thêm a, xóa b mục)`. `task_ids` có id không tồn tại → 404 (và không đổi gì). Trả `{ tasks, tasks_thay_doi, muc_them, muc_xoa, tasks_bo_qua }`.

### 6.5 Trạng thái và dữ liệu danh mục

- `GET /api/statuses` → `{ items: [{ id, ten, mau, la_hoan_thanh, yeu_cau_hoan_tat, thu_tu, so_task }] }` (theo `thu_tu, id`; `so_task` = số task đang dùng).
- `POST /api/statuses` (admin) `{ ten, mau?, la_hoan_thanh?, yeu_cau_hoan_tat? }` → 201; `ten` bắt buộc ≤ 100, `mau` thuộc 7 màu, hai cờ phải boolean; trùng tên (không phân biệt hoa thường) → 400 `Trạng thái đã tồn tại`; thêm vào cuối.
- `PUT /api/statuses/:id` (admin): một phần; **đổi `ten`** thì mọi `tasks.trang_thai`, `progress_log.trang_thai` đang dùng tên cũ được đổi theo trong một transaction (và ghi nhật ký cho task bị ảnh hưởng).
- `PUT /api/statuses/:id/move` `{ huong: -1|1 }` → `{ items }`.
- `DELETE /api/statuses/:id` → 204; **400** nếu còn task đang dùng (thông báo nêu số task) hoặc là trạng thái cuối cùng.
- `GET /api/data-groups` → `{ groups: [{ key, label, items: [{ id, nhom, ten, thu_tu }] }] }`.
- `POST /api/data-items` (admin) `{ nhom, ten }` → 201 (nhóm phải có trong `DATA_GROUPS`, tên bắt buộc, không trùng trong nhóm không phân biệt hoa thường).
- `POST /api/data-items/bulk` (admin) `{ nhom, ten_list: [...] }` (1–500) → 201 `{ added, skipped }` (tên đã có bị bỏ qua).
- `PUT /api/data-items/:id` `{ ten }`; nếu nhóm có `taskColumn` thì task đang dùng tên cũ được đổi theo (nhật ký). `PUT /api/data-items/:id/move` `{ huong }` → `{ groups }`. `DELETE /api/data-items/:id` → 204, **400** nếu có task đang dùng mục đó.

### 6.6 Cập nhật tiến độ (`POST /api/eod`) và xuất CSV

- **`POST /api/eod`** `{ items: [{ task_id, tien_do, trang_thai, ghi_chu? }] }` (mảng không rỗng; `task_id` nguyên dương, không lặp; `tien_do` 0–100; `trang_thai` hợp lệ). **`ghi_chu` không gửi (undefined) ⇒ giữ nguyên ghi chú hiện tại** (quan trọng: ghi chú HTML/ảnh không đi qua đây); có gửi thì `sanitizeNote` + ≤ 8M. Mọi task phải thuộc quyền người gọi (assertTaskAccess, kiểm tra trước khi lưu). Trong **một transaction** (lỗi nào cũng hoàn tác hết): kiểm tra luật 5.2, cập nhật task (`cap_nhat_luc`), **upsert `progress_log` hôm nay** (`UNIQUE(task_id, ngay)`), ghi nhật ký từng trường đổi trong `tien_do, trang_thai, ghi_chu` (nhóm `tien_do`); nếu không trường nào đổi ghi một dòng `Xác nhận không đổi (tiến độ X%, trạng thái Y)`. Trả `{ saved: N }`.
- **`GET /api/export`**: CSV UTF-8 có **BOM**, CRLF, mọi ô bọc `"…"` (nháy kép nhân đôi), ô bắt đầu bằng `= + - @ \t \r` thêm `'` phía trước (chống công thức Excel). Cột theo thứ tự: `ma_task, ten, ngay_nhan, deadline, dev_hoan_thanh_thuc_te, nguoi_giao, dev_cross_check, tien_do, trang_thai, ghi_chu` (chữ thuần), `link_test_case, checklist_da_xong, checklist_tong, tao_luc, cap_nhat_luc`. Header `Content-Disposition: attachment; filename="tasks_<YYYY-MM-DD>.csv"`. User thường chỉ xuất task của mình.

### 6.9 Task đã xóa (chỉ admin; `/api/deleted-tasks…` nằm trong `ADMIN_ONLY_RULES`, user thường 403)

- `GET /api/deleted-tasks` — query `q`, `page`, `limit`, `sort`, `dir` (khóa sort như `GET /api/tasks`, thêm `xoa_luc`, `nguoi_xoa`; mặc định `xoa_luc` giảm dần). Trả `{ items, total }` như danh sách task, kèm `xoa_luc`, `nguoi_xoa`.
- `POST /api/deleted-tasks/:id/restore` — đặt `xoa_luc`/`nguoi_xoa` về NULL, cập nhật `cap_nhat_luc`, ghi nhật ký `Khôi phục task`, trả task. Task không tồn tại hoặc chưa xóa → 404 `Không tìm thấy task đã xóa`.
- `DELETE /api/deleted-tasks/:id` — **xóa vĩnh viễn** (`DELETE FROM tasks`, checklist/vấn đề/tiến độ/nhật ký xóa theo `ON DELETE CASCADE`), 204; chỉ áp dụng cho task đã xóa mềm, task còn hoạt động hoặc không tồn tại → 404 `Không tìm thấy task đã xóa` (muốn xóa vĩnh viễn phải xóa mềm trước).

### 6.7 Nhật ký thay đổi (`task_history`)

Ghi **trong cùng transaction** với thay đổi; chỉ ghi khi giá trị thực sự đổi. Mỗi dòng ghi thêm **người thay đổi** = tên đăng nhập của người gọi API (middleware đặt `AsyncLocalStorage` sau `enforceRoles`, `addHistory` và các câu `INSERT … SELECT` đổi tên trạng thái/Dev đọc từ đó); lệnh chạy tay (seed, backup) thì `NULL`. Là bản chụp lúc ghi, đổi hay xóa tài khoản sau đó không đổi dòng cũ. `ALTER TABLE` thêm cột cho DB cũ (dòng cũ `NULL`, giao diện hiện `—`). `loai`: `task` (thông tin), `tien_do`, `checklist`, `van_de`.
- Tạo task: `Tạo task` (task).
- Đổi trường: `<Nhãn>: <cũ> → <mới>` với nhãn: `ma_task→Số Pwire`, `ten→Tên task`, `ngay_nhan→Ngày giờ nhận`, `deadline→Deadline`, `dev_hoan_thanh_thuc_te→Thực tế dev hoàn thành`, `nguoi_giao→Người giao`, `link_test_case→Link Pwire`, `dev_cross_check→Dev Cross check` (loại `task`); `tien_do→Tiến độ`, `trang_thai→Trạng thái`, `ghi_chu→Ghi chú` (loại `tien_do`). Giá trị rỗng hiển thị `(trống)`; tiến độ thêm `%`; ghi chú dùng bản chữ thuần; mọi giá trị cắt 500 ký tự (+`…`). Lưu `truong` = nhãn, `gia_tri_cu`, `gia_tri_moi`.
- Các câu khác: xem 5.3 (PIC), 6.3–6.6.

### 6.8 Ghi chú HTML — `backend/noteHtml.js`

- `isRichNote(s)`: có ít nhất một thẻ (`/<\/?[a-zA-Z][^>]*>/`). Ghi chú không có thẻ là chữ thuần và được giữ nguyên.
- `sanitizeNote(s)`: nếu không rich trả nguyên; ngược lại **dựng lại** HTML từ danh sách cho phép:
  - Trước: xóa chú thích `<!-- -->` và cả khối `script|style|iframe|object|embed|noscript|template|textarea|title|svg|math` (bỏ luôn nội dung).
  - Thẻ cho phép: `p br div span b strong i em u s strike ul ol li a img h1 h2 h3 blockquote pre code hr table thead tbody tr th td`. Thẻ khác: bỏ thẻ, giữ chữ. Thẻ void: `br img hr`. Đóng đủ thẻ mở, bỏ thẻ đóng thừa.
  - Thuộc tính cho phép: `a[href]`, `img[src,alt]`, `td/th[colspan,rowspan (1-2 chữ số)]`. Mọi thuộc tính khác (style, class, on*) bị bỏ.
  - `href` chỉ `http://`, `https://`, `mailto:` (`/^(https?:\/\/|mailto:)[^\s]*$/i`); `src` chỉ data URI `^data:image/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$`; `img` không có `src` hợp lệ thì bỏ hẳn. Giá trị thuộc tính có thực thể lạ (khác `&amp; &quot; &lt; &gt; &#39;`) bị bỏ để không giấu `javascript:`. `a` luôn thêm `target="_blank" rel="noopener noreferrer"`.
  - Chữ ngoài thẻ: thoát `<`, `>`, và `&` không thuộc thực thể.
- `noteToPlainText(s)`: không rich → trả nguyên; rich → `<img>` thành ` [ảnh] `, `</p|div|li|tr|h1-3|blockquote|pre>`, `<br>`, `<hr>` thành xuống dòng, `</td|th>` thành ` | `, bỏ thẻ, giải mã `&nbsp; &lt; &gt; &quot; &#39; &amp;`, gom dòng trống (≥3 `\n` → 2), `trim`. Dùng cho: nhật ký, `progress_log`, CSV, danh sách task.

---

## 7. Frontend

### 7.1 Khởi động và providers (`main.jsx`)

`StrictMode > BrowserRouter > Theme (Astryx, mode light) > InternationalizationProvider (locale vi-VN, bản dịch `@astryxdesign/core/locales/vi-VN.generated.js`) > LinkProvider (RouterLink: đường dẫn nội bộ qua react-router, http/mailto/tel dùng thẻ `<a>`) > ToastProvider (LayerProvider của Astryx) > DialogProvider > AuthProvider > AuthGate > StatusProvider > App`. `index.css` phải là file CSS được import đầu tiên.

`AuthGate`: gọi `GET /api/auth/me`; chưa đăng nhập → hiện `Login`; đã đăng nhập mà `user.bat_buoc_doi_mat_khau = true` → hiện **màn hình `ForceChangePassword` thay cho toàn bộ ứng dụng** (không có sidebar/menu), gồm tiêu đề "Bạn cần đổi mật khẩu", dòng giải thích "Tài khoản này đang dùng mật khẩu mặc định/do quản trị viên đặt. Hãy đặt mật khẩu mới để tiếp tục.", ô mật khẩu hiện tại, mật khẩu mới, nhập lại (kiểm tra khớp, ≥ 8 ký tự, khác mật khẩu hiện tại; lỗi đỏ dưới ô), nút "Đổi mật khẩu" và nút phụ "Đăng xuất"; đổi xong → tải lại `me` rồi vào ứng dụng bình thường. Khi mọi API khác trả 403 `Bạn cần đổi mật khẩu…` cũng quay về màn hình này; lỗi mạng → khung lỗi đỏ; đang tải → chữ "Đang tải..."; khi API trả 401 (sự kiện `auth-expired` do `api.js` bắn) quay về đăng nhập.

`Login`: form tên + mật khẩu + ô **Ghi nhớ đăng nhập**; nếu `can_setup` thì đổi thành "Tạo tài khoản đầu tiên" (thêm ô nhập lại mật khẩu, kiểm tra khớp); nếu `needs_setup` nhưng không phải máy chủ thì chỉ báo phải tạo tài khoản trên máy chủ. Thẻ form `noValidate`, lỗi đỏ dưới ô.

### 7.2 `api.js`

`request(method, url, body)`: JSON; lỗi mạng → `Error('Không kết nối được server')`; 204 → `null`; 401 (không phải `/api/auth/`) → `window.dispatchEvent(new Event('auth-expired'))`; `!response.ok` → `Error(data?.error || 'Có lỗi xảy ra')`. `buildQuery({status,q,page,limit,archived,notUpdated,sort,dir})` → `trang_thai, q, page, limit, archived=1, chua_cap_nhat=1, sort, dir(asc|desc)`. Export một hàm cho mỗi API ở mục 6, và `EXPORT_URL = '/api/export'` (dùng thẻ `<a>`).

### 7.3 Hằng số và tiện ích (`constants.js`, `reportStatus.js`, hooks)

- `constants.js`: `ISSUE_TYPES`, `ISSUE_STATUSES`, `DEFAULT_ASSIGNER`, `TASK_CODE_PREFIX`, `PWIRE_NUMBER_PATTERN`/`_MESSAGE`, `LINK_MESSAGE`, `isHttpUrl`, `sanitizePwireNumber(next, previous)` (giữ tiền tố, **không xóa được**, bỏ ký tự không phải chữ số phía sau, chuẩn hóa chữ hoa khi dán chữ thường; giá trị cũ không có tiền tố thì cho gõ tự do), `REPORT_CUTOFF_TIME='16:30'`, `PAGE_SIZE`, `PAGE_SIZE_OPTIONS`, `STATUS_COLOR_OPTIONS`, `getNow()` (`new Date().toLocaleString('sv-SE').slice(0,16)`), `toInputDateTime` (`'YYYY-MM-DD HH:mm'`/ngày thuần → `'YYYY-MM-DDTHH:mm'`), `fromInputDateTime`, `TABLE_BORDER_CLASS = 'border-collapse [&_tbody_tr]:border-t [&_tbody_tr]:border-border-strong [&_th]:font-medium [&_th]:text-muted'` (gắn vào mọi `<table>`).
- `usePageSize()` → `[limit, changeLimit]`, nhớ trong `localStorage['pageSize']` (try/catch, chỉ nhận giá trị trong `PAGE_SIZE_OPTIONS`).
- `useDataItems(group)` → `{ items }` của một nhóm từ `/api/data-groups`.
- `StatusContext`: `{ statuses, activeStatuses (chưa hoàn thành), getStatus(name), reload, loading, error }`.
- `useReportSummary(reloadKey)`: tải tối đa 200 task `notUpdated` → `{ total, missed, now, afterCutoff, reload }` (đồng hồ cập nhật mỗi phút).
- **`getReportStatus(task, now)`** (`reportStatus.js`) → `{ level, label, updatedToday, updatedAt? }`:
  - `ngay_cap_nhat_cuoi === hôm nay`: nếu không có `gio_cap_nhat_cuoi` → `unknown_time` (xám, "Đã cập nhật <ngày> (chưa có giờ)"); ngược lại `early` nếu giờ lưu `< 16:30` (**vàng**), `after` nếu `≥ 16:30` (**xanh**); `updatedAt` = 16 ký tự đầu của `gio_cap_nhat_cuoi`, label `Đã cập nhật lúc <updatedAt>`.
  - Chưa cập nhật hôm nay: nếu task tạo trước hôm nay mà (chưa từng cập nhật hoặc lần cuối trước hôm qua) → `missed` (đỏ; "Quá hạn cập nhật, lần cuối dd/mm (n ngày trước)" hoặc "Quá hạn cập nhật, chưa từng cập nhật"); else giờ ≥ 16:30 → `late` (đỏ, "Chưa cập nhật"); else `pending` (đỏ, "Chưa cập nhật (chốt lúc 16:30)").
  - Lớp nhãn: `early bg-yellow-300 text-yellow-900`; `after bg-green-300 text-green-900`; `unknown_time bg-gray-200 text-gray-700`; `pending/late/missed bg-red-300 text-red-900`. **Chỉ nhãn có màu, không tô nền dòng/ô.**
- `noteHtml.js` (frontend): `isRichNote`, `noteToHtml` (chữ thuần → thoát + `\n`→`<br>`), `sanitizeFragment(html)` (DOMParser, cùng allowlist), `imageFileToDataUrl(file)` (cạnh dài ≤ 1600px, vẽ canvas nền trắng, JPEG chất lượng 0.85 → 0.6, thu nhỏ ×0.7 tối đa 5 lần cho tới ≤ 1.500.000 ký tự; GIF nhỏ giữ nguyên; lỗi "Chỉ chấp nhận file ảnh" / "Ảnh quá lớn, hãy dùng ảnh nhỏ hơn").

### 7.4 Component dùng chung

> **Cập nhật Astryx (ghi đè các mô tả hình thức bên dưới; hành vi nghiệp vụ giữ nguyên):** mọi ô nhập, nút, bảng, hộp thoại, thông báo, menu, tab, huy hiệu, thanh tiến độ, phân trang dùng component của Astryx. Ánh xạ: `Toast` → `useToast` của Astryx (info/error, tự ẩn 3500/6000 ms); `Dialog` → `AlertDialog` (confirm, `danger` → nút `destructive`) và `Dialog`+`TextInput` (prompt, không đóng khi bấm nền); `StatusBadge` → `Badge`; `ProgressBar` → `ProgressBar` (đỏ <30, cảnh báo 30-59, accent 60-99, xanh 100); `Pagination` → `Pagination` (variant pages, chọn số dòng); `RowMenu` → `MoreMenu`; `DateTimeInput` tự viết → `DateTimeInput` của Astryx (**hai ô ngày và giờ riêng, giờ 24, tuần bắt đầu thứ Hai, popover**; giá trị `YYYY-MM-DDTHH:mm`); `FieldError` bỏ, lỗi đi qua prop `status` của ô nhập; ô bắt buộc dùng `isRequired` (Astryx hiện chữ "Bắt buộc"); `PasswordInput` → `PasswordField` (TextInput + nút con mắt ẩn/hiện); `Select` gốc → `Selector`; bảng → `Table` bọc `DataTable` (khung cuộn ngang, `minWidth`), sắp xếp phía backend qua `useTableSortable` (Table không có onRowClick: mở task bằng liên kết ở cột Số Pwire). Icon từ `lucide-react` qua `Icon` của Astryx. **Trình soạn ghi chú `RichNoteEditor` vẫn tự viết** (contentEditable, HTML đã lọc, dán/kéo thả ảnh thu nhỏ ≤ 1600px) vì `@astryxdesign/richtext` dựa trên Lexical và không giữ được định dạng HTML đã lọc của backend; chỉ thanh công cụ dùng `Button` của Astryx. Menu admin/menu người dùng, các trang và luồng thao tác không đổi.

- **Toast** (`useToast()`: `success|error|info(message)`): góc phải trên, `fixed right-4 top-4 z-50 w-80`, tự ẩn 3500 ms (lỗi 6000 ms), có nút đóng; màu success xanh lá, error đỏ, info xanh dương (biểu tượng `✓ ! i`).
- **Dialog** (`useDialog()`): `confirm({title,message,confirmLabel,cancelLabel,danger}) → Promise<boolean>`, `prompt({title,message,inputLabel,inputType,placeholder,initialValue,validate,confirmLabel}) → Promise<string|null>`. Modal `fixed inset-0` nền tối, `max-w-md`; Enter = xác nhận, Esc / bấm nền = hủy; `danger` → nút xác nhận đỏ và **mặc định focus nút Hủy**; `prompt` báo lỗi `validate` đỏ ngay trong hộp và chỉ đóng khi hợp lệ; `role="dialog" aria-modal`.
- **StatusBadge**: `inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium` + lớp màu của trạng thái (không tìm thấy → xám).
- **ProgressBar**: thanh `h-2 w-20 rounded-full bg-gray-200` + phần màu theo mức (`<30` đỏ `bg-red-500`; `30-59` cam `bg-orange-500`; `60-99` xanh dương `bg-blue-500`; `100` xanh lá `bg-green-500`) + `<span class="w-9 text-xs text-gray-600">N%</span>`.
- **Pagination**: `"{total} {unit} · trang {page}/{totalPages}"`, ô `Số {unit}/trang` (nếu có `onChangeLimit`), nút ‹ (trang trước), dãy số trang `1 2 3 … N` (trang hiện tại nền đen, `aria-current="page"`), nút › (khóa ở hai đầu, icon-only có `aria-label`).
- **FieldError** (chữ đỏ nhỏ dưới ô), **StateMessage** (`Loading` "Đang tải...", `ErrorBox` đỏ có nút "Thử lại"), **PwireLink** (liên kết `target="_blank" rel="noopener noreferrer"`, chỉ khi URL http/https hợp lệ, không thì chữ thường), **MenuIcon** (SVG nội tuyến outline 24×24, `currentColor`; khóa `list plus chart check tag database archive users download`).
- **DateTimeInput**: **một ô** `YYYY-MM-DD HH:mm` 24 giờ. Gõ trực tiếp (đủ và hợp lệ mới báo; rời ô mà dở dang thì trả về giá trị cũ); bấm vào ô / biểu tượng lịch mở bảng: lịch tháng (tuần bắt đầu **thứ Hai**, `T2…CN`, hôm nay có viền, ngày chọn tô xanh, nút `‹ ›`), ô chọn giờ 00-23, phút 00-59, nút **Bây giờ**, **Xóa** (chỉ khi `clearable` và có giá trị), **Xong**; đóng khi bấm ngoài hoặc Esc. Giá trị vào/ra dạng `YYYY-MM-DDTHH:mm` hoặc `''`.
- **RichNoteEditor**: `contentEditable` + thanh công cụ (`B`, `I`, `U`, `Dấu chấm`, `Đánh số`, `Xóa kiểu`, `Link` (hỏi URL bằng `dialog.prompt`, nhớ/khôi phục vùng chọn), `Ảnh` (chọn file nhiều ảnh)). Dán: ảnh đơn thuần (không có text/html / text/plain) → thu nhỏ + `insertImage`; có `text/html` → `insertHTML(sanitizeFragment(...))`; còn lại dán chữ thường. Kéo thả ảnh chèn tại vị trí thả. `onChange(html)`; rỗng (không chữ, ảnh, bảng, hr) → `''`. Vùng soạn `min-h-28 max-h-96 resize-y overflow-auto`, có style cho `a ul ol li table td th img blockquote h1-3 pre` bằng biến thể `[&_x]:` của Tailwind (vì preflight reset). Giá trị chữ thuần cũ được nạp qua `noteToHtml`.
- **ChecklistBox** (checkbox + tên mục, gạch ngang khi xong, hiện "xong lúc …"), **SelectAllCheckbox** (checkbox 3 trạng thái tick/không tick/lưng chừng; bỏ tick tất cả hỏi `dialog.confirm`), **IssueForm / IssueRow** (thêm; hiển thị dòng; sửa tại chỗ loại/lý do/người liên quan; nút đổi trạng thái `Mở↔Đã xử lý`; xóa có xác nhận), **TaskHistory** (bảng `Thời gian | Người thay đổi | Nhóm | Nội dung thay đổi` (người thay đổi là `UserChip`, `—` nếu không rõ), nhóm là nhãn màu: Thông tin / Tiến độ xanh dương / Checklist xanh lá / Vấn đề; phân trang với `Số thay đổi/trang`), **TaskPicker** (tìm + phân trang cố định `PAGE_SIZE` (10), chọn nhiều task cho "Áp dụng mẫu"), **ApplyTemplatePanel** (xem 7.5 Checklist), **ChecklistTemplateEditor**, **ChecklistOverview**, **PicTransfer** (admin: "PIC: **tên**" + ô chọn "Chuyển cho..." (loại PIC hiện tại) + nút Chuyển + `dialog.confirm` → `PUT owner` → tải lại + toast).
- **TaskForm** (`initialValues`, `showProgress`, `submitLabel`, `onSubmit(payload)`, `gridClass` mặc định `grid-cols-1 sm:grid-cols-2`): các ô theo thứ tự — Số Pwire*, Tên task*, Ngày giờ nhận* (DateTimeInput), Deadline (ngày giờ) (clearable), Thực tế dev hoàn thành (ngày giờ) (clearable), Người giao*, Dev Cross check (select: `— Chưa chọn —` + danh sách Dev; giữ giá trị hiện tại nếu đã bị xóa khỏi danh sách), Link Pwire (placeholder `https://...`, có link hợp lệ thì hiện dưới ô `↗ Mở link Pwire`), nếu `showProgress`: Tiến độ (%) (number) + Trạng thái (select các trạng thái); rồi **Ghi chú** (RichNoteEditor); nút submit (`Đang lưu...` khi lưu). Kiểm tra phía client trước khi gửi (không lưu khi còn lỗi, lỗi đỏ ngay dưới ô): Số Pwire không rỗng/không chỉ tiền tố/đúng mẫu (trừ khi bằng giá trị gốc), Link đúng http(s) (trừ khi bằng giá trị gốc), tên, người giao, ngày giờ nhận (`Vui lòng chọn ngày giờ nhận`), tiến độ nguyên 0-100, và nếu trạng thái `yeu_cau_hoan_tat` thì tiến độ phải là 100% (`Chuyển sang <X> thì tiến độ phải là 100%`). Lỗi server bắt đầu bằng `Số Pwire đã tồn tại` / `Số Pwire phải bắt đầu` / `Link Pwire phải là` được gắn vào đúng ô; lỗi khác hiện khung đỏ cuối form. Payload gửi: `ma_task, ten, ngay_nhan, deadline|null, dev_hoan_thanh_thuc_te|null, nguoi_giao, ghi_chu, link_test_case, dev_cross_check` (+ `tien_do` số, `trang_thai` nếu `showProgress`); ngày giờ đổi `'T'→khoảng trắng`.

### 7.5 Khung ứng dụng (`App.jsx`) và các trang

> **Cập nhật Astryx:** khung là `AppShell` + `SideNav`/`SideNavItem` (header "Quản lý task", mục menu như bảng dưới, chấm đỏ số task chưa cập nhật là `Badge` error, chân menu: Xuất CSV, người dùng + badge admin, nút Đăng xuất). Màn dưới breakpoint của Astryx tự đổi sang ngăn kéo (không còn tự viết ngưỡng 1024px). Các mô tả màu/lớp Tailwind cũ trong mục này (như `bg-blue-600`) không còn áp dụng; hình thức theo mục 7.6.

**Khung:** `flex min-h-screen`. **Sidebar** `w-56` (`border-r bg-white`): tiêu đề "Quản lý task"; menu (NavLink, `gap-3`, icon + chữ, mục đang chọn `bg-blue-600 text-white`, còn lại `text-gray-700 hover:bg-gray-100`):

| Route | Nhãn | Icon | Ghi chú |
| --- | --- | --- | --- |
| `/` | Đang xử lý | list | `end` |
| `/tasks/new` | Thêm task | plus | |
| `/cuoi-chieu` | Cập nhật tiến độ | chart | chấm số đỏ (`rounded-full bg-red-600`) = số task chưa cập nhật hôm nay (đếm tất cả, kể cả trước 16:30) |
| `/checklist` | Checklist | check | |
| `/trang-thai` | Quản lý trạng thái | tag | **chỉ admin** |
| `/quan-ly-data` | Quản lý data | database | **chỉ admin** |
| `/archive` | Đã hoàn thành | archive | |
| `/da-xoa` | Task đã xóa | trash | **chỉ admin** |
| `/tai-khoan` | Tài khoản | users | |

Cuối sidebar: nút "Xuất CSV" (icon download, thẻ `<a href=EXPORT_URL>`), tên tài khoản + "admin" nếu là admin, nút "Đăng xuất". Thanh trên có nút `☰` ẩn/hiện sidebar. **Responsive:** dưới 1024px (`matchMedia('(max-width: 1023px)')`) sidebar mặc định ẩn, khi mở thì `fixed inset-y-0 z-30 shadow-xl` có nền mờ `bg-black/30` (bấm nền hoặc chọn mục thì đóng); qua ngưỡng thì tự ẩn/hiện. Vùng nội dung `main` `px-6 py-6`, **full chiều ngang cho mọi trang** (không `max-w`). Route lạ → "Không tìm thấy trang."; trang admin bọc `RequireAdmin` (user thường thấy thông báo không có quyền).

**Danh sách `/` và Đã hoàn thành `/archive`** (`TaskListView`, `archived` false/true): tiêu đề "Danh sách task đang xử lý" / "Đã hoàn thành"; thanh công cụ `flex-wrap`: ô tìm (placeholder `Tìm theo số Pwire, tên, link, người giao, Dev, ghi chú, PIC`, `w-80`), (chỉ danh sách đang xử lý) select `Tất cả trạng thái` + trạng thái chưa hoàn thành, checkbox `Chưa cập nhật hôm nay`, nút xanh `Thêm task`. Thanh nhắc đỏ (`bg-red-100 border-red-300`) khi `report.total > 0`: "Có N task chưa cập nhật tiến độ hôm nay" (hoặc "Còn N task chưa cập nhật tiến độ (chốt lúc 16:30)" trước giờ chốt) + ", trong đó M task đã bỏ sót từ các ngày trước" + nút **Cập nhật ngay** → `/cuoi-chieu`. Bảng (`overflow-x-auto`, `whitespace-nowrap`, viền ô, padding `px-3 py-1.5`), mỗi tiêu đề cột là nút sắp xếp (▲ tăng, ▼ giảm, ⇕ chưa chọn; bấm: tăng → giảm → bỏ), các cột: `PIC` (**admin**), `Số Pwire`, `Tên` (cắt `max-w-64` + `title`), `Link Pwire` (PwireLink cắt), `Người giao`, `Deadline` (`—` nếu trống), `Tiến độ` (ProgressBar), `Trạng thái` (StatusBadge), `Checklist` (`đã xong/tổng`), `Cập nhật` (chỉ danh sách đang xử lý). Ô `Cập nhật`: nhãn màu (`✓ <ngày giờ>` nếu đã cập nhật hôm nay, "Chưa cập nhật" nếu `pending`, ngược lại `label`) + nếu **chưa cập nhật hôm nay** nút nhỏ **Không đổi** (dừng sự kiện click để không mở chi tiết; gọi `POST /api/eod` với `{task_id,tien_do,trang_thai}` — **không gửi ghi chú** — rồi tải lại danh sách + `report.reload()` + toast). Bấm một dòng → `/tasks/:id`. Dưới bảng: Loading / "Không có task nào." và Pagination. Lọc/tìm/sắp xếp/đổi trang đều gọi API (đổi bộ lọc quay về trang 1).

**Thêm task `/tasks/new`:** tiêu đề "Thêm task"; `TaskForm` với `gridClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"`; giá trị đầu: `ma_task = 'PP000017-'`, `ten ''`, `ngay_nhan = giờ hiện tại`, `deadline ''`, `dev_hoan_thanh_thuc_te ''`, `nguoi_giao = 'Ngo Hai Nhu'`, `ghi_chu ''`, `link_test_case ''`, `dev_cross_check ''`. Lưu → toast "Đã tạo task" → `/tasks/<id mới>`.

**Chi tiết `/tasks/:id`:** hàng đầu `flex-wrap`: `← Danh sách`, tên task (h1), StatusBadge, ProgressBar, (đẩy phải) nút **Không đổi tiến độ** (chỉ khi trạng thái không phải "hoàn thành"; gọi `/api/eod` không gửi ghi chú; toast "Đã ghi nhận: không có gì thay đổi ở tiến độ hôm nay"), nút đỏ **Xóa task** (modal `danger`, xóa xong về `/` + toast), và (admin) `PicTransfer`. Dưới là **lưới 4 khối** `grid gap-6 xl:grid-cols-2`, thứ tự (dùng `order-1..4`, hai div bọc `contents`):
1. **Thông tin** (`TaskForm showProgress`, `key = cap_nhat_luc` để nạp lại sau lưu; dòng nhỏ "Tạo lúc … · Cập nhật lúc …"; lưu → toast "Đã lưu thay đổi" (hoặc "Đã lưu thay đổi và ghi cập nhật tiến độ hôm nay" nếu tiến độ đổi)).
2. **Checklist (đã/tổng)** với `SelectAllCheckbox` ("Chọn tất cả"), nút **Sao chép mẫu comment** (clipboard: `Task: <ma_task> - <ten>\nDev done: \nCTS: \nObject: \nTest case: <link>`), danh sách `ChecklistBox`.
3. **Vấn đề QnA / Process** (bảng `Loại | Ngày giờ | Lý do | Người liên quan | Trạng thái | thao tác` hoặc "Chưa có vấn đề nào." + `IssueForm`: select loại, ô người liên quan (không bắt buộc), ô lý do, nút "Thêm vấn đề" (ngày giờ tự ghi)).
4. **Lịch sử thay đổi** (`TaskHistory`).

Màn hình hẹp (`< xl`) xếp dọc theo thứ tự ①②③④. Mọi thao tác báo bằng toast, lỗi hiện cả `ErrorBox`.

**Cập nhật tiến độ `/cuoi-chieu`** (`EndOfDay`): tiêu đề, ô tìm (debounce 300 ms), checkbox `Chỉ task chưa cập nhật hôm nay`, chữ cam "N thay đổi chưa lưu", nút `Xác nhận không đổi (N)` (N = task trên trang chưa cập nhật hôm nay và chưa sửa dở; hỏi `dialog.confirm`; gửi **không kèm ghi chú**), nút xanh `Lưu tất cả`. Bảng cột `Task` (tên đậm, Số Pwire nhỏ, nhãn trạng thái cập nhật + nút `Không đổi` nếu chưa cập nhật hôm nay và chưa sửa) | `Tiến độ (%)` (number 0-100, lỗi đỏ dưới ô) | `Trạng thái` (select) | `Ghi chú` (textarea 1 dòng; nếu `ghi_chu_rich` thì **readOnly**, mờ, tooltip "Ghi chú có định dạng hoặc ảnh: sửa ở trang chi tiết task"); các ô **căn giữa dòng** (`align-middle`). Chỉ gửi task đã sửa; **ghi chú chỉ gửi khi người dùng sửa ô ghi chú** (cờ `noteEdited`). Kiểm tra trước khi lưu: tiến độ hợp lệ, trạng thái `yeu_cau_hoan_tat` thì phải 100% (`<X> thì phải 100%`); còn lỗi thì không lưu + toast "Còn ô tiến độ chưa hợp lệ…"; không có gì sửa → toast info "Chưa có thay đổi nào để lưu."; thành công toast "Đã lưu N task." và tải lại. Pagination có chọn số task/trang.

**Checklist `/checklist`:** hai tab.
- Tab **"Mẫu checklist"** (**chỉ admin**, mặc định mở với admin): `ChecklistTemplateEditor` (thêm mục, sửa tên, ↑ ↓ đổi thứ tự, xóa có xác nhận, nút Lưu / Hoàn tác; báo mẫu còn sửa dở lên trang cha để **khóa nút Áp dụng mẫu**) và khối "Áp dụng mẫu cho task đã có": radio `Tất cả task chưa hoàn thành` / `Chọn task cụ thể` (TaskPicker) + nút **Áp dụng mẫu (ghi đè)** → `dialog.confirm` kiểu `danger` ("GHI ĐÈ checklist của … bằng mẫu hiện tại? Mục không có trong mẫu sẽ bị XÓA, … Không thể hoàn tác.", nút `Ghi đè`) → toast kết quả ("Đã ghi đè checklist của X/Y task (thêm a, xóa b mục)" hoặc "Không có gì thay đổi…", kèm "(bỏ qua N task đã hoàn thành)").
- Tab **"Tổng hợp theo task"** (mặc định với user thường): bảng/thẻ từng task với các mục checklist (tick được từng mục, "Chọn tất cả" từng task), lọc trạng thái, tìm, chuyển danh sách đang xử lý / đã hoàn thành, phân trang; lưới 1 cột trên màn hình hẹp, 2 cột từ `lg`.

**Task đã xóa `/da-xoa`** (admin, `RequireAdmin`; `DeletedTasks.jsx`): tiêu đề, dòng mô tả "Task bị xóa vẫn được giữ lại. Chỉ quản trị viên khôi phục hoặc xóa vĩnh viễn được.", ô tìm (debounce 300 ms), bảng cột `PIC | Số Pwire | Tên | Trạng thái | Tiến độ | Xóa lúc | Người xóa | (Khôi phục)` (tiêu đề cột bấm sắp xếp, mặc định `Xóa lúc` giảm dần), nút `Khôi phục` (`BUTTON_SMALL`) → `dialog.confirm` → `POST restore` → toast `Đã khôi phục task <Số Pwire>` + tải lại; menu `…` (`RowMenu`) có `Xóa vĩnh viễn` → `dialog.confirm` kiểu `danger` (nút `Xóa vĩnh viễn`, mặc định focus Hủy, nêu rõ checklist/vấn đề/tiến độ/lịch sử cũng mất, không hoàn tác) → `DELETE` → toast `Đã xóa vĩnh viễn task <Số Pwire>` + tải lại; lỗi hiện toast. Rỗng: "Chưa có task nào bị xóa.". Phân trang như danh sách task. Hộp xác nhận xóa ở trang chi tiết ghi rõ task được chuyển vào mục Task đã xóa.

**Quản lý trạng thái `/trang-thai`** (admin): form thêm (tên, select màu, checkbox `Hoàn thành`, checkbox `Yêu cầu 100% + checklist`, nhãn "Xem trước") và bảng `# | Tên trạng thái | Màu | (xem trước) | Hoàn thành | Yêu cầu 100% + checklist | Số task | thao tác`: sửa tên (rời ô/Enter lưu, Esc hủy; đổi tên trạng thái đang có task dùng → `dialog.confirm` nêu số task), đổi màu, bật/tắt hai cờ, ↑ ↓, Xóa (nút khóa + chú thích số task nếu đang dùng; `dialog.confirm` danger). Phân trang phía trình duyệt (API trả hết); ↑ ↓ tính trên toàn danh sách. Sau mỗi thay đổi gọi `StatusContext.reload()`.

**Quản lý data `/quan-ly-data`** (admin): tab theo nhóm (hiện có `Dev`); thêm một mục, "Thêm nhiều" (textarea mỗi dòng một tên → bulk, báo `added/skipped`), bảng `# | Tên | số task đang dùng | thao tác` (đổi tên rời ô/Enter, ↑ ↓, Xóa có xác nhận; khóa nút nếu đang được task dùng), phân trang phía trình duyệt.

**Tài khoản `/tai-khoan`:** mọi người: khối "Đổi mật khẩu của tôi" (mật khẩu hiện tại, mới, nhập lại; `max-w-xl`). **Admin** thêm khối "Quản lý tài khoản": form thêm (tên, mật khẩu **hiện chữ rõ** vì admin cần đọc để đưa cho người dùng, select vai trò) + bảng `Tên đăng nhập | Vai trò (select đổi ngay) | Tạo lúc | Số phiên | thao tác` với **Đặt lại mật khẩu** (`dialog.prompt` mật khẩu ẩn, ≥ 8 ký tự, báo lỗi trong hộp) và **Xóa** (`dialog.confirm` danger; khóa với chính mình).

### 7.6 Giao diện theo Astryx

Giao diện dùng **Astryx** (design system React của Meta, MIT, https://astryx.atmeta.com), theme **neutral** (nền trắng xám, font Figtree) với **màu chính (accent) đổi sang xanh dương** (#0064E0), chế độ sáng (`<Theme mode="light">`). Tài liệu component: `npx @astryxdesign/cli component <Tên>` (thêm `--dense`), `npx @astryxdesign/cli docs <chủ đề>`.

- **CSS** (`frontend/src/index.css`): dòng `@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;` rồi nạp `tailwindcss/theme.css` (layer theme), `tailwindcss/preflight.css` (layer base), `@astryxdesign/core/reset.css`, `astryx.css`, `tailwind-theme.css` (cầu nối token ↔ lớp Tailwind), `tailwindcss/utilities.css` (layer utilities). Cuối `index.css` có khối `@layer components { [data-astryx-theme="neutral"] { --color-accent… } }` ghi đè 5 token accent (`--color-accent`, `-muted`, `--color-text-accent`, `--color-icon-accent`, `--color-on-accent`); đổi màu chính chỉ cần sửa khối này. `astryx-themes.js` (sinh bởi `npx @astryxdesign/cli theme add neutral`, **không sửa tay**) nạp `theme.css` và font.
- **Màu, bo góc, đổ bóng, chữ:** chỉ dùng token Astryx. Trong JSX không viết màu thô (hex, `bg-gray-100`...); khi cần dùng biến token, viết `text-(--color-text-error)`, `border-(--color-border)`, `bg-(--color-background-body)`... Token chính: `--color-accent`, `--color-background-body|surface|muted`, `--color-text-primary|secondary|error|warning|success`, `--color-border`, `--color-border-emphasized`. Trạng thái nghiệp vụ đi qua `Badge`/`ProgressBar` (variant `neutral|info|success|warning|error` hoặc màu `blue|orange|purple|green|red|yellow`).
- **Bố cục:** `AppShell` (`contentPadding={4}`), tiêu đề trang `Heading level={1}`, khối nội dung `Card`, hàng công cụ `flex flex-wrap gap-3` bằng Tailwind, lưới `grid` bằng Tailwind. Khối trong lưới/flex có `min-w-0`. Bảng rộng bọc `DataTable` để cuộn ngang trên màn hẹp.
- **Nút:** `Button` (`variant` primary cho hành động chính duy nhất, `secondary` mặc định, `ghost`, `destructive` cho xóa/ghi đè); nút chỉ có icon dùng `isIconOnly` (bắt buộc `label`). Mọi ô nhập có `label` (ẩn bằng `isLabelHidden` nếu không cần hiện) và `htmlName`; `autoComplete` đúng (`username`, `current-password`, `new-password`).
- **Hành động trong dòng:** xóa hoặc từ 3 hành động trở lên gom vào `RowMenu` (MoreMenu). Vấn đề QnA/Process hiển thị dạng danh sách dòng.
- **Cập nhật tiến độ trong ô "Cập nhật":** `Badge` theo `getReportStatus`: vàng→`warning`, xanh→`success`, xám→`neutral`, đỏ→`error`; chỉ nhãn có màu.
- **Ngôn ngữ nhãn nội bộ của Astryx** (Bắt buộc, Chọn ngày, Phân trang, Bỏ qua đến nội dung...): bản dịch `vi-VN`. Chuỗi riêng của ứng dụng vẫn là tiếng Việt viết trong code.
- Không dùng emoji hay ký tự mũi tên làm icon. Không viết CSS component riêng.

---

## 8. Luồng nghiệp vụ chính (để kiểm tra hiểu đúng)

1. Admin tạo task → server gán PIC = admin, 11 mục checklist chưa tick, trạng thái `OPEN`, nhật ký "Tạo task".
2. Người dùng tick checklist (mỗi lần ghi `xong_luc`, nhật ký), ghi vấn đề QnA/Process (server ghi ngày giờ).
3. Cuối chiều vào "Cập nhật tiến độ" sửa nhiều task rồi "Lưu tất cả" (một transaction) hoặc bấm "Không đổi".
4. Chuyển task sang `CLOSED` chỉ được khi tiến độ 100% và checklist tick hết; task ra khỏi "Đang xử lý", sang "Đã hoàn thành", không bị nhắc cập nhật nữa. `CANCELED` cũng thành "hoàn thành" nhưng không bị ép 100%.
5. Hằng ngày task chưa hoàn thành quay lại **đỏ** cho tới khi có bản cập nhật của ngày đó (vàng nếu lưu trước 16:30, xanh nếu từ 16:30).
6. Admin đổi mẫu checklist → "Áp dụng mẫu" ghi đè checklist task chưa hoàn thành.
7. Admin chuyển PIC; user chỉ thấy task của mình.

---

## 9. Vận hành

- **`start.bat`** (CRLF, thông báo không dấu): `pushd "%~dp0backend"`; kiểm tra có `node`; dùng PowerShell tìm tiến trình `node` đang nghe cổng 6021/3000 và `Stop-Process` (không đụng chương trình khác); `npm install` backend nếu chưa có `node_modules`; ở `..\frontend` `npm install` nếu chưa có rồi `npm run build` (lỗi thì `pause` và thoát); in hướng dẫn (địa chỉ `http://127.0.0.1:6021`, `http://<IP>:6021`, tạo tài khoản đầu tiên, quên mật khẩu admin: `npm run create-user -- ten`); `start "" http://127.0.0.1:6021`; `node server.js`. **Không** dùng `node --watch`.
- **`backup.js`**: `db.backup('backups/tasks_<YYYY-MM-DD>.db')` (API backup của better-sqlite3), ghi đè trong cùng ngày.
- **`create-user.js`** (`npm run create-user -- <tên> [--admin|--user]`): hỏi mật khẩu ở cửa sổ lệnh (không hiện), tạo tài khoản mới (không cờ: tài khoản đầu tiên là admin, sau đó là user) hoặc hỏi có đặt lại mật khẩu không nếu tên đã có (kèm cờ thì đổi cả vai trò); tài khoản tạo mới hoặc đặt lại mật khẩu đều bị đặt `bat_buoc_doi_mat_khau = 1`; đọc stdin bằng một `readline` duy nhất có hàng đợi để không mất dòng khi nhập qua ống.
- **Admin mặc định:** lần chạy đầu tiên (DB chưa có tài khoản) server tạo `admin` / `admin@123` từ `backend/.env`. Lần đăng nhập đầu hệ thống **ép đổi mật khẩu** (cờ `bat_buoc_doi_mat_khau`) trước khi vào được ứng dụng. README ghi rõ điều này. Mật khẩu mặc định yếu và server mở trên mạng nội bộ, nên không được để nguyên khi cho người khác dùng.
- **Docker/Coolify:** `Dockerfile` ở gốc (build giao diện, cài backend, chạy `node server.js` cổng 6021, người dùng `node`). Biến môi trường: `DB_PATH` (mặc định `backend/tasks.db`; trong image `/data/tasks.db`, `/data` là volume lưu bền; `backup.js` ghi `backups/` cạnh file này), `TRUST_PROXY` (số bước proxy hoặc `true`; bật thì `req.ip` là IP khách thật cho bộ giới hạn đăng nhập và `req.secure` đúng nên cookie phiên có `Secure`), `SEED_FILE` (đường dẫn `seed-data.json`), `ADMIN_USERNAME`/`ADMIN_PASSWORD` (lấy từ môi trường, ưu tiên hơn `.env`). `.dockerignore` loại `.env`, `seed-data.json`, `tasks.db*` khỏi image. Healthcheck `GET /api/auth/me`. Image đặt `TZ=Asia/Ho_Chi_Minh` và cài `tzdata` (nếu chạy UTC thì mọi mốc giờ lưu lệch 7 tiếng và "hôm nay" lệch ngày so với giờ Việt Nam). `DB_PATH` phải là biến môi trường thật (không đọc từ `.env`).
- **Truy cập từ máy khác:** `http://<IP>:6021`; mở cổng Windows: `netsh advfirewall firewall add rule name="Task Tracker 6021" dir=in action=allow protocol=TCP localport=6021 profile=private` (Administrator). HTTP không mã hóa → chỉ dùng mạng nội bộ tin cậy, không mở ra internet.
- Sao lưu: copy `tasks.db` đặt tên theo ngày hoặc `npm run backup`. Không sửa trực tiếp dữ liệu trong `tasks.db` để "làm cho chạy".
- Sau **mỗi lần chỉnh sửa** ghi một phiên vào `WORKLOG.md` (mới nhất ở trên: ngày giờ `YYYY-MM-DD HH:mm`, việc đã làm, file đổi, kết quả chạy thử, tồn đọng, việc tiếp theo) và cập nhật `README.md` nếu thông tin dự án đổi. Không ghi dữ liệu task thật vào hai file này.

---

## 10. Bộ kiểm tra chấp nhận (phải đạt hết)

**Task & dữ liệu**
- [ ] Tạo task thiếu `ma_task/ten/ngay_nhan/nguoi_giao` → 400, không lưu; Số Pwire sai mẫu (`PP000017-12a`, `ABC`) → 400; trùng (kể cả giữa hai user hoặc task đã xóa mềm) → 400 `Số Pwire đã tồn tại`; task `PP000017-236702` có id 236702, đổi Số Pwire thì id đổi theo mà checklist, lịch sử, tiến độ đi theo.
- [ ] Task mới có đúng 11 mục checklist chưa tick; tick lưu `xong_luc`, tải lại vẫn còn; bỏ tick xóa `xong_luc`.
- [ ] Chuyển `CLOSED` khi tiến độ 90% hoặc còn mục chưa tick → 400 và không đổi gì; đủ điều kiện thì được; `CANCELED` không bị ép.
- [ ] Task `CLOSED/CANCELED` không còn ở `GET /api/tasks` (mặc định) mà chỉ ở `archived=1`.
- [ ] `POST /api/eod` nhiều task một lần; lưu lại cùng ngày ghi đè `progress_log` (vẫn một dòng/ngày); lỗi ở một task hoàn tác cả lượt; không gửi `ghi_chu` thì ghi chú cũ nguyên vẹn.
- [ ] Đổi `tien_do` qua `PUT` ghi `progress_log` hôm nay; đổi trạng thái/ghi chú đơn thuần thì **không**.
- [ ] Đổi tên một trạng thái đang dùng → task/`progress_log` đổi theo; xóa trạng thái đang dùng hoặc cuối cùng → 400.
- [ ] Ngày giờ không có thật (`2026-02-31 10:00`, `…25:00`) bị từ chối; `dev_hoan_thanh_thuc_te` lưu/xóa trắng được.
- [ ] CSV mở bằng Excel không lỗi tiếng Việt (BOM), ô `=...` được thêm `'`, ghi chú là chữ thuần.
- [ ] 5.000 task mẫu: danh sách tải/lọc/sắp xếp mượt (mỗi trang chỉ một phần).
- [ ] Tắt/bật lại server dữ liệu còn nguyên.

**Sắp xếp/tìm kiếm**
- [ ] `sort=ma_task` xếp theo số (9 < 100 < 2000); `deadline` rỗng luôn cuối ở cả hai chiều; `sort=bậy` → 400; tìm theo link/người giao/Dev/ghi chú/PIC hoạt động; ký tự `%` được hiểu đúng nghĩa đen.

**Phân quyền**
- [ ] User gọi API quản trị → 403; user truy cập/sửa/xóa task, checklist, vấn đề, tiến độ của người khác → 404; danh sách và CSV của user chỉ có task của mình; admin thấy/sửa tất cả; chuyển PIC đúng (PIC cũ mất quyền); không xóa/hạ quyền admin cuối cùng; đổi vai trò có hiệu lực ngay.
- [ ] DB mới + có `backend/.env` → khởi động xong đăng nhập được bằng `admin` / `admin@123` với vai trò admin; khởi động lại không tạo trùng, không ghi đè mật khẩu đã đổi; đổi `.env` khi DB đã có tài khoản không có tác dụng.
- [ ] Ép đổi mật khẩu: đăng nhập `admin` / `admin@123` lần đầu chỉ thấy màn hình đổi mật khẩu; gọi API khác (vd `GET /api/tasks`) bằng cookie đó → 403 `Bạn cần đổi mật khẩu trước khi tiếp tục`; đổi sang mật khẩu trùng cũ → 400; đổi hợp lệ → cờ về 0, dùng được toàn bộ ứng dụng, đăng nhập lại không bị ép nữa; admin tạo user mới hoặc đặt lại mật khẩu → user đó bị ép đổi ở lần đăng nhập kế tiếp.
- [ ] Đăng nhập: sai 6 lần liên tiếp → 429; `/api/auth/setup` khi đã có tài khoản → 403; cookie `HttpOnly; SameSite=Lax`; DB chỉ lưu băm của mã phiên.

**Ghi chú HTML**
- [ ] Ghi chú chứa `<script>`, `onerror=`, `href="javascript:…"`, ảnh từ URL ngoài, `style` → bị loại; `<b>`, danh sách, link `https`, ảnh data URI png/jpeg/gif/webp được giữ; ghi chú > 8.000.000 ký tự → 400; danh sách task / nhật ký / `progress_log` / CSV chỉ có chữ thuần (`[ảnh]`).

**Mẫu checklist**
- [ ] Áp dụng mẫu ghi đè đúng thứ tự mẫu, giữ tick mục trùng tên, bỏ qua task hoàn thành, lần hai không đổi gì, ghi nhật ký.

**Giao diện**
- [ ] Các ô ngày giờ luôn 24 giờ (không AM/PM, tuần bắt đầu thứ Hai); dán ảnh vào Ghi chú thu nhỏ ≤ 1600px và lưu được; nhãn "Cập nhật" vàng/xanh/đỏ đúng quy tắc 16:30 và chỉ nhãn có màu; thanh tiến độ đổi màu theo mức; bảng rộng cuộn ngang trên màn hẹp; cột có thể sắp xếp; trang chi tiết là lưới 2×2 ở màn hình rộng; thu hẹp cửa sổ thì menu bên chuyển thành ngăn kéo; không có hộp thoại gốc của trình duyệt nào xuất hiện; console không có lỗi.

---

## 11. Điểm cần chú ý / dễ sai

- Tên hiển thị khác tên kỹ thuật: "Số Pwire" = `ma_task`; "Link Pwire" = `link_test_case`; "Cập nhật tiến độ" có route `/cuoi-chieu`; "Đã hoàn thành" có route `/archive` (file `Archive.jsx`); "PIC" = chủ sở hữu = `nguoi_tao_id` (`chu_so_huu` trong API).
- Trạng thái `REOPEN` viết sai chính tả có chủ ý (dữ liệu của người dùng); đừng "sửa".
- Tên người thật (danh sách Dev) và dữ liệu task thật **không** nằm trong mã nguồn hay tài liệu được commit — chỉ ở `tasks.db` hoặc file seed cục bộ `backend/seed-data.json` (đã `.gitignore`).
- Cookie không gắn theo cổng: hai server khác cổng trên cùng host dùng chung cookie `phien_dang_nhap`; khi thử nghiệm song song hãy dùng host khác (`localhost` vs `127.0.0.1`).
- Express 5: handler `async` tự chuyển lỗi sang bộ xử lý lỗi; các handler đồng bộ bọc bằng một hàm `handle` có `try/catch`.
- Thứ tự `@layer` ở đầu `index.css` là bắt buộc: thiếu thì kiểu component của Astryx đè utility Tailwind. `index.css` phải được import trước mọi file khác trong `main.jsx`.
- Astryx chưa xuất bản bản dịch cho mọi chuỗi; chuỗi nào còn tiếng Anh thì truyền qua prop (ví dụ `label`) hoặc `overrides` của `InternationalizationProvider`.

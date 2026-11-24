-- Schema SQLite của ứng dụng quản lý task (nguồn duy nhất, chạy lại an toàn nhờ IF NOT EXISTS).
PRAGMA foreign_keys = ON;

-- Bảng task chính
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_task TEXT NOT NULL,                       -- hiển thị là "Số Pwire"
  ten TEXT NOT NULL,
  ngay_nhan TEXT NOT NULL,                     -- 'YYYY-MM-DD HH:mm' (dữ liệu cũ có thể chỉ 'YYYY-MM-DD')
  deadline TEXT,                               -- như trên, có thể NULL
  nguoi_giao TEXT NOT NULL,
  tien_do INTEGER NOT NULL DEFAULT 0 CHECK (tien_do BETWEEN 0 AND 100),
  trang_thai TEXT NOT NULL,                    -- tên một dòng task_statuses (kiểm tra ở backend, KHÔNG có CHECK)
  ghi_chu TEXT NOT NULL DEFAULT '',            -- HTML đã lọc hoặc chữ thuần cũ
  link_test_case TEXT NOT NULL DEFAULT '',     -- hiển thị là "Link Pwire"
  dev_hoan_thanh_thuc_te TEXT,                 -- 'YYYY-MM-DD HH:mm' hoặc NULL
  dev_cross_check TEXT NOT NULL DEFAULT '',    -- tên Dev (nhóm Dev ở data_items) hoặc ''
  tao_luc TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  cap_nhat_luc TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  nguoi_tao_id INTEGER REFERENCES users(id) ON DELETE SET NULL   -- PIC / chủ sở hữu; NULL = chỉ admin thấy
);

-- Các mục checklist của từng task
CREATE TABLE IF NOT EXISTS checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  ten_muc TEXT NOT NULL,
  da_xong INTEGER NOT NULL DEFAULT 0 CHECK (da_xong IN (0,1)),
  xong_luc TEXT                                -- giờ tick; NULL nếu chưa
);

-- Vấn đề QnA / Process gắn với task
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  loai TEXT NOT NULL CHECK (loai IN ('QnA','Process')),
  ngay_gio TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  ly_do TEXT NOT NULL,
  nguoi_lien_quan TEXT NOT NULL DEFAULT '',
  trang_thai TEXT NOT NULL DEFAULT 'Mở' CHECK (trang_thai IN ('Mở','Đã xử lý'))
);

-- Nhật ký cập nhật tiến độ: mỗi task một dòng mỗi ngày, lưu lại trong ngày thì ghi đè
CREATE TABLE IF NOT EXISTS progress_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  ngay TEXT NOT NULL,                           -- 'YYYY-MM-DD'
  tien_do INTEGER NOT NULL,
  trang_thai TEXT NOT NULL,
  ghi_chu TEXT NOT NULL DEFAULT '',             -- LUÔN chữ thuần, tối đa 2000 ký tự
  cap_nhat_luc TEXT,                            -- 'YYYY-MM-DD HH:mm:ss'; bản ghi cũ có thể NULL
  UNIQUE (task_id, ngay)
);

-- Mẫu checklist dùng cho task mới
CREATE TABLE IF NOT EXISTS checklist_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_muc TEXT NOT NULL UNIQUE,
  thu_tu INTEGER NOT NULL
);

-- Danh sách trạng thái task (động, admin quản lý)
CREATE TABLE IF NOT EXISTS task_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten TEXT NOT NULL UNIQUE COLLATE NOCASE,
  mau TEXT NOT NULL DEFAULT 'gray',
  la_hoan_thanh INTEGER NOT NULL DEFAULT 0 CHECK (la_hoan_thanh IN (0,1)),
  yeu_cau_hoan_tat INTEGER NOT NULL DEFAULT 0 CHECK (yeu_cau_hoan_tat IN (0,1)),
  thu_tu INTEGER NOT NULL
);

-- Danh mục dữ liệu dùng chung (hiện có nhóm 'dev')
CREATE TABLE IF NOT EXISTS data_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nhom TEXT NOT NULL,
  ten TEXT NOT NULL COLLATE NOCASE,
  thu_tu INTEGER NOT NULL,
  UNIQUE (nhom, ten)
);

-- Nhật ký thay đổi của task
CREATE TABLE IF NOT EXISTS task_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  thoi_gian TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  loai TEXT NOT NULL CHECK (loai IN ('task','tien_do','checklist','van_de')),
  truong TEXT, gia_tri_cu TEXT, gia_tri_moi TEXT,
  mo_ta TEXT NOT NULL
);

-- Tài khoản đăng nhập
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_dang_nhap TEXT NOT NULL UNIQUE COLLATE NOCASE,
  mat_khau TEXT NOT NULL,                       -- 'scrypt$<muối hex>$<băm hex>'
  vai_tro TEXT NOT NULL DEFAULT 'user' CHECK (vai_tro IN ('admin','user')),
  bat_buoc_doi_mat_khau INTEGER NOT NULL DEFAULT 0 CHECK (bat_buoc_doi_mat_khau IN (0,1)),  -- 1 = phải đổi mật khẩu trước khi dùng
  tao_luc TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Phiên đăng nhập (chỉ lưu băm của mã phiên)
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

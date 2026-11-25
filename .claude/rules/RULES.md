# RULES.md — Quy tắc code dự án "Web quản lý task cá nhân"

> Đặc tả đầy đủ: `PROJECT_SPEC.md`. Khi có mâu thuẫn, `PROJECT_SPEC.md` thắng. **MUST** = bắt buộc.

## 1. Ngôn ngữ
- Giao diện, thông báo lỗi, label: **tiếng Việt**.
- Tên biến, hàm, hằng, component, props, file code: **tiếng Anh**.
- Tên bảng, cột DB và field JSON của API: **tiếng Việt không dấu `snake_case`** (`ma_task`, `tien_do`, `trang_thai`). Giá trị cố định giữ tiếng Việt (`'Mở'`, `'Đã xử lý'`).
- Mỗi đoạn code có ý nghĩa **MUST** có comment tiếng Việt 1–2 dòng nói mục đích (đầu file, mỗi hàm, component, nhóm hằng, câu SQL, bước kiểm tra).

## 2. Công nghệ (không thêm thư viện khác)
- Backend: Node.js ≥ 20, Express 5, better-sqlite3, ESM (`"type": "module"`).
- Frontend: React 19, react-router-dom 7, Tailwind CSS 4 (`@tailwindcss/vite`), Vite. Chỉ JavaScript.
- Cấm: TypeScript, ORM, thư viện UI/icon/editor/date-picker dựng sẵn.
- Đăng nhập chỉ dùng module `crypto` của Node (scrypt, SHA-256, randomBytes).

## 3. Backend
- Mọi câu SQL **MUST** dùng tham số `?`. Chỉ tên cột/biểu thức lấy từ danh sách cố định trong code mới được ghép vào SQL.
- Hàm ghi nhiều bảng **MUST** chạy trong `db.transaction`.
- Lỗi trả về dạng `{ "error": "mô tả ngắn" }` với đúng mã 400/401/403/404/429/500; lỗi 500 chỉ log `error.code ?? error.name`, không lộ chi tiết, không ghi dữ liệu task vào log.
- Phân trang/lọc/tìm/sắp xếp do **backend** làm.
- Ghi chú task luôn qua `sanitizeNote` trước khi lưu.
- Xóa task là **xóa mềm** (`xoa_luc`, `nguoi_xoa`); mọi truy vấn task mới phải lọc `xoa_luc IS NULL`, riêng trang Task đã xóa (chỉ admin) lọc ngược lại.
- Phân quyền: user thường chỉ thấy task của mình; task không thuộc user trả **404**, không lộ việc tồn tại.
- Server nghe `0.0.0.0:6021`, không đổi cổng/địa chỉ.
- **Không bao giờ xóa `tasks.db`** để đổi cấu trúc; dùng migration an toàn (`PRAGMA user_version`).

## 4. Frontend
- Mọi lời gọi API nằm trong `frontend/src/api.js`; component **không** gọi `fetch`.
- Mọi lời gọi API **MUST** hiển thị trạng thái đang tải và lỗi.
- Cấm `window.confirm / prompt / alert`: dùng `useDialog` và `useToast`.
- Cấm viết CSS component riêng; chỉ Tailwind. `frontend/src/index.css` chỉ có `@import "tailwindcss";`, khối `@theme` (token màu/font/đổ bóng) và `@layer base` ngắn.
- Thứ tự providers trong `main.jsx`: `StrictMode > BrowserRouter > ToastProvider > DialogProvider > AuthProvider > AuthGate > StatusProvider > App`.
- Danh sách task: lọc/tìm/sắp xếp/đổi trang đều gọi API; đổi bộ lọc thì quay về trang 1.
- Mọi `<table>` gắn `TABLE_BORDER_CLASS` (từ `constants.js`) và bọc `overflow-x-auto`.
- Ô ngày giờ dùng `DateTimeInput` (một ô, 24 giờ, không AM/PM). Giá trị vào/ra dạng `YYYY-MM-DDTHH:mm`; khi gửi API đổi `T` thành khoảng trắng.
- Ghi chú dùng `RichNoteEditor`; dán/kéo ảnh phải thu nhỏ (cạnh dài ≤ 1600px) trước khi lưu.
- Nhãn "Cập nhật" theo `getReportStatus`: vàng (lưu trước 16:30), xanh (từ 16:30), đỏ (chưa cập nhật). **Chỉ nhãn có màu, không tô nền dòng/ô.**
- Nút "Không đổi" và `POST /api/eod` **không gửi `ghi_chu`**; ghi chú chỉ gửi khi người dùng thực sự sửa ô ghi chú (cờ `noteEdited`). Ghi chú HTML/ảnh chỉ sửa ở trang chi tiết.
- Hành động xóa/ghi đè/nguy hiểm: `dialog.confirm` kiểu `danger` (mặc định focus nút Hủy). Kết quả mọi thao tác báo bằng toast.
- Kiểm tra dữ liệu ở client trước khi gửi, lỗi đỏ ngay dưới ô (`FieldError`); lỗi server gắn đúng ô khi nhận diện được (Số Pwire, Link Pwire).
- Responsive: dưới 1024px sidebar mặc định ẩn và là lớp phủ. Vùng nội dung full chiều ngang, không dùng `max-w` cho trang.
- Trang admin bọc `RequireAdmin`; user thường không thấy mục menu admin.
- **UI/UX theo evondevKit** (chi tiết ở mục 7.6 của `PROJECT_SPEC.md`):
  - Mọi màu qua token (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `border-border`, `border-border-strong`, `bg-primary`...). **Cấm** viết màu thô kiểu `bg-gray-100`, `bg-blue-600`, hex trong JSX (trừ bảng màu trạng thái trong `STATUS_COLOR_OPTIONS`, thanh tiến độ và huy hiệu có chủ đích).
  - Dùng hằng trong `constants.js` cho nút/ô nhập/thẻ/bảng: `BUTTON_PRIMARY|SECONDARY|SMALL|DANGER`, `INPUT_CLASS`, `CARD_CLASS`, `TABLE_BORDER_CLASS`, `TABLE_WRAP_CLASS`, `ERROR_BOX_CLASS`.
  - Bo góc: `rounded-lg` (≤ 36px), `rounded-xl` (≥ 40px), `rounded-2xl` (thẻ, modal), `rounded-full` (huy hiệu).
  - Phẳng: không gradient, không đổ bóng cho thẻ; chỉ `shadow-popover` / `shadow-modal` cho lớp nổi. Hover/focus chỉ đổi màu (`transition-colors`), cấm `transition-all`, scale, nâng.
  - Màu nhấn là xanh dương (`bg-primary`); màu thêm chỉ theo dữ liệu (sắc Tinted): `cat-1..3` cho ô icon (không cho chữ), `warning/error/success` cho mức độ. Không tô màu trang trí không gắn với dữ liệu; một hàng thẻ số liệu tối đa một số cảnh báo.
  - Nút phá hủy: nền rose nhạt + chữ rose, không viền đỏ. Chỉ hai màu đỏ (red cho lỗi, rose cho phá hủy).
  - Icon: SVG nội tuyến nét mảnh qua `MenuIcon`; cấm emoji và ký tự mũi tên làm icon; icon-only button phải có `aria-label`.
  - Modal có ô nhập không đóng khi bấm nền.
  - Mọi ô nhập phải có nhãn gắn với ô (`htmlFor`/`id`) hoặc `aria-label`, có `name`, và `autoComplete` đúng (`username`, `current-password`, `new-password`); form mật khẩu có ô tên ẩn. Kiểm tra bằng console của Chrome (không còn cảnh báo "No label associated" hay "should have an id or name").
  - Hành động xóa hoặc từ 3 hành động trở lên trong dòng bảng/danh sách: gom vào `RowMenu` (menu `…`), không để hàng nút Xóa lặp từng dòng. Danh sách ngắn (vấn đề) dùng dạng dòng, không bảng ngang.
  - Ô nhập có `placeholder:text-muted`; checkbox/radio dùng kiểu tự vẽ trong `index.css`; vùng bấm tối thiểu 24px (nút chỉ icon `size-9`, tiêu đề cột bấm cao 32px).
  - Khối trong lưới/flex phải có `min-w-0` để không đẩy trang cuộn ngang trên màn hẹp; kiểm tra 375px bằng probe của skill trước khi báo xong.

## 5. Tên hiển thị khác tên kỹ thuật (đừng nhầm)
- "Số Pwire" = `ma_task`; "Link Pwire" = `link_test_case`; "PIC" = chủ sở hữu = `nguoi_tao_id` (API: `chu_so_huu`).
- "Cập nhật tiến độ" = route `/cuoi-chieu`; "Đã hoàn thành" = route `/archive` (file `Archive.jsx`).
- Trạng thái `REOPEN` và `IN DESIG` viết như vậy có chủ ý (dữ liệu của người dùng): **không "sửa" chính tả**.
- Số Pwire luôn có tiền tố `PP000017-` + chữ số. Người giao mặc định `Ngo Hai Nhu`. Giờ chốt cập nhật `16:30`.

## 6. Bảo mật và dữ liệu
- Tên người thật (danh sách Dev) và dữ liệu task thật **không** nằm trong mã nguồn hay tài liệu được commit, chỉ ở `tasks.db` hoặc file seed cục bộ `backend/seed-data.json` (đã `.gitignore`; commit chỉ có `seed-data.example.json` với tên giả). Muốn nạp dữ liệu có sẵn: sửa `seed-data.json` rồi chạy `npm run seed`, không sửa trực tiếp `tasks.db`.
- Không sửa trực tiếp dữ liệu trong `tasks.db` để "làm cho chạy". Muốn sao lưu: `npm run backup` hoặc copy theo ngày.
- Mật khẩu: scrypt + `timingSafeEqual`; phiên lưu SHA-256 của mã, cookie `HttpOnly; SameSite=Lax`.
- Đăng nhập sai quá 5 lần/cặp (địa chỉ, tên) hoặc 30 lần/địa chỉ trong 15 phút → 429.
- Tài khoản admin mặc định lấy từ `backend/.env` (`ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=admin@123`), chỉ tạo khi bảng `users` rỗng, không bao giờ ghi đè hay ghi mật khẩu ra log. Đọc `.env` bằng `process.loadEnvFile()`, không dùng `dotenv`. `.env` nằm trong `.gitignore`; chỉ commit `.env.example`.
- Luôn còn ít nhất 1 admin. `/api/auth/setup` chỉ là đường dự phòng (loopback, khi chưa có tài khoản nào).
- Mật khẩu mặc định yếu: tài khoản tạo từ `.env`, tài khoản admin tạo mới hoặc đặt lại mật khẩu đều có `bat_buoc_doi_mat_khau = 1`. Khi cờ bật, middleware `enforcePasswordChange` chặn **mọi** API (403) trừ `POST /api/auth/password`, `me`, `logout`; chặn ở backend, không chỉ ở giao diện. Mật khẩu mới phải khác mật khẩu cũ. Frontend hiện màn hình `ForceChangePassword` thay cho cả ứng dụng. Nhắc lại trong README.
- CSV: UTF-8 có BOM, ô bắt đầu bằng `= + - @ \t \r` thêm `'` phía trước (chống công thức Excel).
- Ghi chú HTML: chỉ giữ thẻ/thuộc tính trong allowlist; `href` chỉ `http(s)`/`mailto`, `src` chỉ data URI ảnh png/jpeg/gif/webp.
- HTTP không mã hóa: chỉ dùng mạng nội bộ tin cậy, không mở ra internet.

## 7. Vận hành
- `start.bat`: CRLF, thông báo không dấu, chỉ dừng tiến trình `node` đang nghe cổng 6021/3000, **không** dùng `node --watch`.
- Express 5: handler `async` tự chuyển lỗi; handler đồng bộ bọc bằng hàm `handle` có `try/catch`.
- Tailwind v4 quét chuỗi class trong mọi file nguồn; hằng chứa class vẫn được nhận.
- Thử nghiệm song song hai server: dùng host khác nhau (`localhost` vs `127.0.0.1`) vì cookie không gắn theo cổng.

## 8. Quy trình làm việc
- Làm theo thứ tự ở mục 0 của `PROJECT_SPEC.md`; kiểm tra bằng bộ chấp nhận ở mục 10.
- Sửa nhỏ, đúng phạm vi yêu cầu; không refactor lan man.
- Không commit `tasks.db`, `tasks.db-*`, `node_modules`, `dist`, `backend/backups` (đã có trong `.gitignore`).
- **Sau mọi thay đổi mã: commit, push, deploy lên Coolify rồi test trên https://task.mtdd.io.vn** (quy trình chi tiết ở `CLAUDE.md`, mục "Deploy và test"). Chưa deploy và test thì chưa được coi là xong.
- Sau **mỗi lần chỉnh sửa** ghi một phiên vào `WORKLOG.md` (mới nhất ở trên): ngày giờ `YYYY-MM-DD HH:mm`, việc đã làm, file đổi, kết quả chạy thử, tồn đọng, việc tiếp theo. Cập nhật `README.md` nếu thông tin dự án đổi. Không ghi dữ liệu task thật vào hai file này.

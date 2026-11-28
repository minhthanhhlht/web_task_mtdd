# RULES.md — Quy tắc code dự án "Web quản lý task cá nhân"

> Đặc tả đầy đủ: `PROJECT_SPEC.md`. Khi có mâu thuẫn, `PROJECT_SPEC.md` thắng. **MUST** = bắt buộc.

## 1. Ngôn ngữ
- Giao diện, thông báo lỗi, label: **tiếng Việt**.
- Tên biến, hàm, hằng, component, props, file code: **tiếng Anh**.
- Tên bảng, cột DB và field JSON của API: **tiếng Việt không dấu `snake_case`** (`ma_task`, `tien_do`, `trang_thai`). Giá trị cố định giữ tiếng Việt (`'Mở'`, `'Đã xử lý'`).
- Mỗi đoạn code có ý nghĩa **MUST** có comment tiếng Việt 1–2 dòng nói mục đích (đầu file, mỗi hàm, component, nhóm hằng, câu SQL, bước kiểm tra).

## 2. Công nghệ
- Backend: Node.js ≥ 20, Express 5, better-sqlite3, ESM (`"type": "module"`).
- Frontend: React 19, react-router-dom 7, Vite, Astryx (`@astryxdesign/core`, `@astryxdesign/theme-neutral`, `@stylexjs/stylex`) + Tailwind CSS 4 cho bố cục; icon `lucide-react`. Chỉ JavaScript.
- Cấm: TypeScript, ORM, thêm thư viện UI/icon/editor/date-picker khác ngoài Astryx và `lucide-react`.
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
- Cấm viết CSS component riêng. `frontend/src/index.css` chỉ có thứ tự `@layer` và các `@import` của Tailwind/Astryx (xem 7.6 của `PROJECT_SPEC.md`); `src/astryx-themes.js` do CLI sinh, không sửa tay.
- Thứ tự providers trong `main.jsx`: `StrictMode > BrowserRouter > Theme > InternationalizationProvider > LinkProvider > ToastProvider > DialogProvider > AuthProvider > AuthGate > StatusProvider > App`; `index.css` import đầu tiên.
- Danh sách task: lọc/tìm/sắp xếp/đổi trang đều gọi API; đổi bộ lọc thì quay về trang 1.
- Bảng dùng `DataTable` (bọc `Table` của Astryx, cuộn ngang trên màn hẹp). Sắp xếp phía backend qua `useTableSortable`.
- Ô ngày giờ dùng `DateTimeInput` của Astryx (`hourFormat="24h"`, `weekStartsOn="mon"`, `presentation="popover"`). Giá trị vào/ra dạng `YYYY-MM-DDTHH:mm`; khi gửi API đổi `T` thành khoảng trắng.
- Ghi chú dùng `RichNoteEditor` (tự viết); dán/kéo ảnh phải thu nhỏ (cạnh dài ≤ 1600px) trước khi lưu.
- Nhãn "Cập nhật" theo `getReportStatus`: vàng (lưu trước 16:30), xanh (từ 16:30), đỏ (chưa cập nhật). **Chỉ nhãn có màu, không tô nền dòng/ô.**
- Nút "Không đổi" và `POST /api/eod` **không gửi `ghi_chu`**; ghi chú chỉ gửi khi người dùng thực sự sửa ô ghi chú (cờ `noteEdited`). Ghi chú HTML/ảnh chỉ sửa ở trang chi tiết.
- Hành động xóa/ghi đè/nguy hiểm: `dialog.confirm` kiểu `danger` (nút `destructive`). Kết quả mọi thao tác báo bằng toast.
- Kiểm tra dữ liệu ở client trước khi gửi, lỗi hiện ngay dưới ô qua prop `status` của ô nhập Astryx; lỗi server gắn đúng ô khi nhận diện được (Số Pwire, Link Pwire).
- Trang admin bọc `RequireAdmin`; user thường không thấy mục menu admin.
- **UI theo Astryx** (chi tiết ở mục 7.6 của `PROJECT_SPEC.md`):
  - Ưu tiên component của Astryx, tra prop bằng `npx @astryxdesign/cli component <Tên> --dense`; không tự dựng lại thứ Astryx đã có. Ô nhập luôn có `label` (ẩn bằng `isLabelHidden`) và `htmlName`; ô bắt buộc dùng `isRequired`.
  - Màu qua token Astryx (`--color-*`), **cấm** màu thô (hex, `bg-gray-100`...) trong JSX. Dùng dạng `text-(--color-text-error)` khi cần.
  - Nút chính duy nhất `variant="primary"`; xóa/ghi đè `variant="destructive"`; nút chỉ icon dùng `isIconOnly` kèm `label`.
  - Icon qua `Icon` của Astryx với component của `lucide-react`; cấm emoji và ký tự mũi tên làm icon.
  - Hành động xóa hoặc từ 3 hành động trong dòng gom vào `RowMenu`.
  - Khối trong lưới/flex có `min-w-0`; kiểm tra màn hẹp (không tràn ngang trang) trước khi báo xong.

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

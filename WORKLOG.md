# WORKLOG

Nhật ký phát triển (mới nhất ở trên).

## 2026-11-28 — Rà soát và sửa lỗi bố cục bảng sau khi chuyển Astryx

- Bảng của Astryx chia đều cột nên chữ bị cắt (Deadline, Số Pwire xuống dòng, cột Cập nhật ra ngoài màn): đặt độ rộng cột (`pixel`/`proportional`) cho danh sách task, task đã xóa, cập nhật tiến độ, trạng thái, data, tài khoản, lịch sử. Danh sách: PIC chỉ hiện ảnh đại diện (tên ở tooltip), Deadline bỏ giây, nhãn Cập nhật và nút Không đổi xếp dọc.
- Trang chi tiết: khối Lịch sử thay đổi trải hết hai cột (trước bị cuộn ngang trong khối hẹp).

## 2026-11-28 — Màu chính sang xanh dương

- `index.css`: ghi đè token accent của theme neutral (#0064E0) trong layer components; theme vẫn là neutral. Cập nhật mục 7.6 của `PROJECT_SPEC.md`.

## 2026-11-28 — Chuyển toàn bộ giao diện sang Astryx

- Thay evondevKit + component tự viết bằng Astryx (`@astryxdesign/core` 0.7.17, theme neutral, ngôn ngữ vi-VN, MIT). Giữ Tailwind cho bố cục qua cầu nối token. Icon `lucide-react`.
- Viết lại: App (AppShell + SideNav), Login, ForceChangePassword, TaskList/Archive (Table + sắp xếp phía backend), TaskNew/TaskDetail/TaskForm (TextInput, DateTimeInput, Selector, NumberInput), EndOfDay, Checklist (TabList, RadioList), StatusManager, DataManager, DeletedTasks, Accounts và các component dùng chung. `useToast`/`useDialog` giữ nguyên API, dựng trên Toast/AlertDialog/Dialog của Astryx. Thêm `DataTable`, `PasswordField`, `RouterLink`; bỏ `DateTimeInput`, `FieldError`, `MenuIcon`, `PasswordInput`, hằng class trong `constants.js`.
- `RichNoteEditor` giữ tự viết (HTML đã lọc, ảnh thu nhỏ), thanh công cụ dùng Button Astryx.
- Khác biệt hành vi giao diện: ô ngày giờ là hai ô (ngày, giờ); ô bắt buộc hiện "Bắt buộc" thay cho dấu `*`; menu bên tự thành ngăn kéo trên màn hẹp; theme đen–trắng thay màu nhấn xanh dương.
- Ô Ghi chú dùng nhãn `Text` thay `Field` (nhãn `for` trỏ vào `contentEditable` bị Chrome cảnh báo).
- Sửa `PROJECT_SPEC.md` (mục 1, 2, 3, 7.1, 7.4–7.6, 10, 11), `RULES.md` (mục 2, 4), `CLAUDE.md` (mục UI/UX).

## 2026-11-26 — Nút ẩn/hiện mật khẩu

- Thêm `PasswordInput.jsx` (ô mật khẩu + nút con mắt `aria-label`, icon `eye`/`eye-off` trong `MenuIcon`); dùng ở Đăng nhập (kể cả ô nhập lại), Đổi mật khẩu ở trang Tài khoản và màn hình ép đổi mật khẩu. Hộp đặt lại mật khẩu của admin vẫn ẩn.

## 2026-11-26 — id nội bộ của task = số sau PP000017-

- `db.js`: `taskIdFromCode`; tạo task đặt `id` = số Pwire; Số Pwire duy nhất toàn hệ thống (kể cả task đã xóa mềm); sửa Số Pwire thì đổi id và dời bảng con; bỏ kiểm tra trùng theo PIC ở khôi phục/chuyển PIC; migration `user_version 4` đổi id task cũ.
- `TaskDetail.jsx`: lưu mà id đổi thì chuyển sang `/tasks/<id mới>`.
- Thử bằng DB tạm (id cũ hoán đổi chéo, số trùng, mã sai mẫu): migration đúng, khóa ngoại sạch, trùng/0/đã xóa bị từ chối, đổi số giữ checklist và lịch sử.

## 2026-11-25 — Ô ghi chú cho viết dài hơn

- `RichNoteEditor.jsx`: vùng soạn `min-h-40 max-h-[80vh]` (trước `max-h-96` chặn cả việc kéo giãn), vẫn `resize-y` và cuộn dọc khi nội dung dài.

## 2026-11-25 — Dấu * bắt buộc màu đỏ

- `TaskForm.jsx`: dấu `*` ở nhãn Số Pwire, Tên task, Ngày giờ nhận, Người giao tách thành span `text-error-strong` (token lỗi), không đổi hành vi.

## 2026-11-25 — Mật khẩu admin đặt cho tài khoản mới tối thiểu 4 ký tự

- `validatePassword(password, minLength = 8)`; tạo tài khoản và đặt lại mật khẩu (admin) dùng 4. Đổi mật khẩu của người dùng, `.env`, `create-user.js` vẫn 8. Hộp đặt lại mật khẩu ở giao diện kiểm tra 4.

## 2026-11-25 — Hiện mật khẩu khi tạo tài khoản

- `Accounts.jsx`: ô mật khẩu ở form thêm tài khoản chuyển `type="text"` (hiện rõ), `autoComplete="off"`. Ô đổi mật khẩu của chính mình và hộp đặt lại mật khẩu vẫn ẩn.

## 2026-11-25 — Xóa vĩnh viễn trong "Task đã xóa"

- API admin `DELETE /api/deleted-tasks/:id` (xóa hẳn khỏi DB, cascade dữ liệu con; chỉ task đã xóa mềm). Giao diện: menu `…` ở mỗi dòng có "Xóa vĩnh viễn" với hộp xác nhận `danger`.

## 2026-11-25 — Xóa mềm task + trang admin "Task đã xóa" (khôi phục)

- DB: cột `tasks.xoa_luc`, `tasks.nguoi_xoa` (migration). `DELETE /api/tasks/:id` thành xóa mềm; task đã xóa bị loại khỏi danh sách, checklist, CSV, áp dụng mẫu, eod và mọi API theo id (404).
- API admin: `GET /api/deleted-tasks`, `POST /api/deleted-tasks/:id/restore` (chặn nếu trùng Số Pwire với task đang hoạt động). Nhật ký ghi `Xóa task` / `Khôi phục task` kèm người thực hiện.
- Giao diện: trang `/da-xoa` (menu "Task đã xóa", chỉ admin) theo khuôn bảng của danh sách task; sửa câu xác nhận xóa ở trang chi tiết.
- Kiểm thử local (server tạm, 18 kiểm tra): user xóa/ẩn/403, admin xem/tìm/khôi phục, trùng Số Pwire, lịch sử.
- Chưa làm: xóa vĩnh viễn (task đã xóa tích lũy mãi).

## 2026-11-25 — Đếm task chưa cập nhật ngay từ đầu ngày

- `useReportSummary`: `total` luôn = mọi task chưa cập nhật hôm nay (trước đây trước 16:30 chỉ đếm task bỏ sót). Ảnh hưởng ô "Cần cập nhật tiến độ", chấm đỏ menu, thanh nhắc. Cập nhật PROJECT_SPEC mục 7.5.

## 2026-11-25 — Hiện đủ ngày tháng năm giờ phút giây

- `formatDateTime` cắt 19 ký tự (có giây); cột Deadline/Cập nhật ở danh sách hiện `dd/mm/yyyy HH:mm:ss`; nhãn "Đã cập nhật lúc" có giây. Cập nhật PROJECT_SPEC mục 7.6.

## 2026-11-25 — Lịch sử thay đổi: thêm cột "Người thay đổi"

- DB: cột `task_history.nguoi_thay_doi` (migration `ALTER TABLE`). Backend: `actorStorage` (AsyncLocalStorage) đặt theo yêu cầu, `addHistory` và hai câu `INSERT … SELECT` (đổi tên trạng thái/Dev) ghi tên đăng nhập. API history trả thêm `nguoi_thay_doi`. Giao diện: cột "Người thay đổi" (UserChip) ở `TaskHistory`.
- Dòng lịch sử cũ không có người (hiện `—`).

## 2026-11-25 — Sửa múi giờ container (UTC → Asia/Ho_Chi_Minh)

- Phát hiện khi test đầy đủ trên task.mtdd.io.vn: task tạo lúc 02:01 giờ Việt Nam bị ghi `19:02` (ngày hôm trước) vì container chạy UTC.
- Sửa `Dockerfile`: `TZ=Asia/Ho_Chi_Minh` và cài `tzdata`. Database production lúc này chưa có task thật nên không phải chuyển dữ liệu cũ.
- Test trên production trước khi sửa: Quản lý data (15 Dev, 10 mục/trang), mẫu checklist 11 mục, tạo task, tick, vấn đề QnA, luật CLOSED (client + server), đóng task, xóa task, toast, hộp thoại; console sạch (400 là phản hồi đúng của luật CLOSED).

## 2026-11-25 — task.mtdd.io.vn vào được

- Nguyên nhân 502: Cloudflare Tunnel trỏ `task.mtdd.io.vn` tới `http://192.168.20.24:6021` (cổng trên máy chủ) nhưng ứng dụng chưa mở cổng ra máy chủ. Sửa: đặt `ports_mappings = 6021:6021` ở Coolify (giống app `video` dùng `6868:6868`) rồi deploy lại.
- Kiểm tra trên https://task.mtdd.io.vn: trả 200, đăng nhập `admin` thành công qua HTTPS, hiện màn ép đổi mật khẩu, console không lỗi. Chưa đổi mật khẩu admin (để người dùng tự đặt).
- Thêm quy tắc "Deploy và test" vào `CLAUDE.md`/`RULES.md`.

## 2026-11-25 — Deploy lên Coolify

- Đẩy mã lên GitHub `minhthanhhlht/web_task_mtdd` (nhánh `main`). Coolify (manage.mtdd.io.vn): project "Quan ly task", ứng dụng `quan-ly-task` (build pack Dockerfile, cổng 6021, domain `https://task.mtdd.io.vn`).
- Cấu hình: volume `/data` (database), file mount `seed-data.json`, biến môi trường `ADMIN_USERNAME`, `ADMIN_PASSWORD` (sinh riêng, không ghi vào repo), `SEED_FILE`.
- Kết quả: build xong, trạng thái `running:healthy`; log: tạo admin mặc định, nạp 15 Dev.
- Còn lại: tạo bản ghi DNS cho `task.mtdd.io.vn` (chưa phân giải), kiểm tra truy cập qua HTTPS, đổi mật khẩu admin ở lần đăng nhập đầu, thu hồi API token đã dùng.

## 2026-11-25 — Chuẩn bị triển khai Coolify (Docker)

- Thêm `Dockerfile`, `.dockerignore`; backend nhận `DB_PATH`, `SEED_FILE`, `TRUST_PROXY`; cookie phiên có `Secure` khi qua HTTPS; bộ giới hạn đăng nhập dùng IP khách thật (`req.ip`).
- Kiểm tra trên bản sao: DB và sao lưu ghi vào thư mục `DB_PATH`; qua proxy HTTPS cookie có `Secure`, 6 lần sai từ IP A bị 429 mà IP B vẫn đăng nhập được; healthcheck 200.
- Chưa build được image thật (máy này không có Docker) và chưa deploy: cần địa chỉ Coolify, cách đưa mã lên (Git repo) và domain.

## 2026-11-25 — Test ghi dữ liệu bằng Chrome DevTools MCP (task thử đã xóa)

- Tạo task thử `PP000017-999999` trên bản chạy thật rồi xóa sau khi test: tạo task (11 mục checklist mặc định), tick từng mục và "Chọn tất cả", thêm vấn đề QnA, đổi trạng thái vấn đề, menu `…`, luật CLOSED (client: "Chuyển sang CLOSED thì tiến độ phải là 100%"; server: "còn 10 mục checklist chưa tick"), đóng task (lên trang Đã hoàn thành, thẻ số liệu cập nhật), hộp thoại xóa, toast. Tất cả đúng như đặc tả.
- Sửa: nhãn nhóm trong lịch sử thay đổi ("Thông tin") bị xuống dòng → `whitespace-nowrap`.
- Hoàn tác Vivid, giữ Tinted + xanh dương.
- Ghi nhận chưa sửa: dòng bảng task chỉ bấm được bằng chuột (không focus được bằng bàn phím).

## 2026-11-25 — Hoàn tác Vivid, giữ Tinted với màu nhấn xanh dương

- Bỏ gradient (nút chính lại là nền đặc xanh, logo, thẻ hero, nhãn thành tích, vệt loang) và token `--color-accent-to` theo yêu cầu người dùng.

## 2026-11-25 — Màu nhấn xanh dương và thêm màu (sắc Tinted)

- Token: `--color-primary` #2563eb (hover #1d4ed8, nền nhạt `primary-light`), focus/vòng focus xanh, `--color-cat-1..3`.
- Giao diện: logo và mục chọn ở sidebar màu xanh, thẻ số liệu `TaskStats` (3 thẻ) ở "Đang xử lý", `UserChip` cho PIC/người dùng, deadline và checklist đổi màu theo mức, liên kết/tab màu xanh, viền checkbox đậm hơn.
- Đã xem trên bản chạy thật (danh sách, trạng thái): hiển thị đúng, console sạch. Chưa xem khi có task thật (cột deadline/checklist, chip PIC trong bảng).

## 2026-11-25 — Test bằng Chrome DevTools MCP trên bản đang chạy (cổng 6021)

- Đã duyệt: đăng nhập (sai mật khẩu), danh sách, thêm task (kiểm tra phía client), cập nhật tiến độ, checklist (mẫu 11 mục), trạng thái, data (15 Dev), đã hoàn thành, tài khoản, menu `…`, sidebar dạng lớp phủ ở màn hẹp. Chỉ đọc/bấm xem, không ghi dữ liệu.
- Sửa: nhãn không gắn với ô, thiếu `name`/`autocomplete` ở các form (đăng nhập, đổi mật khẩu, tài khoản, form task, ô tìm, ô trong dòng bảng, select phân trang); thêm ô tên ẩn cho form mật khẩu; dấu `…` của menu hàng to và rõ hơn. Console của các trang đã duyệt sạch.
- Chưa test: tạo/sửa/xóa task, tick checklist, vấn đề QnA, hộp thoại xác nhận, toast, ảnh dán vào ghi chú (cần cho phép ghi dữ liệu vào database thật).

## 2026-11-25 — Seed Dev và mẫu checklist từ file riêng

- Thêm `backend/seed.js`, `seed-data.example.json`, `seed-data.json` (gitignored, 15 Dev + 11 mục checklist theo ảnh người dùng), script `npm run seed`; server gọi `seedDevIfEmpty()` lúc khởi động.
- Kiểm tra trên bản sao backend với database riêng: DB mới tự nạp 15 Dev; `npm run seed -- --checklist` thay mẫu bằng 11 mục; chạy lại không thêm trùng. Chưa chạy trên `tasks.db` của người dùng.

## 2026-11-25 — Đổi mẫu checklist mặc định thành 11 mục

- `backend/db.js` (`DEFAULT_TEMPLATE_ITEMS`) và `PROJECT_SPEC.md` (mục 3, 4.2, 8, 10): 11 mục theo ảnh người dùng gửi. Chỉ áp dụng khi bảng `checklist_templates` còn trống (database mới); database đang có thì đổi qua giao diện admin (Checklist > Mẫu checklist).

## 2026-11-25 — Review UI bằng skill evon:ui-ux và sửa toàn bộ

**Đã làm** (theo bảng review 16 dòng):
- Màn hẹp: trang chi tiết hết tràn ngang (`min-w-0`), hàng nút/ô tìm không rớt dòng, menu `…` không tràn mép (đã kiểm ở 375px).
- Tương phản: placeholder, nhãn "Chưa cập nhật", ô ghi chú chỉ-đọc.
- Vùng bấm: tiêu đề cột 32px, link, checkbox tự vẽ 16px.
- Token: `<body>` dùng `bg-background`; thêm `--color-error-strong`, `--color-button-hover`.
- Bảng danh sách gọn (cột Link/Deadline/Cập nhật rút gọn) nên vừa khung ở 1440px; vấn đề QnA/Process đổi thành danh sách dòng.
- Mới: `RowMenu` (menu `…`), `Pagination` dạng ‹ 1 2 3 … ›, kiểu checkbox/radio, bỏ vòng focus của nút (kit I13).
- Hook nhắc UI/UX khi sửa `frontend/src` (`.claude/settings.json`, `.claude/hooks/ui-ux-reminder.mjs`).

**Kiểm tra:** build thành công; probe 62 mã → còn 10 mã, đều đã đối chiếu (checkbox 16px có nhãn bấm được; nền rê của link "Mở" theo token kit; menu `…` đã đo trong màn ở 375px; bảng ở archive cuộn ngang ≤1024px).

**Tồn đọng:** bảng danh sách vẫn cuộn ngang ở ≤1280px (không có mờ mép báo còn cột). Chưa soi lại màn đăng nhập, hộp thoại, toast, giao diện user thường.

## 2026-11-25 — Dựng toàn bộ ứng dụng theo PROJECT_SPEC.md

**Đã làm**
- Backend (`backend/`): `schema.sql`, `db.js` (migration, seed 18 trạng thái + 9 mục mẫu, mọi hàm truy vấn/ghi, nhật ký), `auth.js` (scrypt, phiên, phân quyền, giới hạn đăng nhập, quản lý tài khoản, ép đổi mật khẩu), `noteHtml.js`, `server.js` (toàn bộ API, CSV, phục vụ `frontend/dist`), `backup.js`, `create-user.js`.
- Tài khoản admin mặc định `admin` / `admin@123` đọc từ `backend/.env` (chỉ tạo khi bảng `users` rỗng), có cờ `bat_buoc_doi_mat_khau` → ép đổi mật khẩu lần đầu (backend chặn mọi API trừ đổi mật khẩu / me / logout).
- Frontend (`frontend/`): React 19 + Router 7 + Tailwind 4, đủ các trang (Đang xử lý, Thêm task, Chi tiết, Cập nhật tiến độ, Checklist, Quản lý trạng thái, Quản lý data, Đã hoàn thành, Tài khoản, Đăng nhập, Ép đổi mật khẩu) và component dùng chung.
- `start.bat`, `README.md`, `.gitignore`.

**Kiểm tra**
- `npm run build` (frontend) thành công.
- Chạy thử API bằng script (đăng nhập admin mặc định, bị chặn 403 khi chưa đổi mật khẩu, đổi mật khẩu trùng cũ → 400, tạo/sửa task, số Pwire sai/trùng, ngày không có thật, luật CLOSED (90% / còn checklist), tick tất cả, archive, progress_log, `/api/eod` giữ ghi chú, lọc ghi chú HTML, sort sai → 400, CSV có BOM, phân quyền user/admin, sai 6 lần → 429): đạt hết.
- Database thử nghiệm đã xóa; lần chạy thật sẽ tạo mới và seed lại.

**Chưa kiểm tra**
- Giao diện chưa được thao tác thử trên trình duyệt thật (mới build thành công). Cần chạy `start.bat` và đi qua bộ kiểm tra "Giao diện" ở mục 10 của `PROJECT_SPEC.md`.
- Chưa thử 5.000 task mẫu, chưa thử responsive dưới 1024px.

**Việc tiếp theo**
- Chạy thử giao diện thật, sửa lỗi hiển thị nếu có.

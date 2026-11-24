# Web quản lý task cá nhân

Web quản lý task cho một nhóm nhỏ, chạy trên một máy Windows, mở cho các máy cùng mạng nội bộ. Đặc tả đầy đủ: `PROJECT_SPEC.md`. Quy tắc code: `.claude/rules/RULES.md`.

## Chạy

1. Cài Node.js LTS (≥ 20.12).
2. Chạy `start.bat` (tự cài thư viện, build giao diện, mở server tại `http://127.0.0.1:6021`).
3. Máy khác trong mạng: `http://<IP máy chủ>:6021`. Có thể cần mở cổng Windows (chạy bằng Administrator):
   `netsh advfirewall firewall add rule name="Task Tracker 6021" dir=in action=allow protocol=TCP localport=6021 profile=private`

## Tài khoản admin mặc định

Lần chạy đầu (database chưa có tài khoản) server tạo admin từ `backend/.env`:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
```

Đăng nhập lần đầu **bắt buộc đổi mật khẩu** trước khi dùng được ứng dụng. File `.env` không được commit; `backend/.env.example` là bản mẫu. Đổi `.env` khi database đã có tài khoản không có tác dụng.

Quên mật khẩu: `cd backend` rồi `npm run create-user -- <tên>`.

## Dữ liệu riêng (Dev, mẫu checklist)

Tạo `backend/seed-data.json` (mẫu: `seed-data.example.json`, file thật không được commit) với hai danh sách `dev` và `checklist`.

- Database mới: lúc khởi động server tự nạp nhóm Dev nếu còn trống.
- Database đang dùng: dừng server rồi chạy `cd backend && npm run seed` (thêm tên Dev còn thiếu). Thêm `-- --checklist` để thay mẫu checklist; task đã có không đổi, muốn áp cho task cũ thì dùng "Áp dụng mẫu" ở trang Checklist.

## Triển khai lên Coolify (Docker)

Repo có sẵn `Dockerfile` ở gốc. Trong Coolify: tạo ứng dụng từ repo Git, build pack **Dockerfile**, **Ports Exposes = 6021**, healthcheck `/api/auth/me`.

- **Volume lưu bền:** gắn một volume vào `/data` (chứa `tasks.db` và `backups/`). Không gắn thì mất dữ liệu mỗi lần deploy.
- **Biến môi trường:** `ADMIN_USERNAME`, `ADMIN_PASSWORD` (đặt mật khẩu mạnh; chỉ dùng khi database còn trống, lần đăng nhập đầu vẫn bị ép đổi mật khẩu). `DB_PATH=/data/tasks.db` và `TRUST_PROXY=1` đã đặt sẵn trong image.
- **Danh sách Dev / mẫu checklist (tùy chọn):** thêm file `seed-data.json` qua mục *Storages → File mount* tại `/app/backend/seed-data.json`; server nạp nhóm Dev lúc khởi động nếu còn trống.
- **Domain + HTTPS:** để Coolify cấp. Ứng dụng chạy HTTP sau proxy; cookie tự có `Secure` khi đi qua HTTPS.
- **Sao lưu:** `docker exec <container> node backup.js` (ghi vào `/data/backups`) hoặc dùng backup volume của Coolify.
- **Lưu ý bảo mật:** ứng dụng không có giới hạn mạng riêng; đặt Coolify domain nội bộ/VPN nếu không muốn mở ra internet.

## Lệnh hữu ích

- `cd backend && npm run backup` — sao lưu database ra `backend/backups/`.
- `cd frontend && npm run dev` — chạy giao diện ở chế độ phát triển (proxy `/api` sang cổng 6021).

## Lưu ý

- HTTP không mã hóa: chỉ dùng trong mạng nội bộ tin cậy, không mở ra internet.
- Không sửa trực tiếp dữ liệu trong `tasks.db` và không xóa file này để đổi cấu trúc.

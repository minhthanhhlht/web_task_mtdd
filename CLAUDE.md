# Web quản lý task cá nhân

Đặc tả đầy đủ: @PROJECT_SPEC.md
Quy tắc code (bắt buộc tuân thủ): @.claude/rules/RULES.md

## UI/UX (áp dụng từ nay về sau)

- Mọi việc liên quan giao diện (thêm/sửa trang, component, form, bảng, modal, màu sắc, bố cục, responsive) **MUST** theo evondevKit: gọi skill `evon:ui-ux` (plugin `evon@evondevkit`, đã cài ở phạm vi user) trước khi viết hoặc chỉnh giao diện, rồi làm theo các quy tắc của skill.
- Quy tắc UI/UX của dự án ở mục 7.6 của `PROJECT_SPEC.md` và mục "UI/UX theo evondevKit" của `RULES.md`. Nếu skill và hai file này lệch nhau thì dừng lại hỏi người dùng, không tự chọn.
- Giữ nguyên tính năng và hành vi nghiệp vụ; chỉ đổi cách trình bày trừ khi người dùng yêu cầu khác.
- Sau khi sửa giao diện, build (`npm run build` trong `frontend`) và kiểm tra trực quan bằng trình duyệt (Chrome DevTools MCP nếu có) trước khi báo xong.

# Web quản lý task cá nhân

Đặc tả đầy đủ: @PROJECT_SPEC.md
Quy tắc code (bắt buộc tuân thủ): @.claude/rules/RULES.md

## UI/UX (áp dụng từ nay về sau)

- Giao diện của dự án dùng **Astryx** (design system của Meta, thay evondevKit từ 2026-11-28). Mọi việc liên quan giao diện (thêm/sửa trang, component, form, bảng, modal, màu sắc, bố cục, responsive) **MUST** dùng component của Astryx và theo quy tắc ở mục 7.6 của `PROJECT_SPEC.md` và mục "UI theo Astryx" của `RULES.md`. Tra prop bằng `npx @astryxdesign/cli component <Tên> --dense` trong `frontend`, không đoán prop.
- Skill `evon:ui-ux` (evondevKit) **không còn áp dụng** cho dự án này. Nếu người dùng yêu cầu khác với `PROJECT_SPEC.md`/`RULES.md` thì dừng lại hỏi, không tự chọn.
- Giữ nguyên tính năng và hành vi nghiệp vụ; chỉ đổi cách trình bày trừ khi người dùng yêu cầu khác.
- Sau khi sửa giao diện, build (`npm run build` trong `frontend`) và kiểm tra trực quan bằng trình duyệt (Chrome DevTools MCP nếu có) trước khi báo xong.

## Deploy và test (bắt buộc sau mọi thay đổi)

Từ nay, **mọi thay đổi** về mã (backend, frontend, Dockerfile, cấu hình) đều phải deploy lên Coolify và test trên **https://task.mtdd.io.vn** trước khi báo xong. Người dùng đã cho phép sẵn việc commit, push và deploy theo quy trình này.

1. Sửa xong thì build và kiểm tra nhanh ở local (không dùng `tasks.db` của người dùng cho việc thử).
2. Cập nhật `WORKLOG.md`, rồi `git add`, `git commit` (kèm dòng Co-Authored-By) và `git push origin main`. Không đưa `.env`, `seed-data.json`, `tasks.db`, token hay mật khẩu vào commit.
3. Deploy: `POST https://manage.mtdd.io.vn/api/v1/deploy?uuid=3v5wwenzk9npm5pip2hk1eas` với header `Authorization: Bearer <token>`, rồi theo dõi `GET /api/v1/deployments/<deployment_uuid>` tới khi `finished` (hoặc báo lỗi nếu `failed`). Token Coolify lấy từ biến môi trường `COOLIFY_TOKEN` hoặc do người dùng đưa trong phiên; **không** ghi token vào repo, file cấu hình, memory hay tài liệu. Chưa có token thì hỏi người dùng, không tự đoán.
4. Test trên https://task.mtdd.io.vn bằng Chrome DevTools MCP: tải trang, console không lỗi, thử đúng luồng vừa sửa. Dữ liệu thử phải đặt tên rõ ràng (ví dụ `PP000017-999999`) và xóa ngay sau khi test; không sửa hay xóa dữ liệu thật trên production.
5. Chỉ báo "xong" khi deploy `finished` **và** test trên task.mtdd.io.vn đạt. Nếu domain không vào được (ví dụ Cloudflare báo 502) hoặc deploy lỗi thì nói rõ là chưa xong, kèm nguyên nhân; không báo thành công dựa trên test local.
6. Thông tin hạ tầng (không bí mật): Coolify `manage.mtdd.io.vn`, project "Quan ly task", ứng dụng uuid `3v5wwenzk9npm5pip2hk1eas`, repo `minhthanhhlht/web_task_mtdd` nhánh `main`, database ở volume `/data`.

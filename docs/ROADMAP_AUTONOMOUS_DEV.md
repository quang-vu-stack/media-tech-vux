# MEDIA TECH VUS — Kế hoạch phát triển tiếp theo

Dự án ưu tiên chất lượng, không tăng phiên bản chỉ để tạo cảm giác hoàn thành. Người chơi là Chủ tịch/CEO duy nhất và có quyền phê duyệt các hành động quan trọng.

## Bản hiện tại

**v15:** đối soát ngân quỹ toàn bộ sổ cái, có cảnh báo và không tự sửa; mobile audit panel; SQL migration riêng.

## Các mốc ưu tiên sau v15

1. **Staging thực tế**: chạy npm install, React build, Supabase test database và Playwright end-to-end; sửa mọi lỗi phát hiện, không báo đã chạy nếu chỉ kiểm tra tĩnh.
2. **Backup/recovery**: kiểm tra chính sách sao lưu hiện hành của Supabase, tài liệu restore theo môi trường và thử khôi phục bằng project thử nghiệm; không tự xóa hay ghi đè dữ liệu game.
3. **Tối ưu mobile 3D**: cải thiện FPS, camera, chạm để chọn nhân vật, dọn object/texture, giới hạn dpr và giảm draw calls trên điện thoại.
4. **AI giao việc chuẩn**: dự án có tiến độ, đầu ra, chấm chất lượng, xử lý lỗi và cơ chế dừng/cancel an toàn; không cho AI tự thay dữ liệu kinh tế.
5. **Triển khai công khai (cần người dùng cho phép và tài khoản hosting)**: domain, TLS, secrets, backup, worker riêng, quan sát chi phí API và log.

## Quy tắc an toàn khi tiếp tục tự động

- Chọn một milestone có giá trị ở mỗi lượt, ưu tiên lỗi nghiêm trọng trước tính năng mới.
- Luôn làm việc trên bản sao mã nguồn mới nhất, tạo ZIP/migration *additive*, không phá dữ liệu cũ.
- Không tự ý sử dụng dịch vụ có phí, triển khai công khai, thay đổi Supabase/GitHub thật hoặc dùng khóa bí mật.
- Chỉ báo những test thực sự được chạy; nêu rõ các blocker còn lại.
- Thử chạy CI/build với dependencies nếu môi trường cho phép; không gọi là hoàn thiện 100% khi chưa có test tích hợp và phát hành thử.

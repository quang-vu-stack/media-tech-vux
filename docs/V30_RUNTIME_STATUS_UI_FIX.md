# MEDIA TECH VUX v30 — Sửa trạng thái Gemini / nút bổ sung nhân viên

- `CHƯA HOẠT ĐỘNG` trước đây là trạng thái có chủ đích khi `ENABLE_VUX_AUTONOMOUS_GEMINI` mặc định bằng false. Giờ UI ghi `CHƯA SẴN SÀNG`, giải thích nguyên nhân và điều kiện kích hoạt.
- `ĐỦ ĐIỀU KIỆN` chỉ là trạng thái kiểm tra cấu hình, **không chứng minh worker đã chạy**.
- Nút bổ sung nhân viên bị vô hiệu khi đã có >=19 nhân viên; UI thông báo rõ điều này để người chơi không nhầm là lỗi.
- Không tự bật Gemini, không thêm khóa bí mật, không thay đổi database.

## Nếu muốn bật Gemini tự chủ (có thể phát sinh phí)

1. Cài và cấu hình backend + Supabase VUX an toàn.
2. Đặt `GEMINI_API_KEY` trong môi trường **backend**; không đặt trong biến `VITE_` hoặc frontend.
3. Sau khi chấp nhận ngân sách API, đặt `ENABLE_VUX_AUTONOMOUS_GEMINI=true` trên backend và khởi động lại worker/API.
4. Đặt conversation_mode = adaptive, kiểm tra giới hạn 12 lượt/24h, theo dõi log server và nhật ký AI trò chuyện.
5. Nếu vẫn báo chưa sẵn sàng, kiểm tra `ENABLE_BACKGROUND_WORKER`, trạng thái nhân viên và kết nối Supabase.

## Kiểm thử

`npm run test:all`: PASS 318/318. Frontend build / Playwright E2E: NOT_RUN trong lần vá giao diện này.

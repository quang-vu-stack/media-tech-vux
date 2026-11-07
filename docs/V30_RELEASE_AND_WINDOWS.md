# MEDIA TECH VUX — CEO EMPIRE v30: hướng dẫn, thay đổi và QA

## Mã nguồn nền tảng và những gì còn nguyên

- Nâng cấp trực tiếp từ v29 trong thư mục/package lịch sử `media-tech-vus`.
- Giữ 8 khu vực, văn phòng 3D chibi, 19 nhân viên VUX khởi đầu, cấp độ tối đa 100, phòng họp 20 người, sáu tốc độ, nền tài chính và hợp đồng của v29.
- Vốn 2.000.000.000 VNĐ **chỉ dành cho công ty VUX khởi tạo mới**. Không sửa số dư hoặc nhân viên của bất cứ công ty đang tồn tại nào.
- Không đổi tên hàng loạt database, RPC hay bảng. Không có migration mới cho v30.

## Các module mới / sửa trực tiếp

1. `apps/web/src/vux-live-feed.js` cùng `.d.ts`: chuẩn hóa tối đa 20 hội thoại lưu trữ, lọc bản ghi hỏng, lấy lời thoại mới nhất từng nhân viên; sau 150 giây bong bóng hết hiệu lực.
2. `apps/web/src/components/VuxLiveActivity.tsx`: bảng hoạt động AI trên Dashboard, có mở nhật ký và làm mới thủ công. Nội dung không phải chatbot giả lập ngoại tuyến.
3. `apps/web/src/App.tsx`: tải cài đặt theo phiên CEO và công ty; kiểm tra nội dung hội thoại mỗi 25 giây khi trang hiện, hủy yêu cầu khi đổi phiên; không gọi Gemini từ trình duyệt.
4. `apps/web/src/components/OfficeScene.tsx`: các bong bóng 3D lấy câu thoại đã lưu; không lặp hoạt ảnh React khi trạng thái nhân viên chưa đổi.
5. `apps/api/src/vux-conversation-policy.js`: nguyên tắc cho 12 cuộc/ngày ở `adaptive`, hai cuộc/ngày ở `quiet`, không cuộc nào ở `off`; `quiet` tối thiểu một giờ giữa các lần có kết quả.
6. `apps/api/src/index.js`: API mới `GET /api/vux/runtime` đã đăng nhập, chỉ cho công ty VUX, không tiết lộ key; worker bỏ qua người đang dự họp CEO; tôn trọng cả `ENABLE_BACKGROUND_WORKER` và `ENABLE_VUX_AUTONOMOUS_GEMINI`.
7. `apps/web/src/components/VuxControlPanel.tsx`: thông báo trạng thái AI thực tế, hạn mức còn lại và lý do chưa bật; xóa dữ liệu chat màn hình ngay khi chuyển tài khoản.
8. `scripts/vux-v30.test.mjs`: 16 bài kiểm tra mới (có thể thay đổi nếu bổ sung kiểm thử); sửa kiểm tra phiên bản cũ thành kiểm tra tự động theo package.

## Cài trên Windows

1. Giải nén ZIP v30, vào thư mục `media-tech-vus` chứa `package.json`.
2. Dùng Node.js 22.12 trở lên, mở PowerShell và chạy:

```powershell
npm install
npm run preflight:build
npm run test:all
npm run build
```

3. Đảm bảo `apps/web/.env` và `apps/api/.env` tồn tại và chứa URL Supabase **cùng một project**, frontend chỉ có publishable/anon key, backend giữ service-role key. Dùng `VITE_API_URL=/api`.
4. Sau khi database QA đã được cập nhật đến v29 và build thành công, chạy `npm run dev` và mở `http://localhost:5173`.
5. Kiểm tra Dashboard → **Hoạt động AI trong trụ sở** và menu **VUX · AI tự chủ**. Nếu chưa bật Gemini, bảng AI có thể trống, đó là trạng thái đúng.

## Supabase và Gemini

**Không chạy lại migration đã áp dụng** và **không chạy migration lên project production khi chưa kiểm thử QA + sao lưu**. V30 không thêm bảng, cột hay trigger. Nếu các bảng VUX chưa có, phải kiểm thử migration `supabase/upgrade_v29_vux_opt_in.sql` trên một database QA riêng trước. Giữ cơ chế một công ty/một tài khoản của bản hiện hành; tài khoản VUS cũ không tự trở thành VUX.

Để tự động gọi Gemini, *trên server riêng và sau khi chấp thuận chi phí*, cần `GEMINI_API_KEY`, `ENABLE_BACKGROUND_WORKER=true`, `ENABLE_VUX_AUTONOMOUS_GEMINI=true`. Người chơi chọn `adaptive`, `quiet` hoặc `off` qua giao diện và lưu Supabase. Worker cần server chạy liên tục; nếu server tắt, không có Gemini nào hoạt động trong thời gian đó. Tốc độ hoạt ảnh 0.15×–2× không tăng lượt Gemini.

## QA — trạng thái thực tế

- `npm run test:all`: PASS khi Node tests và kiểm tra cấu trúc đạt.
- Parse cú pháp TypeScript/TSX: PASS trên môi trường kiểm thử hiện tại, **không phải** full typecheck.
- `npm run qa:browser:python`: PASS đối với Chromium self-test độc lập; **không** phải Playwright E2E game.
- `npm run preflight:build`: FAIL nếu chưa cài npm dependencies.
- `npm run build`: FAIL trong môi trường đóng gói do thiếu React, Vite, Three Fiber, Supabase SDK. Không thể xác nhận đã sửa toàn bộ lỗi type/runtime tiềm ẩn.
- Supabase QA migration / Auth / RLS / nhiều tài khoản: NOT_RUN.
- Gemini thật, phí API, 3D FPS trên điện thoại: NOT_RUN.

Đọc `qa-reports/v30-local-report.json` và tiếp tục với QA riêng. **Chưa có deployment production**.

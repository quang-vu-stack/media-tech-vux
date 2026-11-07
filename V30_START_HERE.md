# MEDIA TECH VUX — CEO EMPIRE v30

Phiên bản này **nâng cấp trên mã nguồn v29**, không tạo ứng dụng mới.

## Có gì mới?

- Hội thoại Gemini đã lưu được đồng bộ lên Dashboard và các bong bóng trên nhân viên trong văn phòng 3D, chỉ khi có dữ liệu thật.
- Cảnh báo cho CEO biết worker Gemini đã bật/chưa bật, hạn mức còn lại; không đưa API key ra frontend.
- Loại trừ nhân viên đang họp CEO khỏi các cuộc hội thoại tự động, giảm cập nhật React không cần thiết.
- Chặn phản hồi hội thoại từ phiên tài khoản cũ khi đổi CEO.

## Chạy trên Windows

```powershell
npm install
npm run preflight:build
npm run test:all
npm run build
npm run dev
```

Cần giữ file `.env` hợp lệ của **project QA** hoặc thiết lập mới từ các file `.env.example`. Không chạy lại migration lịch sử nếu đã áp dụng. Bản v30 **không có migration mới** nhưng yêu cầu database đã có các bảng VUX từ v29 để sử dụng các tính năng AI.

**Mặc định Gemini tự động tắt, không tự phát sinh phí API.**

Đọc `docs/V30_RELEASE_AND_WINDOWS.md` và `qa-reports/v30-local-report.json` để biết giới hạn kiểm thử. 318/318 test Node đạt; production React build vẫn FAIL ở môi trường đóng gói do thiếu npm dependencies; Supabase QA và E2E game thật NOT_RUN.

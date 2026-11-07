# MEDIA TECH VUS — CEO EMPIRE v27 VIP

## Phạm vi công việc đã thực hiện

Bản v27 tập trung vào lỗi chạy thực tế và riêng tư khi trình duyệt đăng nhập bằng hai tài khoản CEO khác nhau. Xây dựng dựa trên ZIP v26, giữ nguyên các chức năng game và SQL migrations từ v1 đến v23.

### 1. Tránh lẫn dữ liệu CEO khi đổi tài khoản

- Mọi phản hồi đọc công ty được ràng buộc với **token phiên và thứ tự yêu cầu**. Phản hồi từ phiên trước hoặc lượt tải cũ không được cập nhật màn hình.
- Giao diện được khóa ở màn tải cho đến khi nhận dữ liệu đúng token hiện tại; dữ liệu người cũ được xóa khỏi state khi token thay đổi.
- `getSession()` về chậm không còn được phép ghi đè trạng thái từ sự kiện `SIGNED_IN`/`SIGNED_OUT` mới.

### 2. Chống lỗi xoay vòng vô hạn và chồng request

- Lỗi tải tiến trình đầu tiên được hiển thị kèm nút **Thử lại**. Trước đây `loadedForToken` không được cập nhật khi request lỗi nên người chơi có thể kẹt ở spinner.
- Request GET `/state` và `/meetings` được hủy khi cần thay lượt tải hoặc khi rời phiên, kết hợp timeout tối đa 75 giây; mặc định vẫn là 20 giây.
- Các thao tác tiền, thưởng, giao việc tiếp tục **không** tự gửi lại khi mạng lỗi để tránh trùng giao dịch.

### 3. Chat đúng nhân viên và tài khoản

- Danh sách chat hiển thị chỉ khi đúng cặp token phiên + ID nhân viên đang chọn.
- Phản hồi chat cũ không được cập nhật vào nhân viên mới sau khi chọn người khác.
- Hủy request lịch sử khi đổi nhân viên hoặc rời màn chat.

### 4. Kiểm thử bổ sung

- `scripts/session-guard.test.mjs`: đổi tài khoản, thứ tự phản hồi và hủy request.
- `scripts/auth-session-race.test.mjs`: sự kiện đăng nhập/đăng xuất thắng phản hồi `getSession` cũ.
- `scripts/request-signal.test.mjs`: timeout và hủy request.
- `scripts/session-integrity.test.mjs`: kiểm tra kết nối UI, retry, chat và quy tắc gọi API.
- `scripts/e2e-browser.spec.ts`: kịch bản bổ sung cho hai tài khoản QA và lỗi mạng ban đầu (**chưa chạy thật** nếu không có Chromium, API và project QA riêng).

## Nâng cấp từ v26

1. Sao lưu dữ liệu Supabase và ZIP cũ.
2. Giải nén ZIP v27, giữ lại hai file `.env` của bạn mà không đưa API secret vào frontend.
3. Không chạy migration mới; database vẫn cần tất cả migrations trước v27.
4. Trong PowerShell ở thư mục gốc:

```powershell
npm install
npm run test:all
npm run preflight:build
npm run build
npm run dev
```

5. Khi chạy Docker, kiểm tra `docker compose --env-file .env.deploy up --build -d` và `npm run smoke:deployed` trên môi trường riêng sau khi cấu hình đầy đủ.

## Trạng thái kiểm chứng và giới hạn

- Kiểm tra logic Node + phân tích cú pháp TypeScript đã chạy; xem `docs/qa-evidence/v27-local.json`.
- **Chưa xác minh build frontend và chạy trình duyệt thật** trong môi trường bàn giao do không cài được React/Vite từ npm registry (lỗi mạng DNS/EAI_AGAIN).
- **Chưa kiểm thử Supabase/Gemini/OpenAI thật** vì không có cấu hình và project QA riêng được xác nhận.
- Không được quảng cáo là đã triển khai online hoặc hoàn thành 100% cho đến khi các bài kiểm tra còn thiếu đạt.
- Các yêu cầu cập nhật dữ liệu được gửi trước khi đăng xuất có thể đã được xử lý ở backend; hủy mạng chỉ ngăn phản hồi cũ cập nhật giao diện, không hoàn tác giao dịch đã commit.

## Các hạng mục vẫn cần để phát hành thật

1. Cài dependencies và tạo build sạch trên một máy có Internet hoặc GitHub Actions có quyền truy cập npm.
2. Chạy toàn bộ migration trên project Supabase QA riêng; xác minh RLS, các RPC tài chính và tính đúng đắn của worker.
3. Chạy Playwright Chromium và kiểm thử hai tài khoản QA trong trình duyệt.
4. Kiểm thử bảo mật, backup/restore dữ liệu và giám sát máy chủ trước khi triển khai công khai.

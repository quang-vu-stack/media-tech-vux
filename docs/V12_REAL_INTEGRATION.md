# MEDIA TECH VUS v12 — Kiểm thử tích hợp thực tế

## Các bài kiểm tra được bổ sung

### 1. Supabase + API integration (2 tài khoản thử)

`npm run test:integration` tạo hai người dùng thử trong **project Supabase test riêng** và thực hiện yêu cầu HTTP qua backend Node đang chạy. Kiểm tra:

1. API /ready xác minh schema/migrations.
2. Từ chối người chưa đăng nhập.
3. Hai tài khoản không nhìn thấy tập đoàn của nhau.
4. CEO mới tạo tập đoàn vốn 10.000.000.000 VNĐ và 12 nhân viên.
5. Tài khoản B không thể giao việc cho nhân viên công ty A.
6. Một nhân viên không nhận hai task đang thực hiện.
7. Tài khoản B không thể cập nhật task công ty A.
8. Hoàn thành 4 mốc 25% trả thưởng 500.000 VNĐ, cộng đúng 120 XP.
9. Gọi lại endpoint đã hoàn thành không tạo thưởng lặp.
10. Đọc lại game state xác minh dữ liệu lưu trên server.

**NGUY CƠ:** Tool sử dụng quyền admin Supabase để tạo/xóa hai tài khoản thử, cùng toàn bộ công ty thử thuộc các tài khoản đó. DÙNG PROJECT RIÊNG, KHÔNG DÙNG PRODUCTION. Trong `finally`, script gọi xóa tài khoản thử; nếu mạng lỗi cần xóa thủ công theo ID được in ra.

#### Cách chạy trong PowerShell (test project riêng)

- Clone một Supabase project **dành cho thử nghiệm**, chạy `supabase/schema.sql` và tất cả migration v2 → v9 đúng thứ tự; không sao chép dữ liệu khách hàng thật.
- Cấu hình `apps/api/.env` **chỉ cho test project**, khởi động API bằng `npm run start:api` ở Terminal 1.
- Terminal 2, tại thư mục gốc:

```powershell
$env:SUPABASE_URL='https://YOUR_TEST_REF.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY='YOUR_TEST_PROJECT_SECRET'
$env:SUPABASE_ANON_KEY='YOUR_TEST_PROJECT_PUBLISHABLE_OR_ANON_KEY'
$env:INTEGRATION_API_BASE='http://localhost:4000/api'
$env:INTEGRATION_ALLOW_CREATE_USERS='YES_TEST_PROJECT'
npm run test:integration
```

**Chỉ xác nhận `YES_TEST_PROJECT` sau khi kiểm tra 2 file `.env` và 4 biến trên trỏ cùng một Supabase test project.** Thực thi script không gửi API key hoặc mật khẩu lên frontend. Không commit các biến môi trường/secret.

> `npm run test:all` là test logic không cần Supabase; **không** tự chạy integration để tránh tạo dữ liệu ngoài ý muốn.

### 2. Kiểm thử giao diện thật bằng Playwright

```powershell
npm install
npx playwright install chromium
npm run dev
# Terminal khác
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5173'
npm run test:e2e
```

Bài smoke mặc định kiểm tra trang đăng nhập không lỗi JS. Nếu có tài khoản thử đã tạo sẵn công ty trên test Supabase:

```powershell
$env:E2E_EMAIL='ceo-test@example.com'
$env:E2E_PASSWORD='YOUR_TEST_PASSWORD'
npm run test:e2e
```

Bài thứ hai đăng nhập, xác nhận dashboard CEO và mở Học viện CEO; tự bỏ qua nếu không cung cấp tài khoản thử. Cần URL Supabase thực tế trong `apps/web/.env`. Đừng cung cấp tài khoản production. Playwright chưa tự kiểm thử WebGL rendering, QA có thể cần xem thủ công trên GPU/trình duyệt của bạn.

### 3. GitHub Actions CI

`.github/workflows/validate.yml` chạy unit tests và build; bổ sung job dùng Chromium headless để kiểm tra trang login khi cấu hình giả lập. Job không gọi API Gemini/OpenAI và không chứa secret.

## Phạm vi chưa hoàn thành

- Chưa thực thi integration với Supabase thật trong môi trường tạo mã vì không có dự án/credentials người dùng.
- Chưa chạy build đầy đủ hay chạy Playwright vì npm registry không truy cập được trong môi trường tạo mã.
- Chưa test stress/concurrency nhiều backend instances, migrations production, sao lưu/phục hồi hoặc WebGL 3D thực trên thiết bị cuối.
- Bộ integration mặc định test tiền, quyền sở hữu, task; chưa kiểm tra toàn bộ 100% chức năng dự án.

## Lưu ý bảo vệ dữ liệu

`SUPABASE_SERVICE_ROLE_KEY` chỉ nằm trên backend/test runner. Các mã nguồn test không lưu key hay mật khẩu vào ZIP. Trước khi triển khai production cần thử luồng đa tenant, giới hạn rate, CSRF/CORS phù hợp, backup và phục hồi thật.

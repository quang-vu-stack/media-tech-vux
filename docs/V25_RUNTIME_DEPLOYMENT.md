# MEDIA TECH VUS v25 VIP — Runtime & Deployment Fixes

## Những sửa đổi đã thực hiện

1. **API cùng origin `/api`:** phiên bản cũ mặc định tới `http://localhost:4000/api`, gây lỗi khi người dùng mở website từ một máy khác hoặc qua HTTPS. Mặc định mới là `/api`. Vite dev proxy tới `127.0.0.1:4000`, và Nginx production vẫn proxy `/api` tới container `api:4000`.
2. **Bộ kiểm tra trước build (`npm run preflight:build`):** phân biệt thiếu package, Node không đủ phiên bản và cấu hình API có nguy cơ lỗi mixed-content. Thử build thật vẫn cần `npm run build`.
3. **Smoke test file frontend đã xuất bản:** `npm run smoke:deployed` giờ kiểm tra có JS asset hash và file JS/CSS trả về nội dung hợp lệ; phát hiện lỗi Nginx trả HTML fallback thay vì JS/CSS.
4. **Báo cáo QA phiên bản v25:** tiếp tục ghi rõ `NOT_RUN` cho các kiểm tra thật chưa được chạy. CI bổ sung bước preflight và đường dẫn báo cáo đã cập nhật.
5. **Không thêm migration SQL:** không sửa số dư, XP, họp AI, nhiệm vụ hay dữ liệu người chơi.

## Nâng cấp từ v24

Sao lưu thư mục source cũ và các file `.env` trước khi giải nén v25. Giữ nguyên Supabase URL, publishable key và các secret backend của bạn; **không gửi key qua chat**.

Nếu `apps/web/.env` vẫn ghi `VITE_API_URL=http://localhost:4000/api`, đổi thành `VITE_API_URL=/api`.

Chạy trong thư mục gốc của dự án:

```powershell
node --version
npm install --no-audit --no-fund
npm run preflight:build
npm run test:all
npm run build
npm run dev
```

Mở http://localhost:5173 để kiểm tra login/đăng ký và API `/api/health` qua Vite proxy.

## Triển khai Docker

Khi đã có `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` hợp lệ trong `.env.deploy`:

```powershell
npm run check:deploy
docker compose --env-file .env.deploy up --build -d
npm run smoke:deployed
```

Mặc định website là http://localhost:8080, chỉ bind địa chỉ loopback. Muốn công khai lên Internet phải cấu hình hosting, TLS/HTTPS và giám sát riêng; **bản ZIP này không tự đăng lên hosting**.

Smoke kiểm tra: HTML ứng dụng, `/api/health`, `/api/ready`, chặn truy cập `/api/state` khi chưa đăng nhập, đồng thời file JS/CSS của frontend. Backend chỉ trả `ready=200` nếu Supabase và các migration hoạt động.

## Kết quả môi trường đóng gói

- 243/243 bài test Node đạt (gồm 12 bài mới cho v25).
- Kiểm tra nguồn TypeScript/TSX không đồng nghĩa build hoàn chỉnh.
- Lệnh `npm run build` đã được chạy nhưng thất bại do chưa có các package React/Vite và kiểu dữ liệu npm. Cần chạy lại sau khi `npm install` thành công trong môi trường có mạng.
- Không có cơ sở dữ liệu Supabase QA hay token truy cập hợp lệ trong môi trường đóng gói. Thử nghiệm nhiều tài khoản, Gemini/OpenAI, và môi trường Docker thật **chưa chạy**.
- Báo cáo máy tính tại `docs/qa-evidence/v25-local.json` là bằng chứng cho các lệnh local đã thực hiện; không phải chứng nhận vận hành production.

## Nếu gặp lỗi

- `Cannot find module 'react'` / `react/jsx-runtime`: kiểm tra `node_modules`, `npm install` và Node >=22.12.
- `502 Bad Gateway /api/*`: backend Node chưa sẵn sàng hoặc Nginx không kết nối được service `api`.
- API trả 503 tại `/api/ready`: kiểm tra cấu hình Supabase, kết nối database và các migration.
- Đăng nhập chạy trên máy phát triển nhưng lỗi trên máy khác: kiểm tra `VITE_API_URL=/api`, `WEB_ORIGIN` và HTTPS.
- JS trả HTML hoặc 404: kiểm tra Docker web đã build đúng và `nginx` trỏ `/usr/share/nginx/html`.
- **Không dùng database thật** để chạy bài test tích hợp tạo tài khoản; yêu cầu Supabase project QA tách biệt theo `docs/V24_REAL_INTEGRATION_QA.md`.

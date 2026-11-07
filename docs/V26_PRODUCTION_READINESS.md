# MEDIA TECH VUS — CEO EMPIRE v26 VIP
## Production Readiness: bảo vệ token, kiểm tra tài nguyên web, chốt phát hành

### Mục tiêu
Bản v26 dựa trên v25, không thay đổi SQL, ngân quỹ, nhân viên, trò chuyện AI hay cấp độ công ty. Tập trung vào các lỗi dễ gây sự cố khi chạy ngoài laptop.

### Các thay đổi
1. **Chặn lộ token vì cấu hình API**: `apps/web/src/api-origin.js` chỉ cho phép backend qua `/api` cùng origin. URL API ngoài origin cấu hình nhầm sẽ bị bỏ qua, không được dùng làm điểm đến cho bearer token của CEO. Đường dẫn API nguy hiểm bị từ chối trước khi fetch.
2. **Sửa Nginx**: nhắc lại `X-Content-Type-Options: nosniff` và các header bảo vệ cho `/assets/` và trang HTML, do Nginx không tự kế thừa `add_header` từ cấp cha khi location con có `add_header` riêng. Trang HTML dùng `Cache-Control: no-cache` để người chơi nhận bản JS mới.
3. **Kiểm tra tài nguyên đã deploy**: `npm run smoke:deployed` kiểm tra file JS/CSS là file thật, MIME phù hợp và header `nosniff`, thay vì chấp nhận trang HTML fallback hoặc phản hồi giả HTTP 200.
4. **Bộ chốt phát hành**: `scripts/release-gate.mjs` có ba mức: `logic`, `build`, `production`. Mỗi mức chỉ PASS khi đủ bằng chứng. Thiếu bằng chứng hoặc NOT_RUN đều là BLOCK.
5. **Báo cáo QA cập nhật tự động**: `npm run qa:report` tự tìm toàn bộ bài test `*.test.mjs`, không bỏ sót test mới khi quên sửa danh sách thủ công. Báo cáo không ghi khóa API, token, tên tài khoản hay dữ liệu SQL.
6. **CI có cổng build**: GitHub Actions chạy QA report rồi bắt buộc `release:gate --level=build` trong job build; chưa đánh dấu triển khai production nếu chưa có QA thực tế.

### Không cần migration SQL mới
- Nếu database đã ở v23 (các bản v24, v25 không có migration mới), v26 tiếp tục tương thích.
- Không chạy lại migration cũ nếu nó đã được áp dụng.
- Để an toàn, vẫn sao lưu dữ liệu trước khi thay đổi máy chủ / cấu hình môi trường.

### Chạy trên Windows (PowerShell)
```powershell
npm install --no-audit --no-fund
npm run preflight:build
npm run test:all
npm run build
npm run qa:report -- --build
npm run release:gate -- --level=build
npm run dev
```
Mở http://localhost:5173 khi web và API đã hoạt động. Frontend dùng `VITE_API_URL=/api`.

> Nếu không có internet để tải thư viện, `npm install` và `npm run build` có thể thất bại. Điều này KHÔNG đồng nghĩa kiểm thử build đã thành công. Môi trường tạo ZIP chưa có bộ thư viện React/Vite nên build CHƯA được xác minh.

### Kiểm tra sau triển khai bằng Docker (không dùng dữ liệu thật khi thử lần đầu)
```powershell
npm run check:deploy
docker compose --env-file .env.deploy up --build -d
npm run smoke:deployed
```
Với URL public, `VUS_PUBLIC_URL` phải sử dụng HTTPS. API cần `/api/ready` thành công, test JS/CSS phải trả đúng MIME và security headers. Không công khai backend cổng 4000.

### Lệnh release gate
```powershell
npm run qa:report -- --build
npm run release:gate -- --level=logic
npm run release:gate -- --level=build
npm run release:gate -- --level=production
```
- `logic`: test Node, kiểm tra cấu trúc, cú pháp backend.
- `build`: các mục trên + build React/Vite thực sự PASS.
- `production`: tất cả trên + Playwright thật, tích hợp Supabase QA thật và HTTP asset smoke sau triển khai.

Bộ gate chỉ **đọc báo cáo**; nó không triển khai, không gọi dịch vụ AI hoặc thay đổi database. Trạng thái `NOT_RUN` không được xem là PASS. Một kết quả `logic` đạt KHÔNG khẳng định game đã chạy online.

### Kết quả kiểm thử khi tạo bản v26
- 261/261 test Node đạt (bao gồm test bảo vệ API, release gate và Nginx).
- 30 file TS/TSX qua kiểm tra cú pháp (không thay cho typecheck).
- Backend Node `--check` đạt.
- `npm run build` thất bại do môi trường thiếu React, Vite và khai báo type — không kết luận toàn bộ mã nguồn build được.
- Supabase QA, trình duyệt Chromium, Docker thực tế chưa được chạy.

Dữ liệu công ty hiện tại chưa được chỉnh sửa. Hướng dẫn này không khẳng định bản v26 đã sẵn sàng production.

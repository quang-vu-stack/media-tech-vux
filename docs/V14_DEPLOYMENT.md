# MEDIA TECH VUS — v14 | Triển khai web + API qua Docker Compose

## Kết quả của phiên bản này

Gói v14 thêm Dockerfiles, Nginx reverse proxy, Compose, công cụ chẩn đoán cấu hình trước khi chạy, và smoke test HTTP sau khi chạy. Không có migration SQL mới. Dữ liệu cũ trong Supabase không thay đổi bởi việc nâng cấp container; **hãy sao lưu Supabase trước mọi lần cập nhật database**.

**Giới hạn quan trọng:** Docker trong v14 tạo môi trường chạy gần giống production trên một máy; KHÔNG tự động đưa game lên tên miền public. Mặc định web chỉ mở tại `127.0.0.1:8080`, còn API không công khai port. Để phát hành trên Internet phải tự cấu hình HTTPS/TLS và reverse proxy phía ngoài, domain, firewall, giám sát và sao lưu. Mô phỏng offline cần máy chủ luôn chạy. Worker trong API **chỉ được chạy một replica**, do bộ điều phối hiện dùng khóa trong bộ nhớ, không có distributed lock.

## Yêu cầu

- Docker Engine cùng plugin Docker Compose (`docker compose`); trên Windows dùng Docker Desktop + WSL2.
- Tài khoản Supabase đã chạy `schema.sql` và toàn bộ migration từ v2 đến v9 theo đúng thứ tự trong hướng dẫn các bản trước. Nếu `/api/ready` trả HTTP 503, kiểm tra lại migration và khóa.
- Nếu bật Gemini/OpenAI cần API key tương ứng. Có thể để trống cả hai để chạy chức năng không phụ thuộc dịch vụ AI.
- Internet tại thời điểm Docker build để tải npm packages và Docker images.
- Chỉ tạo file cấu hình trên **máy triển khai đáng tin cậy**.

## Cài đặt trên Windows PowerShell

Tại thư mục gốc `media-tech-vus`:

```powershell
Copy-Item .env.deploy.example .env.deploy
notepad .env.deploy
```

Điền `SUPABASE_URL`, `SUPABASE_ANON_KEY` (key công khai) và `SUPABASE_SERVICE_ROLE_KEY` (key bí mật). Cấu hình `WEB_ORIGIN=http://localhost:8080`. Tên miền công khai cần `WEB_ORIGIN=https://your-domain.example` và proxy HTTPS riêng.

Kiểm tra file mà **không hiển thị secret**:

```powershell
node scripts/deploy-check.mjs
```

Có thể dùng `npm run check:deploy` nếu Node.js được cài trên máy.

Kiểm tra Compose (lưu ý `config` có thể in biến môi trường bí mật, đừng chia sẻ output):

```powershell
docker compose --env-file .env.deploy config --quiet
```

Build và chạy (Web và API):

```powershell
docker compose --env-file .env.deploy up --build -d
```

Tới `http://localhost:8080`. Xem trạng thái và log:

```powershell
docker compose --env-file .env.deploy ps
docker compose --env-file .env.deploy logs --tail 60 api
docker compose --env-file .env.deploy logs --tail 60 web
```

Kiểm tra HTTP tự động:

```powershell
npm run smoke:deployed
```

Lệnh smoke kiểm tra trang web trả HTML React, API `/api/health` hoạt động, database `/api/ready` báo sẵn sàng, và API `/api/state` từ chối người chưa đăng nhập. Không cần key cá nhân cho smoke test; chạy local và không đưa log chứa thông tin riêng ra công khai.

Tắt container **không xóa database Supabase**:

```powershell
docker compose --env-file .env.deploy down
```

### Khi sử dụng tên miền public

- Đặt proxy HTTPS bên ngoài cổng 8080, để web Docker tiếp tục bind `127.0.0.1`; proxy phải chuyển đúng `Host`, `X-Forwarded-Proto` và các header xác thực.
- Trong Supabase Authentication, cập nhật Site URL và Redirect URLs đúng tên miền và scheme HTTPS.
- Nếu đổi `.env.deploy` thì phải rebuild web vì `VITE_*` được nhúng vào JavaScript lúc **build**; khóa công khai Supabase có thể nằm trong bundle và điều đó bình thường. **Tuyệt đối không đặt service role hoặc OpenAI/Gemini key trong VITE_***.
- Để máy chủ reboot vẫn hoạt động: sử dụng chế độ restart Docker, nhưng cần kiểm tra Docker daemon tự khởi động.
- Chỉ có một API instance chạy worker trong v14, không `docker compose up --scale api=2`. Trước khi mở rộng nhiều instance, cần chuyển worker sang hàng đợi có distributed lock và idempotency cấp database.
- Đặt mức hạn chế chi phí AI, phòng chống lạm dụng, backup database theo gói Supabase, khôi phục thử, theo dõi logs và điều khoản sử dụng trước khi đưa lên mạng công khai.

## Các bài kiểm tra có trong mã nguồn

| Lệnh | Mục đích | Có cần kết nối thật? |
|---|---|---|
| `npm run test:all` | Kiểm tra logic game, quyền, mã nguồn và luật deploy | Không |
| `npm run check:deploy` | Validate file `.env.deploy` (không in secret) | Không |
| `npm run smoke:deployed` | Kiểm tra web / health / readiness / 401 qua HTTP | Có — cần hai container đang chạy |
| `npm run test:integration` | Supabase sandbox test | Có — project test độc lập |
| `npm run test:e2e` | Kiểm thử UI Playwright | Có — Chromium và app cần chạy |

## Khắc phục sự cố

- **`/api/ready` không OK**: Kiểm tra schema, migration, database/URL, service key và mạng. Không đưa SQL error trực tiếp cho người chơi.
- **Frontend hiển thị màn cài đặt**: Docker web build không nhận `SUPABASE_URL` hoặc `SUPABASE_ANON_KEY`; sửa `.env.deploy`, build lại.
- **Không chat được AI**: API key bị thiếu/hết quota/model không hỗ trợ; web vẫn dùng được các phần mô phỏng thông thường.
- **Trang tự tải được nhưng không đăng nhập được**: Kiểm tra Supabase Auth URL allowlist, email confirmation, browser devtools, và địa chỉ Supabase ở bản build.
- **Worker không tiến**: Kiểm tra log `api`, trạng thái `ENABLE_BACKGROUND_WORKER=true` và endpoint dashboard Vận hành; worker phải tiếp tục chạy khi trình duyệt đóng.

## Cảnh báo mức độ kiểm thử

Bản v14 có bài test logic/structural và bản kiểm thử HTTP (smoke) để chạy trên máy thật. Nơi tạo gói không có Docker daemon và không tải npm packages, nên không thể xác nhận Docker build/run và Supabase network thực tế. Phải thực hiện bước trên ở môi trường mạng đầy đủ trước khi gọi đây là bản đã triển khai thành công.

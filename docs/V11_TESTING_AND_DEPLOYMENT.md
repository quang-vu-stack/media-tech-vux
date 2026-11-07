# MEDIA TECH VUS v11 — Quality Gate & Deployment Readiness

## Tại sao v11 ưu tiên độ ổn định

Bản v10 có các bài test Node và giám sát worker, nhưng `/api/health` chỉ xác nhận tiến trình Node.js đã chạy. Ở v11, `/api/ready` xác nhận kết nối Supabase và các bảng mới cần có. Kết quả an toàn, không lộ chi tiết SQL hoặc secrets.

| Endpoint | Ý nghĩa | Đáp ứng |
| --- | --- | --- |
| `GET /api/health` | Liveness: API có đang nghe HTTP? | 200 nếu Node sống |
| `GET /api/ready` | Readiness: Supabase + schema hiện tại? | 200 khi đạt, 503 khi thiếu |
| `GET /api/state` | Dữ liệu công ty theo JWT Supabase | 401 nếu chưa đăng nhập |
| `GET /api/studio/projects` | Sản phẩm AI của đúng người dùng | 401 nếu chưa đăng nhập |

Các bảng readiness: `companies` (base), `software_projects` (v7), `software_release_events` (v9). Không cần migration v11. Nếu `/ready` báo `DB_QUERY_FAILED`, kiểm tra migration v1–v9 và quyền service-role của backend. Nếu báo `DB_TIMEOUT` hoặc `DB_UNAVAILABLE`, kiểm tra kết nối database và trạng thái Supabase.

## Kiểm thử không cần Supabase hay Gemini/OpenAI

```powershell
npm run test:all
```

78 bài test Node (bao gồm 8 bài mới) kiểm tra các quy tắc game và các trạng thái sẵn sàng của service. Không cần bất kỳ API key nào để chạy bộ này.

## Kiểm tra TypeScript và tạo bản production

Cần có Internet cho lần đầu `npm install`:

```powershell
npm install
npm run build
```

Build gồm `tsc -b` và Vite. Đây là kiểm tra frontend build, không chứng minh cơ sở dữ liệu có thể truy cập được.

## Kiểm tra API thật sau khi đã cấu hình Supabase

Khởi chạy backend ở terminal đầu tiên:

```powershell
npm run dev -w apps/api
```

Mở terminal thứ hai:

```powershell
npm run smoke:http
```

Smoke thực hiện `GET /health`, `GET /ready`, kiểm tra `401` từ hai API được bảo vệ khi không có token. Để kiểm thử cả dữ liệu của tài khoản bạn, cung cấp token phiên đăng nhập Supabase bằng biến `SMOKE_JWT` trong **máy của bạn**, không đưa token vào chat, tài liệu, terminal công cộng hay GitHub:

```powershell
$env:SMOKE_JWT = "<ACCESS_TOKEN_CHỈ_TRÊN_MÁY_BẠN>"
npm run smoke:http
Remove-Item Env:SMOKE_JWT
```

**Chỉ dùng với tài khoản kiểm thử.** Không được gửi access token hoặc service-role key cho người khác. Không có token, smoke vẫn kiểm tra hệ thống và các cổng quyền truy cập.

## CI trên GitHub

Có file `.github/workflows/validate.yml`:

1. `npm install` trên máy ảo Ubuntu của GitHub.
2. `npm run test:all`.
3. `npm run build`.
4. `node --check apps/api/src/index.js`.
5. Kiểm tra cấu trúc và ranh giới secrets.

CI không sử dụng secrets, không truy cập Supabase thật, không deploy. Chưa thể khẳng định workflow đã chạy thành công khi bạn chưa đưa repo lên GitHub và workflow chưa thực sự chạy trên GitHub Actions.

## Quy trình phát hành khuyến nghị

- Chạy unit tests, build, HTTP smoke trên môi trường staging.
- Thử login 2 tài khoản khác nhau để xác nhận không truy cập lẫn dữ liệu.
- Sao lưu và kiểm tra phục hồi database; nâng migration theo thứ tự.
- Hosting HTTPS + backend/worker luôn bật, xem `/ready` và `/api/system/status`.
- Cấu hình giám sát uptime từ bên ngoài, token usage và ngân sách AI.
- Test tác vụ offline, trả lương, giao dịch đồng thời và nghiệm thu thực tế trước khi công bố sản phẩm.

**Giới hạn:** v11 chưa thêm test browser E2E có Supabase thật; các test HTTP với server giả kiểm tra bản thân script smoke, không thay thế smoke chạy trên API thật.

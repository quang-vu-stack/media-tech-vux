# MEDIA TECH VUX v30 — cài đặt / migration QA / Playwright

## Những gì đã kiểm tra trong phiên thực thi hiện tại

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Đọc lỗi `npm run build` | PASS | `v30-build.log` của lần build gần nhất; 9 module không resolve, đồng thời có lỗi type cascading |
| Tìm package khai báo | PASS | `apps/web/package.json` và `apps/api/package.json` đã khai báo đầy đủ; `npm install` cần npm registry |
| Cài dependencies vào môi trường này | FAIL — môi trường | DNS `registry.npmjs.org` không phân giải; lệnh `npm install` không hoàn thành |
| Dự án Supabase đang kết nối | PASS — read-only | Chỉ có project `gkfoybodioppwuhomgzc` (MEDIA TECH VUS) |
| Xác nhận dự án Supabase QA riêng | NOT_RUN — không tồn tại trong danh sách quyền truy cập | Không chạy migration lên dữ liệu thật |
| Migration v29 trên QA | NOT_RUN | Đã kiểm tra file migration; chưa có QA project, không dùng production |
| `npx playwright test` | FAIL — môi trường | `EAI_AGAIN` khi tải gói `playwright` từ npm registry |
| Python Playwright/Chromium self-test | PASS | Chỉ kiểm tra trình duyệt, không phải E2E game |
| Playwright E2E toàn game | NOT_RUN | Thiếu npm packages, ứng dụng chưa build và không có tài khoản QA |

## Các package thiếu — đã được khai báo chứ chưa được tải về

**Frontend:** `react`, `react-dom`, `@types/react`, `@types/react-dom`, `three`, `@types/three`, `@react-three/fiber`, `@react-three/drei`, `@supabase/supabase-js`, `lucide-react`, `vite`, `@vitejs/plugin-react`, `typescript`, `@types/node`.

**Backend:** `express`, `cors`, `dotenv`, `helmet`, `express-rate-limit`, `zod`, `openai`, `@google/genai`, `@supabase/supabase-js`.

**Kiểm thử/công cụ:** `@playwright/test`, `concurrently`.

Chạy từ **thư mục gốc dự án** trên máy có kết nối npm:

```powershell
npm install --include=dev --no-audit --no-fund
npm run build
npm run test:all
```

Không cần `npm install` từng package vì dự án là npm workspaces. Sau khi cài được, tạo và commit `package-lock.json`, dùng `npm ci` trong CI để tái lập build.

## Migration và E2E QA

Chỉ dùng **Supabase project QA riêng**, không dùng project live ref `gkfoybodioppwuhomgzc`.

Cấu trúc database QA cần các migration trước v29 (v18–v23). File mới `supabase/upgrade_v29_vux_opt_in.sql` cũng cập nhật bảng họp và bổ sung các bảng VUX nên không được tự chạy trên production.

Kịch bản PowerShell `scripts/V30_INSTALL_BUILD_QA_WINDOWS.ps1` chạy build/test trước; chỉ chạy migration khi gọi `-MigrateQA` kèm các biến môi trường `VUX_QA_PROJECT_REF`, `VUX_QA_PG_URL`, `VUX_QA_APPROVE_MIGRATION=RUN_ONLY_ON_ISOLATED_QA`. Cần `psql`.

Bộ E2E hiện yêu cầu website + API QA đang chạy, `PLAYWRIGHT_BASE_URL`, `E2E_ISOLATED_QA=YES_READ_ONLY_QA` và tài khoản QA có sẵn `E2E_EMAIL`/`E2E_PASSWORD`; một số kịch bản cần tài khoản QA thứ hai. Sau đó chạy:

```powershell
npx playwright install chromium
npx playwright test
```

**Lưu ý:** Kịch bản cũ trong mã v30 nhầm nhãn đăng nhập “MEDIA TECH VUS”; bản QA patched đã sửa sang “MEDIA TECH VUX”. Các lỗi kiểu TypeScript độc lập dễ nhận diện đã được sửa; kết quả build thực tế vẫn phải xác minh trên máy cài đủ package.

# MEDIA TECH VUS v28 — Fix 3 QA statuses

Dự án v28 nâng cấp trực tiếp từ v27; không thay đổi Supabase và không yêu cầu migration riêng cho v28.

## Kết quả kiểm tra ngày 04/11/2026

| Hạng mục | Kết quả đã chứng thực | Cần làm tiếp |
|---|---|---|
| Node/unit test | 287/287 test PASS | Tiếp tục chạy trên CI |
| Build React production | FAIL do môi trường này thiếu React/Vite/Supabase SDK, DNS npm registry không hoạt động | Chạy `npm install` trên máy có Internet hoặc GitHub Actions rồi `npm run build`; sửa lỗi TS thật nếu xuất hiện |
| Supabase read-only | PASS kết nối dự án MEDIA TECH VUS, trạng thái ACTIVE_HEALTHY; 22/22 bảng `public` bật RLS | Chạy lần lượt migration v19-v23 sau backup và thử nghiệm riêng; chưa có phép thử tích hợp ghi dữ liệu |
| Chromium browser engine | PASS, Chromium thực sự thực thi JavaScript và click trong Python Playwright | Chạy suite E2E của game sau khi build web thật |
| Full Playwright UI E2E | NOT_RUN vì ứng dụng React chưa build và chưa có tài khoản QA | Dùng tài khoản Supabase QA tách biệt |

## A. Cài lại thư viện và xác minh production build

1. Cài Node.js phiên bản >= 22.12 và đảm bảo `npm` hoạt động trên máy có Internet.
2. Mở PowerShell ở thư mục dự án, chạy:

```powershell
npm config get registry
npm ping --registry=https://registry.npmjs.org
npm install --no-audit --no-fund
npm run qa:environment
npm run test:all
npm run preflight:build
npm run build
npm run qa:report -- --build
npm run release:gate -- --level=build
```

Nếu gặp `EAI_AGAIN` hoặc `ENOTFOUND`, đây là lỗi DNS/đường mạng tới npm registry, không có nghĩa mã nguồn React đã sai. Kiểm tra mạng/VPN/proxy/DNS trước; không tắt SSL/TLS hoặc thêm nguồn package không tin cậy. Nếu `npm run build` phát sinh lỗi TypeScript thật sau khi cài đặt thành công, cần sửa lỗi dựa trên log lúc đó.

Nếu không cài được dependencies trên laptop, có thể đẩy mã nguồn lên **repository GitHub riêng tư** và chạy workflow `.github/workflows/validate.yml`. Workflow này thử build React, chạy Chromium và đóng gói báo cáo CI. Không tự động triển khai công khai. Bản v28 đã sửa đường dẫn báo cáo QA cũ từ v26 thành đường dẫn phiên bản hiện tại.

## B. Supabase thật — những gì đã kiểm chứng

Dự án **MEDIA TECH VUS** trong tài khoản Supabase kết nối đang `ACTIVE_HEALTHY`. Kiểm tra read-only xác nhận 22 bảng public đều có RLS. Migration v18 đã có bảng; **v19, v20, v21, v22, v23 CHƯA có bảng yêu cầu**.

Thứ tự migration cần xem xét và áp dụng **chỉ sau khi sao lưu dữ liệu**:

1. `supabase/upgrade_v19_ai_council.sql`
2. `supabase/upgrade_v20_council_actions.sql`
3. `supabase/upgrade_v21_work_reports.sql`
4. `supabase/upgrade_v22_meeting_handoffs.sql`
5. `supabase/upgrade_v23_handoff_improvements.sql`

**Không chạy bộ test tạo tài khoản ở database đang sử dụng.** Chỉ chạy `npm run test:integration` với project QA tách biệt và đủ biến xác nhận trong `docs/V24_REAL_INTEGRATION_QA.md`; bộ test đó tạo và xóa tài khoản thử. Trước và sau khi migrate, có thể chạy SQL **chỉ đọc** tại `supabase/qa_readonly_check_v28.sql` để kiểm tra bảng và RLS.

Bản v28 **không tự áp dụng** năm migration lên database đang kết nối và không sử dụng khóa service-role trong giao diện.

## C. Chromium và Playwright

Trong môi trường tạo gói, Python Playwright và `/usr/bin/chromium` đã chạy được self-test JavaScript và click. Điều này **chỉ chứng nhận trình duyệt hoạt động**, chưa chứng nhận giao diện game chạy.

Có thể tự kiểm tra Chromium bằng:

```powershell
python -m pip install playwright
python -m playwright install chromium
python scripts/qa-browser-probe.py --selftest
```

Sau khi cài npm thành công và mở game:

```powershell
npm run dev
```

Mở PowerShell khác, chạy:

```powershell
npm run test:e2e
```

Bộ Playwright E2E có bài kiểm tra trang đăng nhập không thay đổi dữ liệu. Những bài có tài khoản chỉ chạy khi bạn cấp tài khoản **QA riêng**. Lệnh `python scripts/qa-browser-probe.py --url http://127.0.0.1:5173` có thể kiểm tra giao diện đăng nhập theo kiểu read-only, không thay thế toàn bộ suite E2E.

## D. Lệnh mới của v28

- `npm run qa:environment`: thư viện, Chromium và DNS của npm trên máy hiện tại.
- `npm run qa:db:check`: các file migration có trong ZIP (không chạm database).
- `npm run qa:browser:python`: self-test Chromium (cần Python Playwright).
- `npm run qa:report -- --build`: báo cáo QA và thử build nếu đủ thư viện.
- `npm run qa:status`: tổng hợp trạng thái theo báo cáo QA phiên bản hiện tại.
- `npm run release:gate -- --level=production`: KHÔNG cho phép đánh dấu production nếu chưa đủ chứng cứ.

## Bảo đảm và giới hạn

- Tất cả cuộc gọi tới Supabase trong phiên này là **đọc**; chưa tạo người dùng hoặc đổi dữ liệu.
- Chrome engine đã kiểm tra thành công, nhưng full game E2E vẫn **NOT_RUN**.
- Build React vẫn **FAIL trong môi trường này do thiếu dependencies**, không tuyên bố production build thành công.
- Không đổi số dư, XP, hợp đồng, nhân viên hay cấp độ game.

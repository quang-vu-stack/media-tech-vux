# MEDIA TECH VUS — CEO EMPIRE v24 VIP — Real Integration & Game QA

## Phạm vi đã làm

v24 tăng độ tin cậy của **quy trình kiểm thử**, không thêm một hệ thống gameplay có thể gây ảnh hưởng đến ngân quỹ.

- Có lớp **QA preflight độc lập**, không thực hiện network: yêu cầu xác nhận rõ project Supabase thử nghiệm, ref của project và host API; từ chối mặc định nếu thiếu.
- Bộ thử nghiệm Supabase hai tài khoản được chuyển sang **import SDK sau bước chặn an toàn**, yêu cầu `SUPABASE_ANON_KEY` riêng thay vì ngầm dùng `service_role` đăng nhập.
- Thêm bài thử Playwright **chỉ đọc** cho lưu số dư/level qua tải lại, đổi USD/VNĐ, và hai CEO không đọc nhầm thông tin công ty nhau.
- Thêm báo cáo QA ở định dạng JSON: ghi kết quả đã chạy và luôn để `NOT_RUN` với các kiểm thử chưa thực hiện.
- GitHub Actions CI lưu lại báo cáo QA. Có workflow **tự kích hoạt thủ công** và xác nhận mục đích riêng trước khi thử nghiệm tích hợp, tuyệt đối không chạy theo push hàng ngày.

## 1. Kiểm tra logic mà không cần API key

Từ thư mục gốc, dùng Node.js 22.12+:

```powershell
npm run test:all
npm run qa:report
```

Kết quả được ghi tại `qa-reports/v24-local-report.json`. Báo cáo này **không** tự kiểm chứng React, Supabase hoặc Chromium nếu các lệnh tương ứng không được thực thi.

Nếu đã `npm install` thành công và muốn đưa build vào báo cáo:

```powershell
npm run qa:report -- --build
```

Nếu chưa cài thư viện, kết quả build bị đánh dấu **FAIL**, không được chuyển thành PASS giả.

## 2. Kiểm tra giao diện bằng Chromium

```powershell
npm install
npx playwright install chromium
npm run dev
```

Ở một Terminal khác:

```powershell
npm run test:e2e
```

Bài thử giao diện đăng nhập sẽ chạy. Các bài thử cần tài khoản QA sẽ tự **SKIP** khi không khai báo thông tin.

Chỉ trên **project thử nghiệm**, nếu đã có hai tài khoản CEO thử (mỗi tài khoản đã có một công ty khác nhau), có thể đặt:

```powershell
$env:E2E_ISOLATED_QA='YES_READ_ONLY_QA'
$env:E2E_EMAIL='ceo-qa-a@example.com'
$env:E2E_PASSWORD='mật_khẩu_thử'
$env:E2E_EMAIL_B='ceo-qa-b@example.com'
$env:E2E_PASSWORD_B='mật_khẩu_thử_B'
npm run test:e2e
```

Các bài thử này chỉ xem Dashboard, chuyển chế độ hiển thị và tải lại trang. Chúng không ký hợp đồng, tạo task hoặc rút tiền.

## 3. Bộ thử nghiệm Supabase tích hợp (CÓ TẠO VÀ XÓA TÀI KHOẢN)

**Cảnh báo:** Chỉ sử dụng Supabase project riêng có thể xóa mọi dữ liệu. Không dùng project chứa tài khoản thật, dữ liệu gameplay thật hoặc key sản xuất.

Tạo project QA mới, chạy toàn bộ SQL migration đến v23, cấu hình backend bằng URL và service_role **của chính project QA**.

Các biến chỉ khai báo trong terminal hoặc file môi trường riêng **không commit vào Git**:

```powershell
$env:INTEGRATION_ALLOW_CREATE_USERS='YES_TEST_PROJECT'
$env:INTEGRATION_ISOLATED_PROJECT_LABEL='MEDIA_TECH_VUS_QA_ONLY'
$env:INTEGRATION_EXPECTED_PROJECT_REF='your-qa-project-ref'
$env:SUPABASE_URL='https://your-qa-project-ref.supabase.co'
$env:SUPABASE_ANON_KEY='your_test_publishable_or_anon_key'
$env:SUPABASE_SERVICE_ROLE_KEY='your_test_service_role_secret'
$env:INTEGRATION_API_BASE='http://127.0.0.1:4000/api'
npm run qa:preflight
npm run test:integration
```

`INTEGRATION_EXPECTED_PROJECT_REF` phải khớp chính xác ref trên URL. API cục bộ mặc định được phép; API từ xa cần thêm xác nhận `INTEGRATION_ALLOW_REMOTE_API=YES_ISOLATED_QA_API` và `INTEGRATION_EXPECTED_API_HOST` khớp host HTTPS.

Bộ kiểm thử tích hợp sẽ tạo hai danh tính và hai công ty thử, giao/hoàn thành nhiệm vụ để xác nhận 10 tỷ VNĐ ban đầu, phân quyền và chống trả thưởng hai lần. Nó dọn người dùng thử trong `finally`, nhưng nếu dọn thất bại **phải xóa thủ công** ở Supabase project QA.

Chưa có bất kỳ bằng chứng nào rằng các bài thử Supabase thật hoặc Chromium thật đã chạy thành công trên môi trường tạo ZIP, nếu không có bản ghi PASS riêng.

## 4. Nâng cấp từ v23

- Không cần migration SQL v24 mới.
- Giữ nguyên `.env`, dữ liệu, XP, VNĐ/USD và level 1–30.
- Chạy `npm install` rồi `npm run test:all`, `npm run build` và `npm run dev` trong môi trường có đủ thư viện.
- **Không** chạy `test:integration` trên database bạn đang chơi.

## Giới hạn hiện tại

Bài test Node đạt chỉ chứng minh logic được kiểm tra. Cài đặt, build, chạy browser/WebGL, API AI và Supabase thật đòi hỏi môi trường và khóa của project QA. Chưa thể tuyên bố game đạt hoàn thiện 100% hoặc đã chạy production.

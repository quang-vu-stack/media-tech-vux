# MEDIA TECH VUS — v15: Kiểm toán ngân quỹ CEO

## Tại sao có tính năng này?

Trong game, nhiều hệ thống cùng sử dụng ngân quỹ 10 tỷ ban đầu: thưởng nhân viên, tiền lương, hợp đồng, đầu tư, chiến lược và những hành động do CEO phê duyệt. Nếu xảy ra lỗi nghiệp vụ hoặc migration, số dư có thể khác với tổng các giao dịch đã ghi vào sổ cái.

v15 bổ sung **đối soát chỉ đọc**: công ty của tài khoản đăng nhập được so sánh với **tổng tất cả** `ledger_entries.amount_vnd`. Không tự động chỉnh sửa số dư và không xóa lịch sử.

## Nâng cấp từ v14

1. **Sao lưu database Supabase** trước khi thay đổi SQL, theo khả năng backup/restore của gói đang sử dụng.
2. Giữ nguyên Supabase project và file `.env`/`.env.deploy` đã dùng với v14.
3. Vào Supabase SQL Editor, chạy **chỉ** file `supabase/upgrade_financial_integrity_v15.sql` sau tất cả migrations v1–v14. Không chạy lại `schema.sql` trên project có dữ liệu thật.
4. Cài thư viện và khởi chạy:

```powershell
npm install
npm run test:all
npm run build
npm run dev
```

5. Đăng nhập bằng tài khoản CEO và mở tab **Tài chính** → **Đối soát ngân quỹ CEO** → **Đối soát ngay**.
6. Nếu số dư không khớp, **KHÔNG bấm sửa tiền hoặc chạy SQL UPDATE thủ công**. Hãy lưu báo cáo, kiểm tra log giao dịch và sử dụng backup của Supabase khi cần.

**Lưu ý:** Tính năng này chỉ kiểm tra tính nhất quán giữa số dư hiện tại và tổng sổ cái. Nó không tự phát hiện mọi gian lận, không khẳng định mọi nghiệp vụ đã đúng và **không thay thế backup**. Doanh thu ảo trong game không phải giao dịch thật. Kết quả snapshot có thể thay đổi sau khi nhiệm vụ hoặc hợp đồng mới hoàn thành.

## API mới

`GET /api/ceo/financial-audit` — yêu cầu `Authorization: Bearer <Supabase access JWT>`.

Ví dụ phản hồi:

```json
{
  "status": "matched",
  "treasury_vnd": "9750000000",
  "ledger_total_vnd": "9750000000",
  "difference_vnd": "0",
  "ledger_entries": 3,
  "checked_at": "2026-11-04T00:00:00+00:00",
  "note": "Báo cáo chỉ đọc, không sửa ngân quỹ. Kiểm tra snapshot tại thời điểm truy vấn."
}
```

Tất cả số tiền được truyền dạng **chuỗi số nguyên**, tránh mất chính xác với số tiền lớn. API chỉ trả dữ liệu của công ty thuộc tài khoản đã được xác thực. SQL SECURITY DEFINER bị từ chối với `anon` và `authenticated`; chỉ backend dùng role được cấp mới có thể gọi.

## Test

```powershell
npm run test:integrity
npm run test:all
```

Các bài test đơn vị kiểm tra số nguyên lớn, trạng thái khớp/chênh lệch, quyền API ở mức cấu trúc, SQL migration và UI. **Chưa kiểm thử end-to-end với một Supabase project thực** trong môi trường tạo bản ZIP này.

## Tiêu chí phát hành production

- Test migration trên bản sao dữ liệu hoặc Supabase project staging.
- Đối soát trên những kịch bản có hợp đồng, lương, chi thưởng, chiến lược, sai số và đồng thời cập nhật.
- Kiểm tra chiến lược backup/restore, log, giới hạn API và giám sát.
- Chạy `npm run build` và smoke test trên máy đã cài đầy đủ dependencies.

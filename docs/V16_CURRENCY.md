# MEDIA TECH VUS v16 — USD/VND

## Bất biến quan trọng

Số dư công ty và sổ cái Supabase vẫn sử dụng `bigint VND`. Không migrate hoặc viết lại số dư khi người chơi chọn `$`. Thay đổi định dạng UI chỉ là cách đọc một giá trị VND theo tỷ giá ngày. Không được sử dụng số USD hiển thị làm đầu vào RPC điều chỉnh ngân quỹ.

## Hướng dẫn

1. Chọn `USD ($)` ở phía trên giao diện để xem tiền đô la. Bấm `VNĐ` để quay lại.
2. Tài chính → Quy đổi tiền tệ hiển thị 1 USD tương đương bao nhiêu VNĐ, thời điểm tham khảo và số dư hai đơn vị.
3. Đổi chế độ không tạo giao dịch, không trừ tiền và không reset cấp độ.
4. Nhập thưởng, ngân sách dự án và giá thầu: các ô hiện tại vẫn yêu cầu VNĐ theo nhãn.
5. API `/api/fx/usd-vnd` yêu cầu JWT hợp lệ và chỉ trả tỷ giá, không tác động sổ cái.

## Tỷ giá

- Provider: `https://open.er-api.com/v6/latest/USD`. Điều khoản yêu cầu ghi công và cache; giao diện trỏ tới https://www.exchangerate-api.com.
- Cache server trong RAM 24 giờ sau khi thành công, 1 giờ khi lỗi. Request đồng thời được gộp lại.
- Fallback từ ngày 04/11/2026 là 25.739 VND/USD, được đánh dấu không phải giá hiện tại.
- Chỉ dùng tham khảo trong game, không làm cơ sở tính giao dịch ngoại hối thực tế.

## Kiểm thử

`npm run test:currency` kiểm tra quy đổi, số âm, lỗi tỷ giá, cache, fallback và không sửa tiền backend. `npm run test:all` chạy bộ regression. `npm run build` yêu cầu phụ thuộc npm được tải đầy đủ. Không có migration mới.

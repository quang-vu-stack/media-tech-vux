# MEDIA TECH VUS — CEO EMPIRE v20 VIP

## CEO Decision → Execution

Bản v20 nối cuộc họp AI của v19 với hệ thống nhiệm vụ đã có: **CEO đọc đề xuất, chỉnh sửa và tự phê duyệt một công việc**, sau đó nhận báo cáo tiến độ theo dữ liệu task trong Supabase.

### Luồng sử dụng

1. Trong **Phòng họp CEO**, triệu tập cuộc họp (v18) và hoàn thành thảo luận Hội đồng AI (v19). Tạo thảo luận AI cần Gemini hoặc OpenAI và có thể phát sinh phí.
2. Khi thảo luận AI đã lưu thành công, mở mục **Quyết định của CEO thành công việc** bên dưới kết luận.
3. Chỉnh tiêu đề, mô tả dựa trên khuyến nghị AI. Chọn một nhân viên **đã tham dự cuộc họp**, thời hạn 30 phút–24 giờ, và tiền thưởng (mặc định 0 VNĐ).
4. Bấm **CEO phê duyệt & giao việc**. Backend xác minh tài khoản và thực hiện SQL RPC trong transaction; nếu nhân viên đang có nhiệm vụ chạy thì yêu cầu bị từ chối.
5. Danh sách quyết định hiển thị người phụ trách, hạn hoàn thành, tiến độ và trạng thái. Mỗi cuộc họp tối đa 8 quyết định. Tải lại hoặc truy cập lại vẫn xem được lịch sử.
6. Worker tự xử lý nhiệm vụ khi đến hạn (hoặc khi hoạt động trở lại sau thời gian tắt máy chủ). Đây là **tiến độ mô phỏng**, không chứng minh AI đã làm một sản phẩm thật.

### Bảo vệ dữ liệu

- Quyền sở hữu công ty và cuộc họp được xác minh từ JWT trong backend **và** tại SQL RPC.
- Nút phê duyệt là thao tác chủ động của CEO; AI không thể tự tạo nhiệm vụ, ký hợp đồng hay chuyển tiền.
- Tạo action + task là một giao dịch nguyên tử. Mỗi lệnh có `clientRequestId` để chống tạo trùng trong trường hợp timeout; lệnh lặp có nội dung khác sẽ bị từ chối.
- Thưởng tối đa 5.000.000 VNĐ/nhiệm vụ. Không trừ tiền khi giao việc; việc trừ thưởng và ghi sổ cái xảy ra theo quy tắc cũ **chỉ sau khi nhiệm vụ được hoàn thành**.
- Không thay đổi số dư, XP hay cấp độ khi áp dụng migration v20. Không reset dữ liệu các phiên bản cũ.
- Lịch sử và các thông tin liên quan chỉ đọc được bởi tài khoản chủ sở hữu; API không xuất raw service role hoặc nội dung bí mật.

### Cài đặt nâng cấp từ v19

1. Sao lưu Supabase project đang dùng.
2. Trong Supabase SQL Editor, chạy migration **`supabase/upgrade_v20_council_actions.sql`**, sau khi đã chạy đủ v18 và v19.
3. Giữ lại các file `.env` của web và backend. Không đưa service role key hoặc Gemini/OpenAI secret vào trình duyệt.
4. Trong terminal tại thư mục project:

```powershell
npm install
npm run test:all
npm run build
npm run dev
```

5. Kiểm tra `http://localhost:4000/api/ready` (API phải đang chạy) và luồng họp → thảo luận → phê duyệt → báo cáo; mở `Vận hành hệ thống` để kiểm tra worker. Các việc chưa đến hạn sẽ chờ xử lý.

### Kiểm tra đã thực hiện và còn hạn chế

- Node tests kiểm tra định dạng, quyền và nguyên tắc idempotency (kiểm tra cấu trúc SQL); kiểm thử thực trên database riêng vẫn cần thực hiện sau migration.
- Cú pháp TS/TSX được phân tích tĩnh. Chưa xác minh build React đầy đủ, giao diện trên trình duyệt thật, hay xử lý worker với Supabase thực do môi trường không có npm dependencies, Supabase test project và API keys.
- Báo cáo tiến độ từ worker là quy trình mô phỏng theo thời gian, không phải tài liệu hay sản phẩm do AI thực sự bàn giao.

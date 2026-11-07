# MEDIA TECH VUS — CEO EMPIRE v22 VIP
## Bản bàn giao AI & cổng kiểm tra chất lượng

### Tóm tắt

Phiên bản v22 giúp CEO xem **tài liệu bàn giao có cấu trúc** trước khi nghiệm thu một nhiệm vụ được tạo từ quyết định của Hội đồng AI (v20). V21 vẫn xử lý trả thưởng +120 XP và số tiền đã giao bằng **một giao dịch PostgreSQL** khi CEO duyệt. V22 chỉ kiểm soát điều kiện đầu vào, **không tự chi tiền**.

### Luồng sử dụng

1. CEO triệu tập cuộc họp, thảo luận AI và giao nhiệm vụ (v18–v20).
2. Worker đưa tiến độ nhiệm vụ đến 99% và tạo báo cáo mô phỏng chờ duyệt (v21).
3. Tại **Phòng họp CEO → Quyết định của CEO thành công việc → Báo cáo nhiệm vụ**, mở nhiệm vụ chờ duyệt.
4. Trong **Hồ sơ bàn giao VIP v22**, chọn nguồn:
   - **Mô phỏng**: tạo văn bản có cấu trúc theo mẫu ngay trên backend, **không gọi API AI**.
   - **Gemini** hoặc **OpenAI**: CEO bấm nút để gọi API một lần tạo tài liệu; cần API key trong `apps/api/.env`; có thể phát sinh phí API. Không tự sinh trong nền.
5. Xem tài liệu gồm tiêu đề, tóm tắt, các mục nội dung, bước tiếp theo, giới hạn/giả định; xem kết quả kiểm tra 0–100.
6. Nếu bản hiện tại đạt các tiêu chí, CEO có thể chọn **Nghiệm thu & chi thưởng**; nếu chưa phù hợp, **Yêu cầu sửa** hoặc **Từ chối**.

### Kiểm tra chất lượng v22 là gì?

Đây là bộ **kiểm tra định dạng/độ chi tiết**, gồm năm mục, mỗi mục 20 điểm:
- Tóm tắt đủ thông tin (ít nhất 110 ký tự)
- Ít nhất ba phần nội dung
- Mỗi phần có độ dài tối thiểu (95 ký tự)
- Bước tiếp theo đủ chi tiết (70 ký tự)
- Nêu giới hạn/giả định rõ (60 ký tự)

Điểm 100 chỉ có nghĩa **đạt năm tiêu chí kỹ thuật đơn giản**. Nó KHÔNG kiểm tra sự thật, tính khả thi, chất lượng chuyên môn, bảo mật hoặc thực thi bên ngoài. CEO vẫn cần đọc và tự đánh giá.

### An toàn tài chính và dữ liệu

- Bảng mới `meeting_handoffs_v22` lưu một tài liệu trên mỗi cặp `(report_id, revision_no)`; đây là lịch sử bất biến của một lần báo cáo.
- SQL RPC `save_meeting_handoff_v22` chỉ cho `service_role`, kiểm tra công ty thuộc người dùng, khóa task trước report, kiểm tra phiên bản báo cáo đang đợi nghiệm thu ở 99%.
- Trigger `handoff_quality_gate_v22` chặn **chuyển báo cáo sang `approved`** nếu chưa có tài liệu của **đúng revision hiện tại** đạt kiểm tra. Hàm nghiệm thu v21 cập nhật ngân quỹ và báo cáo trong cùng transaction; khi trigger báo lỗi, toàn bộ giao dịch rollback.
- Không có thay đổi tiền, XP, level, payroll hoặc ledger trong migration v22.
- Nhiệm vụ đã nghiệm thu và thưởng trước khi chạy migration vẫn giữ nguyên, không được tính thưởng lại.
- Nếu đang chờ duyệt từ v21 thì sau khi lên v22 **bắt buộc tạo bản bàn giao hiện tại** trước khi có thể nghiệm thu.
- Yêu cầu sửa tạo một `revision_no` mới: tài liệu lần trước không đủ điều kiện duyệt bản tiếp theo.
- Frontend không thực thi code do AI tạo; dữ liệu tài liệu chỉ hiển thị như văn bản React.
- API hạn chế tối đa 3 yêu cầu tạo/10 phút theo cơ chế rate limit; cùng lúc trên một tiến trình chỉ chạy một yêu cầu tạo cho một báo cáo. Nếu triển khai nhiều backend instance, vẫn có thể có các lượt gọi AI đồng thời trước khi database chặn ghi trùng: vì vậy cần gateway/job queue phân tán nếu muốn giới hạn chi phí chặt chẽ.

### Cách nâng cấp (từ v21)

1. **Sao lưu database Supabase thật trước khi chạy SQL.** Đặc biệt các bảng `companies`, `tasks`, `ledger_entries`, `meeting_action_items_v20`, `meeting_work_reports_v21`.
2. Sau khi chắc chắn đã chạy migration v21, mở Supabase SQL Editor và chạy **`supabase/upgrade_v22_meeting_handoffs.sql`**.
3. Giữ nguyên khóa `.env` (khóa Gemini/OpenAI chỉ đặt trong `apps/api/.env`, không đưa vào frontend).
4. Cài Node.js 22.12+ và chạy:

```powershell
npm install
npm run test:all
npm run check:config
npm run build
npm run dev
```

5. Vào `GET /api/ready` kiểm tra `ok: true`, có bảng `meeting_handoffs_v22`.
6. Trên **Supabase project thử nghiệm**, tạo nhiệm vụ có thưởng **0 VNĐ**, chờ báo cáo 99%; chọn mô phỏng, kiểm tra 100 điểm, thử nghiệm thu, làm mới, kiểm tra nhiệm vụ 100% và XP. Gửi lại request nghiệm thu để bảo đảm không phát sinh thưởng trùng.
7. Thử một nhiệm vụ khác: yêu cầu sửa rồi tạo tài liệu bản mới, xác nhận tài liệu của revision cũ không được dùng để nghiệm thu bản mới.

### Giới hạn đã xác minh

- Đã chạy test Node và kiểm tra cú pháp các file TS/TSX; kết quả cụ thể có thể kiểm tra lại bằng `npm run test:all`.
- Chưa build React đầy đủ do thiếu thư viện frontend trong môi trường đóng gói.
- Chưa chạy migration hoặc kiểm thử tương tác trên Supabase thật, Docker hay Gemini/OpenAI thật.
- Đây là *game mô phỏng doanh nghiệp*, không phải dịch vụ tạo sản phẩm được triển khai ngoài đời.

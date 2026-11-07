# MEDIA TECH VUS — v23 VIP | AI Quality Improvement

## Tính năng

Bản v23 cho phép CEO cải thiện **tài liệu bàn giao** mà không phải đưa nhiệm vụ sang vòng sửa báo cáo thời gian v21 ngay lập tức. Sau khi đã có hồ sơ v22, CEO có thể nhập góp ý (10–900 ký tự), chọn nguồn tạo (`simulated`, `gemini`, `openai`), rồi bấm **Tạo tài liệu v2/v3/v4**. Không có cuộc gọi AI tự phát.

- Tối đa **4 phiên bản tài liệu** cho mỗi **lần báo cáo**. Lần báo cáo v21 kế tiếp sau khi CEO yêu cầu sửa vẫn có bộ tài liệu riêng, không dùng bản cũ để duyệt.
- Mỗi phiên bản chứa nguồn tạo, văn bản, kết quả kiểm tra, phản hồi CEO và thời điểm. Bản v22 hiện tại được phản ánh trong bảng `meeting_handoffs_v22`, còn toàn bộ lịch sử được chụp trong `meeting_handoff_versions_v23`.
- Khu **So sánh** hiển thị **tóm tắt và điểm cấu trúc** của bản trước cạnh bản mới; giao diện không tự kết luận bản mới tốt hơn, mà cung cấp dữ liệu để CEO tự quyết định.
- Bổ sung điểm **chuyên môn tham khảo 0–100** cho các nhóm Kỹ thuật, Marketing, Tài chính, Vận hành và Quản trị tổng hợp. Tiêu chí gồm: bám nhiệm vụ, dấu hiệu chuyên môn, chỉ số/mốc đo, hành động cụ thể, nhận diện giới hạn. Đây là kiểm tra heuristic theo từ khóa, **không có ý nghĩa chứng minh tính xác thực, bảo mật, tính khả thi hoặc chất lượng công việc ngoài đời**.
- Tiêu chí **nghiệm thu có hiệu lực** vẫn là cổng định dạng/độ chi tiết ở v22 và thao tác CEO trong RPC v21. Điểm chuyên môn v23 chỉ hiển thị tham khảo; bản sửa mới không được dùng để duyệt nếu cổng v22 đánh dấu `passed=false`.

## Tính toàn vẹn và quyền

- Migration v23 sao lưu tất cả hồ sơ đã có ở v22 vào **version 1**, không reset số dư, XP, hợp đồng, nhân viên hoặc nhiệm vụ.
- Bản nộp mới v22 được tự động thêm vào lịch sử version 1 trong cùng giao dịch bằng trigger PostgreSQL.
- Khi CEO yêu cầu sửa, RPC khóa **task → report → handoff**, đối chiếu chủ sở hữu, trạng thái report `awaiting_review`, task `in_progress` tại `99%` và `expectedVersion`. Bản cũ không bị ghi đè trong lịch sử.
- Bản mới và cập nhật bản v22 hiện hành được commit **nguyên tử**, nên không có trạng thái sửa dở. `quality.passed` của bản hiện hành vẫn là điều kiện nghiệm thu thông qua trigger v22.
- Backend dùng JWT và chỉ gọi Gemini/OpenAI khi người dùng thực sự bấm tạo. Có giới hạn 3 lượt/10 phút **theo IP** và khóa xử lý trong cùng một tiến trình Node.js; nhiều backend instances vẫn có khả năng phát sinh cuộc gọi AI thừa trước khi một yêu cầu bị SQL từ chối. Muốn tránh chi phí trùng đa instance cần hàng đợi phân tán và idempotency trước API.
- Không có auto-payment hoặc gọi API từ background cho chức năng này.

## Cách nâng cấp từ v22

1. **Sao lưu database Supabase thực tế trước khi áp dụng migration.** Kiểm tra đã chạy đầy đủ v21 và v22.
2. Mở Supabase SQL Editor, chạy `supabase/upgrade_v23_handoff_improvements.sql` một lần. Nếu chạy lại, kiểm tra kết quả và không bỏ qua lỗi của bản triển khai.
3. Giữ các file `.env` từ v22. Nếu dùng Gemini/OpenAI, khóa chỉ nằm trên backend. Không đưa khóa vào frontend hoặc file ZIP chia sẻ.
4. Chạy:

```powershell
npm install
npm run test:all
npm run check:config
npm run build
npm run dev
```

5. Kiểm tra `GET /api/ready` báo `ok:true`, gồm bảng `meeting_handoff_versions_v23`.
6. Trên **Supabase thử nghiệm**, tạo nhiệm vụ sau họp thưởng 0 VNĐ, chờ 99%, tạo hồ sơ mô phỏng v1; sửa thành v2, kiểm tra lịch sử 1–2; sửa tiếp đến v4, xác nhận không cho v5. Kiểm tra bản cũ vẫn được đọc nhưng **không dùng để nghiệm thu**. Thử gửi lại một bản có `expectedVersion` cũ: phải từ chối, không ghi thêm phiên bản.
7. Xác nhận CEO nghiệm thu v21 chỉ thưởng một lần; khi báo cáo đã được duyệt hoặc từ chối, endpoint sửa phải từ chối.

## Giới hạn kiểm thử

- Kiểm tra Node domain/rules và kiểm tra cú pháp TSX có thể chạy trong môi trường tạo gói.
- Chưa xác minh build React đầy đủ hoặc SQL migration trên Supabase thật khi không có thư viện/credentials.
- Không có bằng chứng AI đã thực sự hoàn thành công việc ngoài game.

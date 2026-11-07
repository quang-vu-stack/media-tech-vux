# MEDIA TECH VUS v21 VIP — AI Work Reports & CEO Review

## Mục đích

Kết nối quyết định đã được CEO phê duyệt tại Hội đồng AI (v20) với **báo cáo mô phỏng sau khi đến hạn**, giúp CEO quyết định có trả thưởng hay không. Không giả định có công việc thật được hoàn thành ngoài game.

## Cách hoạt động

1. CEO họp và giao nhiệm vụ từ Hội đồng AI như v20; công việc đã có nhân viên và thời hạn.
2. Khi worker `process_due_auto_tasks` gặp nhiệm vụ sau họp v20 đang thực hiện và đã đến hạn, worker giữ nhiệm vụ ở **99%**, sinh báo cáo từ dữ liệu nhiệm vụ, lưu vào bảng `meeting_work_reports_v21` với trạng thái `awaiting_review`.
3. CEO vào **Phòng họp CEO → Hội đồng AI → Báo cáo nhiệm vụ sau họp**. Báo cáo hiển thị rõ là **mô phỏng theo thời gian**, không phải một kết quả công việc được AI thực thi bên ngoài.
4. CEO chọn một trong ba quyết định:
   - **Nghiệm thu:** Ghi nhận hoàn thành (100%), cộng +120 XP, trả đúng khoản thưởng đã đặt (0–5 triệu VNĐ) và đưa nhân viên về trạng thái rảnh. PostgreSQL khóa bản ghi và lưu ledger trong **một giao dịch duy nhất**; chỉ được duyệt một lần.
   - **Yêu cầu sửa:** Ghi rõ phản hồi (8–1000 ký tự), tối đa 3 lần. Worker sẽ tạo bản báo cáo mô phỏng mới ở chu kỳ tiếp theo; chưa cấp XP hoặc thưởng.
   - **Từ chối:** Đóng nhiệm vụ ở trạng thái `cancelled`, trả lại nhân viên về rảnh, **không cấp XP và không trả thưởng**.
5. Khi phản hồi HTTP không rõ kết quả, CEO nên **bấm Làm mới** trước khi thử lại. Frontend không tự retry thay đổi tài chính.

## Phạm vi áp dụng và tương thích

- Áp dụng **chỉ cho nhiệm vụ từ quyết định họp AI v20 chưa hoàn thành** khi v21 được cập nhật.
- Những nhiệm vụ v20 đã hoàn thành trước đó **giữ nguyên lịch sử và khoản thưởng**; v21 không sinh một báo cáo mới để trả tiền lại.
- Các nhiệm vụ thông thường tự động hoàn thành như trước; các nhiệm vụ agent có bản bàn giao riêng vẫn chờ CEO duyệt theo v6.
- Sổ cái luôn lưu **VNĐ**; giao diện chuyển USD/VNĐ của v16 vẫn dùng để hiển thị.
- Level công ty vẫn giới hạn tại 30 theo v18, XP tích lũy vẫn tăng.
- Mỗi nhiệm vụ chỉ có **một báo cáo hiện tại**, số lần sửa được đếm ở `revision_no` (không có kho lịch sử từng bản chỉnh sửa riêng).

## Những điều chưa có trong phiên bản này

- **Chưa** sinh báo cáo bằng Gemini/OpenAI và **chưa** có bản bàn giao thực tế như source code, hình ảnh hay tài liệu được nhân viên AI thực thi.
- **Chưa** xây trang xem trước từng phiên bản báo cáo cũ hoặc chứng cứ công việc; báo cáo là bản mô phỏng.
- **Chưa** chạy kiểm thử tích hợp trên Supabase thật, browser Playwright hay Docker trong môi trường đóng gói này.

## Hướng dẫn nâng cấp

1. Sao lưu dữ liệu của project Supabase (đặc biệt `companies`, `ledger_entries`, `tasks`, `meeting_action_items_v20`).
2. Chạy `supabase/upgrade_v21_work_reports.sql` **sau khi** các migration v18, v19, v20 đã áp dụng.
3. Giữ nguyên `.env` của API/web, cập nhật mã nguồn v21.
4. Trên máy đã cài Node 22.12+ và npm, chạy:

```powershell
npm install
npm run test:all
npm run check:config
npm run build
npm run dev
```

5. Xác nhận `GET /api/ready` (không gửi JWT) trả về `ok: true`. Nếu API không sẵn sàng, kiểm tra migration và cấu hình.
6. Giao một nhiệm vụ thử với thưởng **0 VNĐ** và hạn 1 phút (hoặc gần nhất UI cho phép), chờ worker xử lý, xem báo cáo, thử yêu cầu sửa và nghiệm thu; sau đó kiểm tra XP, trạng thái và sổ cái.
7. Thử gửi lại yêu cầu nghiệm thu đã hoàn tất: **không được trả thưởng lần hai**. Chỉ dùng tài khoản/project thử nghiệm.

## Bảo mật và tính nhất quán

- RLS chỉ cho chủ sở hữu đọc báo cáo trong Supabase; trình duyệt không được INSERT/UPDATE/DELETE báo cáo.
- RPC `review_meeting_work_report_v21` chỉ mở cho `service_role`, dùng quyền owner lấy từ JWT đã xác minh ở backend.
- RPC khóa task trước report để thống nhất thứ tự khóa với worker; kiểm tra `expectedRevision` chống nghiệm thu bản cũ.
- Trigger `meeting_report_gate_v21` ngăn các RPC cập nhật tiến độ cũ đặt công việc sau họp thành `completed`, `cancelled` hoặc 100% nếu thiếu quyết định nghiệm thu tương ứng.
- `ledger_entries.task_id` vốn đã UNIQUE; một nhiệm vụ không thể ghi hai dòng thưởng.

## Kiểm thử

`npm run test:all` chạy các bài kiểm tra logic và hồi quy, trong đó có `scripts/work-reports.test.mjs`. Bài kiểm tra cấu trúc SQL/route **không thay thế** việc thực hiện migration và kiểm thử database thật.

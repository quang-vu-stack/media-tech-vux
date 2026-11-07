# MEDIA TECH VUS v19 VIP — HỘI ĐỒNG AI NHIỀU NHÂN VẬT

## Tổng quan
Bản v19 phát triển từ cơ chế CEO triệu tập và kết thúc cuộc họp của v18.
Ở bản này, CEO có thể yêu cầu AI tạo **một phiên thảo luận có nhiều nhân vật**, mỗi người có lập trường chuyên môn và vòng phản biện, sau đó AI tổng hợp phương án để CEO cân nhắc.

**Quan trọng:** Hệ thống dùng **một lần gọi tới Gemini hoặc OpenAI** để đóng vai nhiều nhân viên, không phải các AI độc lập tự vận hành hoặc tự tranh luận ở backend. Cuộc họp AI hiện là tư vấn, không có quyền tự ký hợp đồng, chuyển tiền, tạo nhiệm vụ hoặc ra quyết định thay CEO.

## Các chức năng
1. CEO chọn 2–4 nhân viên nằm trong danh sách tham dự cuộc họp đang mở. Vẫn có thể triệu tập tối đa 12 nhân viên như v18.
2. Hai vòng phát biểu theo nhân vật: đề xuất ở vòng 1, phản biện và bổ sung ở vòng 2.
3. Kết quả gồm lượt phát biểu, tóm tắt và đề xuất cho CEO.
4. Bấm vào lượt phát biểu để đánh dấu nhân viên trên scene 3D bằng vòng tròn và trạng thái **Đang phát biểu · Hội đồng AI**. Không tự chạy lời nói thành âm thanh.
5. Chỉ khi CEO nhấn **Chép đề xuất vào biên bản**, phần văn bản mới chuyển sang ô biên bản. CEO cần bấm kết thúc để lưu biên bản chính thức.
6. Phiên thảo luận đã tạo thành công được lưu theo cuộc họp trong Supabase và có thể xem trong lịch sử.

## An toàn, giới hạn và chi phí
- Quyền của từng tài khoản được xác minh trên backend và trong SQL RPC. Một công ty không thể lấy nhân viên hoặc biên bản của công ty khác.
- Một cuộc họp chỉ lưu **một phiên thảo luận AI hoàn thành**. Nhấn lặp trong khi AI đang chạy không phát sinh lần gọi AI thứ hai nếu yêu cầu đầu vẫn đang được xử lý; cơ chế này sử dụng row lock + `attempt_id`.
- Có cơ chế thử lại thủ công sau lỗi. Một lượt gọi AI thất bại vẫn có thể tiêu tốn token và phát sinh phí từ nhà cung cấp; bản này không tự chạy lại gọi phí.
- Phát biểu bị giới hạn độ dài, yêu cầu hai vòng đúng danh sách nhân viên, và có kiểm tra JSON trước khi lưu.
- Chưa có voice chat, hội thoại streaming theo thời gian thật, AI tự quyết định nhiệm vụ, hoặc hệ nhiều agent hoạt động độc lập.
- Khóa AI **chỉ đặt ở backend** `apps/api/.env`. Không chèn service role key hoặc API key vào frontend.

## Nâng cấp từ v18
1. Sao lưu database Supabase.
2. Trong Supabase SQL Editor chạy `supabase/upgrade_v19_ai_council.sql` sau `upgrade_v18_meetings.sql`.
3. Giữ lại hai file `.env` trong thư mục web/API. Đảm bảo `GEMINI_API_KEY` hoặc `OPENAI_API_KEY` đã cấu hình phía API nếu muốn dùng nhà cung cấp đó.
4. Tại thư mục project:

```powershell
npm install
npm run test:all
npm run build
npm run dev
```

5. Mở **Phòng họp CEO** → triệu tập → chọn thành viên Hội đồng AI → chọn nhà cung cấp → **Bắt đầu tranh luận AI**.
6. Chỉ CEO xác nhận biên bản/đề xuất mới là quyết định. Game không tự chi tiền từ kết quả AI.

## Kiểm tra và hạn chế
- Unit tests Node kiểm tra cấu trúc hai vòng, lỗi JSON, phân quyền trong migration, idempotency và ranh giới thực thi.
- Giao diện TypeScript/TSX và cú pháp JavaScript được kiểm tra riêng khi tạo gói.
- Chưa xác minh được build Vite/React đầy đủ, kết nối thực tế tới Supabase và gọi Gemini/OpenAI khi không có các khóa, npm dependency và database thật.
- Không có migration làm thay đổi quỹ tiền hoặc reset dữ liệu người chơi.

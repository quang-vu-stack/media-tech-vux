# MEDIA TECH VUS — V10 Operations & Reliability

## Phạm vi

Phiên bản 10 tập trung vào tính quan sát được của backend, không mở thêm hệ thống gameplay. Trình điều phối worker cũ có thể bỏ dở các bước sau nếu một bước gặp lỗi; thay bằng supervisor tuần tự, tách lỗi độc lập. Mỗi lần chạy vẫn có giới hạn tối đa 100/50 mục trong từng RPC tùy việc.

## Kiến trúc

`apps/api/src/worker-supervisor.js` nhận các job `name` và `run`, điều khiển lịch 30 giây, phát hiện vòng chạy trùng lặp. Một lỗi được ghi bằng **mã lỗi**, không đưa dữ liệu nhạy cảm ra giao diện. Có bộ đếm runs/successes/failures và lastSuccessAt. Không có retry vô hạn trong một chu kỳ; các lần chạy sau sẽ thử lại. Đảm bảo idempotency của từng RPC vẫn thuộc trách nhiệm Postgres (đã xây dựng ở migrations cũ).

`GET /api/system/status` dùng JWT Supabase, xác thực user trên server, tra `owner_id` công ty; trả tổng số nhân viên, task, hợp đồng và snapshot supervisor. Không trả API keys. Khai báo AI key không xác minh billing hoặc quota.

## Phạm vi giới hạn

- Đây là **giám sát tiến trình**, không phải hệ thống cảnh báo ngoài hay monitoring nhiều server.
- Worker phải luôn chạy trên hosting có Node.js sống liên tục; serverless ngủ sẽ không bảo đảm chạy việc offline.
- Không có Redis/BullMQ, leader election liên instance, phân tán job hoặc durable queue trong phiên bản này. Tránh chạy nhiều replica worker đồng thời cho đến khi triển khai distributed locking/queue.
- Supervisor in-memory reset khi restart, nên không được coi là bằng chứng lịch sử uptime.
- API `health` chỉ thể hiện tiến trình Node sống, không phải kiểm tra đầy đủ database.
- API status không chứa thông tin dung lượng backup, không bảo đảm 100% không mất dữ liệu. Cần kiểm thử restore và backup độc lập.

## Thử nghiệm

`npm run test:worker` chạy 7 bài test supervisor (isolation, overlap, recovery, validation, snapshot, lifecycle). `npm run test:all` chạy cả bộ test trước đó. Không có Supabase project/API keys thật trong môi trường tạo mã, nên không thể kiểm thử kết nối dịch vụ.

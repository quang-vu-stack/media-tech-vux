# MEDIA TECH VUS v13 — Ổn định, bảo mật và chuẩn bị triển khai

## Thay đổi quan trọng

### 1. Chặn rò rỉ lỗi database qua API

Trước v13, `assertDb` gắn `error.message` từ Supabase vào thông báo JSON trả về frontend. Những chuỗi này có thể lộ tên bảng, cấu trúc SQL, tên server hoặc chi tiết nội bộ. V13:

- Chỉ trả các **mã lỗi** được phép: `DUPLICATE_RECORD`, `GAME_RULE_CONFLICT`, `ACCESS_DENIED`, `DATABASE_UNAVAILABLE`, `MIGRATION_REQUIRED`, `DATABASE_OPERATION_FAILED`.
- Những lỗi không nhận diện được trả HTTP 500 với nội dung chung.
- Log server chỉ ghi mã lỗi đã lọc, không ghi full SQL message.
- Thông báo lỗi AI được giữ lại qua các mã riêng `AI_NOT_CONFIGURED`, `AI_GENERATION_FAILED`.
- Nên xem log ở backend để điều tra; frontend không nhận stack trace.

### 2. API GET /state không còn cập nhật dữ liệu

Trước v13, một lần xem dashboard chạy RPC `process_due_auto_tasks`, có thể thay đổi tiến độ cho nhiều công ty. Đây là hành vi không phù hợp với API đọc và dễ làm request chậm khi số công ty tăng.

- V13 chỉ SELECT khi đọc `/api/state`.
- Worker `auto_tasks`, `agent_reconcile`, `agent_deliverables`, `world_simulation` tiếp tục xử lý công việc nền mỗi 30 giây.
- **Quan trọng:** worker cần backend chạy và `ENABLE_BACKGROUND_WORKER` khác `false`. Nếu tắt worker, việc chỉ tải lại trang sẽ **không** tự hoàn thành nhiệm vụ.
- Worker hiện ở trong cùng API process; không chạy nhiều bản API với worker cùng lúc nếu chưa thiết kế job locking/distributed leader election.

### 3. Frontend xử lý kết nối

- `request()` giới hạn chờ 20 giây để tránh treo vô hạn khi API không trả lời.
- Từ chối phản hồi HTTP 200 không có JSON hợp lệ.
- Không tự động retry POST/PUT hoặc hành động thưởng, vì có thể tạo tác vụ hai lần.

### 4. Kiểm tra cấu hình offline

Chạy tại thư mục dự án:

```powershell
npm run check:config
```

Công cụ không gọi mạng, không in API key. Kiểm tra sự hiện diện cấu hình, URL HTTPS Supabase, hai bên cùng project, không để secret ở frontend, và cảnh báo nguy cơ chạy nhiều worker. Kết quả PASS chỉ có nghĩa **cấu hình có vẻ đúng**, không chứng minh key đang còn hiệu lực hoặc Supabase sẵn sàng.

### 5. Các lệnh cần chạy sau khi cài dependencies

```powershell
npm install
npm run test:all
npm run check:config
npm run build
npm run dev
```

Mở terminal thứ hai:

```powershell
npm run smoke:http
```

Nếu có test Supabase riêng, làm theo `docs/V12_REAL_INTEGRATION.md`. **Không thử trên database production** vì test tạo/xóa hai tài khoản.

## Cập nhật từ v12

1. Sao lưu Supabase và cấu hình `.env` của bạn.
2. Giải nén v13 vào thư mục mới.
3. Chép hai file `.env` từ v12 vào đúng thư mục `apps/web/` và `apps/api/`. **Không chép chúng lên GitHub**.
4. Không cần migration SQL riêng cho v13 nếu các migration trước đã áp dụng đầy đủ.
5. Chạy các lệnh ở trên.

## Giới hạn cần biết

- Đã chạy được test Node và kiểm tra cú pháp tại môi trường tạo dự án.
- Môi trường hiện không truy cập được npm registry, nên **chưa** cài package/build Vite/React đầy đủ.
- **Chưa** kết nối Supabase production, Gemini hoặc OpenAI từ môi trường kiểm tra.
- Chưa có worker phân tán bền vững/đảm bảo chạy 24/7 qua reboot nếu hosting không ổn định.
- Dù mã có kiểm tra tĩnh và iframe sandbox, nó không chứng nhận sản phẩm AI an toàn để đưa lên Internet.

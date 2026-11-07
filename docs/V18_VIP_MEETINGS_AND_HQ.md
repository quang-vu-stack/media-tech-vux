# MEDIA TECH VUS — CEO EMPIRE v18 VIP: Hội đồng điều hành & Trụ sở cấp độ

## Tổng quan

Nâng cấp trực tiếp từ v17 VIP, không tạo lại công ty. Người chơi vẫn là **Chủ tịch và CEO**, nhân viên được triệu tập tới cuộc họp có trạng thái lưu dài hạn. Bản v18 tăng tính tương tác trong văn phòng 3D, có biên bản họp, và thực thi Level Max = 30 tại database.

## Điều đã thực hiện

1. **Triệu tập họp thực sự trong gameplay:** màn hình `Phòng họp CEO · VIP`; chọn 1–12 nhân viên, đặt tên và chương trình họp; `POST /api/meetings` mở họp, `POST /api/meetings/:id/end` lưu biên bản và kết thúc. API luôn xác thực JWT trước khi dùng quyền database service_role.
2. **Không trùng cuộc họp:** một công ty chỉ có một cuộc họp `active` tại một thời điểm. Backend kết hợp khóa transaction và unique partial index.
3. **Không lẫn nhân sự giữa các công ty:** RPC kiểm tra tất cả attendee IDs đúng công ty của CEO và không trùng lặp.
4. **Văn phòng 3D cải tiến:** 12 bàn riêng biệt; nhân viên thực sự di chuyển giữa bàn làm việc, khu hội nghị và màn hình; trạng thái nổi cập nhật định kỳ khi cảnh đang mở.
5. **Bảng công việc 3D:** màn hình lớn hiển thị tên tập đoàn, cấp độ, danh sách việc đang chạy, % tiến độ và trạng thái họp từ dữ liệu máy chủ.
6. **Mở khóa trang trí trụ sở theo cấp độ:** Level 1, 5, 10, 15, 20, 25, 30; ánh sáng, bảng hiệu, các điểm nhấn thị giác được mở dần.
7. **Level Max trên server:** trigger `companies_level_cap_v18` giới hạn cấp độ của tất cả đường cộng XP cũ tại 30; XP vẫn tích lũy và lịch sử không bị xóa.
8. **Hoạt động họp tồn tại sau khi đóng tab:** trạng thái trong PostgreSQL, khi đăng nhập lại vẫn có thể kết thúc và lưu biên bản. Chỉ visual animation phụ thuộc việc mở trình duyệt.

## Điều chưa thực hiện

- Nhân viên chưa có AI multi-agent tự thảo luận trong cuộc họp: họp hiện là **quy trình/hoạt ảnh có dữ liệu lưu thật** do CEO điều hành.
- Chuyển động 3D sử dụng nội suy tọa độ; chưa tích hợp navmesh tránh vật cản hoặc animation rigged nhân vật chuyên nghiệp.
- Bảng công việc lấy từ các nhiệm vụ do game lưu, không phải hoạt động thật của ứng dụng bên ngoài.
- Số lượng nhân viên hiện vẽ trực tiếp tối đa 12 trong một khu vực 3D để tối ưu hiệu năng; người dự họp được ưu tiên xuất hiện.
- Chưa chạy thử build frontend với đủ thư viện và chưa thử Supabase thật trong môi trường tạo mã nguồn.

## Cập nhật từ v17 (không xóa dữ liệu)

1. Sao lưu database Supabase trước khi nâng cấp.
2. Giải nén v18 ZIP; giữ nguyên `apps/api/.env`, `apps/web/.env` của bạn (hoặc cấu hình Docker `.env.deploy`).
3. Trong **SQL Editor** của đúng project Supabase đang lưu game, chạy toàn bộ file:

   `supabase/upgrade_v18_meetings.sql`

   Migration tạo bảng `company_meetings`, RPC meeting và trigger level. **Không chạy `schema.sql` để tạo lại database.**
4. Trong thư mục gốc của project:

   ```powershell
   npm install
   npm run test:office
   npm run test:all
   npm run build
   npm run dev
   ```
5. Mở web, đăng nhập, vào menu `Phòng họp CEO · VIP`. Chọn nhân viên, nhấn bắt đầu, xem cảnh 3D, ghi biên bản rồi nhấn kết thúc.
6. Mở `Tổng quan` để thấy thanh Level 1 → 30 và các hạng mục mở khóa trụ sở.

**Với Docker:** build lại với `docker compose --env-file .env.deploy up --build -d` sau khi chạy migration. Không đưa `SUPABASE_SERVICE_ROLE_KEY` lên frontend.

## Kiểm tra

- `npm run test:all` kiểm tra logic và mã nguồn, gồm 13 test v18.
- `npm run build` cần có React/Three/Vite packages từ `npm install`.
- `GET /api/ready` sẽ kiểm tra bảng `company_meetings` trong bản v18. Nếu chưa chạy migration, readiness báo chưa sẵn sàng thay vì lầm tưởng đủ schema.
- Thử bằng hai tài khoản độc lập trên **Supabase thử nghiệm** trước khi phát hành để kiểm chứng isolation thực tế.

## Lưu ý Level Max

- Level 30 là cấp tối đa hiển thị và lưu ở bảng `companies`.
- Công thức cấp độ giữ nguyên theo game cũ: `min(30, 1 + floor(XP/500))`.
- Nếu đã vượt 30 ở bản trước, migration đưa `level` về 30 nhưng **không xóa XP**.
- Các vật phẩm/mốc mở khóa mới là trang trí trong văn phòng; không tự phát sinh tiền hay tăng thưởng.

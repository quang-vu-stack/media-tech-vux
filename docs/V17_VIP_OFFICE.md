# MEDIA TECH VUS — CEO EMPIRE v17 VIP

## Trọng tâm nâng cấp

Bản v17 VIP tập trung vào trải nghiệm văn phòng 3D và cảm nhận công ty đang vận hành trực tiếp trước mắt CEO.

### 1) Nhân viên AI có thể di chuyển
- Nhân viên không còn chỉ đứng yên tại bàn.
- Trong mô phỏng 3D, nhân viên có thể đi lại xử lý công việc và quay về bàn.
- Nếu có nhiệm vụ đang chạy, họ sẽ luân phiên giữa các trạng thái làm việc, họp và demo.

### 2) Khu họp và hoạt động họp
- Văn phòng có bàn họp trung tâm.
- Nhân viên đang có nhiệm vụ có thể chuyển tới khu họp để thể hiện hoạt động thảo luận kế hoạch.

### 3) Trạng thái nổi trên đầu nhân viên
- Mỗi nhân viên có nhãn hiển thị trên đầu.
- Một số trạng thái tiêu biểu:
  - Sẵn sàng nhận việc
  - Đang làm: [tên nhiệm vụ]
  - Đang họp kế hoạch
  - Đang demo: [tên nhiệm vụ]
  - Đang di chuyển xử lý việc

### 4) Màn hình lớn trong văn phòng
- Bổ sung màn hình lớn hiển thị:
  - Tên công ty
  - Level công ty
  - Danh sách nhiệm vụ đang chạy
- Đây là bảng theo dõi trực quan cho CEO ngay trong scene 3D.

### 5) Level công ty từ Level 1 đến Level Max
- Bổ sung panel Tiến trình phát triển công ty.
- Công ty có Level Max = 30.
- Có thanh tiến độ XP, mốc Level và tên giai đoạn phát triển:
  - Startup Studio
  - Growing Agency
  - Scale-up Tech Firm
  - Regional Powerhouse
  - Legendary Empire

## Tương thích dữ liệu
- Không yêu cầu migration SQL mới nếu bạn đã ở v16.
- Dữ liệu tiền và sổ cái vẫn giữ nguyên.
- Nâng cấp này chủ yếu tác động giao diện và mô phỏng 3D.

## Kiểm tra đã chạy
- 148/148 bài test Node đạt.
- 3 file TypeScript/TSX mới hoặc sửa lớn đã qua kiểm tra cú pháp.

## Lưu ý
- Đây là mô phỏng trực quan trong scene 3D, chưa phải AI tự điều khiển nhân vật bằng hệ navigation phức tạp.
- Chưa xác minh build React đầy đủ hoặc kết nối Supabase thực tế trong môi trường tạo gói này.

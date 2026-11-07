# Kiến trúc MEDIA TECH VUS — CEO EMPIRE v2

## Sơ đồ nghiệp vụ

```text
                                NGƯỜI CHƠI = CEO
                                      |
   +-----------------+----------------+--------------------+
   |                 |                |                    |
PHÒNG CEO          HỌC VIỆN CEO    KINH DOANH           NHÂN SỰ
6 quyết định       30 bài học      hợp đồng             tuyển dụng
profile/strategy   60 quiz         chi phí/doanh thu    lương/thưởng
   |                 |                |                    |
   +-----------------+----------------+--------------------+
                                      |
                              API Node.js Express
                         getUser(JWT) + owner check
                                      |
                              PostgreSQL RPC
                  tasks/ledger/xp/finance/academy/cert
                                      |
            +-------------------------+----------------------+
            |                                                |
      JOB / SIMULATION WORKER                             AI ADVISOR
      30-second polling                                      Gemini
      due_at offline progression                              OpenAI
      atomic task reward                            chat / plan proposal only
            |                                                |
     database transactions                  CEO approval -> backend creates job
```

## Quy tắc công nghệ

- Web React 19 / Vite / TypeScript / Three.js / React Three Fiber / Drei. Hiển thị số dư, nhân sự, nhiệm vụ, Academy, chiến lược, tài chính.
- Node Express 5 giữ `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` trong env phía backend; không xuất ra browser.
- JWT lấy từ Supabase Auth client; mọi API xác thực bằng `db.auth.getUser(jwt)`. Query có `company_id` và `owner_id` kiểm tra phía server; quyền thay đổi trạng thái qua SECURITY DEFINER RPC chỉ grant cho service_role.
- SQL `UPDATE companies`, `INSERT ledger_entries` và đổi task/contract thực hiện trong cùng một transaction RPC.
- CEO Academy server chứa đáp án, không trả về index đúng trước khi nộp bài. 100%/2 câu mới qua, thưởng 75 XP đúng 1 lần/bài.
- Worker tính tiến độ deterministic theo timestamp, không gọi LLM mỗi tick. Nó vẫn chạy khi browser đóng nếu Node API còn chạy. Backend restart sẽ tính bù các job đến hạn.
- Cấp độ dùng công thức `1+floor(xp/500)` trên database.

## Bảo mật / fairness

1. `GET /state` tải dữ liệu công ty thuộc user. GET có thể chạy bước hòa giải các job quá hạn để trạng thái cập nhật ngay khi đăng nhập lại.
2. Khởi tạo công ty chỉ một lần (unique `owner_id`).
3. Thu chi đều qua SQL transaction, giữ dấu vết sổ cái; tài khoản không thể tự đổi treasury từ browser.
4. Nhiệm vụ và hợp đồng không được trả thưởng/lợi nhuận hai lần; hàng được lock trước khi thay đổi.
5. Chỉ server grade bài CEO; không tin điểm số trình duyệt.
6. Cấm chứa service_role key ở frontend.

## Hạn chế & roadmap

**Đã làm:** công ty đa tài khoản, CEO profile/3D, Academy 30 bài, HR thuê, payroll, hợp đồng, quyết định chiến lược, AI chat/đề xuất, nhiệm vụ tự động có tick. Đây là **bộ nguồn beta**, cần kiểm thử Supabase thật sau khi cài dependencies.

**Chưa làm / bước tiếp theo:** cơ chế chấp thuận nhiều cấp và AI tự chia nhiệm vụ theo tool schemas; công cụ tự viết code/sản xuất media (bảo mật sandbox); thị trường cạnh tranh AI nhiều công ty; mô phỏng nhà đất/văn phòng nhiều tầng; đội ngũ di chuyển theo navigation mesh; real-time multiplayer; audit đầy đủ; rate limit phân tán; autoscaling/HA; test end-to-end; live deployment; backup khôi phục; hóa đơn, payroll accounting chuẩn kế toán và hệ thống phá sản.

**Kiến trúc mở rộng production:** tách worker Redis/BullMQ, persistent job queue, WebSocket/Realtime event stream; migrate Postgres bằng công cụ migration có phiên bản; OpenTelemetry/Sentry; backups và restore drill; hosting always-on API và Supabase project production riêng.

# API MEDIA TECH VUS CEO EMPIRE v2

**Base:** `http://localhost:4000/api`. Trừ `/health`, mọi route cần `Authorization: Bearer SUPABASE_JWT`. API tự lấy chủ thể JWT qua Supabase, không nhận `user_id` do frontend tự khai báo.

| Method | Route | Mục đích |
|---|---|---|
| GET | `/health` | Kiểm tra server (public) |
| GET | `/state` | Công ty, nhân sự, nhiệm vụ, hồ sơ, khóa học, hợp đồng, quyết định, sổ cái, lương |
| POST | `/company` | Tạo công ty vốn 10 tỷ, 12 nhân viên |
| PUT | `/ceo/profile` | Tên và thông điệp CEO |
| GET | `/academy` | Giáo trình 10 chương/30 bài và câu hỏi, **không có đáp án** |
| POST | `/academy/submit` | Nộp 2 đáp án, backend chấm điểm, thưởng XP 1 lần |
| POST | `/academy/certificate` | Cấp chứng nhận nội bộ sau 30 bài |
| POST | `/tasks` | Giao nhiệm vụ thủ công |
| POST | `/tasks/auto` | Giao nhiệm vụ hẹn giờ xử lý ở backend |
| POST | `/tasks/:id/advance` | Tăng +25% nhiệm vụ thủ công |
| POST | `/contracts` | Ký hợp đồng mô phỏng |
| POST | `/contracts/:id/complete` | Nghiệm thu, thu doanh thu và chi phí |
| POST | `/employees/hire` | Tuyển người, trừ phí tuyển dụng |
| POST | `/payroll/pay` | Trả lương cho tháng hiện hành 1 lần |
| POST | `/ceo/decide` | CEO xử lý 1 trong 6 tình huống |
| GET | `/ai/history?employeeId=...` | Lịch sử hội thoại theo nhân viên |
| POST | `/ai/chat` | Chat Gemini/OpenAI theo vai trò nhân viên |
| POST | `/ai/plan` | AI tạo đề xuất; chưa thực thi cho đến khi CEO duyệt |

**Ví dụ JSON** (gửi sau khi xác thực):

```json
{ "employeeId": "UUID", "title": "Thiết kế website", "description": "Tạo trang đích", "rewardVnd": 500000, "durationMinutes": 5 }
```

Dùng với `POST /tasks/auto`.

### Giới hạn demo

- Worker chạy ở process API; nhiều instance nên thay bằng queue Redis cho production.
- Chưa có OpenAPI spec tự động.
- Lỗi API chuẩn ở dạng `{ "error": "..." }`.


## AI workforce v3

- `GET /api/agents/orders` — Các kế hoạch, bước chạy và nhật ký thuộc công ty CEO hiện tại.
- `POST /api/agents/plan` — `{employeeId,objective,provider}`; provider = `simulated|gemini|openai`. Lưu đề xuất vào DB, **không giao việc**.
- `POST /api/agents/orders/:id/decision` — `{approve:true|false}`; backend xác minh chủ sở hữu; RPC cập nhật atomic.
- SQL worker `reconcile_agent_orders` cập nhật kết quả mô phỏng sau `process_due_auto_tasks`.

## Thị trường & đối thủ — v4

- `GET /api/market` — xác thực, sinh tối đa 3 cơ hội/ngày UTC cho công ty hiện tại, trả về tối đa 30 offer và danh sách đối thủ. Cần chạy migration `supabase/upgrade_market.sql`.
- `POST /api/market/:id/bid` — body `{ "bidVnd": 150000000 }`. Xác minh ownership qua user JWT; SQL RPC `submit_market_bid` khóa hàng và chấp nhận duy nhất một lần cho cơ hội còn mở. Response `{offer, won}`.
- Khi thắng, RPC tự tạo bản ghi `contracts` ở trạng thái `signed`, không trả tiền ngay. CEO bấm nghiệm thu qua `POST /api/contracts/:id/complete` để nhận doanh thu và ghi chi phí, XP.
- Không có API cho người chơi thay đổi giá của đối thủ hoặc tự phát sinh offer.
- Đối thủ là mô phỏng thuật toán cạnh tranh, không phải LLM tự thực thi.

## V5 Persistent Business World

All routes below require `Authorization: Bearer <Supabase JWT>`.

- `GET /api/world` — advances this user's company up to 45 unprocessed UTC days, reads recent 30 world days, 180 rival daily snapshots, last 30 CEO actions, company reputation/balance.
- `POST /api/world/strategy` — JSON `{ "action": "marketing" | "research" | "reserve" }`. Backend calls transactional `choose_world_strategy` RPC, allowing exactly one CEO choice/day UTC.

Backend worker calls `advance_all_company_worlds({ p_limit: 50 })` every 30 seconds when enabled. This handles a small installation only; for production it requires a paginated queue processing all active companies.

### Database migration

Run `supabase/upgrade_world_v5.sql` after v4 schema. The RPC also upgrades `submit_market_bid` to incorporate market reputation (at most +2% of rival quote).

### Simulation versus autonomous AI

Rival snapshots are deterministic game simulations, not Gemini/OpenAI calls or autonomous real-world work. World events currently appear in the dedicated UI; the bidding advantage is affected by earned reputation. Other effects of world events on customer acquisition and contract pricing are reserved for later versions.

## v6 — AI document handoff and CEO review

- `GET /api/agents/orders` — includes `deliverable`, `review_notes`, `revision_no`, `submitted_at`, `last_generation_error` and status: `drafting`, `awaiting_review`, `revision_requested`, `generation_failed`.
- `POST /api/agents/orders/:id/review` — JWT required. Body: `{ "action": "accept"|"revise"|"retry", "feedback": "..." }`. `revise` needs >=10 chars and allows at most 3 rounds; `retry` is only available if document generation failed.
- The backend worker calls `claim_agent_draft`, uses the specified AI provider (or marked simulated output) and stores the structured report via `save_agent_draft` RPC.
- Reward/XP are granted atomically only through `review_agent_draft(accept)` after CEO acceptance. Browser cannot invoke SQL RPCs directly; an agent-related task cannot use manual `/tasks/:id/advance`.
- The report is JSON in the database and is downloadable for reading. This is not a code-execution or publication API.


## v7 — Software Studio (requires `upgrade_software_studio_v7.sql`)

- `GET /api/studio/projects` — returns max 30 company-owned code projects, source included.
- `POST /api/studio/projects` — body `{employeeId, prompt, provider: "gemini"|"openai"|"simulated"}`, rate limit 4/minute; returns a draft with 3 static files.
- `POST /api/studio/projects/:id/review` — `{decision: "approved"|"rejected"}`; only the company owner can review a previously unreviewed project. No money or XP transfer.
- All AI generation uses server-side keys. No generated code executes in the Node.js backend.
- Frontend preview uses `iframe sandbox="allow-scripts"` (NO `allow-same-origin`), plus a restrictive CSP. Browser execution is still untrusted and should not be treated as production-ready security validation.

## v8 — Software Studio Quality & Versions (requires `upgrade_studio_quality_v8.sql`)

- `GET /api/studio/projects/:id/versions` — lịch sử tối đa 6 phiên bản và báo cáo, kiểm tra chủ sở hữu.
- `POST /api/studio/projects` — giữ request từ v7; nay tạo dự án và phiên bản đầu tiên trong SQL transaction, tự kiểm tra tĩnh.
- `POST /api/studio/projects/:id/quality` — phân tích lại nguồn phiên bản mới nhất, trả `{ report }`, không thực thi JS.
- `POST /api/studio/projects/:id/revise` — body `{ feedback: string, provider: 'gemini'|'openai'|'simulated', expectedVersion: number }`. Giới hạn 6 phiên bản/dự án và optimistic concurrency.
- `POST /api/studio/projects/:id/review` — body `{ decision: 'approved'|'rejected', expectedVersion: number }`. Nghiệm thu `approved` chỉ khi phiên bản mới nhất đã chạy kiểm tra và **không có lỗi chặn**; `rejected` cũng cần có báo cáo. Toàn bộ cập nhật trong RPC có lock.

Các checks v8 gồm: cú pháp JS qua `node:vm.Script` (chỉ parse, không execute), HTML cấu trúc tối thiểu, script/style inline, event handler HTML, CSS braces cơ bản, mạng không được phép, eval và DOM id được JS tham chiếu. Các quy tắc regex/heuristic có thể báo nhầm hoặc bỏ lọt lỗi. Không phải E2E test hay chứng nhận an toàn.

## v9 — Internal release & rollback (`upgrade_studio_release_v9.sql`)

All routes require a valid Supabase JWT; backend verifies ownership against `companies.owner_id`.

- `GET /api/studio/projects/:id/releases` — `{project_id,active_version,events}`; 40 most recent internal release/rollback events.
- `POST /api/studio/projects/:id/release` — `{expectedVersion:2,note:"Approved by CEO"}`. Requires latest CEO-approved version and passing static quality report; backend reanalyzes artifact files and checks SHA-256 before committing via `studio_release_v9` SQL function.
- `POST /api/studio/projects/:id/rollback` — `{targetVersion:1,expectedPublishedVersion:2,note:"Rollback"}`. Can only activate a previously released version, using SQL row lock and atomic audit log insertion.

**No public deployment occurs.** The release history is an internal registry. Optional browser smoke checks are untrusted advisory feedback and never authorize a release.


### v19 VIP · Hội đồng AI

- `GET /api/meetings/:id/debate` — đọc phiên thảo luận đã lưu, chỉ CEO chủ sở hữu công ty.
- `POST /api/meetings/:id/debate` — `{ provider: "gemini" | "openai", employeeIds: [uuid, ...] }`, chọn 2–4 nhân viên trong cuộc họp đang hoạt động. Có xác minh JWT, sở hữu, giới hạn số lần và khóa đồng thời ở database.
- Khi request đồng thời đã có thảo luận đang chạy, backend trả 202 và bản ghi có `status="running"`, không gọi API AI lần nữa.
- Thảo luận trả JSON hai vòng; CEO xem, và có thể chép đề xuất vào biên bản nhưng không tự động chi tiền, ký hợp đồng hoặc tạo nhiệm vụ.
- RPC cần migration `upgrade_v19_ai_council.sql`.

### v20 VIP · CEO phê duyệt và giao việc sau họp AI

- `GET /api/meetings/:id/actions` — trả về tối đa 8 quyết định CEO đã giao từ cuộc họp, gồm người phụ trách, trạng thái, tiến độ và `due_at` của nhiệm vụ thực trong database.
- `POST /api/meetings/:id/actions` — **chỉ CEO** gửi lệnh chủ động với JSON:

```json
{
  "clientRequestId":"dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "employeeId":"11111111-1111-4111-8111-111111111111",
  "title":"Triển khai đề xuất sau cuộc họp",
  "description":"Phân tích, thử nghiệm và báo cáo cho CEO",
  "rewardVnd":0,
  "durationMinutes":120
}
```

- Backend kiểm tra JWT và công ty, sau đó gọi RPC `approve_meeting_action_v20` để xác thực quyền sở hữu, cuộc họp đã có thảo luận AI **hoàn thành**, nhân viên tham dự hợp lệ và giới hạn 8 công việc mỗi cuộc họp.
- SQL tạo nhiệm vụ cùng bản ghi phê duyệt trong **một transaction**. `clientRequestId` chống gửi trùng khi người dùng bấm lại do mạng chậm; dùng lại key với nội dung thay đổi bị chặn.
- Mỗi nhân viên chỉ có tối đa một nhiệm vụ đang chạy; thưởng mặc định 0 VNĐ. Nếu có thưởng, chỉ trừ quỹ khi worker hoàn thành theo cơ chế nhiệm vụ gốc.
- Không có lệnh AI tự phê duyệt, không chạy công việc thực tế bên ngoài mô phỏng, không gọi LLM ở API giao việc.
- Yêu cầu migration `supabase/upgrade_v20_council_actions.sql` sau v19.


## v21: Nghiệm thu báo cáo sau họp AI

- `GET /api/meetings/:id/actions` — thêm `report` (hoặc `null`) vào mỗi hành động; bao gồm trạng thái, phiên bản, nội dung báo cáo mô phỏng, ghi chú CEO.
- `POST /api/meetings/:id/actions/:actionId/review` — CEO-only, JWT, owner-scoped. JSON: `{ "decision": "approve" | "revise" | "reject", "expectedRevision": 0, "notes": "..." }`. `revise` bắt buộc ghi chú từ 8–1000 ký tự. Thao tác không được tự retry.
- `GET /api/ready` — kiểm tra có bảng `meeting_work_reports_v21`.

**Không có route ghi trực tiếp số dư hay bảng báo cáo từ trình duyệt.** Quyết định, cập nhật nhiệm vụ, thưởng và XP được thực hiện thông qua function PostgreSQL `review_meeting_work_report_v21`.


## v22: Bản bàn giao AI và kiểm tra chất lượng sau họp

- `POST /api/meetings/:id/actions/:actionId/handoff` (JWT): body `{ "provider": "simulated" | "gemini" | "openai", "expectedRevision": 0 }`. CEO chủ động tạo tài liệu theo report đang `awaiting_review`; request giới hạn 3 lần/10 phút; cùng report+revision được trả lại nếu đã tạo. Backend kiểm tra owner của công ty và cuộc họp.
- `GET /api/meetings/:id/actions` (JWT): trả thêm `report.handoff` cho revision hiện tại, gồm tài liệu, nguồn và kết quả kiểm tra cấu trúc. Tài liệu cũ không được dùng để duyệt bản đã sửa.
- `POST /api/meetings/:id/actions/:actionId/review` (JWT): giữ API v21; khi `decision=approve`, trigger SQL v22 chặn nghiệm thu nếu chưa có bản bàn giao hiện tại đạt kiểm tra. V21 vẫn là nơi duy nhất trả thưởng/XP trong một transaction.
- `GET /api/ready`: xác minh thêm bảng `meeting_handoffs_v22`.

Migration: `supabase/upgrade_v22_meeting_handoffs.sql`. JSON do AI tạo chỉ là **văn bản mô phỏng**; bộ QA là kiểm tra cấu trúc, không kiểm chứng sự thật hoặc thực thi code.


## v23: Sửa hồ sơ bàn giao và lịch sử phiên bản

- `GET /api/meetings/:id/actions` (JWT): mỗi `report.handoff` hiện có `handoff_version`, `latest_feedback`, `versions[]` theo quyền sở hữu; bản hiện tại vẫn có `quality.passed` của v22, cộng thêm `quality.rubric` nếu tài liệu được đánh giá bằng v23.
- `POST /api/meetings/:id/actions/:actionId/handoff/revise` (JWT, rate limit): JSON `{provider: 'simulated'|'gemini'|'openai', feedback: string(10..900), expectedRevision: int(0..3), expectedVersion: int(1..3)}`. Chỉ chạy khi CEO bấm; ngăn gửi lại ở cùng tiến trình và kiểm soát phiên bản bằng SQL.
- SQL RPC `revise_meeting_handoff_v23` kiểm tra chủ sở hữu, khóa task → report → handoff, tạo bản lịch sử bất biến và cập nhật projection v22 trong cùng transaction. Nó **không thay đổi số dư hay XP**.
- `GET /api/ready` nay yêu cầu thêm `meeting_handoff_versions_v23`.

Migration: `supabase/upgrade_v23_handoff_improvements.sql` (sau v22). Phân loại chuyên môn và chấm điểm chỉ hỗ trợ CEO tham khảo, không xác minh thực tế.

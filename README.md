# MEDIA TECH VUX — CEO EMPIRE v30

**Nâng cấp trực tiếp từ v29; không phải game tạo mới.** Tên thư mục/package lịch sử vẫn là `media-tech-vus` để giữ tương thích. Các phần ghi "VUS" phía dưới là tài liệu lịch sử; **cấu hình VUX mới là 2 tỷ VNĐ, 19 nhân viên, tám phòng và Level MAX 100**. VUS cũ giữ nguyên dữ liệu, không bị đổi thành VUX.

**Mới v30 — Live AI Conversations & Runtime Transparency**

- Trụ sở tải lại *hội thoại đã lưu* qua API mỗi 25 giây khi cửa sổ đang hoạt động; bong bóng AI hiển thị nội dung thật của các lượt mới nhất và tự hết hạn. Khi Gemini tắt, không tự dựng lời thoại giả.
- Dashboard có bảng "Hoạt động AI trong trụ sở" cho CEO xem những cuộc trò chuyện thực sự đã lưu.
- Trang VUX cho biết Gemini worker đã bật/tắt, nguyên nhân, số hội thoại đã dùng và hạn mức trong 24 giờ; không tiết lộ API key.
- Nhân viên đang họp với CEO không được chọn để trò chuyện tự phát; chế độ `quiet` có khoảng nghỉ tối thiểu một giờ theo thời gian thật.
- Giảm những lần cập nhật React không cần thiết cho avatar khi trạng thái làm việc không thay đổi.
- **Không có migration SQL mới ở v30**. Cần các migration lịch sử đến v29 trên Supabase QA trước khi thử. Không tự bật Gemini trả phí.
- **Trạng thái QA:** Node logic PASS; npm production build FAIL do thiếu dependencies trong môi trường này; Supabase QA và Playwright toàn game NOT_RUN. Không coi đây là bản đã được kiểm chứng production-ready.

Xem [`docs/V30_RELEASE_AND_WINDOWS.md`](docs/V30_RELEASE_AND_WINDOWS.md) và [`qa-reports/v30-local-report.json`](qa-reports/v30-local-report.json).

---

## MEDIA TECH VUS v27 VIP — Session Integrity & Recovery

Bản v27 bảo vệ dữ liệu CEO khi đổi tài khoản, chống phản hồi mạng cũ ghi đè dữ liệu mới, tách đúng lịch sử chat từng nhân viên và sửa vòng tải vô hạn khi API gặp sự cố. Phần tải game và cuộc họp có thể hủy request khi chuyển phiên. **Không có migration SQL mới**. Xem [`docs/V27_SESSION_INTEGRITY.md`](docs/V27_SESSION_INTEGRITY.md).

> Kiểm thử Node thành công **không** đồng nghĩa game đã build React, chạy Chromium hoặc kết nối Supabase thật. Xem `docs/qa-evidence/v27-local.json` để biết trạng thái chính xác.

## MEDIA TECH VUS v26 VIP — Production Readiness

Bản v26 ưu tiên bảo vệ bearer token CEO khi frontend kết nối API, sửa chính sách header Nginx cho file JS/CSS, bổ sung kiểm tra MIME của tài nguyên sau triển khai, tự liệt kê bài test khi tạo QA report và có **release gate** riêng cho logic / build / production. **Không có SQL migration mới**. Xem hướng dẫn [`docs/V26_PRODUCTION_READINESS.md`](docs/V26_PRODUCTION_READINESS.md).

> Kiểm tra Node đạt không thay thế build React thật hoặc thử Supabase/Chromium. `npm run release:gate -- --level=production` sẽ chặn khi chưa có bằng chứng live.

## MEDIA TECH VUS v25 VIP — Runtime & Deployment Fixes

Bản v25 dùng đường dẫn API tương đối `/api` mặc định, Vite chuyển tiếp request trong môi trường local, có công cụ kiểm tra môi trường build và kiểm tra tài nguyên web sau triển khai. Chạy `npm run preflight:build` trước `npm run build`, và `npm run smoke:deployed` sau khi Docker + Supabase hoạt động.


## MEDIA TECH VUS v24 VIP — Real Integration & Game QA

Bổ sung bộ khóa an toàn cho thử nghiệm Supabase bằng hai tài khoản, kịch bản Playwright chỉ đọc cho lưu tiến trình và phân quyền, workflow GitHub Actions thủ công cho project QA, cùng công cụ xuất báo cáo JSON xác định rõ PASS/FAIL/NOT_RUN. Không có SQL migration mới. Xem `docs/V24_REAL_INTEGRATION_QA.md`.

# MEDIA TECH VUS — CEO EMPIRE v23 VIP (Sửa tài liệu AI & So sánh phiên bản)

# MEDIA TECH VUS — CEO EMPIRE v15.0

**Bản v15: Financial Integrity — đối soát ngân quỹ CEO**, dựa trên v14 với Docker deployment. Hướng dẫn nâng cấp an toàn: [`docs/V15_FINANCIAL_INTEGRITY.md`](docs/V15_FINANCIAL_INTEGRITY.md). Lộ trình phát triển không cần quyết định từng tính năng: [`docs/ROADMAP_AUTONOMOUS_DEV.md`](docs/ROADMAP_AUTONOMOUS_DEV.md).

- **Mới v15:** API `GET /api/ceo/financial-audit`, chức năng Đối soát ngân quỹ trong tab Tài chính, so sánh số dư với **toàn bộ** ledger (không chỉ 40 giao dịch gần nhất), tiền dạng chuỗi số nguyên chính xác, cảnh báo lệch số dư mà không tự sửa.
- Migration mới: `supabase/upgrade_financial_integrity_v15.sql`. Chạy trên project đã áp dụng đầy đủ migrations trước đó, sao lưu dữ liệu trước.
- Test mới: `npm run test:integrity`; tất cả test: `npm run test:all`.
- **Giới hạn:** chưa thực hiện build frontend đầy đủ với npm dependencies hoặc kiểm thử Supabase live trong môi trường tạo ZIP; một báo cáo cân bằng không có nghĩa dữ liệu có bản backup đáng tin cậy.


**Web Game AI mô phỏng doanh nghiệp — CEO hybrid, tiền VNĐ, văn phòng 3D, Học viện CEO và lệnh AI nhiều bước.**

**[Hướng dẫn cài Windows](HUONG_DAN_WINDOWS.md)** · [Chi tiết kiến trúc](docs/KIEN_TRUC_VA_LO_TRINH.md) · [API routes](docs/API_ROUTES.md)

## Vai trò người chơi

Bạn giữ chức danh **Nhà sáng lập / Chủ tịch / CEO**, quyết định chiến lược, tài chính và nhân sự. Hệ thống NPC AI chỉ đề xuất; các khoản đầu tư lớn, giao việc và hợp đồng đều do bạn phê duyệt. Nhân vật CEO có vị trí riêng trong văn phòng 3D.

## Tính năng đã có trong mã nguồn

- 10 tỷ VNĐ vốn khởi nghiệp, 12 nhân viên seed, mở rộng tuyển thêm tối đa 20 người.
- Dashboard CEO, avatar CEO 3D, hồ sơ CEO lưu trên Supabase.
- **Học viện CEO:** 10 chương, 30 bài, 60 câu trắc nghiệm (đáp án bí mật ở server), bài tập tình huống, lưu kết quả, 75 XP/bài, chứng nhận nội bộ sau khi hoàn thành toàn bộ (+500 XP).
- **Trung tâm quyết định CEO:** 6 tình huống chiến lược chỉ giải quyết một lần, tác động tiền và XP; kết quả backend xử lý và ghi sổ cái.
- **Nhân sự:** hồ sơ, trạng thái, kỹ năng, tuyển dụng với phí, lương hàng tháng.
- **Dự án:** nhiệm vụ thủ công hoặc tự động theo thời hạn (1-1440 phút); nhiệm vụ AI v6 chỉ trả thưởng/XP sau CEO nghiệm thu. Các nhiệm vụ tự động khác tiếp tục trả thưởng đúng hạn.
- **Hợp đồng:** tạo, nghiệm thu, ghi doanh thu và chi phí, +250 XP.
- **Tài chính:** sổ cái, tiền VNĐ dạng bigint, trả lương tháng 1 lần (CEO phê duyệt).
- **Phân tích & thành tựu (v2.1):** biểu đồ thu/chi 7 ngày, quỹ lương dự kiến, hợp đồng đang chờ nghiệm thu, 6 mốc thành tựu và xuất JSON.
- **AI:** Chat Gemini/OpenAI có ngữ cảnh hội thoại, nhân sự, nhiệm vụ, hợp đồng và quyết định; AI đề xuất JSON kế hoạch; CEO duyệt trước khi tạo task.
- **Lưu dài hạn:** Supabase Auth, Postgres, đa tài khoản độc lập, RLS đọc dữ liệu, thay đổi đi qua backend xác thực JWT và RPC transaction.
- **Persistent simulation:** Node API chạy vòng lặp xử lý job đến hạn khi trình duyệt đã đóng; sau khi backend tắt/bật lại, `due_at` phục hồi tiến độ còn chờ.

## AI WORKFORCE v3 — mới

- Menu **AI nhân viên → Đội ngũ nhân viên AI**: chọn một nhân viên và đặt mục tiêu, chọn Gemini, OpenAI hoặc **mô phỏng không cần API**.
- AI đưa ra **2–5 bước** có thời lượng, chi phí thưởng; lưu đề xuất và nhật ký vào Supabase.
- Chỉ **CEO tài khoản sở hữu công ty** được phê duyệt hoặc từ chối. Phê duyệt tạo nhiệm vụ tự động trong game (không gọi dịch vụ ngoài và không tự chi ngoài hạn mức).
- Worker Node.js xử lý nhiệm vụ theo thời gian và đưa ra trạng thái hoàn thành; SQL bảo đảm thưởng và XP không bị cộng trùng.
- Lưu lịch sử `agent_orders` / `agent_events`; xem lại khi đăng nhập. Có chế độ không API để học gameplay.
- **Giới hạn trung thực:** các bước sau phê duyệt là tiến độ mô phỏng bằng quy tắc game, không phải LLM tự thao tác trình duyệt, viết chương trình, gửi email hay tạo sản phẩm ngoài đời. Báo cáo hoàn thành là báo cáo tiến độ trong game.

**Upgrade từ v2.1 (không reset)**: chạy thêm `supabase/upgrade_ai_agents.sql` sau `upgrade_ceo_empire.sql`. Backup Supabase trước khi migration.

## Chạy nhanh

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env
# Tạo Supabase mới: SQL Editor chạy schema.sql, upgrade_ceo_empire.sql rồi upgrade_ai_agents.sql
# Điền URL, keys vào hai .env
npm run dev
```

Mở **http://localhost:5173**. Health API: **http://localhost:4000/api/health**.

## Kiểm tra

```powershell
npm run test:all
npm run build
```

Cần `npm install` trước khi build giao diện. Bản đóng gói đã vượt qua test Node độc lập, nhưng chưa xác minh build phụ thuộc npm và Supabase kết nối thực.

## Không được hiểu sai là đã có

- Không phải sản phẩm đã triển khai công khai, chưa chạy được khi chưa điền Supabase URL/key và chưa cài npm dependencies.
- Chat và lập kế hoạch bằng LLM cần key API thật, có thể có chi phí. **Worker mô phỏng nhiệm vụ không gọi LLM liên tục.**
- Nhân viên 3D là đồ họa mô phỏng, không có animation full motion capture; chưa có thế giới mở hoặc multiplayer đồng thời.
- Chưa có thị trường cạnh tranh động phức tạp, cổ đông thực, cơ chế phá sản hoàn chỉnh, giao dịch thật, hay hàng trăm tác nhân AI tự khám phá và làm mọi việc.
- Chưa kiểm thử tích hợp với Supabase production, chưa chạy đầy đủ `npm install` trong môi trường tạo gói (registry mạng không truy cập được).
- Biểu đồ chỉ tính 40 giao dịch gần nhất; thành tựu dựa trên dữ liệu API trả về (tối đa 80 nhiệm vụ).
- JSON export là bản sao để đọc/lưu, chưa hỗ trợ nhập để khôi phục.
- Để chơi 24/7 khi tắt laptop phải host Node.js ở server luôn hoạt động. Khi tắt cả server, nhiệm vụ được tính bù **khi khởi động lại**, chứ không thực thi lúc server tắt.
- Chứng nhận Học viện CEO là **thành tựu nội bộ game**, không phải bằng tốt nghiệp hay chứng chỉ nghề nghiệp được công nhận.

## Cấu trúc

```text
media-tech-vus/
├── apps/
│   ├── web/src/
│   │   ├── App.tsx                  # Router menu, state, game UI
│   │   ├── components/
│   │   │   ├── OfficeScene.tsx      # CEO + nhân viên văn phòng 3D
│   │   │   ├── CeoOffice.tsx        # Phòng CEO + tình huống
│   │   │   ├── AcademyView.tsx      # Khóa học, quiz, chứng nhận
│   │   │   ├── ContractsView.tsx    # Hợp đồng & doanh thu
│   │   │   ├── HRPanel.tsx          # Tuyển dụng
│   │   │   └── AiPlanner.tsx        # AI đề xuất, CEO duyệt
│   │   ├── types.ts, lib.ts, styles.css
│   │   └── ...
│   └── api/src/
│       ├── index.js                 # Auth + API + worker vòng lặp
│       └── academy.js               # 30 bài, đáp án và chấm điểm
├── supabase/
│   ├── schema.sql                    # Cài gốc Phase 1
│   └── upgrade_ceo_empire.sql       # Migration v2, giữ dữ liệu
├── docs/
├── scripts/
└── HUONG_DAN_WINDOWS.md
```

Dữ liệu tài khoản được giữ riêng theo `company.owner_id`, mật khẩu do Supabase Auth quản lý; API key không được đưa vào frontend.


## v4.0: Thị trường & đối thủ cạnh tranh

- Chạy thêm **`supabase/upgrade_market.sql`** SAU toàn bộ migrations v3, **không xóa database hiện có**.
- Menu **Thị trường & đối thủ**: 3 cơ hội/ngày UTC cho mỗi tập đoàn; mỗi cơ hội có khách hàng, dự án, ngân sách, chi phí dự kiến, giá của đối thủ và nhu cầu.
- CEO quyết định giá chào một lần/cơ hội. Giá chào hợp lệ phải nằm giữa chi phí và ngân sách khách hàng. Kết quả thắng nếu giá chào <= giá đối thủ + lợi thế cấp CEO (tối đa 5%).
- Khi thắng hệ thống tạo **hợp đồng ở trạng thái ký**, doanh thu **chỉ được ghi sau khi CEO nghiệm thu** trong tab Hợp đồng. Khi thua hoặc hết hạn không tạo hợp đồng.
- Dữ liệu cơ hội và giá chào là bản ghi Supabase theo từng tài khoản, không thể reroll miễn phí trong cùng một ngày. Trạng thái và quyền được kiểm tra bằng PostgreSQL RPC với row lock.
- **Đối thủ hiện là thuật toán mô phỏng giá đấu thầu, không phải nhân vật LLM tự đàm phán.** Giá đối thủ hiện được hiển thị để người chơi luyện chiến lược lựa chọn biên lợi nhuận.
- Thị trường là kinh tế **ảo**; không có tiền thật hoặc đối tác thực tế.
- Chạy `npm run test:all` để kiểm tra các quy tắc thị trường và các test cũ. Cần triển khai Supabase thật để thực hiện kiểm thử tích hợp.


## v5.0 — Thế giới kinh doanh & đối thủ tự vận hành

- **Migration cần chạy sau toàn bộ schema của v4:** `supabase/upgrade_world_v5.sql`.
- Tab **Thế giới kinh doanh** có biến động nhu cầu mỗi ngày, nhật ký sự kiện và 6 đối thủ mô phỏng thay đổi số nhân viên, ngân quỹ, sức mạnh và chỉ số ảnh hưởng.
- CEO chọn **Marketing** (80 triệu, +2 uy tín), **Nghiên cứu** (120 triệu, +3) hoặc **Giữ tiền** (0). Mỗi ngày UTC chỉ một lựa chọn. Mọi cập nhật dùng SQL transaction, kiểm tra quyền, ngân quỹ và tính duy nhất.
- Uy tín thị trường tăng lợi thế giá đấu thầu (tối đa +2% giá đối thủ), cộng với lợi thế cấp CEO cũ (tối đa +5%).
- World Engine đồng bộ khi mở tab và mỗi 30 giây qua worker (khi `ENABLE_BACKGROUND_WORKER` bật). Nếu máy chủ tắt, lần đồng bộ sau sẽ bù tối đa 45 ngày mỗi lần; hơn 45 ngày cần đồng bộ lại để cập nhật đến hiện tại.
- **Đối thủ v5 là AI mô phỏng theo luật và sự kiện đã lưu**, không gọi LLM liên tục hoặc tự mua hàng/truy cập Internet. Các chỉ số `market_share` là chỉ số ảnh hưởng riêng, **không phải thị phần cộng lại thành 100%**.
- Worker hiện chỉ quét tối đa 50 công ty đầu tiên mỗi lần, cần phân trang/queue cho production lớn.
- Cần test tích hợp trên project Supabase thật trước khi triển khai hoặc coi như bản release hoàn chỉnh.


## v6.0 — AI tạo tài liệu bàn giao để CEO nghiệm thu

1. **Chạy migration mới SAU v5:** `supabase/upgrade_deliverables_v6.sql` bằng SQL Editor, sao lưu database trước. Migration chỉ bổ sung cột / cập nhật hàm, không xóa các bản ghi cũ.
2. Vào **AI nhân viên → Đội ngũ nhân viên AI** và giao việc. Chọn **Mô phỏng** để có báo cáo mẫu; chọn **Gemini/OpenAI** để sinh nội dung dựa trên mục tiêu (cần API key và có thể phát sinh phí).
3. CEO phê duyệt kế hoạch trước khi nhân viên bắt đầu. Khi đến hạn, worker claim order và viết tài liệu có mục tiêu, các phần nội dung, bước tiếp theo và giới hạn. Có cơ chế lease 3 phút để tránh 2 worker ghi trùng.
4. Nhân viên nộp bản bàn giao vào database. **Tiền thưởng và XP chưa cộng cho đến khi CEO bấm Nghiệm thu**. Chọn **Yêu cầu sửa** (tối đa 3 lần) để gửi phản hồi và sinh bản sửa; nếu AI lỗi chọn **Thử tạo lại**.
5. CEO có thể đọc và tải JSON bản bàn giao. Xuất JSON không phải sản phẩm được triển khai hay hợp đồng ngoài đời.
6. Bản v6 chỉ tạo nội dung văn bản có cấu trúc. Chưa có sandbox thực thi code, tự sửa repository, đăng bài marketing hay gửi email. Điều đó đòi hỏi tool adapters, quyền truy cập và môi trường kiểm tra riêng.

### Độ tin cậy / giới hạn

- Tạo bản bàn giao có thể thất bại do key, quota, model, mạng hay output không hợp lệ; worker sẽ đánh dấu lỗi để CEO chủ động thử lại. Không tráo bản mô phỏng vào output AI khi provider thực không hoạt động.
- Worker cần API backend luôn bật để xử lý đúng thời điểm; máy chủ tắt sẽ xử lý bù sau khi hoạt động trở lại.
- Logic unit tests và kiểm tra cú pháp **không thay thế** kiểm thử tích hợp Supabase, kiểm thử build frontend và vận hành thật.
- Với đơn hàng agent tồn tại từ v5 và đã completed, dữ liệu và thưởng cũ vẫn được giữ nguyên (không bắt nghiệm thu lại).


## v7 — Xưởng phần mềm AI

- Menu **Xưởng phần mềm AI**: CEO chọn kỹ sư, mô tả yêu cầu và chọn Gemini/OpenAI (hoặc bản mẫu offline).
- AI chỉ tạo **3 file tĩnh** `index.html`, `style.css`, `app.js`, lưu theo công ty trong `software_projects`.
- Xem mã nguồn, xem trước trong iframe `sandbox="allow-scripts"` **không cho `allow-same-origin`**; CSP chặn mạng, không thực thi mã AI trên Node.js.
- CEO có thể phê duyệt hoặc từ chối bản bàn giao, tải JSON chứa mã nguồn.
- Không tự triển khai website, không truy cập dữ liệu thật, không build/chạy test mã AI trên server.
- Cần chạy `supabase/upgrade_software_studio_v7.sql` sau mọi migration cũ.
- Mã AI tạo ra **chưa được kiểm toán**. Sandbox ở mức trình duyệt, cần kiểm thử thực tế trước khi dùng sản phẩm ngoài game.

## V8 — Quality Gate & Source Versions

- **Xưởng phần mềm AI v8:** kiểm tra tĩnh JS/HTML/CSS không chạy mã AI trên server; báo cáo lỗi chặn/cảnh báo, SHA-256 mã nguồn, nút kiểm tra lại.
- **Version Control:** lưu tối đa 6 phiên bản mã nguồn của mỗi dự án, xem lại phiên bản trước, xem sự thay đổi qua mã và tải JSON từng phiên bản.
- **AI Revision:** CEO nhập phản hồi, Gemini/OpenAI có thể viết lại từ source trước; chế độ simulated **chỉ chèn ghi chú**, không được quảng cáo là AI sửa được chức năng.
- **CEO Approval Gate:** migration v8 dùng RPC `studio_review_v8` khóa project và đối chiếu phiên bản mới nhất + quality report trước nghiệm thu.
- **Upgrade v7 → v8:** sao lưu database, chạy `supabase/upgrade_studio_quality_v8.sql` sau v7; giữ `.env` cũ. Trên project mới cần chạy lần lượt tất cả migration v1–v8.
- **Thực tế:** static lint chỉ phát hiện một số lỗi, không phải unit test trình duyệt hay quét lỗ hổng. Chưa xác nhận build frontend và Supabase integration trong môi trường đóng gói.

## NEW v9 — Browser smoke check and controlled internal release

- Isolated `iframe sandbox="allow-scripts"` startup smoke test: DOM exists, heading visible, no JS boot errors. This is advisory, can be spoofed by untrusted code, and is **not an authoritative pass**.
- CEO internal release of an approved, latest, static-check-passing version with a source SHA-256 digest; backend re-analyzes the source before submitting a release RPC.
- Immutable release events with version number, digest, timestamp and CEO note. Rollback is allowed only to a version that has previously been released. Newer source versions are never erased on rollback.
- SQL migration `supabase/upgrade_studio_release_v9.sql` **must run after v8**. Does not reset existing accounts or game progress.
- "Release" means **in-game internal release registry**, not hosting deployment. No public upload or actual production pipeline is included. Protect the service-role key on the server and never run untrusted AI scripts in the Node backend.
- Tests: `npm run test:all` including `scripts/release.test.mjs`; frontend full build requires `npm install` and a compatible runtime with network access to npm.

## V10 — Trung tâm vận hành

- Thêm màn hình **Vận hành hệ thống**, chỉ hiển thị cho người chơi đã đăng nhập. API `/api/system/status` trả về thông tin worker của tiến trình backend và thống kê công ty của chính tài khoản đang truy cập.
- Worker gồm 4 nhóm xử lý độc lập: `auto_tasks`, `agent_reconcile`, `agent_deliverables`, `world_simulation`. Lỗi một nhóm không làm dừng các nhóm sau trong cùng một chu kỳ.
- Giám sát số lần chạy/thất bại, lần thành công, mã lỗi chuẩn hóa, khoảng thời gian xử lý; tránh chạy chồng chu kỳ trong cùng tiến trình.
- Không thêm/mất/khởi tạo lại bảng Supabase ở v10. Để dùng bản này, phải chạy đủ các SQL migrations v1–v9 trước đó.
- Các chỉ số chỉ nằm trong bộ nhớ của một tiến trình Node.js. Khi restart sẽ reset; nhiều instance có trạng thái riêng. Chưa thay thế được monitoring/worker queue có độ bền và failover thực.

### Kiểm tra bản nâng cấp

```powershell
npm install
npm run test:all
npm run build
npm run dev
```

Nếu `npm install` không thành công, phải xử lý kết nối npm trước; kết quả kiểm tra cú pháp không tương đương build thành công.

## v12.0 — Kiểm tra sẵn sàng trước phát hành

- Thêm `GET /api/ready` kiểm tra thật kết nối Supabase và các bảng `companies`, `software_projects`, `software_release_events` (200 hoặc 503).
- `GET /api/health` vẫn là liveness; không được dùng để kết luận database đã sẵn sàng.
- Tắt hẹn giờ worker và đóng HTTP listener khi tiến trình nhận SIGINT/SIGTERM.
- Bộ `npm run smoke:http` kiểm tra API đang chạy, lỗi thiếu token, và readiness; tùy chọn `SMOKE_JWT` để kiểm tra tài khoản demo thực.
- Thêm GitHub Actions CI để chạy `npm install`, `npm run test:all`, build và kiểm tra bảo mật cấu trúc.
- Có **78 bài test Node**, bao gồm 8 bài mới; chưa thay thế kiểm thử tích hợp Supabase thực tế.
- **Không có migration v11**. Nếu cập nhật từ v10, giữ nguyên schema Supabase đã nâng tới v9.

Hướng dẫn chi tiết: [`docs/V11_TESTING_AND_DEPLOYMENT.md`](docs/V11_TESTING_AND_DEPLOYMENT.md).


## v12 — Kiểm thử tích hợp & trình duyệt

- `npm run test:all`: bộ test Node (không cần tài khoản Supabase).
- `npm run test:integration`: tạo 2 tài khoản thử trên **test Supabase project** (cần explicit opt-in và API đang chạy).
- `npm run test:e2e`: kiểm tra login-shell, dashboard CEO, Học viện CEO bằng Playwright/Chromium.
- GitHub Actions chạy unit, build và browser smoke.
- Hướng dẫn an toàn: [docs/V12_REAL_INTEGRATION.md](docs/V12_REAL_INTEGRATION.md).
- **Không claim đã xác thực kết nối cloud thực tế khi chưa cấp môi trường kiểm thử.**

## v13 — Runtime Hardening

- Chặn lộ thông báo PostgreSQL/Supabase qua HTTP JSON; phản hồi các mã lỗi an toàn và có thể xử lý trong frontend.
- API `GET /api/state` chỉ đọc; worker tách biệt quản lý tiến độ và tác vụ AI, tránh biến dashboard thành nơi kích hoạt công việc nền toàn hệ thống.
- Giới hạn HTTP frontend 20 giây, không tự retry thao tác thay đổi tiền hoặc nhiệm vụ.
- `npm run check:config`: kiểm tra URL và biến môi trường mà không in khóa bí mật.
- Bộ test Node mở rộng với kiểm tra bảo mật lỗi, cấu hình và hành vi chỉ đọc.
- **Không yêu cầu migration SQL v13** nếu đã nâng cấp đến v12.
- Hướng dẫn: [`docs/V13_STABILITY_SECURITY.md`](docs/V13_STABILITY_SECURITY.md).

## Phiên bản v14 — Deployment & Operations

v14 bổ sung cơ chế chạy 2 container bằng Docker Compose: Nginx frontend, Node.js backend, reverse proxy cùng domain `/api`, kiểm tra readiness, kiểm tra cấu hình bí mật và smoke HTTP. Đây là cách chạy gần production để người chơi truy cập cùng một địa chỉ trên máy triển khai; **không tự động tạo public website, domain hay SSL**. Chi tiết: [docs/V14_DEPLOYMENT.md](docs/V14_DEPLOYMENT.md).

```bash
cp .env.deploy.example .env.deploy
# Điền Supabase project URL, public key, service role key
npm run check:deploy
docker compose --env-file .env.deploy up --build -d
npm run smoke:deployed
```

**Lưu ý:** Chỉ chạy 1 API replica có background worker; không scale ngang trước khi có distributed job locks. Docker images và npm dependencies cần được tải khi build; bài test Node không thay thế kiểm thử tích hợp Supabase, bảo mật hay trải nghiệm 3D thật.


## v16 — Chuyển hiển thị VNĐ / USD cho CEO

- Vào Dashboard hoặc Tài chính, chọn đơn vị ở đầu trang: **VNĐ** hoặc **USD ($)**. Chỉ thay đổi giao diện; vốn, sổ cái, lương, nhiệm vụ và các RPC vẫn tính bằng VNĐ nguyên.
- Thanh trên cùng hiển thị **hai giá trị**: số dư theo đơn vị đang chọn và số tương đương bằng đơn vị còn lại. Toàn bộ mục có dùng hàm `vnd(...)` sẽ tự theo đơn vị đã chọn.
- Tab Tài chính hiển thị rõ tỷ giá, thời điểm cập nhật và nguồn. Giao diện ghi rõ khi tỷ giá dự phòng là thông tin cũ.
- Hệ thống lấy tỷ giá USD/VNĐ tham khảo từ https://open.er-api.com/v6/latest/USD qua API Node, cache thành công 24 giờ. Khi offline, sử dụng tỷ giá tham khảo ghi nhận **04/11/2026: 1 USD = 25.739 VNĐ**, có cảnh báo, không giả vờ là giá mới.
- Khi nhà cung cấp gián đoạn, cache tỷ giá mới nhất trong tiến trình nếu đã lấy được. Sau khi restart và không có Internet, sẽ dùng tỷ giá dự phòng kèm ngày.
- Đơn vị tiền được lưu qua `localStorage` của trình duyệt (thuộc sở thích hiển thị, chưa đồng bộ đa thiết bị), không thay đổi database Supabase. Bản v16 không cần migration SQL.
- Ô nhập ngân sách, tiền thưởng và giá chào vẫn ghi **VNĐ** theo nhãn; đây không phải tính năng đổi số dư/game economy sang USD hay mua bán ngoại tệ. Đổi đơn vị chỉ để dễ xem.
- Nguồn (yêu cầu ghi công): [Rates By Exchange Rate API](https://www.exchangerate-api.com).
- Chạy kiểm tra: `npm run test:currency`, `npm run test:all`, `npm run build` (build cần `npm install`).


## Tính năng mới v17 VIP

- **Nhân viên AI di chuyển trong văn phòng 3D**: đi lại, quay về bàn, di chuyển khi xử lý công việc.
- **Họp chiến lược**: nhân viên đang có nhiệm vụ có thể chuyển sang bàn họp trong mô phỏng.
- **Trạng thái nổi trên đầu**: mỗi nhân viên hiển thị nhãn như “Đang làm”, “Đang họp kế hoạch”, “Đang di chuyển xử lý việc”, “Đang demo”.
- **Màn hình máy tính lớn của văn phòng**: hiển thị bảng công việc đang chạy và cấp độ công ty.
- **Tiến trình công ty từ Level 1 đến Level Max 30**: có thanh tiến độ, mốc phát triển và mô tả từng giai đoạn.

Bản v17 tập trung vào trải nghiệm văn phòng 3D và cảm giác công ty đang vận hành “sống”, không thay đổi sổ cái hoặc cơ chế tiền hiện có.

## v18 VIP — CEO MEETINGS & HEADQUARTERS

- Triệu tập họp qua server, tối đa 12 nhân viên và 1 cuộc họp đang diễn ra cho mỗi công ty.
- Lưu biên bản, người dự, thời gian họp; họp không mất khi thoát tài khoản.
- Văn phòng 3D mới: 12 bàn tách riêng, nhân viên di chuyển, tham dự họp, trạng thái nổi cập nhật định kỳ và màn hình công việc trực tiếp từ nhiệm vụ game.
- Tiến trình mở khóa trụ sở Level 1–30, Level Max được giới hạn qua trigger SQL trên tất cả đường cộng XP.
- **Migration bắt buộc:** `supabase/upgrade_v18_meetings.sql` sau các migration cũ. Không reset dữ liệu.
- Tài liệu chi tiết: `docs/V18_VIP_MEETINGS_AND_HQ.md`.
- **Giới hạn:** Nhân viên di chuyển theo hoạt ảnh mô phỏng; chưa hội thoại multi-agent trong họp. Chưa kiểm thử tích hợp Supabase thật.


## v19 VIP — HỘI ĐỒNG AI TRANH LUẬN

- Triệu tập cuộc họp trong **Phòng họp CEO** như v18. Chọn **2–4 nhân viên** tham dự Hội đồng AI, chọn Gemini hoặc OpenAI, rồi nhấn **Bắt đầu tranh luận AI**.
- Mô hình AI tạo kịch bản hai vòng theo vai trò: ý kiến chuyên môn và phản biện. **Một cuộc thảo luận dùng một lượt gọi AI**, không phải 4 tác nhân độc lập.
- Kết quả lưu Supabase theo công ty và cuộc họp. Mở lịch sử để xem lại. Nhấn vào một lượt phát biểu để làm nổi bật nhân viên trong văn phòng 3D.
- CEO có thể **chép đề xuất vào biên bản**, sau đó tự phê duyệt quyết định. AI không tự chi tiền hay giao nhiệm vụ.
- Lượt gọi Gemini/OpenAI có thể phát sinh chi phí; không tự thử lại yêu cầu trả phí khi mạng gián đoạn. Mỗi cuộc họp chỉ lưu một bản hội đồng thành công.
- **Migration bắt buộc:** `supabase/upgrade_v19_ai_council.sql`, chạy sau v18. Không reset tiền, nhân viên, tiến trình hoặc cấp độ.
- Xem `docs/V19_AI_COUNCIL.md` để biết chi tiết và giới hạn kiểm thử.


## v20 VIP — TỪ QUYẾT ĐỊNH HỘI ĐỒNG ĐẾN NHIỆM VỤ

- CEO có thể chuyển khuyến nghị từ cuộc họp AI đã hoàn tất thành nhiệm vụ mô phỏng với người phụ trách, hạn hoàn thành và thưởng tùy chọn (mặc định 0).
- Nhiệm vụ được tạo ở backend qua SQL RPC nguyên tử, giới hạn 8 quyết định/cuộc họp và kiểm soát không trùng khi gửi lại.
- Bảng theo dõi thể hiện tiến độ thực từ dữ liệu nhiệm vụ trên Supabase. Không giao việc tự động chỉ vì AI đã đề xuất.
- Chạy migration `supabase/upgrade_v20_council_actions.sql` sau v19.
- Xem `docs/V20_COUNCIL_ACTIONS.md` để biết cách dùng, kiểm thử và giới hạn.


## v21 VIP — CEO NGHIỆM THU BÁO CÁO SAU HỌP

- Nhiệm vụ **sau cuộc họp AI**, khi đến hạn, được giữ ở **99%**, không tự trả thưởng.
- Worker tạo **báo cáo MÔ PHỎNG** dựa trên tên, mô tả và thời hạn nhiệm vụ (không gọi AI, không phát sinh phí token, không phản ánh công việc ngoài đời).
- CEO có ba lựa chọn: **Nghiệm thu**, **Yêu cầu sửa** (tối đa 3 lần), hoặc **Từ chối**.
- Chỉ khi **CEO nghiệm thu**, PostgreSQL trừ thưởng và cộng 120 XP **trong một giao dịch**, tạo ledger với `task_id` duy nhất để tránh chi hai lần.
- Khi **Từ chối**, nhiệm vụ chuyển `cancelled`, nhân viên rảnh, không cộng XP hoặc trả thưởng.
- Nhiệm vụ tự động thường và nhiệm vụ agent-deliverable tiếp tục sử dụng cơ chế riêng như trước.
- Các nhiệm vụ v20 **đã hoàn thành và đã xử lý thưởng trước khi cập nhật** không được phát thưởng lại.

**Cần migration mới:** `supabase/upgrade_v21_work_reports.sql`. Chạy **sau** v20 trên Supabase đã sao lưu.

Tham khảo thêm `docs/V21_WORK_REPORTS.md`.


## v22 VIP — HỒ SƠ BÀN GIAO AI & CỔNG KIỂM TRA CHẤT LƯỢNG

- Nhân viên có **hồ sơ bàn giao dạng tài liệu** đi kèm báo cáo sau họp.
- CEO chọn **mô phỏng (không phí AI)** hoặc **Gemini/OpenAI**; API chỉ được gọi khi CEO chủ động bấm nút, có giới hạn tần suất.
- Kiểm tra 5 tiêu chí định dạng và độ chi tiết trước khi duyệt. Điểm này **không xác minh chất lượng/sự thật thực tế**.
- PostgreSQL bắt buộc có bản bàn giao phù hợp revision đang chờ và đạt kiểm tra trước khi `approved`; thưởng/XP vẫn do RPC v21 quản lý.
- **Migration mới:** `supabase/upgrade_v22_meeting_handoffs.sql` (chạy sau v21 và sau khi sao lưu DB).
- Hướng dẫn đầy đủ: `docs/V22_HANDOFF_QUALITY.md`.


## v23 VIP — AI QUALITY IMPROVEMENT

- **Sửa hồ sơ bàn giao ngay trong một lần báo cáo**: CEO gửi phản hồi 10–900 ký tự; chọn mô phỏng (không phí) hoặc Gemini/OpenAI (có thể tính phí). Không tự tạo ở nền.
- **Lưu tối đa 4 phiên bản tài liệu** của cùng một lần báo cáo, mỗi bản có nội dung, thời điểm, nguồn tạo, góp ý và kết quả kiểm tra; các phiên bản cũ được giữ lại.
- **So sánh trước/sau**: giao diện hiển thị tóm tắt, điểm cấu trúc và góp ý đã dẫn đến bản sửa.
- **Chuyên môn riêng**: bảng kiểm tham khảo theo nhóm Kỹ thuật, Marketing, Tài chính, Vận hành hoặc Tổng hợp. Đây là heuristic theo từ khóa, **không thay thế nghiệm thu thực tế**.
- **CEO vẫn giữ toàn quyền**: kết quả AI chỉ cập nhật tài liệu; không chuyển tiền hoặc thực hiện công việc ngoài game. V22 quality gate và v21 atomic payout tiếp tục bảo vệ thưởng.
- **Migration**: Sao lưu DB trước, chạy `supabase/upgrade_v23_handoff_improvements.sql` SAU v22. Không reset công ty, thưởng hay XP.

Xem `docs/V23_AI_QUALITY_IMPROVEMENT.md` để biết luồng cụ thể và giới hạn.


## v28: Chẩn đoán build, Chromium và Supabase thật

Xem `docs/V28_FIX_3_STATUSES.md`. Lệnh `npm run qa:status` xem dữ liệu QA hiện có,
`npm run qa:db:check` kiểm tra bộ file migration, `npm run qa:environment` chẩn đoán
thư viện và khả năng kết nối npm, còn `npm run qa:browser:python` kiểm tra bộ máy Chromium
(nếu đã cài Python Playwright). Bộ kiểm tra Chromium đơn lẻ **không thay thế** E2E của web game.


## V29 fork: MEDIA TECH VUX

This source is an in-place evolution of the V28 VUS codebase. VUX has a separate 2-billion VND bootstrap, 19 sample employees, 8-room isometric campus, level cap 100, and opt-in Gemini conversation worker. See `docs/V29_VUX_RELEASE_NOTES.md`, `docs/V29_WINDOWS_SETUP.md` and `docs/V29_SUPABASE_GEMINI.md`. No production migration or public deployment has been performed.

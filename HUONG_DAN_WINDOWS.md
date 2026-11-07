> **MEDIA TECH VUX v30:** Dự án hiện là VUX trên nền mã lịch sử VUS. Đọc `docs/V30_RELEASE_AND_WINDOWS.md` trước; các chỉ dẫn VUS dưới đây dành cho lịch sử. Không chạy lại migration VUS hay xóa dữ liệu cũ.

# Bổ sung cho MEDIA TECH VUS v27 VIP

Nếu đã có v26 và database đầy đủ đến migration v23, bản v27 **không cần chạy thêm SQL**. Tải ZIP v27, giải nén, giữ nguyên file `.env` của chính bạn (đừng chép secret vào frontend), sau đó chạy tại thư mục chứa `package.json`:

```powershell
npm install
npm run test:all
npm run preflight:build
npm run build
npm run dev
```

Để kiểm tra trên project QA riêng, làm theo `docs/V24_REAL_INTEGRATION_QA.md`. Không chạy các thử nghiệm tạo tài khoản trên database sản xuất. Hướng dẫn này có các bước cài đặt lịch sử; sử dụng tên ZIP mới `media-tech-vus-ceo-empire-v27-vip.zip` thay vì phiên bản v3 trong mục phía dưới.

---

# MEDIA TECH VUS CEO EMPIRE v3 — HƯỚNG DẪN WINDOWS

**Phiên bản mã nguồn để bạn cài trên máy, không phải game đã được host công khai.** Thực hiện theo thứ tự dưới đây, KHÔNG xóa project Supabase đang có nếu bạn đã chơi bản Phase 1.

## 1. Máy tính cần gì?

- Windows 10/11, Google Chrome hoặc Edge có hỗ trợ WebGL.
- Node.js **22.12.0 trở lên** (khuyến nghị bản LTS mới nhất), npm đi kèm: https://nodejs.org/
- VS Code: https://code.visualstudio.com/
- Internet để `npm install`, tạo Supabase project và gọi Gemini/OpenAI.

Mở PowerShell và kiểm tra:

```powershell
node -v
npm -v
```

## 2. Giải nén mã nguồn

Giải nén `media-tech-vus-ceo-empire-v3.zip`. Mở thư mục **media-tech-vus** trong VS Code, chọn **Terminal > New Terminal**.

```powershell
npm install
```

Nếu npm báo lỗi mạng, hãy kiểm tra Internet/proxy rồi thử lại. **Không chạy lệnh trong thư mục `apps/web`**; hãy chạy tại thư mục gốc có `package.json`.

## 3. Cài đặt Supabase và giữ tài khoản cũ

Mở https://supabase.com/dashboard

**Trường hợp A — Chưa từng tạo game:**

1. Tạo project Supabase mới.
2. Vào **SQL Editor**.
3. Mở `supabase/schema.sql`, sao chép toàn bộ vào SQL Editor và Run.
4. Tiếp theo mở `supabase/upgrade_ceo_empire.sql`, sao chép toàn bộ và Run.
5. Cuối cùng chạy `supabase/upgrade_ai_agents.sql`.

**Trường hợp B — Đã chơi Phase 1:**

1. Mở **project Supabase cũ** mà bạn đã dùng. Không tạo project mới.
2. **Sao lưu database** trước khi chạy migration.
3. Nếu đã chạy `upgrade_ceo_empire.sql` từ v2.1, **không cần chạy lại**; chỉ chạy `supabase/upgrade_ai_agents.sql`. Nếu từ Phase 1, chạy upgrade_ceo_empire.sql trước rồi mới chạy upgrade_ai_agents.sql. **Không reset công ty hoặc chạy lại schema.sql.**
4. Giữ nguyên `SUPABASE_URL` và key của project cũ.

Migration bổ sung hồ sơ CEO, tiến độ khóa học, hợp đồng, quyết định chiến lược, nhân viên tuyển mới, bảng lương và nhiệm vụ tự động. Những dữ liệu Phase 1 đã lưu sẽ được giữ nếu migration chạy thành công.

Nếu SQL báo lỗi, không chạy lại mù quáng trên dữ liệu thực: ghi lại thông báo lỗi và kiểm tra hoặc hỏi hỗ trợ trước.

## 4. Tạo file cấu hình bí mật

Ở PowerShell tại thư mục gốc:

```powershell
Copy-Item apps/web/.env.example apps/web/.env
Copy-Item apps/api/.env.example apps/api/.env
```

Sửa `apps/web/.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
VITE_API_URL=/api
```

Sửa `apps/api/.env`:

```env
PORT=4000
WEB_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
ENABLE_BACKGROUND_WORKER=true
```

Tìm **Project URL** và API keys trong Supabase Dashboard → Project Settings → API / API Keys (tên mục có thể thay đổi).

- `anon` / `publishable key` chỉ để phía web.
- `service_role` / secret key **CHỈ** để ở `apps/api/.env`. Đừng đưa lên GitHub hoặc chia sẻ cho người khác.
- Nếu bạn chưa có key Gemini/OpenAI, **để trống** và dùng các phần game không cần model: CEO, học viện, văn phòng, nhân sự, tiền, nhiệm vụ và hợp đồng vẫn hoạt động. Chat AI và đề xuất AI cần key tương ứng.
- Gemini API key: https://aistudio.google.com/apikey
- OpenAI API key: https://platform.openai.com/api-keys — ChatGPT Plus không đồng nghĩa bạn đã có ngân sách API.

## 5. Chạy game

```powershell
npm run doctor
npm run dev
```

Sau khi khởi động, mở:

- **Game:** http://localhost:5173
- **API health:** http://localhost:4000/api/health

Nếu API hoạt động, health trả về JSON có `ok: true` và `phase: 2`.

Lưu ý: lần đầu Vite cần cài đặt dependencies và biên dịch code.

## 6. Chơi thử từng tính năng

1. Đăng ký email/mật khẩu. Nếu Supabase yêu cầu xác minh email, mở hộp thư xác nhận. Đăng nhập.
2. Nhập **tên CEO của bạn**, để tên công ty **MEDIA TECH VUS**, bấm thành lập. Công ty bắt đầu với **10.000.000.000 VNĐ và 12 nhân viên**.
3. Vào **Phòng Chủ tịch & CEO** để sửa tên, thông điệp lãnh đạo và xử lý 6 tình huống chiến lược. Mỗi tình huống chỉ giải quyết một lần.
4. Vào **Học viện CEO**: chọn chương → đọc bài → trả lời **2 câu**. Đúng cả hai sẽ hoàn thành và nhận **75 XP**. Có 30 bài thuộc 10 chương. Hoàn thành cả 30 bài sẽ nhận chứng nhận nội bộ và 500 XP, có thể in.
5. Vào **Nhân sự**, chọn người trong văn phòng 3D; nhập hồ sơ để tuyển người mới (chi phí tuyển dụng 2 triệu VNĐ).
6. Vào **Dự án & nhiệm vụ**, chọn **Tự động theo thời hạn**, thử đặt **1 phút** rồi giao cho nhân viên. Đợi đến hạn; API/worker xử lý và ghi thưởng, XP. Nếu muốn thử thủ công, chọn **CEO cập nhật từng mốc** và bấm +25% bốn lần.
7. Vào **Hợp đồng**: ký một hợp đồng 200 triệu doanh thu, 80 triệu chi phí, bấm **Nghiệm thu** để ghi số dư. Đây là dòng tiền mô phỏng.
8. Vào **Tài chính**: xem sổ cái và chủ động phê duyệt bảng lương tháng. Cùng một tháng không thể trả lương hai lần.
9. Vào **AI nhân viên** để trò chuyện nếu đã cấu hình Gemini/OpenAI. Bên dưới có tính năng **AI đề xuất kế hoạch → CEO phê duyệt → giao nhiệm vụ tự động**.
10. Đóng tab game, mở lại hoặc đăng nhập trên thiết bị khác dùng cùng project/server, dữ liệu đã lưu vẫn còn.

## 7. Cơ chế offline/persistent chính xác

- **Khi chỉ đóng trình duyệt** nhưng Node.js API server còn chạy, worker chạy chu kỳ ~30 giây, xử lý nhiệm vụ tự động đến hạn. Không cần mở web.
- **Khi API server bị tắt**, nhiệm vụ không được xử lý thực tế trong lúc máy chủ ngừng. Khi API khởi động lại và tải trạng thái, những nhiệm vụ đã quá hạn được tính bù bằng timestamp `due_at`.
- **Khi máy tính của bạn tắt**, Node backend chạy trên máy đó cũng tắt. Để game tiếp tục chạy thường xuyên, bạn cần **triển khai backend trên máy chủ hoạt động liên tục** (VPS / hosting không sleep).
- AI chỉ được gọi khi bạn bấm chat hoặc xin kế hoạch; worker tự động hoàn thành nhiệm vụ theo luật mô phỏng, **không phải LLM độc lập làm việc 24/7**.

## 8. Kiểm thử & xây dựng frontend

```powershell
npm run test:game
npm run build
```

Các test có sẵn kiểm tra giáo trình, điểm quiz, sự hiện diện của các module, phân tách bí mật API và những hàm SQL quan trọng. Build kiểm tra frontend sau khi `npm install` thành công. Các kiểm tra này **không thay thế** test tích hợp Supabase thật.

## 9. Những lỗi thường gặp

| Vấn đề | Cách xử lý |
|---|---|
| `Cannot find module` | Chạy `npm install` ở thư mục gốc. |
| Backend thiếu Supabase URL/service-role | Kiểm tra `apps/api/.env`; không thêm dấu ngoặc kép thừa. |
| Web hiện thông báo chưa cấu hình | Kiểm tra `apps/web/.env`; tắt Vite bằng Ctrl+C rồi khởi động lại. |
| Login thành công nhưng trạng thái lỗi | Đảm bảo đã chạy **cả hai** file SQL theo đúng thứ tự nếu cài mới. |
| Lỗi `schema cache` / function not found | Kiểm tra SQL đã chạy thành công và Supabase PostgREST nhận cấu trúc mới; khởi động lại backend. |
| AI báo 502/503 | Kiểm tra key, model ID, billing/quota, kết nối mạng và log Node. |
| Nhiệm vụ không tự hoàn thành | Kiểm tra `ENABLE_BACKGROUND_WORKER`, tiến trình Node còn chạy, SQL migration và số dư đủ để trả thưởng. |
| Game 3D bị trắng | Kiểm tra tăng tốc phần cứng/WebGL, driver đồ họa và console trình duyệt. |
| Email not confirmed | Xác nhận email theo hướng dẫn Supabase Auth. |

## 10. Chạy online và bảo vệ dữ liệu

Để người khác dùng website, cần deploy **hai dịch vụ**:

- Static frontend (`apps/web`) dùng Vite `npm run build` để tạo thư mục `dist`.
- Node backend (`apps/api`) phải có URL HTTPS, biến môi trường bí mật và instance **luôn hoạt động** nếu muốn job tiếp tục chạy offline.

Khi deploy qua Docker/Nginx, để `VITE_API_URL=/api` để web và API chạy cùng origin. Chỉ đặt API URL riêng khi đã cấu hình HTTPS/CORS phù hợp; cấu hình `WEB_ORIGIN` phải trùng địa chỉ frontend được phép. Kích hoạt backup Supabase, giám sát lỗi, quản lý rate-limit bằng Redis/shared store cho nhiều instance, kiểm thử quyền RLS và API trước khi ra mắt công khai.

**Không được** ghi `SERVICE_ROLE_KEY`, Gemini API key hay OpenAI API key vào bất kỳ biến `VITE_` hoặc file `.tsx` nào. Không có chức năng rút tiền thật trong game.


## Bổ sung v2.1

Vào mục **Phân tích & thành tựu** để xem báo cáo thu chi 7 ngày, quỹ lương dự kiến, 6 thành tựu CEO và xuất JSON dữ liệu. Chỉ dùng dữ liệu đang tải, không phải sao lưu database toàn phần.


## 10. Chạy hệ thống nhân viên AI phiên bản v3

Sau khi đăng nhập, chọn **AI nhân viên**, kéo xuống **Đội ngũ nhân viên AI tự chủ trong game**. Chọn nhân viên, ghi mục tiêu (ít nhất 8 ký tự), chọn *Mô phỏng* để dùng không cần API key; hoặc chọn Gemini / OpenAI nếu backend đã cấu hình khóa hợp lệ. Nhấn **Yêu cầu AI lập kế hoạch**, kiểm tra các bước và bấm **CEO phê duyệt**. Tác vụ được tính giờ và tự hoàn thành trong thế giới game. Xem nhật ký ở phần đơn hàng và báo cáo tiền/XP tại dashboard.

Nếu bạn đóng trình duyệt mà vẫn để backend chạy, nó xử lý nhiệm vụ mỗi 30 giây. Nếu backend cũng dừng, nó xử lý bù khi bật trở lại (nếu dữ liệu và migration vẫn còn). Máy tính tự tắt **không** có nghĩa API vẫn chạy 24/7; muốn hoạt động liên tục cần triển khai lên server luôn bật.

### Nếu báo thiếu `upgrade_ai_agents.sql`

Hãy sao lưu dữ liệu và chạy file SQL mới tại **đúng project Supabase**. Không tự xóa bảng khi gặp lỗi.

### Kiểm tra nhanh

```powershell
npm run test:all
npm run build
npm run dev
```

`test:all` kiểm tra logic đơn vị và cấu trúc; build yêu cầu cài xong npm, còn kiểm thử thao tác thật cần Supabase / các API key do bạn quản lý.


## Nâng cấp v3 → v4: Thị trường và đối thủ

1. **Sao lưu database Supabase trước khi nâng cấp.**
2. Đảm bảo đã chạy `schema.sql`, `upgrade_ceo_empire.sql`, `upgrade_ai_agents.sql` trước đó.
3. Vào Supabase SQL Editor, chạy nội dung `supabase/upgrade_market.sql` đúng một lần. Đây là migration bổ sung, không reset game.
4. Chạy `npm install`, `npm run test:all`, `npm run build`, rồi `npm run dev`.
5. Đăng nhập, vào tab **Thị trường & đối thủ**. Mỗi công ty có tối đa ba cơ hội đấu thầu mới mỗi ngày (theo ngày UTC).
6. Chọn giá chào >= chi phí, <= ngân sách; nhấn phê duyệt. Nếu thắng, chuyển sang **Hợp đồng kinh doanh** để nghiệm thu và ghi dòng tiền.

**Lưu ý:** v4 chưa có đối thủ AI dùng LLM hoặc thị trường được điều khiển bởi dữ liệu kinh tế thật; đối thủ dùng quy tắc cạnh tranh mô phỏng để tạo gameplay dự đoán được. Nhiệm vụ offline cần Node.js backend chạy để xử lý đúng hạn (hoặc xử lý bù khi backend hoạt động lại).


## Nâng cấp từ v4 sang v5

1. **Sao lưu database trước khi chạy SQL**, giữ nguyên URL và API key Supabase.
2. Chạy migration `supabase/upgrade_world_v5.sql` trong SQL Editor, **sau** `schema.sql`, `upgrade_ceo_empire.sql`, `upgrade_ai_agents.sql`, `upgrade_market.sql`.
3. Sau khi cập nhật code, chạy `npm install`, `npm run test:all`, `npm run build`, `npm run dev`.
4. Mở menu **Thế giới kinh doanh**, kiểm tra danh sách sáu đối thủ và chọn **một** chiến lược/ngày UTC.
5. Quay lại **Thị trường & đối thủ** để đấu thầu; uy tín sẽ giúp tăng lợi thế cạnh tranh.
6. Nếu đã dừng backend nhiều hơn 45 ngày, mở lại màn Thế giới kinh doanh một vài lần để đồng bộ bù ngày; Worker đang chạy không phụ thuộc tab trình duyệt.

**Quan trọng:** Dữ liệu v5 là trò chơi mô phỏng. Đối thủ chưa sử dụng Gemini/OpenAI để lập chiến lược; cần bổ sung orchestration, worker phân trang, CI/CD và test tích hợp để phát hành production.


## Nâng cấp v5 → v6: AI bàn giao tài liệu, CEO nghiệm thu

1. Sao lưu Supabase database và giữ các file `.env` hiện tại.
2. Đảm bảo toàn bộ migration v5 đã chạy. Trong Supabase SQL Editor, chạy `supabase/upgrade_deliverables_v6.sql` **một lần**, không cần xóa bảng hay reset tài khoản.
3. Cập nhật mã nguồn v6 rồi chạy `npm install`, `npm run test:all`, `npm run build`, `npm run dev`.
4. Vào **AI nhân viên → Đội ngũ nhân viên AI**. Giao nhiệm vụ, chọn Mô phỏng/Gemini/OpenAI và CEO phê duyệt kế hoạch.
5. Khi nhiệm vụ đến hạn, chờ worker backend tạo bản bàn giao (worker quét mỗi 30 giây). Chọn **Yêu cầu sửa** hoặc **CEO nghiệm thu và thưởng**. Thưởng chỉ trừ ngân quỹ sau nghiệm thu.
6. Nếu job lỗi, xem thông báo và log backend, kiểm tra key/model/quota rồi chọn **Thử tạo lại**.

**Lưu ý:** các đơn hàng agent hoàn thành trước v6 giữ nguyên thưởng trước đó. Bản v6 không tự động tạo phần mềm thực, chỉ tạo tài liệu nội dung cho CEO xem xét.


## NÂNG CẤP v6 → v7: XƯỞNG PHẦN MỀM AI

1. Sao lưu Supabase và giữ nguyên hai file `.env`.
2. Trong Supabase SQL Editor, chạy **duy nhất migration mới** `supabase/upgrade_software_studio_v7.sql` (không chạy lại schema từ đầu).
3. Tại thư mục gốc chạy: `npm install`, `npm run test:all`, `npm run build`, `npm run dev`.
4. Mở tab **Xưởng phần mềm AI**, chọn nhân viên, nhập yêu cầu, chọn Gemini/OpenAI hoặc bản mẫu, tạo sản phẩm.
5. Xem mã trong tab **Mã nguồn**, xem thử bằng iframe cách ly, sau đó CEO phê duyệt hoặc từ chối. Xuất JSON nếu cần.

**An toàn:** Mã AI không chạy trên backend, không có quyền sửa ngân quỹ hoặc triển khai ra Internet. Không nhập API key/mật khẩu vào ứng dụng tạo ra. Dữ liệu bản thảo thuộc công ty trong Supabase. Xem trước trong sandbox không phải là kiểm toán bảo mật.

## Nâng cấp Xưởng phần mềm AI lên v8.0 (kiểm thử và lịch sử phiên bản)

1. **Sao lưu** dữ liệu Supabase và toàn bộ thư mục game trước khi cập nhật.
2. Đảm bảo đã chạy đủ SQL theo thứ tự giai đoạn 1 tới v7 (tài khoản mới cần toàn bộ migration trước đó).
3. Vào Supabase **SQL Editor** và chạy `supabase/upgrade_studio_quality_v8.sql` **một lần**. Migration này thêm `current_version`, bảng `software_project_versions`, backfill các dự án v7 thành phiên bản 1 và RPC kiểm tra/đổi phiên bản.
4. Giữ nguyên `apps/web/.env` và `apps/api/.env` hiện có (không copy file .env.example đè lên cấu hình thật).
5. Trong PowerShell tại thư mục gốc của v8, chạy:

```powershell
npm install
npm run test:all
npm run build
npm run dev
```

6. Vào **Xưởng phần mềm AI**, chọn dự án, nhấn **Kiểm tra lại** để chấm mã cũ từ v7; với dự án v8 mới, báo cáo được tạo ngay khi lưu bản mã.
7. Nếu bị chặn, nhập ý kiến CEO rồi nhấn **Tạo phiên bản mới** (tối đa v6 của một dự án); chọn Gemini/OpenAI để AI thật sửa, hoặc chế độ mô phỏng để tạo bản demo có ghi chú.
8. Chỉ **CEO nghiệm thu** khi kiểm tra tĩnh của phiên bản mới nhất không có lỗi chặn. Cảnh báo vẫn cần đọc và đánh giá thủ công.

**Lưu ý:** v8 KHÔNG chạy mã AI trên máy chủ, chưa thực hiện unit test/E2E thật trên các ứng dụng được AI viết và chưa tự triển khai website. Nút xem trước chạy mã trong `iframe sandbox="allow-scripts"` với CSP ngăn kết nối. Tuy vậy, mã chưa tin cậy vẫn có nguy cơ lỗi hoặc thử làm tắc trình duyệt; không chạy hoặc triển khai mã này trong môi trường production khi chưa được kiểm toán.

## Nâng cấp v8 → v9: Chạy thử & phát hành nội bộ

1. **Sao lưu database Supabase và toàn bộ dự án** trước khi cập nhật. Đây là migration mới, không xóa dữ liệu v8.
2. Giữ nguyên `apps/web/.env` và `apps/api/.env`. Chạy `supabase/upgrade_studio_release_v9.sql` trong Supabase SQL Editor **sau khi đã chạy migration v8**.
3. Trong thư mục gốc v9, chạy `npm install`, `npm run test:all`, `npm run build`, sau đó `npm run dev`.
4. Mở **Xưởng phần mềm AI**, chọn một dự án, nhấn **Chạy thử**: ứng dụng khởi tạo trong iframe cách ly và gửi báo cáo DOM/JS. Đây chỉ là kiểm tra sơ bộ trên trình duyệt, có thể bị mã sinh ra đánh lừa; **không sử dụng kết quả này để bảo đảm ứng dụng an toàn**.
5. Chọn bản mới nhất đạt kiểm tra tĩnh, nhấn **CEO nghiệm thu**. Sau đó nút **Phát hành vN** sẽ bật; nhấn để ghi bản phát hành nội bộ (dữ liệu vào Supabase, **không tạo website public**).
6. Nếu đã phát hành bản v1, v2 và v2 hoạt động kém, có thể chọn **Khôi phục v1** từ lịch sử; phiên bản mã nguồn mới không bị xóa.
7. Kiểm tra database bảng `software_release_events`, trường `published_version` của `software_projects` và các API mới. Nếu gặp lỗi thiếu quan hệ hoặc RPC, xác minh migration v9 đã chạy trên đúng Supabase project.

**Cần phân biệt:** **Phát hành nội bộ** là chỉ định phiên bản đang hoạt động trong dữ liệu game; không đẩy mã AI lên hosting công cộng. Để xuất bản web thật cần thiết kế dịch vụ riêng, quét mã, build/test tại môi trường cô lập, cấp quyền triển khai và giám sát hoạt động. Kết quả kiểm tra tĩnh hoặc trình duyệt hiện chưa đủ chứng minh bảo mật / tính đúng đắn.


## V10 — Nâng cấp từ v9 (không cần SQL mới)

1. Sao lưu Supabase, backup file `.env` hiện tại.
2. Giải nén bản v10, chép lại hai file `.env` vào `apps/web` và `apps/api`; không đưa service-role key lên frontend.
3. Chạy `npm install`, `npm run test:all`, `npm run build`, `npm run dev`.
4. Đăng nhập, vào menu **Vận hành hệ thống**. Backend API là `http://localhost:4000/api/health`.
5. Worker mất kết nối database sẽ hiện trạng thái lỗi, nhưng trạng thái chỉ tồn tại trong bộ nhớ của tiến trình hiện tại.
6. Nếu nâng từ bản cũ hơn v9, bắt buộc chạy các SQL migration còn thiếu theo `npm run doctor`; **v10 không cần chạy thêm migration**.

## Bổ sung v11 — Cổng kiểm tra trước khi chơi

Không cần migration SQL mới nếu bạn đã sử dụng database đã nâng cấp tới v9. Sau khi cấu hình hai file `.env` và khởi động backend, kiểm tra:

```powershell
npm run test:all
npm run build
npm run dev
```

Trong terminal mới:

```powershell
npm run smoke:http
```

- http://localhost:4000/api/health trả `ok: true` khi Node chạy.
- http://localhost:4000/api/ready trả HTTP **200** nếu Supabase và các bảng v9 sẵn sàng; trả **503** nếu lỗi.
- Nếu thiếu thư viện npm, cần `npm install` trên máy có Internet.
- Có thể cấu hình GitHub Actions từ `.github/workflows/validate.yml` để tự kiểm tra trên GitHub mỗi lần cập nhật code.

Đọc thêm: `docs/V11_TESTING_AND_DEPLOYMENT.md`. **Không gửi `.env` hay API key lên GitHub.**


## v12: Kiểm thử Supabase, nhiều tài khoản và trình duyệt

Trước khi chạy integration (tạo và xóa tài khoản thử), đọc **docs/V12_REAL_INTEGRATION.md**. Chỉ chạy trên một project Supabase test riêng. Lệnh `npm run test:all` không cần credentials, còn `npm run test:integration` yêu cầu xác nhận rõ và `npm run test:e2e` yêu cầu Chromium của Playwright.

## Ghi chú nâng cấp v13 (từ v12)

Giữ cấu hình `.env` cũ, không cần chạy SQL migration mới. Hãy mở Terminal và chạy:

```powershell
npm install
npm run test:all
npm run check:config
npm run build
npm run dev
```

Nếu `check:config` báo lỗi, sửa URL Supabase hoặc các trường bị thiếu trước. Nếu tắt worker bằng `ENABLE_BACKGROUND_WORKER=false`, việc mở lại dashboard **không** tự chạy các nhiệm vụ đến hạn. Đọc `docs/V13_STABILITY_SECURITY.md` để biết các thay đổi về bảo mật và kiểm tra.

---

## v14 — Chạy bằng Docker (đề xuất để triển khai)

Game có thể được chạy bằng 2 container web/API qua `compose.yaml` thay vì mở 2 terminal npm. Xem **`docs/V14_DEPLOYMENT.md`**. Các lệnh chính:

```powershell
Copy-Item .env.deploy.example .env.deploy
notepad .env.deploy
npm run check:deploy
docker compose --env-file .env.deploy up --build -d
npm run smoke:deployed
```

Mặc định mở `http://localhost:8080`. Docker Compose chỉ bind local; để mở tên miền công khai cần HTTPS reverse proxy và cấu hình Supabase Auth. Không cần migration SQL riêng cho v14.


## Cập nhật v15 — Đối soát ngân quỹ CEO

Nếu bạn đang chạy v14 và đã áp dụng hết SQL trước đó: **sao lưu Supabase**, rồi chạy `supabase/upgrade_financial_integrity_v15.sql` một lần trong SQL Editor. Không reset database. Mở tab **Tài chính** và chọn **Đối soát ngay**. Xem hướng dẫn chi tiết trong `docs/V15_FINANCIAL_INTEGRITY.md`. Nếu chênh lệch, không tự sửa số dư trong SQL.


## v16: Tùy chọn USD / VNĐ

Bản v16 giữ mọi dữ liệu game bằng VNĐ; không cần SQL migration. Sau khi chạy game, chọn `VNĐ` hoặc `USD ($)` trên thanh đầu trang. Dòng nhỏ phía dưới luôn hiển thị giá trị tương đương. Vào **Tài chính** để xem tỷ giá và ngày cập nhật. Tỷ giá có thể lấy tự động từ ExchangeRate-API qua backend khi có Internet. Nếu dịch vụ lỗi, hệ thống dùng tỷ giá tham khảo từ ngày 04/11/2026 và ghi rõ là dự phòng; không coi đây là tỷ giá ngân hàng. Sở thích tiền tệ lưu trên trình duyệt, không đồng bộ qua tài khoản.


## Tính năng mới v17 VIP

Sau khi nâng cấp, văn phòng 3D sẽ có nhân viên di chuyển, trạng thái trên đầu, khu họp và màn hình lớn hiển thị công việc. Hệ Level công ty cũng hiển thị rõ từ Level 1 tới Level Max 30. Bản này không yêu cầu migration SQL mới nếu bạn đã ở v16.


Xem thêm tài liệu riêng của bản VIP: `docs/V17_VIP_OFFICE.md`.

## v18 VIP: Họp CEO & trụ sở mở khóa cấp độ

Sau khi sao lưu database, chạy `supabase/upgrade_v18_meetings.sql` trong SQL Editor của project Supabase đang lưu game, rồi giữ `.env` và chạy `npm install`, `npm run build`, `npm run dev`.

Trong game mở `Phòng họp CEO · VIP` → chọn người dự → `CEO bắt đầu cuộc họp` → xem nhân viên đến bàn họp → nhập biên bản → `Kết thúc họp & lưu biên bản`. Các sự kiện có dữ liệu PostgreSQL. Mọi cấp độ từ Level 1 đến Level Max 30 đều có tiến trình mở khóa trang trí văn phòng. Xem `docs/V18_VIP_MEETINGS_AND_HQ.md`.


## v19 VIP — Hội đồng AI tranh luận

Bắt buộc sao lưu Supabase, chạy `supabase/upgrade_v19_ai_council.sql` sau v18.
Điền `GEMINI_API_KEY` hoặc `OPENAI_API_KEY` trong `apps/api/.env` (backend), không đưa khóa lên frontend.
Sau đó chạy `npm install`, `npm run test:all`, `npm run build`, `npm run dev`.
Mở **Phòng họp CEO**, triệu tập cuộc họp, chọn 2–4 nhân viên trong mục Hội đồng AI rồi bắt đầu.
Xem `docs/V19_AI_COUNCIL.md` để biết giới hạn, phí API và quy trình nâng cấp.


### Nâng cấp từ v19 lên v20 VIP

Sao lưu database, chạy `supabase/upgrade_v20_council_actions.sql` sau migration v19, giữ file `.env` hiện có. Sau đó chạy `npm install`, `npm run test:all`, `npm run build`, `npm run dev`. Xem `docs/V20_COUNCIL_ACTIONS.md`.


### Nâng cấp từ v20 lên v21 VIP — Báo cáo và CEO nghiệm thu

1. Sao lưu database Supabase hiện tại. Đảm bảo các migration đến v20 đã chạy đầy đủ.
2. Trong Supabase SQL Editor, chạy **một lần** file `supabase/upgrade_v21_work_reports.sql`.
3. Giữ nguyên `.env`; giải nén mã nguồn v21 rồi chạy `npm install`, `npm run test:all`, `npm run build`, `npm run dev`.
4. Vào **Phòng họp CEO → Hội đồng AI → Quyết định của CEO thành công việc**. Đợi nhiệm vụ được worker xử lý tới hạn; mở báo cáo, chọn **Nghiệm thu / Yêu cầu sửa / Từ chối**.
5. Nếu worker không chạy, không có báo cáo tự động. Kiểm tra **Vận hành hệ thống** và `GET /api/ready`.

**Quan trọng:** v21 không trả thưởng lại cho công việc v20 đã hoàn thành trước khi migration. Các báo cáo v21 là báo cáo game mô phỏng và **không chứng minh công việc thực tế**. Xem `docs/V21_WORK_REPORTS.md`.


### Nâng cấp từ v21 lên v22 VIP — Bản bàn giao AI

Sao lưu Supabase rồi chạy SQL `supabase/upgrade_v22_meeting_handoffs.sql` sau migration v21. Không xóa hoặc reset bảng cũ. Các báo cáo đang chờ duyệt sẽ cần bản bàn giao mới đạt kiểm tra trước khi CEO nghiệm thu. Tạo bản mô phỏng không cần API key; Gemini/OpenAI chỉ có thể dùng nếu bạn đã cấu hình key trên backend và có thể phát sinh phí. Xem hướng dẫn chi tiết tại `docs/V22_HANDOFF_QUALITY.md`.


### Nâng cấp v22 → v23 VIP: Phiên bản tài liệu và góp ý CEO

Sao lưu Supabase, rồi chạy `supabase/upgrade_v23_handoff_improvements.sql` **sau migration v22**. Không xóa hoặc reset bảng. Giữ `.env` như cũ. Sau khi khởi động game, mở **Phòng họp CEO → Báo cáo nhiệm vụ → Hồ sơ bàn giao v22 → VIP v23**, nhập góp ý và chọn nguồn tạo bản sửa. Xem hướng dẫn `docs/V23_AI_QUALITY_IMPROVEMENT.md`.


## QA v24

Để kiểm tra an toàn: `npm run test:all` và `npm run qa:report`. Xem `docs/V24_REAL_INTEGRATION_QA.md` trước khi thử với Supabase. Không chạy bộ integration trên tài khoản game đang dùng.


## v25 VIP — Khắc phục đường dẫn API và lỗi build

**Quan trọng:** nếu đang dùng `apps/web/.env` của bản cũ, đổi `VITE_API_URL=http://localhost:4000/api` thành **`VITE_API_URL=/api`**. Khi chạy local, Vite tự chuyển tiếp `/api` đến Node cổng 4000; khi chạy Docker, Nginx xử lý trên cùng origin. Không cần mở port 4000 công khai.

Chạy lần lượt từ thư mục gốc:

```powershell
npm install --no-audit --no-fund
npm run preflight:build
npm run test:all
npm run build
npm run dev
```

Nếu `preflight:build` báo thiếu React/Vite, nghĩa là npm chưa cài thành công. Kiểm tra kết nối npm registry, phiên bản Node >=22.12 và chạy lại `npm install`. Không kết luận mã nguồn lỗi chỉ dựa vào `TS2307 Cannot find module` khi `node_modules` chưa tồn tại. Tuy nhiên, build vẫn cần kiểm thử lại để tìm những lỗi TypeScript khác sau khi cài đủ thư viện.

Sau khi Docker hoạt động và Supabase `ready`, chạy `npm run smoke:deployed` để xác minh cả API và file JS/CSS đã phát hành. Xem `docs/V25_RUNTIME_DEPLOYMENT.md`.


## v26 VIP — Bảo vệ token và kiểm tra phát hành

Giữ `VITE_API_URL=/api` trong `apps/web/.env`. Phiên bản mới chỉ gửi token đăng nhập qua API cùng tên miền, không dùng URL API cross-origin cấu hình nhầm. Không cần SQL migration mới nếu v25 đã cập nhật đầy đủ.

Chạy `npm run test:all`, `npm run build`, `npm run qa:report -- --build`, sau đó kiểm tra `npm run release:gate -- --level=build`. Nếu gate báo BLOCK, phải giải quyết lỗi hoặc chạy bước kiểm thử còn thiếu; không bỏ qua để phát hành công khai.

Chi tiết: `docs/V26_PRODUCTION_READINESS.md`.


## V29 MEDIA TECH VUX

Đọc `docs/V29_WINDOWS_SETUP.md` để cài các phiên bản mới của game và cấu hình Supabase đúng dự án. Không chạy schema cũ trên database đang có dữ liệu.

# Run from any location: powershell -ExecutionPolicy Bypass -File scripts\V30_INSTALL_BUILD_QA_WINDOWS.ps1
# Safe by default. Migrates only an explicitly named disposable QA project with extra safeguards.
param([switch]$MigrateQA, [switch]$RunE2E)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
function AssertExit([string]$label) { if ($LASTEXITCODE -ne 0) { throw "$label thất bại (exit $LASTEXITCODE). Xem log ở phía trên." } }
Write-Host 'MEDIA TECH VUX v30 — kiểm tra cài đặt và QA' -ForegroundColor Cyan
node --version; AssertExit 'Node.js'
npm --version; AssertExit 'npm'
Write-Host 'Cài dependencies của cả web + API + test theo npm workspaces...'
npm install --include=dev --no-audit --no-fund
AssertExit 'npm install'
Write-Host 'Build React production...'
npm run build
AssertExit 'npm run build'
Write-Host 'Kiểm tra Node...'
npm run test:all
AssertExit 'npm run test:all'

if ($MigrateQA) {
  # Never migrate user's real shared VUS/VUX Supabase project.
  $liveRef='gkfoybodioppwuhomgzc'
  $qaRef=$env:VUX_QA_PROJECT_REF
  $dbUrl=$env:VUX_QA_PG_URL
  if ([string]::IsNullOrWhiteSpace($qaRef) -or $qaRef -eq $liveRef) { throw 'Thiếu VUX_QA_PROJECT_REF hoặc đang trỏ nhầm project thật. KHÔNG áp dụng migration.' }
  if ([string]::IsNullOrWhiteSpace($dbUrl) -or $dbUrl -notlike "*$qaRef*") { throw 'VUX_QA_PG_URL không khớp VUX_QA_PROJECT_REF. Không áp dụng migration.' }
  if ($dbUrl -like "*$liveRef*") { throw 'Phát hiện ref production trong QA connection string; từ chối.' }
  if ($env:VUX_QA_APPROVE_MIGRATION -ne 'RUN_ONLY_ON_ISOLATED_QA') { throw 'Cần đặt VUX_QA_APPROVE_MIGRATION=RUN_ONLY_ON_ISOLATED_QA để xác nhận.' }
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'Chưa có psql. Cài PostgreSQL client; không nên chạy SQL thủ công lên production.' }
  $migration='supabase/upgrade_v29_vux_opt_in.sql'
  $requires=@('company_meetings','meeting_ai_debates','meeting_action_items_v20','meeting_work_reports_v21','meeting_handoffs_v22','meeting_handoff_versions_v23')
  foreach($table in $requires) {
    $exists=(& psql $dbUrl -X -At -v ON_ERROR_STOP=1 -c "select to_regclass('public.$table') is not null;")
    AssertExit "QA prerequisite $table"
    if (($exists | Out-String).Trim() -ne 't') { throw "QA còn thiếu public.$table. Cần áp dụng migration v18–v23 theo thứ tự trên QA trước." }
  }
  Write-Host "Chạy $migration trên QA $qaRef trong một transaction..." -ForegroundColor Yellow
  & psql $dbUrl -X -v ON_ERROR_STOP=1 -1 -f $migration
  AssertExit 'Migration v29'
}
if ($RunE2E) {
  if ($env:E2E_ISOLATED_QA -ne 'YES_READ_ONLY_QA') { throw 'E2E_ISOLATED_QA phải là YES_READ_ONLY_QA.' }
  if ([string]::IsNullOrWhiteSpace($env:PLAYWRIGHT_BASE_URL)) { throw 'Thiếu PLAYWRIGHT_BASE_URL, hãy khởi chạy web + API trên môi trường QA.' }
  if ([string]::IsNullOrWhiteSpace($env:E2E_EMAIL) -or [string]::IsNullOrWhiteSpace($env:E2E_PASSWORD)) { throw 'Thiếu tài khoản QA thử nghiệm E2E_EMAIL/E2E_PASSWORD.' }
  if ($env:PLAYWRIGHT_BASE_URL -like '*gkfoybodioppwuhomgzc*') { throw 'Không dùng địa chỉ project thật làm E2E.' }
  npx playwright install chromium
  AssertExit 'Playwright Chromium install'
  npx playwright test
  AssertExit 'Playwright E2E'
}
Write-Host 'Build và logic test đã hoàn tất. QA migration/E2E chỉ chạy khi có cờ và môi trường riêng.' -ForegroundColor Green

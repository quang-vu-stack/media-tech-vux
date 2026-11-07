# Windows setup — MEDIA TECH VUX v29

1. Unzip the archive. Keep the historical project folder `media-tech-vus` (renaming the folder is optional; it is not a new application).
2. Install current supported Node.js 22 LTS or later, and Git. In PowerShell enter the project root (`package.json`).
3. Copy `apps/web/.env.example` to `apps/web/.env`, and `apps/api/.env.example` to `apps/api/.env`.
4. Populate `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and backend `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for the **same Supabase project**. Never expose the service-role key to the web client. The backend must be private.
5. Run `npm install` while connected to npm registry. Keep the generated lockfile and prefer `npm ci` thereafter.
6. Run `npm run test:all`, `npm run preflight:build`, `npm run build`, `npm run dev`.
7. For real-browser tests: `npx playwright install chromium`, then configure *QA-only* credentials and run `npm run test:e2e`. Do not test live finances on production data.
8. Apply the v29 SQL migration **only after a QA backup/test** and after required historical migrations. A VUX user needs a dedicated account while `companies.owner_id` is unique.
9. On the VUX game account, create `MEDIA TECH VUX`, then open `VUX · AI tự chủ` to set six time speeds, bubble display and adaptive talk.
10. Optional Gemini automation: set `GEMINI_API_KEY` and explicitly change `ENABLE_VUX_AUTONOMOUS_GEMINI=true` **only after accepting API usage costs**; ensure backend hosting and worker are running. Default is off.

Troubleshooting: `npm run preflight:build` checks local modules. If it says React/Vite missing, npm installation has not succeeded; do not report the frontend as production-ready. Real Supabase failure usually means a missing migration, incorrect project URL or RLS/grants issue.

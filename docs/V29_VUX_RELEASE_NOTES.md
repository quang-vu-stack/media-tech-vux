# MEDIA TECH VUX — CEO EMPIRE v29 | V28 → V29

**Source:** continued from `media-tech-vus-ceo-empire-v28-qa-fix.zip` (not a new project). Existing historical directory/package names and VUS tables are intentionally retained.

## Delivered (source implementation, subject to QA)
- Frontend branding MEDIA TECH VUX; new VUX onboarding defaults to CEO **Quang Vũ**. The API selects `bootstrap_vux_company_v29` for an exactly named new VUX company and seeds **2,000,000,000 VND** with a matching ledger entry and **19 staff**. Legacy VUS bootstrap remains unchanged.
- Existing users are not silently renamed or reseeded. An explicit owner-scoped top-up function adds staff until 19, skipping duplicate seed names, without deleting existing staff.
- Eight named office zones, night skyline, neon-colored geometry, furniture, 24 employee desks, 20 conference seats, chibi character meshes with eyes, hair, clothing, walk animation, corridor waypoints, large meeting display and clickable simulated customer. React Three Fiber is retained. 6 image-reference thumbnails are included under `docs/references-v29/` as visual direction only, never substituted for the live 3D campus.
- Orthographic isometric camera with right-drag rotation, middle drag/pan, wheel zoom, WASD and double-clicking office/meeting regions. 3D movement is waypoint-based illustration, not a production navigation mesh / collision solver.
- Level MAX 100 for VUX (500 XP per level); preexisting VUS companies retain the 30 cap via name-aware trigger.
- Meeting attendee cap increased to 19 (+ CEO seat in scene); original meeting history, AI Council, work reviews and handoffs remain untouched.
- Reuses `game_settings` and adds `time_scale` with 0.15×, 0.25×, 0.5×, 1×, 1.5× and 2×. CEO can save conversation mode and chat bubbles, including `adaptive`, `quiet`, `off`.
- An **opt-in** server worker (disabled by default) can create real Gemini-sourced, short conversations between available employees. SQL per-company cooldown and a daily cap prevent per-frame calls; stored history, agent memory and relationship familiarity are company-scoped. No fake dialogue is displayed when Gemini is disabled.
- Existing financial accounting, currency display, task workers, contracts and review gates remain in the package. NPC customer currently links to the existing contracts view; multi-round negotiation and client settlement are not yet implemented.

## Not complete / not verified
- Full React production build **BLOCKED** in this execution environment because npm dependencies are missing and package download is unavailable. TS/TSX syntax checks are not a substitute for TypeScript typechecking, `vite build`, or rendering.
- v29 SQL migration **NOT RUN** against a QA database and **NOT APPLIED** to the user's production Supabase. RLS, stored procedures, event worker and 19-staff bootstrap require actual integration tests.
- Playwright E2E, native 3D gameplay and mobile FPS were **NOT RUN** against the compiled game.
- Animation is stylized procedural chibi (not a polished rigged GLTF/FBX character). Hallway waypoints are not a general collision/navigation solution. The CEO meeting model's visual attendance is not a guarantee that 19 independent AI models debate in parallel.
- AI dialogue worker requires active hosting, credentials and explicit opt-in. No AI performs independent real-world tasks while the server is stopped.
- Contract customer NPC only launches the pre-existing contracts workflow. No autonomous negotiation / invoicing / real settlement.

## Migration and company isolation
- Existing database has historical one-company-per-owner constraint (`companies.owner_id UNIQUE`). **Do not attempt to add VUX to the same existing VUS account** without a tested multi-company migration. Use a *separate game account* for VUX on the shared Supabase project or plan a future schema migration.
- Migrate only on a **backed-up QA project** first, after verifying v18–v23 migration status. Apply `supabase/upgrade_v29_vux_opt_in.sql` *once*, not the old bootstrap schema. This SQL does **not** rewrite historical treasury, XP or employees.
- Do not enable Gemini worker until API budget, real RLS, and host are verified.

## QA evidence
See `qa-reports/v29-report.json`. PASS only covers exercised tests. NOT_RUN and FAIL items must not be treated as success.

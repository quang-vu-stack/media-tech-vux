# Supabase & Gemini — VUX v29

Target existing Supabase project REF: `gkfoybodioppwuhomgzc`. The model did **not** run v29 DDL on it. The project must be backed up and tested in a dedicated QA environment before production changes.

The v29 SQL migration `supabase/upgrade_v29_vux_opt_in.sql` extends `public.game_settings`, changes only the VUX level cap, expands existing meetings to 19, adds server-controlled AI conversation tables with RLS and RPC grants restricted to service role, and adds a separate VUX bootstrap plus staff top-up function. It does not reset VUS funds or data.

Existing RLS and JWT ownership enforcement still apply. `game_settings` is selected and changed via the backend after verifying `ownedCompany()`. New conversation tables are read-only to authenticated owners, and writes require the backend service key. Do not store your Gemini API key or Supabase service role in `apps/web/.env`.

**No API calls unless opt in.** `ENABLE_VUX_AUTONOMOUS_GEMINI=false` is the shipped default. When enabled, the hosted worker schedules attempts; SQL claims at most one conversation per company per 15 minutes, and the code allows at most 12 stored conversations in a rolling 24 hours (quiet mode: 2). Failed generations consume a cooldown to avoid paid retry loops. Time-scale settings do not multiply API calls. The worker must actually be running to continue when browsers are closed.

Gemini generates short JSON conversations; role-based personalities, recent tasks, earlier topic titles and recent stored memory guide topic selection. The backend stores dialogue, rolling per-agent memory and pairwise familiarity. This is limited agent simulation, not multiple simultaneously running independent AI models.

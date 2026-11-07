-- READ-ONLY migration inventory for MEDIA TECH VUS v28.
-- Safe in a connected Supabase SQL Editor. It DOES NOT install migrations.
select x.migration,
       x.table_name,
       (to_regclass('public.' || x.table_name) is not null) as installed
from (values
  ('v18','company_meetings'),
  ('v19','meeting_ai_debates'),
  ('v20','meeting_action_items_v20'),
  ('v21','meeting_work_reports_v21'),
  ('v22','meeting_handoffs_v22'),
  ('v23','meeting_handoff_versions_v23')
) as x(migration,table_name)
order by x.migration;

select count(*) as public_tables,
       count(*) filter (where rowsecurity) as tables_with_rls
from pg_tables where schemaname='public';

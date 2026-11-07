-- MEDIA TECH VUS v22 VIP — structured handoffs + format quality gate.
-- Run AFTER upgrade_v21_work_reports.sql. Backup before migration.
-- Does not mutate existing XP, treasury, payroll, ledger or completed reports.

create table if not exists public.meeting_handoffs_v22 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  action_id uuid not null references public.meeting_action_items_v20(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  report_id uuid not null references public.meeting_work_reports_v21(id) on delete cascade,
  revision_no integer not null check (revision_no between 0 and 3),
  provider text not null check (provider in ('simulated','gemini','openai')),
  document jsonb not null check (jsonb_typeof(document)='object'),
  quality jsonb not null check (
    jsonb_typeof(quality)='object' and quality ? 'passed' and quality ? 'score'
    and jsonb_typeof(quality->'passed')='boolean'
  ),
  created_at timestamptz not null default now(),
  unique(report_id,revision_no)
);
create index if not exists meeting_handoffs_company_v22
  on public.meeting_handoffs_v22(company_id,created_at desc);
alter table public.meeting_handoffs_v22 enable row level security;
drop policy if exists meeting_handoffs_owner_read_v22 on public.meeting_handoffs_v22;
create policy meeting_handoffs_owner_read_v22 on public.meeting_handoffs_v22
  for select to authenticated
  using (exists (select 1 from public.companies c
    where c.id=company_id and c.owner_id=(select auth.uid())));
grant select on public.meeting_handoffs_v22 to authenticated;
revoke insert,update,delete on public.meeting_handoffs_v22 from anon,authenticated;

-- All financial review remains in v21's atomic RPC. Save is idempotent for a
-- report revision and never changes the task status, XP or treasury.
create or replace function public.save_meeting_handoff_v22(
  p_user_id uuid, p_report_id uuid, p_expected_revision integer,
  p_provider text, p_document jsonb, p_quality jsonb
) returns public.meeting_handoffs_v22
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r public.meeting_work_reports_v21;
  t public.tasks;
  h public.meeting_handoffs_v22;
begin
  if p_provider is null or p_provider not in ('simulated','gemini','openai')
    or p_expected_revision is null or p_expected_revision not between 0 and 3
    or jsonb_typeof(p_document)<>'object' or jsonb_typeof(p_quality)<>'object'
    or jsonb_typeof(p_quality->'passed')<>'boolean'
    or octet_length(p_document::text)>65000 or octet_length(p_quality::text)>4000 then
    raise exception 'Invalid handoff payload';
  end if;
  select r0.* into r from public.meeting_work_reports_v21 r0
    join public.companies c on c.id=r0.company_id
    where r0.id=p_report_id and c.owner_id=p_user_id;
  if not found then raise exception 'Report not found or unauthorized'; end if;
  -- Stable lock order with v21 worker/review functions: task, then report.
  select * into t from public.tasks where id=r.task_id and company_id=r.company_id for update;
  if not found then raise exception 'Task not found'; end if;
  select * into r from public.meeting_work_reports_v21 where id=p_report_id for update;
  if r.status<>'awaiting_review' or r.revision_no<>p_expected_revision
    or t.status<>'in_progress' or t.progress<>99 then
    raise exception 'Report changed; refresh before generating handoff';
  end if;
  select * into h from public.meeting_handoffs_v22
    where report_id=r.id and revision_no=r.revision_no;
  if found then return h; end if;
  insert into public.meeting_handoffs_v22(company_id,action_id,task_id,report_id,
      revision_no,provider,document,quality)
    values(r.company_id,r.action_id,r.task_id,r.id,r.revision_no,
      p_provider,p_document,p_quality) returning * into h;
  return h;
end;
$$;

-- Trigger applies ONLY to future attempts to approve an unfinished report.
-- Existing v21 completed/approved items remain untouched. If no current
-- passing handoff exists, the v21 review function throws and its ledger/XP
-- updates roll back atomically (no partial payout).
create or replace function public.enforce_meeting_handoff_quality_v22()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status='approved' and old.status is distinct from 'approved' then
    if not exists (
      select 1 from public.meeting_handoffs_v22 h
      where h.report_id=new.id and h.company_id=new.company_id
        and h.action_id=new.action_id and h.task_id=new.task_id
        and h.revision_no=new.revision_no
        and h.quality->>'passed'='true'
    ) then
      raise exception 'Current work handoff must pass quality review before CEO approval';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists handoff_quality_gate_v22 on public.meeting_work_reports_v21;
create trigger handoff_quality_gate_v22
  before update of status on public.meeting_work_reports_v21
  for each row execute function public.enforce_meeting_handoff_quality_v22();

revoke all on function public.save_meeting_handoff_v22(uuid,uuid,integer,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_meeting_handoff_v22(uuid,uuid,integer,text,jsonb,jsonb) to service_role;
revoke all on function public.enforce_meeting_handoff_quality_v22() from public,anon,authenticated;

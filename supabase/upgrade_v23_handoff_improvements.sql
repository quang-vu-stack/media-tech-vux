-- MEDIA TECH VUS v23 VIP — feedback-driven document versions.
-- Requires v22 migration. Backup before applying; does not change cash, XP or tasks.
-- The v22 row remains the current version used by v22's atomic CEO approval gate.

begin;

alter table public.meeting_handoffs_v22
  add column if not exists handoff_version integer not null default 1
    check (handoff_version between 1 and 4);
alter table public.meeting_handoffs_v22
  add column if not exists latest_feedback text not null default '';

create table if not exists public.meeting_handoff_versions_v23 (
  id uuid primary key default gen_random_uuid(),
  handoff_id uuid not null references public.meeting_handoffs_v22(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  report_id uuid not null references public.meeting_work_reports_v21(id) on delete cascade,
  revision_no integer not null check (revision_no between 0 and 3),
  version_no integer not null check (version_no between 1 and 4),
  provider text not null check (provider in ('simulated','gemini','openai')),
  feedback text not null default '' check (char_length(feedback)<=900),
  document jsonb not null check (jsonb_typeof(document)='object'),
  quality jsonb not null check (jsonb_typeof(quality)='object'
    and jsonb_typeof(quality->'passed')='boolean'),
  created_at timestamptz not null default now(),
  unique(handoff_id,version_no)
);
create index if not exists handoff_versions_company_v23
  on public.meeting_handoff_versions_v23(company_id,handoff_id,version_no);
alter table public.meeting_handoff_versions_v23 enable row level security;
drop policy if exists handoff_versions_owner_read_v23 on public.meeting_handoff_versions_v23;
create policy handoff_versions_owner_read_v23 on public.meeting_handoff_versions_v23
  for select to authenticated
  using (exists(select 1 from public.companies c where c.id=company_id
    and c.owner_id=(select auth.uid())));
grant select on public.meeting_handoff_versions_v23 to authenticated, service_role;
revoke insert,update,delete on public.meeting_handoff_versions_v23 from anon,authenticated;

-- Preserve every v22 handoff as version 1 before enabling the append trigger.
insert into public.meeting_handoff_versions_v23
  (handoff_id,company_id,report_id,revision_no,version_no,provider,feedback,document,quality,created_at)
select h.id,h.company_id,h.report_id,h.revision_no,1,h.provider,'',h.document,h.quality,h.created_at
from public.meeting_handoffs_v22 h
on conflict(handoff_id,version_no) do nothing;

-- All NEW v22 handoffs get a version 1 snapshot in the same transaction.
create or replace function public.seed_handoff_version_v23()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.meeting_handoff_versions_v23
    (handoff_id,company_id,report_id,revision_no,version_no,provider,feedback,document,quality,created_at)
  values(new.id,new.company_id,new.report_id,new.revision_no,1,new.provider,'',new.document,new.quality,new.created_at)
  on conflict(handoff_id,version_no) do nothing;
  return new;
end;
$$;
drop trigger if exists seed_handoff_version_v23 on public.meeting_handoffs_v22;
create trigger seed_handoff_version_v23
  after insert on public.meeting_handoffs_v22 for each row
  execute function public.seed_handoff_version_v23();

-- Lock ordering matches v21/v22: task -> report -> handoff.
-- Expected version makes concurrent edits fail rather than overwrite. A new
-- snapshot and current-v22 projection update commit/rollback together.
create or replace function public.revise_meeting_handoff_v23(
  p_user_id uuid, p_report_id uuid, p_expected_revision integer,
  p_expected_version integer, p_provider text, p_feedback text,
  p_document jsonb, p_quality jsonb
) returns public.meeting_handoffs_v22
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r public.meeting_work_reports_v21;
  t public.tasks;
  h public.meeting_handoffs_v22;
  v integer;
begin
  if p_expected_revision is null or p_expected_revision not between 0 and 3
    or p_expected_version is null or p_expected_version not between 1 and 3
    or p_provider is null or p_provider not in ('simulated','gemini','openai')
    or p_feedback is null or char_length(trim(p_feedback)) not between 10 and 900
    or jsonb_typeof(p_document)<>'object' or jsonb_typeof(p_quality)<>'object'
    or jsonb_typeof(p_quality->'passed')<>'boolean'
    or octet_length(p_document::text)>65000 or octet_length(p_quality::text)>6000 then
    raise exception 'Invalid revision payload';
  end if;
  select r0.* into r from public.meeting_work_reports_v21 r0
    join public.companies c on c.id=r0.company_id
    where r0.id=p_report_id and c.owner_id=p_user_id;
  if not found then raise exception 'Report not found or unauthorized'; end if;
  select * into t from public.tasks where id=r.task_id and company_id=r.company_id for update;
  if not found then raise exception 'Task not found'; end if;
  select * into r from public.meeting_work_reports_v21 where id=p_report_id for update;
  if r.status<>'awaiting_review' or r.revision_no<>p_expected_revision
    or t.status<>'in_progress' or t.progress<>99 then
    raise exception 'Report changed; refresh before revising';
  end if;
  select * into h from public.meeting_handoffs_v22
    where report_id=r.id and revision_no=r.revision_no and company_id=r.company_id for update;
  if not found then raise exception 'Handoff missing'; end if;
  if h.handoff_version<>p_expected_version then
    raise exception 'Handoff version changed; refresh before revising';
  end if;
  v := h.handoff_version+1;
  if v>4 then raise exception 'Maximum four versions'; end if;
  insert into public.meeting_handoff_versions_v23
    (handoff_id,company_id,report_id,revision_no,version_no,provider,feedback,document,quality)
  values(h.id,h.company_id,r.id,r.revision_no,v,p_provider,trim(p_feedback),p_document,p_quality);
  update public.meeting_handoffs_v22
    set handoff_version=v,latest_feedback=trim(p_feedback),provider=p_provider,
        document=p_document,quality=p_quality,created_at=now()
    where id=h.id returning * into h;
  return h;
end;
$$;

revoke all on function public.revise_meeting_handoff_v23(uuid,uuid,integer,integer,text,text,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.revise_meeting_handoff_v23(uuid,uuid,integer,integer,text,text,jsonb,jsonb)
  to service_role;
revoke all on function public.seed_handoff_version_v23() from public,anon,authenticated;

commit;

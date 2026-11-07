-- MEDIA TECH VUS CEO EMPIRE v18 — persistent CEO-led meetings + real level max.
-- Apply AFTER all previous migrations. Backup DB before migration.
-- Does not reset treasury, employees, tasks or historic XP.

create table if not exists public.company_meetings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 120),
  agenda text not null default '' check (char_length(agenda) <= 1200),
  attendee_ids uuid[] not null check (cardinality(attendee_ids) between 1 and 12),
  status text not null default 'active' check (status in ('active','ended')),
  minutes_text text not null default '' check (char_length(minutes_text) <= 4000),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint meeting_finished_state check ((status='ended') = (ended_at is not null))
);
create unique index if not exists one_active_company_meeting_v18
  on public.company_meetings(company_id) where status = 'active';
create index if not exists company_meetings_history_v18 on public.company_meetings(company_id, started_at desc);

alter table public.company_meetings enable row level security;
-- SELECT is safe for the owning authenticated user; writes exclusively via backend RPC.
drop policy if exists company_meetings_owner_read_v18 on public.company_meetings;
create policy company_meetings_owner_read_v18 on public.company_meetings
for select to authenticated
using (exists (
  select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())
));
grant select on public.company_meetings to authenticated;
revoke insert, update, delete on public.company_meetings from authenticated, anon;

create or replace function public.start_company_meeting_v18(
  p_user_id uuid, p_title text, p_agenda text, p_attendee_ids uuid[]
) returns public.company_meetings
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  c public.companies;
  v_attendee_count integer;
  v_result public.company_meetings;
begin
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found then raise exception 'Company not found or unauthorized'; end if;
  if p_title is null or char_length(trim(p_title)) not between 4 and 120
     or char_length(coalesce(p_agenda,'')) > 1200 then
    raise exception 'Invalid meeting title or agenda';
  end if;
  if p_attendee_ids is null or cardinality(p_attendee_ids) not between 1 and 12 then
    raise exception 'Meeting requires between 1 and 12 attendees';
  end if;
  -- All IDs must be unique, real, and owned by the same company. Prevent forged attendees.
  select count(distinct id) into v_attendee_count from public.employees
    where company_id=c.id and id=any(p_attendee_ids);
  if v_attendee_count <> cardinality(p_attendee_ids) then
    raise exception 'Invalid, duplicated or foreign attendee';
  end if;
  if exists (select 1 from public.company_meetings where company_id=c.id and status='active') then
    raise exception 'Only one active meeting allowed';
  end if;
  insert into public.company_meetings(company_id,title,agenda,attendee_ids)
    values(c.id,trim(p_title),coalesce(p_agenda,''),p_attendee_ids)
    returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.end_company_meeting_v18(
  p_user_id uuid, p_meeting_id uuid, p_minutes_text text
) returns public.company_meetings
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_result public.company_meetings;
begin
  if char_length(coalesce(p_minutes_text,'')) > 4000 then
    raise exception 'Meeting minutes too long';
  end if;
  select m.* into v_result from public.company_meetings m
    join public.companies c on c.id=m.company_id
    where m.id=p_meeting_id and c.owner_id=p_user_id
    for update of m;
  if not found then raise exception 'Meeting not found or unauthorized'; end if;
  if v_result.status='ended' then return v_result; end if; -- idempotent, no duplicate event
  update public.company_meetings
    set status='ended', ended_at=now(), minutes_text=coalesce(p_minutes_text,'')
    where id=p_meeting_id returning * into v_result;
  return v_result;
end;
$$;

-- Enforce company max level across ALL old game RPCs without altering their payout logic.
-- XP remains cumulative; the display level stops at 30.
create or replace function public.cap_company_level_v18()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.level := least(30, greatest(1, 1 + floor(new.xp / 500.0)::integer));
  return new;
end;
$$;
drop trigger if exists companies_level_cap_v18 on public.companies;
create trigger companies_level_cap_v18
  before insert or update of xp, level on public.companies
  for each row execute function public.cap_company_level_v18();
update public.companies set level=least(30,greatest(1, 1 + floor(xp / 500.0)::integer))
  where level is distinct from least(30,greatest(1, 1 + floor(xp / 500.0)::integer));

revoke execute on function public.start_company_meeting_v18(uuid,text,text,uuid[]) from public, anon, authenticated;
revoke execute on function public.end_company_meeting_v18(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.start_company_meeting_v18(uuid,text,text,uuid[]) to service_role;
grant execute on function public.end_company_meeting_v18(uuid,uuid,text) to service_role;

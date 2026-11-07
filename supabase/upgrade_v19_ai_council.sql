-- MEDIA TECH VUS v19 VIP — Persisted, owner-authorized AI Council deliberations.
-- Apply after upgrade_v18_meetings.sql. Backup first. No changes to treasury or XP.

create table if not exists public.meeting_ai_debates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  meeting_id uuid not null unique references public.company_meetings(id) on delete cascade,
  employee_ids uuid[] not null check(cardinality(employee_ids) between 2 and 4),
  provider text not null check(provider in ('gemini','openai')),
  status text not null default 'running' check(status in ('running','completed','failed')),
  attempt_id uuid not null default gen_random_uuid(),
  transcript jsonb not null default '[]'::jsonb check(jsonb_typeof(transcript) = 'array'),
  summary text not null default '' check(char_length(summary) <= 900),
  recommendation text not null default '' check(char_length(recommendation) <= 900),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists meeting_ai_debates_by_company_v19
  on public.meeting_ai_debates(company_id, created_at desc);

alter table public.meeting_ai_debates enable row level security;
drop policy if exists meeting_ai_debates_owner_read_v19 on public.meeting_ai_debates;
create policy meeting_ai_debates_owner_read_v19 on public.meeting_ai_debates
  for select to authenticated using (
    exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
  );
grant select on public.meeting_ai_debates to authenticated;
revoke insert,update,delete on public.meeting_ai_debates from authenticated, anon;

-- Serialize debate creation per company meeting, prevent double billing on repeated clicks.
create or replace function public.reserve_meeting_debate_v19(
  p_user_id uuid, p_meeting_id uuid, p_provider text, p_employee_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_meeting public.company_meetings;
  v_row public.meeting_ai_debates;
  v_count integer;
begin
  select m.* into v_meeting from public.company_meetings m
    join public.companies c on c.id=m.company_id
    where m.id=p_meeting_id and c.owner_id=p_user_id for update of m;
  if not found then raise exception 'Meeting not found or unauthorized'; end if;
  if v_meeting.status <> 'active' then raise exception 'Meeting is not active'; end if;
  if p_provider not in ('gemini','openai') then raise exception 'Invalid provider'; end if;
  if p_employee_ids is null or cardinality(p_employee_ids) not between 2 and 4 then
    raise exception 'Choose between 2 and 4 AI participants';
  end if;
  select count(distinct e.id) into v_count from public.employees e
    where e.company_id=v_meeting.company_id and e.id=any(p_employee_ids) and e.id=any(v_meeting.attendee_ids);
  if v_count <> cardinality(p_employee_ids) then raise exception 'Invalid, duplicate or foreign participant'; end if;
  select * into v_row from public.meeting_ai_debates where meeting_id=p_meeting_id for update;
  if found then
    if v_row.status='completed' then return jsonb_build_object('debate',to_jsonb(v_row),'claimed',false); end if;
    if v_row.status='running' and v_row.updated_at > now()-interval '10 minutes' then
      return jsonb_build_object('debate',to_jsonb(v_row),'claimed',false); -- no duplicate model call
    end if;
    update public.meeting_ai_debates set
      status='running', provider=p_provider, employee_ids=p_employee_ids, attempt_id=gen_random_uuid(),
      transcript='[]'::jsonb,summary='',recommendation='',completed_at=null,updated_at=now()
      where id=v_row.id returning * into v_row;
    return jsonb_build_object('debate',to_jsonb(v_row),'claimed',true);
  end if;
  insert into public.meeting_ai_debates(company_id,meeting_id,employee_ids,provider)
    values(v_meeting.company_id,p_meeting_id,p_employee_ids,p_provider)
    returning * into v_row;
  return jsonb_build_object('debate',to_jsonb(v_row),'claimed',true);
end;
$$;

-- Completion is granted to backend service role only. The id + owner + provider/attendees
-- must still match the reserved attempt so stale concurrent workers cannot overwrite it.
create or replace function public.complete_meeting_debate_v19(
  p_user_id uuid, p_debate_id uuid, p_attempt_id uuid, p_provider text, p_employee_ids uuid[],
  p_transcript jsonb, p_summary text, p_recommendation text
) returns public.meeting_ai_debates
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_row public.meeting_ai_debates;
begin
  select d.* into v_row from public.meeting_ai_debates d
    join public.companies c on c.id=d.company_id
    where d.id=p_debate_id and c.owner_id=p_user_id for update of d;
  if not found then raise exception 'Debate not found or unauthorized'; end if;
  if v_row.status<>'running' or v_row.attempt_id<>p_attempt_id or v_row.provider<>p_provider or v_row.employee_ids<>p_employee_ids then
    raise exception 'Stale or invalid debate attempt';
  end if;
  if p_transcript is null or jsonb_typeof(p_transcript)<>'array' or
     jsonb_array_length(p_transcript)<>2*cardinality(p_employee_ids) or
     char_length(p_transcript::text)>12000 or
     char_length(coalesce(p_summary,'')) not between 1 and 900 or
     char_length(coalesce(p_recommendation,'')) not between 1 and 900 then
    raise exception 'Invalid AI result';
  end if;
  update public.meeting_ai_debates set transcript=p_transcript,summary=p_summary,
      recommendation=p_recommendation,status='completed',completed_at=now(),updated_at=now()
      where id=p_debate_id returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.fail_meeting_debate_v19(
  p_user_id uuid, p_debate_id uuid, p_attempt_id uuid, p_provider text, p_employee_ids uuid[]
) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.meeting_ai_debates d set status='failed', updated_at=now()
    where d.id=p_debate_id and d.status='running' and d.attempt_id=p_attempt_id
      and d.provider=p_provider and d.employee_ids=p_employee_ids
      and exists(select 1 from public.companies c where c.id=d.company_id and c.owner_id=p_user_id);
  return found;
end;
$$;

revoke all on function public.reserve_meeting_debate_v19(uuid,uuid,text,uuid[]) from public,anon,authenticated;
revoke all on function public.complete_meeting_debate_v19(uuid,uuid,uuid,text,uuid[],jsonb,text,text) from public,anon,authenticated;
revoke all on function public.fail_meeting_debate_v19(uuid,uuid,uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function public.reserve_meeting_debate_v19(uuid,uuid,text,uuid[]) to service_role;
grant execute on function public.complete_meeting_debate_v19(uuid,uuid,uuid,text,uuid[],jsonb,text,text) to service_role;
grant execute on function public.fail_meeting_debate_v19(uuid,uuid,uuid,text,uuid[]) to service_role;

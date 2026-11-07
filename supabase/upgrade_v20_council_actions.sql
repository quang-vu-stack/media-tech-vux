-- MEDIA TECH VUS v20 VIP — CEO-approved action items after the AI council.
-- Prerequisites: schema.sql, upgrade_ceo_empire.sql, upgrades v18 and v19.
-- Back up before applying. No changes to existing treasury, XP, employees or tasks.

create table if not exists public.meeting_action_items_v20 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  meeting_id uuid not null references public.company_meetings(id) on delete cascade,
  debate_id uuid not null references public.meeting_ai_debates(id) on delete cascade,
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  client_request_id uuid not null,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  reward_vnd bigint not null default 0 check (reward_vnd between 0 and 5000000),
  approved_at timestamptz not null default now(),
  unique (company_id, client_request_id)
);
create index if not exists meeting_actions_company_meeting_v20
  on public.meeting_action_items_v20(company_id,meeting_id,approved_at desc);

alter table public.meeting_action_items_v20 enable row level security;
drop policy if exists meeting_actions_owner_read_v20 on public.meeting_action_items_v20;
create policy meeting_actions_owner_read_v20 on public.meeting_action_items_v20
for select to authenticated using (
  exists(select 1 from public.companies c
    where c.id=company_id and c.owner_id=(select auth.uid()))
);
grant select on public.meeting_action_items_v20 to authenticated;
revoke insert,update,delete on public.meeting_action_items_v20 from anon,authenticated;

-- One atomic transaction: validate owner + council result + attendee, then create
-- scheduled game task and its durable approval record. The meeting row is locked to
-- serialize concurrent requests for the same meeting (max 8 actions per meeting).
-- Reusing client_request_id is safe ONLY with identical parameters.
create or replace function public.approve_meeting_action_v20(
  p_user_id uuid, p_meeting_id uuid, p_client_request_id uuid,
  p_employee_id uuid, p_title text, p_description text,
  p_reward_vnd bigint, p_duration_minutes integer
) returns public.meeting_action_items_v20
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  m public.company_meetings;
  d public.meeting_ai_debates;
  a public.meeting_action_items_v20;
  t public.tasks;
  v_title text := trim(coalesce(p_title,''));
  v_description text := trim(coalesce(p_description,''));
begin
  if p_client_request_id is null or p_employee_id is null or
     char_length(v_title) not between 3 and 120 or
     char_length(v_description)>1000 or
     p_reward_vnd is null or p_reward_vnd not between 0 and 5000000 or
     p_duration_minutes is null or p_duration_minutes not between 1 and 1440 then
    raise exception 'Invalid CEO action input';
  end if;
  select m0.* into m from public.company_meetings m0
    join public.companies c on c.id=m0.company_id
    where m0.id=p_meeting_id and c.owner_id=p_user_id
    for update of m0;
  if not found then raise exception 'Meeting not found or unauthorized'; end if;

  select * into a from public.meeting_action_items_v20
    where company_id=m.company_id and client_request_id=p_client_request_id;
  if found then
    if a.meeting_id<>p_meeting_id or a.employee_id<>p_employee_id or a.title<>v_title or
       a.description<>v_description or a.reward_vnd<>p_reward_vnd or
       a.duration_minutes<>p_duration_minutes then
       raise exception 'Idempotency key reused with different action';
    end if;
    return a;
  end if;

  select * into d from public.meeting_ai_debates
    where meeting_id=m.id and company_id=m.company_id and status='completed';
  if not found then raise exception 'AI council must finish before CEO approval'; end if;
  if not (p_employee_id=any(m.attendee_ids)) or not exists(
    select 1 from public.employees e where e.id=p_employee_id and e.company_id=m.company_id
  ) then raise exception 'Employee is not an attendee of this company meeting'; end if;
  if (select count(*) from public.meeting_action_items_v20 where meeting_id=m.id)>=8 then
    raise exception 'Maximum eight actions per meeting';
  end if;

  -- Reuse game server's already validated task RPC; no money moves here.
  -- Its worker will award XP and optionally deduct reward only ON completion.
  t:=public.create_auto_employee_task(
    p_user_id,m.company_id,p_employee_id,v_title,v_description,
    p_reward_vnd,p_duration_minutes
  );
  insert into public.meeting_action_items_v20(
    company_id,meeting_id,debate_id,task_id,employee_id,client_request_id,
    title,description,reward_vnd,duration_minutes
  ) values (
    m.company_id,m.id,d.id,t.id,p_employee_id,p_client_request_id,
    v_title,v_description,p_reward_vnd,p_duration_minutes
  ) returning * into a;
  return a;
end;
$$;

revoke all on function public.approve_meeting_action_v20(uuid,uuid,uuid,uuid,text,text,bigint,integer)
  from public,anon,authenticated;
grant execute on function public.approve_meeting_action_v20(uuid,uuid,uuid,uuid,text,text,bigint,integer)
  to service_role;

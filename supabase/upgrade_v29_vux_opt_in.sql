-- MEDIA TECH VUX v29 opt-in additive migration. Apply to a BACKED-UP QA database first.
-- DO NOT rerun v18..v23 migrations that are already installed.
-- Does not update existing company balance, staff, XP, tasks, or name.

alter table public.company_meetings drop constraint if exists company_meetings_attendee_ids_check;
alter table public.company_meetings add constraint company_meetings_attendee_ids_check
  check (cardinality(attendee_ids) between 1 and 19);

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
  if p_attendee_ids is null or cardinality(p_attendee_ids) not between 1 and 19 then
    raise exception 'Meeting requires between 1 and 19 attendees';
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


revoke execute on function public.start_company_meeting_v18(uuid,text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.start_company_meeting_v18(uuid,text,text,uuid[]) to service_role;

-- Preserve VUS level cap 30, VUX level cap 100. Never rewrite treasury or XP.
create or replace function public.cap_company_level_v18()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.level := least(case when lower(new.name) like 'media tech vux%' then 100 else 30 end,
    greatest(1, 1 + floor(new.xp/500.0)::integer));
  return new;
end; $$;

-- Reuse existing public.game_settings if present; add only the missing time-scale field.
create table if not exists public.game_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  conversation_mode text not null default 'adaptive',
  show_chat_bubbles boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.game_settings add column if not exists time_scale numeric(3,2) not null default 1;
alter table public.game_settings drop constraint if exists game_settings_vux_time_scale_check;
alter table public.game_settings add constraint game_settings_vux_time_scale_check
  check(time_scale in (0.15,0.25,0.5,1,1.5,2));
alter table public.game_settings enable row level security;
drop policy if exists game_settings_vux_owner_select on public.game_settings;
create policy game_settings_vux_owner_select on public.game_settings for select to authenticated
  using(exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())));
grant select on public.game_settings to authenticated;
revoke insert,update,delete on public.game_settings from anon,authenticated;

-- Autonomous dialogue is opt-in on the server, with SQL cooldown across replicas.
create table if not exists public.vux_conversation_cooldowns_v29 (
  company_id uuid primary key references public.companies(id) on delete cascade,
  next_allowed_at timestamptz not null default now()
);
alter table public.vux_conversation_cooldowns_v29 enable row level security;
revoke all on public.vux_conversation_cooldowns_v29 from public,anon,authenticated;

create table if not exists public.vux_agent_conversations_v29 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  speaker_a_id uuid not null references public.employees(id),
  speaker_b_id uuid not null references public.employees(id),
  topic text not null check(char_length(topic) between 3 and 200),
  dialogue jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint vux_different_agents_v29 check(speaker_a_id<>speaker_b_id)
);
create index if not exists vux_agent_conversations_by_company on public.vux_agent_conversations_v29(company_id,created_at desc);
alter table public.vux_agent_conversations_v29 enable row level security;
drop policy if exists vux_conversations_owner_read on public.vux_agent_conversations_v29;
create policy vux_conversations_owner_read on public.vux_agent_conversations_v29 for select to authenticated
  using(exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())));
grant select on public.vux_agent_conversations_v29 to authenticated;
revoke insert,update,delete on public.vux_agent_conversations_v29 from anon,authenticated;

create table if not exists public.vux_agent_memories_v29 (
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(company_id,employee_id)
);
alter table public.vux_agent_memories_v29 enable row level security;
drop policy if exists vux_memories_owner_read on public.vux_agent_memories_v29;
create policy vux_memories_owner_read on public.vux_agent_memories_v29 for select to authenticated
  using(exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())));
grant select on public.vux_agent_memories_v29 to authenticated;
revoke insert,update,delete on public.vux_agent_memories_v29 from anon,authenticated;

create table if not exists public.vux_agent_relationships_v29 (
  company_id uuid not null references public.companies(id) on delete cascade,
  agent_a_id uuid not null references public.employees(id) on delete cascade,
  agent_b_id uuid not null references public.employees(id) on delete cascade,
  familiarity integer not null default 1 check(familiarity between 0 and 100),
  last_contact_at timestamptz not null default now(),
  primary key(company_id,agent_a_id,agent_b_id),
  constraint ordered_vux_pair_v29 check(agent_a_id<agent_b_id)
);
alter table public.vux_agent_relationships_v29 enable row level security;
drop policy if exists vux_relationships_owner_read on public.vux_agent_relationships_v29;
create policy vux_relationships_owner_read on public.vux_agent_relationships_v29 for select to authenticated
  using(exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())));
grant select on public.vux_agent_relationships_v29 to authenticated;
revoke insert,update,delete on public.vux_agent_relationships_v29 from anon,authenticated;

create or replace function public.vux_claim_conversation_v29(p_company_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_next timestamptz;
begin
  if not exists(select 1 from public.companies where id=p_company_id and lower(name) like 'media tech vux%') then return false; end if;
  insert into public.vux_conversation_cooldowns_v29(company_id,next_allowed_at) values(p_company_id,now())
    on conflict(company_id) do nothing;
  select next_allowed_at into v_next from public.vux_conversation_cooldowns_v29
    where company_id=p_company_id for update;
  if v_next > now() then return false; end if;
  update public.vux_conversation_cooldowns_v29 set next_allowed_at=now()+interval '15 minutes'
    where company_id=p_company_id;
  return true;
end; $$;
revoke execute on function public.vux_claim_conversation_v29(uuid) from public,anon,authenticated;
grant execute on function public.vux_claim_conversation_v29(uuid) to service_role;

-- VUX-specific staff template. Existing staff NEVER deleted. Max top-up to 19.
create or replace function public.vux_topup_staff_v29(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; rec record; v_count integer; v_added integer:=0;
begin
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found or lower(c.name) not like 'media tech vux%' then raise exception 'Not a VUX company'; end if;
  select count(*) into v_count from public.employees where company_id=c.id;
  for rec in select * from (values
      ('Nguyễn Minh Anh','COO','Ban điều hành',91,40000000),
      ('Trần Bảo Long','CTO','Kỹ thuật',92,35000000),
      ('Phạm Thảo Vy','CFO','Tài chính',91,35000000),
      ('Lê Hải Yến','CHRO','Nhân sự',88,29000000),
      ('Đỗ Minh Quân','Frontend Developer','Kỹ thuật',85,25000000),
      ('Vũ Hoàng Mai','Backend Developer','Kỹ thuật',88,27000000),
      ('Ngô Gia Bảo','AI Engineer','Kỹ thuật',92,31000000),
      ('Bùi Khánh Linh','QA Engineer','Kỹ thuật',85,24000000),
      ('Phan Ngọc Hà','UI/UX Designer','Thiết kế',87,24000000),
      ('Đặng Quốc Huy','Graphic Designer','Thiết kế',84,23000000),
      ('Hồ Mai Trang','Marketing Director','Marketing',89,31000000),
      ('Mai Minh Phúc','Social Media Manager','Marketing',82,23000000),
      ('Nguyễn Bảo An','SEO Specialist','Marketing',83,22000000),
      ('Trần Anh Khoa','Sales Director','Kinh doanh',89,31000000),
      ('Lê Thanh Vân','Account Executive','Kinh doanh',85,22000000),
      ('Phạm Hương Giang','Recruiter','Nhân sự',82,22000000),
      ('Võ Kim Ngân','HR Operations','Nhân sự',85,23000000),
      ('Đinh Đức Huy','Financial Analyst','Tài chính',84,25000000),
      ('Hà Quang Dũng','Business Development','Kinh doanh',89,27000000)
    ) as e(full_name,role,department,skill,salary_vnd)
  loop
    if v_count>=19 then exit; end if;
    if exists(select 1 from public.employees where company_id=c.id and full_name=rec.full_name) then continue; end if;
    insert into public.employees(company_id,full_name,role,department,skill,morale,energy,salary_vnd)
      values(c.id,rec.full_name,rec.role,rec.department,rec.skill,86,90,rec.salary_vnd);
    v_count:=v_count+1;v_added:=v_added+1;
  end loop;
  return v_added;
end; $$;

create or replace function public.bootstrap_vux_company_v29(p_user_id uuid,p_name text)
returns public.companies language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies;
begin
  if trim(p_name)<>'MEDIA TECH VUX' then raise exception 'Only MEDIA TECH VUX can use this bootstrap';end if;
  -- Unique owner means VUS owners must use a separate account or future multi-company schema.
  insert into public.companies(owner_id,name,treasury_vnd,level,xp)
    values(p_user_id,'MEDIA TECH VUX',2000000000,1,0) returning * into c;
  insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note)
    values(c.id,2000000000,2000000000,'starting_capital','Vốn khởi nghiệp MEDIA TECH VUX');
  perform public.vux_topup_staff_v29(p_user_id);
  insert into public.game_settings(company_id,conversation_mode,show_chat_bubbles,time_scale)
    values(c.id,'adaptive',true,1) on conflict(company_id) do nothing;
  return c;
end; $$;
revoke execute on function public.vux_topup_staff_v29(uuid) from public,anon,authenticated;
revoke execute on function public.bootstrap_vux_company_v29(uuid,text) from public,anon,authenticated;
grant execute on function public.vux_topup_staff_v29(uuid) to service_role;
grant execute on function public.bootstrap_vux_company_v29(uuid,text) to service_role;

-- MEDIA TECH VUS / CEO EMPIRE v2
-- CHAY SAU schema.sql PHASE 1; khong reset game, giu nguyen tien / nhan vien / task.
-- Can chay trong SQL Editor bang role owner. Migration designed to be rerunnable for new tables and functions.

alter table public.tasks add column if not exists auto_mode boolean not null default false;
alter table public.tasks add column if not exists duration_minutes integer not null default 15;
alter table public.tasks add column if not exists due_at timestamptz;

create table if not exists public.ceo_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'CEO' check(length(display_name) between 2 and 60),
  bio text not null default '' check(length(bio) <= 500),
  updated_at timestamptz not null default now()
);
create table if not exists public.ceo_learning (
  company_id uuid not null references public.companies(id) on delete cascade,
  lesson_id text not null check(length(lesson_id) between 3 and 80),
  best_score integer not null check(best_score between 0 and 100),
  passed_at timestamptz not null default now(),
  primary key(company_id,lesson_id)
);
create table if not exists public.ceo_certificates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  code text unique not null default ('VUS-CEO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  issued_at timestamptz not null default now()
);
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_name text not null check(length(client_name) between 2 and 100),
  title text not null check(length(title) between 3 and 150),
  revenue_vnd bigint not null check(revenue_vnd between 1000000 and 5000000000),
  cost_vnd bigint not null check(cost_vnd between 0 and 5000000000),
  status text not null default 'signed' check(status in ('signed','completed')),
  signed_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists contracts_by_company on public.contracts(company_id,signed_at desc);
create table if not exists public.ceo_decisions (
  company_id uuid not null references public.companies(id) on delete cascade,
  scenario_key text not null check(length(scenario_key) between 3 and 60),
  choice_index integer not null check(choice_index between 0 and 2),
  delta_vnd bigint not null,
  xp_gain integer not null,
  decided_at timestamptz not null default now(),
  primary key(company_id,scenario_key)
);

-- Existing data carries over; RLS restricts browser reading to owner only.
alter table public.ceo_profiles enable row level security;
alter table public.ceo_learning enable row level security;
alter table public.ceo_certificates enable row level security;
alter table public.contracts enable row level security;
alter table public.ceo_decisions enable row level security;

drop policy if exists ceo_profile_owner_read on public.ceo_profiles;
create policy ceo_profile_owner_read on public.ceo_profiles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists ceo_learning_owner_read on public.ceo_learning;
create policy ceo_learning_owner_read on public.ceo_learning for select to authenticated using (
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
drop policy if exists ceo_certificate_owner_read on public.ceo_certificates;
create policy ceo_certificate_owner_read on public.ceo_certificates for select to authenticated using (
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
drop policy if exists contracts_owner_read on public.contracts;
create policy contracts_owner_read on public.contracts for select to authenticated using (
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
drop policy if exists decisions_owner_read on public.ceo_decisions;
create policy decisions_owner_read on public.ceo_decisions for select to authenticated using (
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
grant select on public.ceo_profiles,public.ceo_learning,public.ceo_certificates,public.contracts,public.ceo_decisions to authenticated;
revoke insert,update,delete on public.ceo_profiles,public.ceo_learning,public.ceo_certificates,public.contracts,public.ceo_decisions from authenticated,anon;

-- Profile CEO: backend is sole writer and must validate JWT.
create or replace function public.upsert_ceo_profile(p_user_id uuid,p_display_name text,p_bio text)
returns public.ceo_profiles language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.ceo_profiles;
begin
  if length(trim(p_display_name)) not between 2 and 60 or length(coalesce(p_bio,''))>500 then
    raise exception 'Invalid CEO profile';
  end if;
  insert into public.ceo_profiles(user_id,display_name,bio)
    values(p_user_id,trim(p_display_name),coalesce(p_bio,''))
    on conflict(user_id) do update set display_name=excluded.display_name,bio=excluded.bio,updated_at=now()
    returning * into r;
  return r;
end;$$;

-- CEO Academy: score grade happens on backend, not in client; awarding is idempotent.
create or replace function public.pass_ceo_lesson(p_user_id uuid,p_lesson_id text,p_score integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; inserted integer:=0;
begin
  if p_score<70 or p_score>100 then raise exception 'Minimum passing score is 70'; end if;
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found then raise exception 'No owned company'; end if;
  insert into public.ceo_learning(company_id,lesson_id,best_score)
    values(c.id,p_lesson_id,p_score) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted=0 then
    update public.ceo_learning set best_score=greatest(best_score,p_score)
      where company_id=c.id and lesson_id=p_lesson_id;
  else
    update public.companies set xp=xp+75,level=(1+(xp+75)/500)::integer,updated_at=now()
      where id=c.id;
  end if;
  return jsonb_build_object('passed',true,'first_pass',inserted=1,'xp_awarded',case when inserted=1 then 75 else 0 end);
end;$$;

create or replace function public.issue_ceo_certificate(p_user_id uuid,p_required integer)
returns public.ceo_certificates language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; r public.ceo_certificates; n integer; inserted integer;
begin
  if p_required<>30 then raise exception 'Unknown curriculum version'; end if;
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found then raise exception 'No company'; end if;
  select count(*) into n from public.ceo_learning where company_id=c.id;
  if n<p_required then raise exception 'Not enough lessons passed'; end if;
  insert into public.ceo_certificates(company_id) values(c.id) on conflict(company_id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 then update public.companies set xp=xp+500,level=(1+(xp+500)/500)::integer where id=c.id; end if;
  select * into r from public.ceo_certificates where company_id=c.id;
  return r;
end;$$;

-- Create scheduled job. Each employee only one active task (existing partial unique index).
create or replace function public.create_auto_employee_task(
  p_user_id uuid,p_company_id uuid,p_employee_id uuid,p_title text,p_description text,
  p_reward_vnd bigint,p_duration_minutes integer
) returns public.tasks language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.tasks;
begin
  if not exists(select 1 from public.companies where id=p_company_id and owner_id=p_user_id) then raise exception 'Forbidden company'; end if;
  if not exists(select 1 from public.employees where id=p_employee_id and company_id=p_company_id) then raise exception 'Forbidden employee'; end if;
  if length(trim(p_title)) not between 3 and 120 or length(coalesce(p_description,''))>1000
    or p_reward_vnd not between 0 and 5000000 or p_duration_minutes not between 1 and 1440 then
    raise exception 'Invalid task parameters';
  end if;
  insert into public.tasks(company_id,employee_id,title,description,reward_vnd,auto_mode,duration_minutes,due_at)
    values(p_company_id,p_employee_id,trim(p_title),coalesce(p_description,''),p_reward_vnd,true,p_duration_minutes,now()+make_interval(mins=>p_duration_minutes))
    returning * into r;
  update public.employees set status='working' where id=p_employee_id;
  return r;
end;$$;

-- Durable offline simulation: while backend runs, it triggers due processing on a timer.
-- AFTER downtime, next tick or state load reconciles jobs with due_at in the past.
-- No LLM calls here. Delivery is deterministic, money and XP atomic.
create or replace function public.process_due_auto_tasks(p_limit integer default 50)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.tasks; c public.companies; processed integer:=0;
begin
  if p_limit<1 or p_limit>100 then raise exception 'Invalid batch size'; end if;
  -- Running tasks advance predictably by elapsed wall-clock time (without LLM token cost).
  update public.tasks set
    progress=least(99,greatest(0,floor(100*extract(epoch from (now()-created_at)) / (duration_minutes*60))::integer)),
    updated_at=now()
    where auto_mode=true and status='in_progress' and due_at>now()
      and progress<least(99,greatest(0,floor(100*extract(epoch from (now()-created_at)) / (duration_minutes*60))::integer));
  for t in select * from public.tasks
    where auto_mode=true and status='in_progress' and due_at<=now()
    order by due_at,id limit p_limit for update skip locked
  loop
    update public.companies set treasury_vnd=treasury_vnd-t.reward_vnd,
      xp=xp+120,level=(1+(xp+120)/500)::integer,updated_at=now()
      where id=t.company_id and treasury_vnd>=t.reward_vnd returning * into c;
    if found then
      if t.reward_vnd>0 then
        insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note,task_id)
          values(t.company_id,-t.reward_vnd,c.treasury_vnd,'task_bonus',
            'Thưởng nhiệm vụ tự động: '||t.title,t.id);
      end if;
      update public.tasks set progress=100,status='completed',completed_at=now(),updated_at=now() where id=t.id;
      update public.employees set status='idle' where id=t.employee_id;
      processed:=processed+1;
    end if;
  end loop;
  return processed;
end;$$;

create or replace function public.create_contract(p_user_id uuid,p_client_name text,p_title text,p_revenue bigint,p_cost bigint)
returns public.contracts language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; r public.contracts;
begin
  if length(trim(p_client_name)) not between 2 and 100 or length(trim(p_title)) not between 3 and 150
    or p_revenue not between 1000000 and 5000000000 or p_cost not between 0 and 5000000000 then
    raise exception 'Invalid contract';
  end if;
  select * into c from public.companies where owner_id=p_user_id;
  if not found then raise exception 'No company'; end if;
  insert into public.contracts(company_id,client_name,title,revenue_vnd,cost_vnd)
    values(c.id,trim(p_client_name),trim(p_title),p_revenue,p_cost) returning * into r;
  return r;
end;$$;

create or replace function public.complete_contract(p_user_id uuid,p_contract_id uuid)
returns public.contracts language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.contracts; c public.companies; before_vnd bigint;
begin
  select k0.* into k from public.contracts k0
    join public.companies c0 on c0.id=k0.company_id
    where k0.id=p_contract_id and c0.owner_id=p_user_id for update of k0;
  if not found then raise exception 'Unknown contract'; end if;
  if k.status='completed' then return k; end if;
  select * into c from public.companies where id=k.company_id for update;
  before_vnd:=c.treasury_vnd;
  update public.companies set treasury_vnd=treasury_vnd+k.revenue_vnd-k.cost_vnd,
    xp=xp+250, level=(1+(xp+250)/500)::integer,updated_at=now()
    where id=c.id and treasury_vnd+k.revenue_vnd>=k.cost_vnd returning * into c;
  if not found then raise exception 'Insufficient funds'; end if;
  insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note)
    values(k.company_id,k.revenue_vnd,before_vnd+k.revenue_vnd,'contract_income','Doanh thu: '||k.title);
  if k.cost_vnd>0 then
    insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note)
      values(k.company_id,-k.cost_vnd,c.treasury_vnd,'contract_cost','Chi phí thực hiện: '||k.title);
  end if;
  update public.contracts set status='completed',completed_at=now() where id=k.id returning * into k;
  return k;
end;$$;

-- CEO strategy incidents, decisions one-time, finite outcomes defined on server-side SQL.
create or replace function public.resolve_ceo_decision(p_user_id uuid,p_scenario text,p_choice integer)
returns public.ceo_decisions language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; d public.ceo_decisions; delta bigint; gain integer;
begin
  if p_choice not between 0 and 2 then raise exception 'Invalid choice'; end if;
  case p_scenario
    when 'data_leak' then
      delta:=case p_choice when 0 then -120000000 when 1 then -40000000 else -90000000 end;
      gain:=case p_choice when 0 then 300 when 1 then 70 else 130 end;
    when 'competitor' then
      delta:=case p_choice when 0 then -200000000 when 1 then 65000000 else -60000000 end;
      gain:=case p_choice when 0 then 100 when 1 then 260 else 180 end;
    when 'key_employee' then
      delta:=case p_choice when 0 then -70000000 when 1 then -15000000 else 10000000 end;
      gain:=case p_choice when 0 then 250 when 1 then 200 else 70 end;
    when 'late_client' then
      delta:=case p_choice when 0 then -10000000 when 1 then -45000000 else 20000000 end;
      gain:=case p_choice when 0 then 240 when 1 then 100 else 90 end;
    when 'ai_investment' then
      delta:=case p_choice when 0 then -300000000 when 1 then -90000000 else 0 end;
      gain:=case p_choice when 0 then 420 when 1 then 220 else 80 end;
    when 'brand_crisis' then
      delta:=case p_choice when 0 then -100000000 when 1 then -45000000 else -15000000 end;
      gain:=case p_choice when 0 then 320 when 1 then 190 else 40 end;
    else raise exception 'Unknown scenario';
  end case;
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found then raise exception 'No company'; end if;
  if exists(select 1 from public.ceo_decisions where company_id=c.id and scenario_key=p_scenario) then
    raise exception 'Scenario already resolved';
  end if;
  if c.treasury_vnd+delta<0 then raise exception 'Insufficient funds'; end if;
  insert into public.ceo_decisions(company_id,scenario_key,choice_index,delta_vnd,xp_gain)
    values(c.id,p_scenario,p_choice,delta,gain) returning * into d;
  update public.companies set treasury_vnd=treasury_vnd+delta,
    xp=xp+gain, level=(1+(xp+gain)/500)::integer,updated_at=now() where id=c.id;
  if delta<>0 then
    insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note)
      values(c.id,delta,c.treasury_vnd+delta,'ceo_decision','Quyết định CEO: '||p_scenario);
  end if;
  return d;
end;$$;

-- Human resources and monthly payroll (explicit CEO approval).
create table if not exists public.payroll_periods(
  company_id uuid not null references public.companies(id) on delete cascade,
  period text not null check(period ~ '^[0-9]{4}-[0-9]{2}$'),
  total_vnd bigint not null check(total_vnd >= 0),
  paid_at timestamptz not null default now(),
  primary key(company_id,period)
);
alter table public.payroll_periods enable row level security;
drop policy if exists payroll_owner_read on public.payroll_periods;
create policy payroll_owner_read on public.payroll_periods for select to authenticated using(
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
grant select on public.payroll_periods to authenticated;
revoke insert,update,delete on public.payroll_periods from authenticated,anon;

create or replace function public.hire_employee(p_user_id uuid,p_full_name text,p_role text,p_department text,p_salary bigint)
returns public.employees language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; r public.employees; staff_count integer;
begin
  if length(trim(p_full_name)) not between 3 and 65 or length(trim(p_role)) not between 3 and 60
    or length(trim(p_department)) not between 3 and 60 or p_salary not between 8000000 and 100000000 then
    raise exception 'Invalid employee information';
  end if;
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found then raise exception 'No owned company'; end if;
  select count(*) into staff_count from public.employees where company_id=c.id;
  if staff_count>=20 then raise exception 'Office at capacity (20 employees)'; end if;
  update public.companies set treasury_vnd=treasury_vnd-2000000,updated_at=now()
    where id=c.id and treasury_vnd>=2000000 returning * into c;
  if not found then raise exception 'Insufficient recruiting funds'; end if;
  insert into public.employees(company_id,full_name,role,department,skill,salary_vnd,pos_x,pos_z)
    values(c.id,trim(p_full_name),trim(p_role),trim(p_department),65,p_salary,
      case (staff_count-12)%4 when 0 then -5.5 when 1 then -4.5 when 2 then 4.5 else 5.5 end,
      case when staff_count<16 then 3.7 else -4.1 end)
    returning * into r;
  insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note)
    values(c.id,-2000000,c.treasury_vnd,'recruitment','Chi phí tuyển dụng: '||r.full_name);
  return r;
end;$$;

create or replace function public.pay_monthly_payroll(p_user_id uuid,p_period text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; total bigint;
begin
  if p_period<>to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYY-MM') then
    raise exception 'Only the current local month can be paid';
  end if;
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found then raise exception 'No owned company'; end if;
  if exists(select 1 from public.payroll_periods where company_id=c.id and period=p_period) then
    raise exception 'Payroll already paid for this period';
  end if;
  select coalesce(sum(salary_vnd),0) into total from public.employees where company_id=c.id;
  if total=0 then raise exception 'No employees'; end if;
  update public.companies set treasury_vnd=treasury_vnd-total,updated_at=now()
    where id=c.id and treasury_vnd>=total returning * into c;
  if not found then raise exception 'Insufficient payroll funds'; end if;
  insert into public.payroll_periods(company_id,period,total_vnd) values(c.id,p_period,total);
  insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note)
    values(c.id,-total,c.treasury_vnd,'payroll','Lương nhân viên tháng '||p_period);
  return jsonb_build_object('period',p_period,'total_vnd',total,'balance_after_vnd',c.treasury_vnd);
end;$$;

-- role-based restrictions: only service-role backend invokes security definer routines.
revoke all on function public.upsert_ceo_profile(uuid,text,text) from public,anon,authenticated;
revoke all on function public.pass_ceo_lesson(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.issue_ceo_certificate(uuid,integer) from public,anon,authenticated;
revoke all on function public.create_auto_employee_task(uuid,uuid,uuid,text,text,bigint,integer) from public,anon,authenticated;
revoke all on function public.process_due_auto_tasks(integer) from public,anon,authenticated;
revoke all on function public.create_contract(uuid,text,text,bigint,bigint) from public,anon,authenticated;
revoke all on function public.complete_contract(uuid,uuid) from public,anon,authenticated;
revoke all on function public.resolve_ceo_decision(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.upsert_ceo_profile(uuid,text,text) to service_role;
grant execute on function public.pass_ceo_lesson(uuid,text,integer) to service_role;
grant execute on function public.issue_ceo_certificate(uuid,integer) to service_role;
grant execute on function public.create_auto_employee_task(uuid,uuid,uuid,text,text,bigint,integer) to service_role;
grant execute on function public.process_due_auto_tasks(integer) to service_role;
grant execute on function public.create_contract(uuid,text,text,bigint,bigint) to service_role;
grant execute on function public.complete_contract(uuid,uuid) to service_role;
grant execute on function public.resolve_ceo_decision(uuid,text,integer) to service_role;

revoke all on function public.hire_employee(uuid,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.pay_monthly_payroll(uuid,text) from public,anon,authenticated;
grant execute on function public.hire_employee(uuid,text,text,text,bigint) to service_role;
grant execute on function public.pay_monthly_payroll(uuid,text) to service_role;

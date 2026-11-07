-- MEDIA TECH VUS | Supabase SQL Editor | Giai đoạn 1
-- Chạy một lần trong project Supabase MỚI. Cần quyền owner/editor của database.
-- Dữ liệu được kiểm soát bởi backend và chỉ đọc được bởi chủ tài khoản.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 70),
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  treasury_vnd bigint not null default 10000000000 check (treasury_vnd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  role text not null,
  department text not null,
  skill integer not null check (skill between 0 and 100),
  morale integer not null default 85 check (morale between 0 and 100),
  energy integer not null default 90 check (energy between 0 and 100),
  salary_vnd bigint not null check (salary_vnd >= 0),
  status text not null default 'idle' check (status in ('idle', 'working')),
  pos_x numeric(5,2) not null default 0,
  pos_z numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists employees_by_company on public.employees(company_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '',
  reward_vnd bigint not null default 0 check (reward_vnd between 0 and 5000000),
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tasks_by_company on public.tasks(company_id,created_at desc);
create unique index if not exists one_active_task_per_employee on public.tasks(employee_id) where status = 'in_progress';

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  amount_vnd bigint not null check (amount_vnd <> 0),
  balance_after_vnd bigint not null check (balance_after_vnd >= 0),
  kind text not null,
  note text not null default '',
  task_id uuid unique references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ledger_by_company on public.ledger_entries(company_id,created_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  actor text not null check (actor in ('user', 'assistant')),
  content text not null,
  provider text not null check (provider in ('gemini','openai')),
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_history on public.ai_messages(company_id,employee_id,created_at desc);

-- RLS: browser chỉ đọc dữ liệu thuộc sở hữu; browser không được ghi trực tiếp.
alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.tasks enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.ai_messages enable row level security;

create policy "company_owner_read" on public.companies
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "employee_owner_read" on public.employees
  for select to authenticated using (
    exists(select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );
create policy "task_owner_read" on public.tasks
  for select to authenticated using (
    exists(select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );
create policy "ledger_owner_read" on public.ledger_entries
  for select to authenticated using (
    exists(select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );
create policy "chat_owner_read" on public.ai_messages
  for select to authenticated using (
    exists(select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid()))
  );

-- Quyền SQL bổ sung cho API công khai: chỉ SELECT qua RLS.
-- Service role vẫn có quyền quản lý từ backend.
grant usage on schema public to authenticated;
grant select on public.companies, public.employees, public.tasks,
  public.ledger_entries, public.ai_messages to authenticated;
revoke insert, update, delete on public.companies, public.employees,
  public.tasks, public.ledger_entries, public.ai_messages from authenticated, anon;

-- Bootstrap thực hiện atomic: công ty + vốn + nhân viên.
create or replace function public.bootstrap_company(p_user_id uuid, p_name text)
returns public.companies
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_company public.companies;
begin
  if char_length(trim(p_name)) < 3 or char_length(trim(p_name)) > 70 then
    raise exception 'Invalid company name';
  end if;
  insert into public.companies(owner_id, name) values (p_user_id, trim(p_name)) returning * into v_company;
  insert into public.ledger_entries(company_id, amount_vnd, balance_after_vnd, kind, note)
    values(v_company.id, 10000000000, 10000000000, 'starting_capital', 'Vốn khởi nghiệp 10 tỷ VNĐ');
  insert into public.employees(company_id,full_name,role,department,skill,morale,energy,salary_vnd,pos_x,pos_z)
    select v_company.id, e.full_name, e.role, e.department, e.skill, e.morale, 90, e.salary_vnd, e.pos_x, e.pos_z
    from (values
      ('Nguyễn Minh Quân','CTO','Công nghệ & AI',92,88,35000000,-3.5,-2.9),
      ('Trần Thảo Linh','COO','Ban điều hành',91,93,40000000,3.5,-2.9),
      ('Phạm Hoàng Nam','Chuyên viên chiến lược','Ban điều hành',78,84,23000000,-3.5,-0.5),
      ('Lê Bảo An','AI Engineer','Công nghệ & AI',88,86,28000000,-1.3,-2.9),
      ('Đỗ Quốc Huy','Frontend Developer','Công nghệ & AI',83,87,24000000,1.3,-2.9),
      ('Vũ Thanh Mai','Content Lead','Truyền thông',86,92,25000000,3.5,-0.5),
      ('Ngô Hải Yến','Video Producer','Truyền thông',84,85,22000000,-1.3,-0.5),
      ('Bùi Minh Đức','Marketing Manager','Marketing',88,86,27000000,1.3,-0.5),
      ('Phan Khánh Vy','Performance Ads','Marketing',82,89,21000000,-3.5,2.0),
      ('Đặng Anh Tuấn','Sales Director','Kinh doanh',87,85,30000000,-1.3,2.0),
      ('Hồ Ngọc Hà','Account Executive','Kinh doanh',81,91,21000000,1.3,2.0),
      ('Mai Gia Bảo','Finance & HR','Tài chính & Nhân sự',89,90,29000000,3.5,2.0)
    ) as e(full_name,role,department,skill,morale,salary_vnd,pos_x,pos_z);
  return v_company;
end; $$;

-- Giao nhiệm vụ: xác minh owner, đúng nhân viên, không trùng task đang làm.
create or replace function public.create_employee_task(
  p_user_id uuid, p_company_id uuid, p_employee_id uuid, p_title text,
  p_description text, p_reward_vnd bigint
) returns public.tasks
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_task public.tasks;
begin
  if not exists(select 1 from public.companies where id=p_company_id and owner_id=p_user_id) then
    raise exception 'Unauthorized company';
  end if;
  if not exists(select 1 from public.employees where id=p_employee_id and company_id=p_company_id) then
    raise exception 'Employee does not belong to company';
  end if;
  if length(trim(p_title)) not between 3 and 120 or p_reward_vnd not between 0 and 5000000 then
    raise exception 'Invalid task input';
  end if;
  insert into public.tasks(company_id,employee_id,title,description,reward_vnd)
    values(p_company_id,p_employee_id,trim(p_title),coalesce(p_description,''),p_reward_vnd)
    returning * into v_task;
  update public.employees set status='working' where id=p_employee_id;
  return v_task;
end; $$;

-- Tiến độ nhiệm vụ giai đoạn 1: CEO bấm +25%, hoàn thành mới thưởng và +120 XP.
-- Hàng được lock, toàn bộ cập nhật là một transaction, tránh thưởng lặp.
create or replace function public.advance_employee_task(p_user_id uuid, p_task_id uuid)
returns public.tasks
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_task public.tasks; v_company public.companies; v_progress integer;
begin
  select t.* into v_task from public.tasks t
    join public.companies c on c.id=t.company_id
    where t.id=p_task_id and c.owner_id=p_user_id
    for update of t;
  if not found then raise exception 'Task not found or unauthorized'; end if;
  if v_task.status='completed' then return v_task; end if;
  v_progress := least(100,v_task.progress+25);
  if v_progress=100 then
    update public.companies set
      treasury_vnd=treasury_vnd-v_task.reward_vnd,
      xp=xp+120,
      level=(1+(xp+120)/500)::integer,
      updated_at=now()
      where id=v_task.company_id and treasury_vnd>=v_task.reward_vnd
      returning * into v_company;
    if not found then raise exception 'Insufficient company funds'; end if;
    if v_task.reward_vnd>0 then
      insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note,task_id)
        values(v_task.company_id,-v_task.reward_vnd,v_company.treasury_vnd,'task_bonus',
          'Thưởng hoàn thành: '||v_task.title,v_task.id);
    end if;
    update public.employees set status='idle' where id=v_task.employee_id;
    update public.tasks set progress=100,status='completed',completed_at=now(),updated_at=now()
      where id=v_task.id returning * into v_task;
  else
    update public.tasks set progress=v_progress,updated_at=now()
      where id=v_task.id returning * into v_task;
  end if;
  return v_task;
end; $$;

-- Chỉ backend có service_role được gọi RPC; người chơi không thể tự giả owner-id.
revoke execute on function public.bootstrap_company(uuid,text) from public, anon, authenticated;
revoke execute on function public.create_employee_task(uuid,uuid,uuid,text,text,bigint) from public, anon, authenticated;
revoke execute on function public.advance_employee_task(uuid,uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_company(uuid,text) to service_role;
grant execute on function public.create_employee_task(uuid,uuid,uuid,text,text,bigint) to service_role;
grant execute on function public.advance_employee_task(uuid,uuid) to service_role;

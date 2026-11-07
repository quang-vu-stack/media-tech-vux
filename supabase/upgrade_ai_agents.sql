-- MEDIA TECH VUS AI AGENTS v3 — run AFTER schema.sql + upgrade_ceo_empire.sql
-- Safe upgrade: creates new tables and RPC; does not drop existing game data.
create table if not exists public.agent_orders (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 task_id uuid unique references public.tasks(id) on delete set null,
 objective text not null check(length(objective) between 8 and 600),
 provider text not null check(provider in ('gemini','openai','simulated')),
 plan jsonb not null,
 status text not null default 'pending' check(status in ('pending','running','completed','rejected')),
 created_at timestamptz not null default now(),
 approved_at timestamptz,
 completed_at timestamptz,
 check (jsonb_typeof(plan)='object')
);
create index if not exists agent_orders_company on public.agent_orders(company_id,created_at desc);
create table if not exists public.agent_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 order_id uuid not null references public.agent_orders(id) on delete cascade,
 event_type text not null check(event_type in ('proposed','approved','rejected','completed')),
 details text not null,
 created_at timestamptz not null default now(),
 unique(order_id,event_type)
);
create index if not exists agent_events_order on public.agent_events(order_id,created_at);
alter table public.agent_orders enable row level security;
alter table public.agent_events enable row level security;
drop policy if exists agent_orders_owner_read on public.agent_orders;
create policy agent_orders_owner_read on public.agent_orders for select to authenticated using(
 exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
drop policy if exists agent_events_owner_read on public.agent_events;
create policy agent_events_owner_read on public.agent_events for select to authenticated using(
 exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
revoke insert,update,delete on public.agent_orders,public.agent_events from anon,authenticated;
grant select on public.agent_orders,public.agent_events to authenticated;

-- Only backend service role invokes. Authenticated browser clients cannot call these RPCs.
create or replace function public.create_agent_order(p_user_id uuid,p_employee_id uuid,p_objective text,p_provider text,p_plan jsonb)
returns public.agent_orders language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; o public.agent_orders;
begin
 select c0.* into c from public.companies c0 join public.employees e on e.company_id=c0.id
 where e.id=p_employee_id and c0.owner_id=p_user_id;
 if not found then raise exception 'Forbidden employee'; end if;
 if length(trim(p_objective)) not between 8 and 600 or p_provider not in ('gemini','openai','simulated')
 or jsonb_typeof(p_plan)<>'object' or jsonb_typeof(p_plan->'steps')<>'array'
 or jsonb_array_length(p_plan->'steps') not between 2 and 5
 or length(p_plan::text)>4500 then raise exception 'Invalid agent plan'; end if;
 insert into public.agent_orders(company_id,employee_id,objective,provider,plan)
 values(c.id,p_employee_id,trim(p_objective),p_provider,p_plan) returning * into o;
 insert into public.agent_events(company_id,order_id,event_type,details)
 values(c.id,o.id,'proposed','Nhân viên đã gửi đề xuất; chờ CEO phê duyệt.');
 return o;
end;$$;

create or replace function public.decide_agent_order(p_user_id uuid,p_order_id uuid,p_approve boolean)
returns public.agent_orders language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.agent_orders; t public.tasks; total_minutes integer;
begin
 select x.* into o from public.agent_orders x join public.companies c on c.id=x.company_id
 where x.id=p_order_id and c.owner_id=p_user_id for update of x;
 if not found then raise exception 'Agent order missing or forbidden'; end if;
 if o.status<>'pending' then return o; end if;
 if not p_approve then
   update public.agent_orders set status='rejected' where id=o.id returning * into o;
   insert into public.agent_events(company_id,order_id,event_type,details)
    values(o.company_id,o.id,'rejected','CEO từ chối kế hoạch.');
   return o;
 end if;
 select coalesce(sum((s.value->>'durationMinutes')::integer),0) into total_minutes
 from jsonb_array_elements(o.plan->'steps') s;
 if total_minutes<1 or total_minutes>1440 then raise exception 'Invalid total minutes'; end if;
 -- Revalidate numeric fields in trusted SQL before creating any task.
 if (o.plan->>'rewardVnd')::bigint not between 0 and 5000000 then raise exception 'Invalid reward'; end if;
 t:=public.create_auto_employee_task(p_user_id,o.company_id,o.employee_id,
   o.plan->>'title',o.plan->>'description',(o.plan->>'rewardVnd')::bigint,total_minutes);
 update public.agent_orders set task_id=t.id,status='running',approved_at=now()
 where id=o.id returning * into o;
 insert into public.agent_events(company_id,order_id,event_type,details)
 values(o.company_id,o.id,'approved','CEO duyệt, bắt đầu mô phỏng tiến độ công việc.');
 return o;
end;$$;

-- Idempotent, safe to execute from worker and GET endpoints.
create or replace function public.reconcile_agent_orders(p_limit integer default 100)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.agent_orders; processed integer:=0;
begin
 if p_limit<1 or p_limit>200 then raise exception 'Invalid batch size'; end if;
 for o in select a.* from public.agent_orders a join public.tasks t on t.id=a.task_id
 where a.status='running' and t.status='completed' order by t.completed_at,a.id
 limit p_limit for update of a skip locked loop
  update public.agent_orders set status='completed',completed_at=now() where id=o.id;
  insert into public.agent_events(company_id,order_id,event_type,details)
   values(o.company_id,o.id,'completed',
    'Đã hoàn thành nhiệm vụ mô phỏng và ghi nhận thưởng/XP; không phải sản phẩm bên ngoài game.')
   on conflict(order_id,event_type) do nothing;
  processed:=processed+1;
 end loop;
 return processed;
end;$$;
revoke all on function public.create_agent_order(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.decide_agent_order(uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.reconcile_agent_orders(integer) from public,anon,authenticated;
grant execute on function public.create_agent_order(uuid,uuid,text,text,jsonb) to service_role;
grant execute on function public.decide_agent_order(uuid,uuid,boolean) to service_role;
grant execute on function public.reconcile_agent_orders(integer) to service_role;

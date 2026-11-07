-- MEDIA TECH VUS CEO EMPIRE v5
-- Apply AFTER schema.sql, upgrade_ceo_empire.sql, upgrade_ai_agents.sql, upgrade_market.sql
-- Idempotent daily market world. Server-side algorithmic competitors (NOT generative LLM).

alter table public.companies add column if not exists market_reputation integer not null default 30
  check(market_reputation between 0 and 100);

create table if not exists public.world_days (
  company_id uuid not null references public.companies(id) on delete cascade,
  day date not null,
  demand_index integer not null check(demand_index between 50 and 150),
  event_key text not null,
  market_sentiment text not null,
  reputation_snapshot integer not null,
  created_at timestamptz not null default now(),
  primary key(company_id,day)
);

create table if not exists public.world_rival_days (
  company_id uuid not null references public.companies(id) on delete cascade,
  day date not null,
  rival_code text not null references public.market_competitors(code),
  staff integer not null check(staff between 1 and 100000),
  cash_vnd bigint not null check(cash_vnd >= 0),
  strength integer not null check(strength between 1 and 100),
  market_share integer not null check(market_share between 1 and 100),
  action_key text not null,
  created_at timestamptz not null default now(),
  primary key(company_id,day,rival_code),
  foreign key(company_id,day) references public.world_days(company_id,day) on delete cascade
);

create table if not exists public.world_ceo_actions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  day date not null,
  action_key text not null check(action_key in ('marketing','research','reserve')),
  cost_vnd bigint not null check(cost_vnd>=0),
  reputation_change integer not null,
  created_at timestamptz not null default now(),
  unique(company_id,day),
  foreign key(company_id,day) references public.world_days(company_id,day)
);
create index if not exists world_days_latest on public.world_days(company_id,day desc);

alter table public.world_days enable row level security;
alter table public.world_rival_days enable row level security;
alter table public.world_ceo_actions enable row level security;

create policy world_days_read_owner on public.world_days for select to authenticated using (
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
create policy world_rivals_read_owner on public.world_rival_days for select to authenticated using (
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
create policy world_actions_read_owner on public.world_ceo_actions for select to authenticated using (
  exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid()))
);
grant select on public.world_days,public.world_rival_days,public.world_ceo_actions to authenticated;
revoke insert,update,delete on public.world_days,public.world_rival_days,public.world_ceo_actions from anon,authenticated;

-- Caller must be backend service-role. Locks one company row so no duplicate ticks or CEO actions.
-- Catch up at most 45 days per call, with successive calls covering older outages.
create or replace function public.advance_company_world(p_company_id uuid, p_max_days integer default 45)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  c public.companies;
  d date;
  last_date date;
  today_utc date := (now() at time zone 'UTC')::date;
  seed int;
  changes int:=0;
  r record;
  prev public.world_rival_days;
  new_staff integer; new_cash bigint; new_strength integer; new_share integer;
  momentum int; action text;
  demand int; event_name text; sentiment text;
begin
  if p_max_days < 1 or p_max_days > 45 then raise exception 'p_max_days out of range'; end if;
  select * into c from public.companies where id=p_company_id for update;
  if not found then raise exception 'Company not found'; end if;
  select max(day) into last_date from public.world_days where company_id=c.id;
  if last_date is null then
    d:=today_utc; -- New company starts today; no synthetic months of history.
  else
    d:=last_date+1;
  end if;
  while d<=today_utc and changes < p_max_days loop
    seed := (get_byte(decode(md5(c.id::text||'world'||d::text),'hex'),0)*256
           +get_byte(decode(md5(c.id::text||'world'||d::text),'hex'),1));
    demand := 70+(seed%61);
    event_name := (array['tech_boom','ad_shift','talent_war','stable','price_war','consumer_wave'])[(seed%6)+1];
    sentiment := case when demand>112 then 'tang_truong' when demand<90 then 'suy_giam' else 'on_dinh' end;
    insert into public.world_days(company_id,day,demand_index,event_key,market_sentiment,reputation_snapshot)
      values(c.id,d,demand,event_name,sentiment,c.market_reputation) on conflict do nothing;

    for r in select * from public.market_competitors order by code loop
      seed := get_byte(decode(md5(c.id::text||d::text||r.code),'hex'),0)*256
             +get_byte(decode(md5(c.id::text||d::text||r.code),'hex'),1);
      select * into prev from public.world_rival_days
        where company_id=c.id and rival_code=r.code and day<d order by day desc limit 1;
      momentum := (seed%9)-4;
      action := (array['hire','launch','research','price_cut','consolidate'])[((seed/13)%5)+1];
      if prev.company_id is null then
        new_staff:=18 + r.strength / 3;
        new_cash:=(r.strength::bigint * 40000000);
        new_strength:=r.strength;
        new_share:=greatest(1,least(100,r.strength/6));
      else
        new_staff:=greatest(1,prev.staff + case when action='hire' then 2 when action='consolidate' then -1 else 0 end);
        new_cash:=greatest(0::bigint, prev.cash_vnd + (momentum::bigint * 14000000)
          - case when action='hire' then 35000000::bigint when action='research' then 25000000::bigint else 0::bigint end);
        new_strength:=greatest(1,least(100,prev.strength + case when action='research' then 1 when action='launch' then 1 when action='price_cut' then -1 else 0 end));
        new_share:=greatest(1,least(100,prev.market_share + case when demand>100 then 1 else -1 end + (seed%3)-1));
      end if;
      insert into public.world_rival_days(company_id,day,rival_code,staff,cash_vnd,strength,market_share,action_key)
        values(c.id,d,r.code,new_staff,new_cash,new_strength,new_share,action)
        on conflict do nothing;
      prev:=null;
    end loop;
    changes:=changes+1;
    d:=d+1;
  end loop;
  return changes;
end; $$;

create or replace function public.advance_world_for_owner(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c uuid;
begin
  select id into c from public.companies where owner_id=p_user_id;
  if c is null then raise exception 'Company not found'; end if;
  return public.advance_company_world(c,45);
end; $$;

-- One decision per UTC day; negative cash movement is recorded in the ledger.
create or replace function public.choose_world_strategy(p_user_id uuid, p_action text)
returns public.world_ceo_actions language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; a public.world_ceo_actions; cost bigint; gain integer;
  today_utc date:=(now() at time zone 'UTC')::date;
begin
  if p_action not in ('marketing','research','reserve') or p_action is null then
    raise exception 'Unknown strategy';
  end if;
  select * into c from public.companies where owner_id=p_user_id for update;
  if not found then raise exception 'Company not found'; end if;
  perform public.advance_company_world(c.id,45);
  if not exists(select 1 from public.world_days where company_id=c.id and day=today_utc) then
    raise exception 'World synchronization in progress, retry';
  end if;
  cost := case p_action when 'marketing' then 80000000 when 'research' then 120000000 else 0 end;
  gain := case p_action when 'marketing' then 2 when 'research' then 3 else 0 end;
  if exists(select 1 from public.world_ceo_actions where company_id=c.id and day=today_utc) then
    raise exception 'CEO strategy already chosen today';
  end if;
  if c.treasury_vnd<cost then raise exception 'Insufficient treasury'; end if;
  insert into public.world_ceo_actions(company_id,day,action_key,cost_vnd,reputation_change)
    values(c.id,today_utc,p_action,cost,gain) returning * into a;
  update public.companies set treasury_vnd=treasury_vnd-cost,
    market_reputation=least(100,market_reputation+gain),updated_at=now()
    where id=c.id returning * into c;
  if cost>0 then
    insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note)
      values(c.id,-cost,c.treasury_vnd,'market_strategy','Chiến lược thị trường: '||p_action);
  end if;
  return a;
end; $$;

-- World strategy impacts bidding: at most +2% on rival bid as negotiation advantage.
-- Replacement keeps atomic company ownership check and one-contract-per-offer semantics.
create or replace function public.submit_market_bid(p_user_id uuid,p_offer_id uuid,p_bid bigint)
returns public.market_offers language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.market_offers; c public.companies; k public.contracts; advantage bigint;
begin
  select mo.* into o from public.market_offers mo join public.companies c0 on c0.id=mo.company_id
    where mo.id=p_offer_id and c0.owner_id=p_user_id for update of mo;
  if not found then raise exception 'Offer not found or forbidden'; end if;
  if o.status<>'open' or o.offer_date<>(now() at time zone 'UTC')::date then raise exception 'Offer closed or expired'; end if;
  if p_bid is null or p_bid<o.estimated_cost_vnd or p_bid>o.client_budget_vnd then
    raise exception 'Bid outside profitable allowed range';
  end if;
  select * into c from public.companies where id=o.company_id;
  advantage := least(c.level,5)::bigint * o.rival_bid_vnd/100
       + least(c.market_reputation,100)::bigint * o.rival_bid_vnd/5000;
  if p_bid <= o.rival_bid_vnd + advantage then
    insert into public.contracts(company_id,client_name,title,revenue_vnd,cost_vnd)
      values(o.company_id,o.client_name,o.title,p_bid,o.estimated_cost_vnd) returning * into k;
    update public.market_offers set status='won',player_bid_vnd=p_bid,contract_id=k.id,decided_at=now()
      where id=o.id returning * into o;
  else
    update public.market_offers set status='lost',player_bid_vnd=p_bid,decided_at=now()
      where id=o.id returning * into o;
  end if;
  return o;
end; $$;

create or replace function public.advance_all_company_worlds(p_limit integer default 50)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; processed integer:=0;
begin
  if p_limit not between 1 and 200 then raise exception 'Invalid limit'; end if;
  for r in select id from public.companies order by created_at limit p_limit loop
    perform public.advance_company_world(r.id,45);
    processed:=processed+1;
  end loop;
  return processed;
end; $$;

revoke all on function public.advance_company_world(uuid,integer) from public,anon,authenticated;
revoke all on function public.advance_world_for_owner(uuid) from public,anon,authenticated;
revoke all on function public.choose_world_strategy(uuid,text) from public,anon,authenticated;
revoke all on function public.advance_all_company_worlds(integer) from public,anon,authenticated;
revoke all on function public.submit_market_bid(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.advance_company_world(uuid,integer) to service_role;
grant execute on function public.advance_world_for_owner(uuid) to service_role;
grant execute on function public.choose_world_strategy(uuid,text) to service_role;
grant execute on function public.advance_all_company_worlds(integer) to service_role;
grant execute on function public.submit_market_bid(uuid,uuid,bigint) to service_role;

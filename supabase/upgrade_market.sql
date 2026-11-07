-- MEDIA TECH VUS v4: thị trường cạnh tranh. Chạy SAU schema.sql, upgrade_ceo_empire.sql, upgrade_ai_agents.sql.
-- Migration bổ sung; KHÔNG xóa tài khoản, hợp đồng hoặc số dư hiện có.
create table if not exists public.market_competitors (
  code text primary key,
  display_name text not null,
  specialty text not null,
  strength integer not null check (strength between 0 and 100)
);
insert into public.market_competitors(code,display_name,specialty,strength) values
 ('nova','NOVA Digital','Marketing',84),('zenith','Zenith Studio','Truyền thông',79),
 ('cloudx','CloudX Systems','Công nghệ',88),('pixel','PixelSpark','Thiết kế',73),
 ('orion','Orion AI Labs','AI',92),('delta','Delta Commerce','Thương mại',80)
on conflict(code) do nothing;

create table if not exists public.market_offers (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 offer_date date not null,
 slot integer not null check(slot between 1 and 3),
 client_name text not null,
 title text not null,
 category text not null,
 client_budget_vnd bigint not null check(client_budget_vnd>0),
 estimated_cost_vnd bigint not null check(estimated_cost_vnd>=0),
 rival_code text not null references public.market_competitors(code),
 rival_bid_vnd bigint not null check(rival_bid_vnd>0),
 demand_index integer not null check(demand_index between 70 and 130),
 status text not null default 'open' check(status in ('open','won','lost','expired')),
 player_bid_vnd bigint,
 contract_id uuid unique references public.contracts(id) on delete set null,
 decided_at timestamptz,
 created_at timestamptz not null default now(),
 unique(company_id,offer_date,slot)
);
create index if not exists market_by_company on public.market_offers(company_id,offer_date desc);
alter table public.market_competitors enable row level security;
alter table public.market_offers enable row level security;
create policy "market_competitors_read" on public.market_competitors for select to authenticated using(true);
create policy "market_offers_owner_read" on public.market_offers for select to authenticated using(
 exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())));
revoke insert,update,delete on public.market_competitors,public.market_offers from anon,authenticated;
grant select on public.market_competitors,public.market_offers to authenticated;

-- Mỗi ngày UTC tạo 3 cơ hội riêng cho mỗi công ty, tự động khi CEO mở tab thị trường.
-- SHA hash giúp cùng một ngày luôn trả về bộ cơ hội ổn định, tránh reroll miễn phí.
create or replace function public.refresh_company_market(p_user_id uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.companies; s integer; seed integer; v_cat text; v_client text; v_title text;
  v_budget bigint; v_cost bigint; v_quote bigint; v_rival text; v_demand integer; v_inserted integer:=0;
begin
 select * into c from public.companies where owner_id=p_user_id;
 if not found then raise exception 'No company'; end if;
 update public.market_offers set status='expired',decided_at=now()
 where company_id=c.id and offer_date< (now() at time zone 'UTC')::date and status='open';
 for s in 1..3 loop
   seed := get_byte(decode(md5(c.id::text||'/'||(now() at time zone 'UTC')::date::text||'/'||s),'hex'),0)
       + 256*get_byte(decode(md5(c.id::text||'/'||(now() at time zone 'UTC')::date::text||'/'||s),'hex'),1);
   v_cat := (array['Marketing','Truyền thông','Công nghệ','Thiết kế','AI','Thương mại'])[(seed % 6)+1];
   v_client := (array['Green Lotus','Vina Retail','BlueRiver Group','Sunrise Media','Hanoi Ventures','Future City'])[(seed % 6)+1];
   v_title := (array['Triển khai quảng cáo đa kênh','Sản xuất chiến dịch thương hiệu',
       'Xây dựng nền tảng số','Thiết kế bộ nhận diện','Tích hợp trợ lý AI','Tối ưu bán hàng trực tuyến'])[(seed % 6)+1];
   v_budget := (120 + (seed % 19)*15)::bigint * 1000000;
   v_cost := (v_budget* (44 + (seed % 13))/100)::bigint;
   v_quote := (v_budget*(70 + (seed % 15))/100)::bigint;
   v_demand := 70+(seed%61);
   v_rival := (array['nova','zenith','cloudx','pixel','orion','delta'])[((seed/7)%6)+1];
   insert into public.market_offers(company_id,offer_date,slot,client_name,title,category,
     client_budget_vnd,estimated_cost_vnd,rival_code,rival_bid_vnd,demand_index)
   values(c.id,(now() at time zone 'UTC')::date,s,v_client,v_title,v_cat,v_budget,v_cost,v_rival,v_quote,v_demand)
   on conflict(company_id,offer_date,slot) do nothing;
   if found then v_inserted:=v_inserted+1; end if;
 end loop;
 return v_inserted;
end; $$;

-- Khóa cơ hội + quyền sở hữu, tối đa một bid, giao dịch thắng mới tạo hợp đồng.
-- Luật thắng công khai: giá chào <= giá của đối thủ + ưu thế theo cấp CEO (tối đa 5%).
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
 advantage := least(c.level,5)::bigint * o.rival_bid_vnd / 100;
 if p_bid<=o.rival_bid_vnd + advantage then
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
revoke all on function public.refresh_company_market(uuid) from public,anon,authenticated;
revoke all on function public.submit_market_bid(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.refresh_company_market(uuid) to service_role;
grant execute on function public.submit_market_bid(uuid,uuid,bigint) to service_role;

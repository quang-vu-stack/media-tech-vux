import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {strategyPreview,worldBidAdvantage,STRATEGIES} from '../apps/api/src/world-rules.js';
const sql=readFileSync(new URL('../supabase/upgrade_world_v5.sql',import.meta.url),'utf8');
const api=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../apps/web/src/App.tsx',import.meta.url),'utf8');
test('strategy validates resources and caps reputation',()=>{
 assert.deepEqual(strategyPreview('marketing',100_000_000,99),{allowed:true,cost:80_000_000,remaining:20_000_000,reputation:100});
 assert.equal(strategyPreview('research',100_000_000,70).allowed,false);
 assert.deepEqual(strategyPreview('reserve',0,100),{allowed:true,cost:0,remaining:0,reputation:100});
 assert.throws(()=>strategyPreview('hacked',100_000_000,10));
 assert.throws(()=>strategyPreview('marketing',Number.NaN,20));
 assert.equal(Object.keys(STRATEGIES).length,3);
});
test('reputation improves bid advantage but remains capped',()=>{
 assert.equal(worldBidAdvantage(100_000_000,2,50),3_000_000);
 assert.equal(worldBidAdvantage(100_000_000,5,100),7_000_000);
 assert.throws(()=>worldBidAdvantage(100_000_000,2,101));
});
test('world database enforces unique daily rows and ownership',()=>{
 assert.match(sql,/primary key\(company_id,day,rival_code\)/i);
 assert.match(sql,/unique\(company_id,day\)/i);
 assert.match(sql,/select \* into c from public\.companies where owner_id=p_user_id for update/i);
 assert.match(sql,/if exists\(select 1 from public\.world_ceo_actions/i);
 assert.match(sql,/where c\.id=company_id and c\.owner_id=\(select auth\.uid\(\)\)/i);
});
test('strategy can never be purchased with insufficient cash',()=>{
 assert.match(sql,/if c\.treasury_vnd<cost then raise exception 'Insufficient treasury'/i);
 assert.match(sql,/market_reputation=least\(100,market_reputation\+gain\)/i);
 assert.match(sql,/insert into public\.ledger_entries/i);
});
test('daily competition evolves from prior snapshot and is deterministic',()=>{
 assert.match(sql,/prev\.staff/);
 assert.match(sql,/prev\.cash_vnd/);
 assert.match(sql,/prev\.strength/);
 assert.match(sql,/md5\(c\.id::text\|\|d::text\|\|r\.code\)/);
 assert.match(sql,/on conflict do nothing/);
});
test('worker and authenticated routes share company ownership enforcement',()=>{
 assert.match(api,/app\.get\('\/api\/world'/);
 assert.match(api,/app\.post\('\/api\/world\/strategy'/);
 assert.match(api,/advance_all_company_worlds/);
 assert.match(sql,/revoke all on function public\.choose_world_strategy\(uuid,text\) from public,anon,authenticated/i);
 assert.match(sql,/grant execute on function public\.choose_world_strategy\(uuid,text\) to service_role/i);
 assert.match(ui,/id: 'world'/);
});

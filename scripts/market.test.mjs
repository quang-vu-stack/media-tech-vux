import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMarketBid, validateMarketBid, marketAdvantage} from '../apps/api/src/market-rules.js';
const sql=readFileSync(new URL('../supabase/upgrade_market.sql',import.meta.url),'utf8');
test('bid must fit cost and budget',()=>{
 assert.equal(validateMarketBid(50_000_000,60_000_000,100_000_000),false);
 assert.equal(validateMarketBid(130_000_000,60_000_000,100_000_000),false);
 assert.equal(validateMarketBid(80_000_000,60_000_000,100_000_000),true);
 assert.equal(validateMarketBid(1.1,1,2),false);
});
test('competitive quote and CEO level affect outcomes',()=>{
 assert.equal(evaluateMarketBid({bid:99_000_000,cost:60_000_000,budget:120_000_000,rivalBid:100_000_000,level:1}).won,true);
 assert.equal(evaluateMarketBid({bid:110_000_000,cost:60_000_000,budget:120_000_000,rivalBid:100_000_000,level:1}).won,false);
 assert.equal(marketAdvantage(100_000_000,50),5_000_000);
 assert.equal(evaluateMarketBid({bid:105_000_000,cost:60_000_000,budget:120_000_000,rivalBid:100_000_000,level:5}).won,true);
});
test('cannot generate loss-making bids',()=>assert.throws(()=>evaluateMarketBid({bid:1,cost:100,budget:200,rivalBid:150,level:2})));
test('database enforces uniqueness, row locking and ownership',()=>{
 assert.match(sql,/unique\(company_id,offer_date,slot\)/i);
 assert.match(sql,/for update of mo/i);
 assert.match(sql,/c0\.owner_id=p_user_id/i);
 assert.match(sql,/if o\.status<>'open'/i);
 assert.match(sql,/revoke all on function public\.submit_market_bid/i);
 assert.match(sql,/grant execute on function public\.submit_market_bid\(uuid,uuid,bigint\) to service_role/i);
});
test('offers are updated at most once and winning bids create contracts',()=>{
 assert.match(sql,/on conflict\(company_id,offer_date,slot\) do nothing/i);
 assert.match(sql,/insert into public\.contracts/i);
 assert.match(sql,/contract_id=k\.id/i);
 assert.match(sql,/status='lost'/i);
});

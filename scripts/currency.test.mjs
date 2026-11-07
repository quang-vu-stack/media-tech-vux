import test from 'node:test';
import assert from 'node:assert/strict';
import { amountInUsd, formatVnd, formatUsdFromVnd, formatGameMoney, validUsdVndRate, REFERENCE_USD_VND } from '../apps/web/src/money.js';
import { makeFxRateService } from '../apps/api/src/fx-rate.js';
import { readFileSync } from 'node:fs';

const OK_BODY = { result: 'success', base_code: 'USD', rates: { VND: 25800.5 }, time_last_update_unix: 1793760000 };
const response = body => ({ ok: true, json: async () => body });

test('accounting reference: 10 billion VND converts to USD without mutating VND', () => {
  const money = 10_000_000_000;
  assert.equal(amountInUsd(money, 25000), 400000);
  assert.equal(money, 10_000_000_000);
});
test('currency format contains local VND and USD symbols', () => {
  assert.match(formatVnd(1000000), /1\.000\.000 ₫/);
  assert.match(formatUsdFromVnd(1000000, 25000), /\$40\.00/);
});
test('USD display and VND display are intentionally different views', () => {
  assert.equal(formatGameMoney(25739,'VND',25739), formatVnd(25739));
  assert.equal(formatGameMoney(25739,'USD',25739), '$1.00');
});
test('invalid rates are rejected, including zero, NaN, Infinity and strings', () => {
  for (const rate of [0,-1,NaN,Infinity,'26000',null,100001,999]) assert.equal(validUsdVndRate(rate),false);
  assert.equal(validUsdVndRate(REFERENCE_USD_VND),true);
});
test('conversion failures return a neutral placeholder', () => {
  assert.equal(formatUsdFromVnd(20000,0),'—');
  assert.equal(formatVnd(NaN),'—');
});
test('negative balance differences can be represented', () => {
  assert.match(formatUsdFromVnd(-25739,25739), /-\$1\.00/);
});
test('fx service fetches and caches valid daily response', async () => {
  let calls = 0; let timestamp = 2_000_000_000_000;
  const fx = makeFxRateService({fetchImpl: async ()=>{calls++;return response(OK_BODY);},now:()=>timestamp});
  assert.equal((await fx()).usdVnd,25800.5);
  assert.equal((await fx()).usdVnd,25800.5);
  assert.equal(calls,1);
  timestamp += 24*60*60*1000+1;
  await fx(); assert.equal(calls,2);
});
test('fx service uses dated fallback on network error, limits retries', async () => {
  let calls=0;let timestamp=2_000_000_000_000;
  const fx=makeFxRateService({fetchImpl:async()=>{calls++;throw new Error('offline');},now:()=>timestamp});
  const rate=await fx();
  assert.equal(rate.source,'reference');assert.equal(rate.isFallback,true);assert.ok(Date.parse(rate.asOf));
  await fx();assert.equal(calls,1);
  timestamp += 60*60*1000+1;await fx();assert.equal(calls,2);
});
test('fx service preserves last good quote when provider fails next day', async () => {
  let calls=0;let timestamp=2_000_000_000_000;
  const fx=makeFxRateService({now:()=>timestamp,fetchImpl:async()=>{calls++;return calls===1?response(OK_BODY):Promise.reject(new Error('down'));}});
  assert.equal((await fx()).usdVnd,25800.5);
  timestamp+=24*60*60*1000+1;
  const saved=await fx();assert.equal(saved.usdVnd,25800.5);assert.equal(saved.isFallback,true);
});
test('fx service rejects provider invalid rates', async () => {
  const fx=makeFxRateService({fetchImpl:async()=>response({...OK_BODY,rates:{VND:0}})});
  assert.equal((await fx()).source,'reference');
});
test('fx service coalesces concurrent calls', async()=>{
  let calls=0;
  const fx=makeFxRateService({fetchImpl:async()=>{calls++;await new Promise(r=>setTimeout(r,10));return response(OK_BODY);}});
  const results=await Promise.all([fx(),fx(),fx()]);
  assert.equal(calls,1); assert.deepEqual(results.map(r=>r.usdVnd),[25800.5,25800.5,25800.5]);
});
test('web code exposes preference and dual view; server does not mutate balances',()=>{
  const app=readFileSync(new URL('../apps/web/src/App.tsx',import.meta.url),'utf8');
  const index=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
  assert.match(app, /setDisplayCurrency/);
  assert.match(app, /exactVnd\(company\.treasury_vnd\)/);
  assert.match(index, /get\('\/api\/fx\/usd-vnd'/);
  assert.doesNotMatch(index.slice(index.indexOf("app.get('/api/fx/usd-vnd'"),index.indexOf("app.get('/api/ceo/financial-audit'")),/update\(|insert\(|\.rpc\(/);
});

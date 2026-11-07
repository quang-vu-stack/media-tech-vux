import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateFinancialAudit } from '../apps/api/src/financial-integrity.js';
const file = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const sample = {
  status: 'matched', treasury_vnd: '9750000000', ledger_total_vnd: '9750000000',
  difference_vnd: '0', ledger_entries: 3, checked_at: new Date().toISOString(),
};

test('matched financial audit is accepted without modifying balances', () => {
  const result = validateFinancialAudit(sample);
  assert.equal(result.status, 'matched');
  assert.equal(result.treasury_vnd, '9750000000');
  assert.equal(result.difference_vnd, '0');
});
test('mismatched ledger produces warning status with exact signed difference', () => {
  const data = validateFinancialAudit({ ...sample, status:'mismatch', ledger_total_vnd:'9749000000', difference_vnd:'1000000' });
  assert.equal(data.status, 'mismatch');
  assert.equal(data.difference_vnd, '1000000');
});
test('exact integers above JS safe integer limit stay lossless as decimal strings', () => {
  const big='9007199254740993';
  assert.equal(validateFinancialAudit({ ...sample, treasury_vnd:big, ledger_total_vnd:big }).treasury_vnd,big);
});
test('reject inconsistent arithmetic',()=>assert.throws(()=>validateFinancialAudit({...sample,difference_vnd:'1'}),/Inconsistent/));
test('reject mismatched labels',()=>assert.throws(()=>validateFinancialAudit({...sample,status:'mismatch'}),/status/));
test('reject malformed or fractional integers',()=>{
  for(const bad of ['NaN','1.01','1e5',100,null,undefined])
    assert.throws(()=>validateFinancialAudit({...sample,ledger_total_vnd:bad}),/Invalid/);
});
test('reject negative or fractional ledger entries / invalid count',()=>{
  for(const value of [-1,1.2,'23'])
    assert.throws(()=>validateFinancialAudit({...sample,ledger_entries:value}),/Invalid/);
});
test('SQL audit is one read-only query and checks ownership',()=>{
  const sql=file('supabase/upgrade_financial_integrity_v15.sql');
  assert(sql.includes('c.owner_id = p_user_id'));
  assert(/STABLE\s+SECURITY DEFINER/i.test(sql));
  assert(!/\b(?:DELETE|UPDATE|INSERT)\s+(?:INTO\s+)?public\.companies/i.test(sql));
  assert(sql.includes('COALESCE(SUM(l.amount_vnd::numeric), 0)'));
  assert(sql.includes('REVOKE ALL ON FUNCTION'));
  assert(sql.includes('TO service_role'));
});
test('financial audit endpoint is authenticated and read-only',()=>{
  const src=file('apps/api/src/index.js');
  assert(src.indexOf("app.use('/api', auth)") < src.indexOf("app.get('/api/ceo/financial-audit'"));
  const section=src.split("app.get('/api/ceo/financial-audit'")[1].split("app.get('/api/state'")[0];
  assert(section.includes('ownedCompany(req.user.id)'));
  assert(section.includes("db.rpc('audit_company_finances_v15'"));
  assert(section.includes("'Cache-Control', 'no-store, private'"));
  assert(!section.includes('db.from(\'companies\').update'));
});
test('UI shows audit and mismatch warning, no automatic adjustment button',()=>{
  const ui=file('apps/web/src/components/FinancialIntegrity.tsx');
  const app=file('apps/web/src/App.tsx');
  assert(ui.includes("'/ceo/financial-audit'"));
  assert(ui.includes('Phát hiện số dư không khớp'));
  assert(app.includes('<FinancialIntegrity token={token!}/>'));
  assert(!ui.includes('repair-balance'));
});

test('detect complete ledger deletion as mismatch, not invalid payload',()=>{
  const result=validateFinancialAudit({...sample,ledger_entries:0,ledger_total_vnd:'0',difference_vnd:'9750000000',status:'mismatch'});
  assert.equal(result.ledger_entries,0);
});

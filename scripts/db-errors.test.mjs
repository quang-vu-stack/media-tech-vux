import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDatabaseError, throwOnDatabaseError, toPublicHttpError } from '../apps/api/src/db-errors.js';

test('does not classify success as an error', () => assert.equal(classifyDatabaseError(null),null));
test('duplicate record results in safe conflict', () => {
  assert.deepEqual(classifyDatabaseError({code:'23505',message:'sql passwords'}), {
    status:409,code:'DUPLICATE_RECORD',message:'Dữ liệu đã tồn tại hoặc thao tác đã được thực hiện.',
  });
});
test('business rule errors do not expose private SQL', () => {
  for(const code of ['23503','23514','22P02','P0001']) {
    const r=classifyDatabaseError({code,message:'SQL hidden internal tokens'});
    assert.equal(r.status,409);
    assert(!JSON.stringify(r).includes('SQL hidden'));
  }
});
test('forbidden and disconnected database have distinct status', () => {
  assert.equal(classifyDatabaseError({code:'42501'}).status,403);
  assert.equal(classifyDatabaseError({code:'08006'}).status,503);
});
test('missing SQL migration has actionable safe response', () => {
  assert.equal(classifyDatabaseError({code:'PGRST202'}).code,'MIGRATION_REQUIRED');
  assert.equal(classifyDatabaseError({code:'42P01'}).status,503);
});
test('unknown database failure does not leak SQL or internal stack', () => {
  const r=classifyDatabaseError({code:'XX001',message:'secret=abc'}) ;
  assert.equal(r.status,500); assert(!JSON.stringify(r).includes('secret'));
});
test('throwOnDatabaseError throws sanitized message', () => {
  const original=console.error;console.error=()=>{};
  try {
    assert.throws(()=>throwOnDatabaseError({code:'XX001',message:'private-db-host'},'Thao tác thất bại'),e=> {
      assert.equal(e.status,500);assert(!e.message.includes('private-db-host'));return true;
    });
  } finally { console.error=original; }
});
test('public error handler returns only allowlisted response', () => {
  assert.deepEqual(toPublicHttpError({status:409,code:'DUPLICATE_RECORD',message:'safe'}),{status:409,body:{error:'safe',code:'DUPLICATE_RECORD'}});
  assert.equal(toPublicHttpError(new Error('internal secrets')).body.code,'INTERNAL_ERROR');
});
test('status without public code does not pass message through', () => {
  const r=toPublicHttpError({status:400,message:'select * from secret'});
  assert.equal(r.status,500);
  assert(!JSON.stringify(r).includes('secret'));
});
test('malformed JSON has stable public code', () => {
  const err=new SyntaxError('body includes secret SQL');err.body='x';
  assert.equal(toPublicHttpError(err).body.code,'INVALID_JSON');
});
test('known AI failures pass status and useful message', () => {
  assert.equal(toPublicHttpError({status:503,code:'AI_NOT_CONFIGURED',message:'Chưa cấu hình AI'}).status,503);
  assert.equal(toPublicHttpError({status:502,code:'AI_GENERATION_FAILED',message:'AI chưa tạo được mã'}).body.code,'AI_GENERATION_FAILED');
});
test('unknown codes are not passed through to client', () => {
  const output=toPublicHttpError({status:401,code:'SECRET_DB_FAILURE',message:'key=abc'});
  assert.equal(output.status,500);assert(!JSON.stringify(output).includes('abc'));
});

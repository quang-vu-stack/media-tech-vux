import test from 'node:test';
import assert from 'node:assert/strict';
import { safeApiBase,safeApiPath } from '../apps/web/src/api-origin.js';

test('default API origin stays relative and same-origin',()=>{
  assert.equal(safeApiBase(undefined),' /api'.trim());
  assert.equal(safeApiBase('/api'),' /api'.trim());
  assert.equal(safeApiBase('/api/'),'/api');
});
test('different-domain API URL cannot receive bearer token',()=>{
  assert.equal(safeApiBase('https://attacker.example/api','https://game.example'),'/api');
  assert.equal(safeApiBase('http://attacker.example/api','https://game.example'),'/api');
});
test('valid same-origin absolute API is canonicalized to /api',()=>{
  assert.equal(safeApiBase('https://game.example/api','https://game.example'),'/api');
});
test('authentication, query and credentials URL injections are refused',()=>{
  for(const base of ['https://game.example/api?x=1','https://user:secret@game.example/api','https://game.example/admin','//attacker.example/api']){
    assert.equal(safeApiBase(base,'https://game.example'),'/api');
  }
});
test('regular game API routes with encoded UUID and query accepted',()=>{
  assert.equal(safeApiPath('/ai/history?employeeId=abc-123'),'/ai/history?employeeId=abc-123');
  assert.equal(safeApiPath('/meetings/123/actions'),'/meetings/123/actions');
});
test('unsafe paths are rejected before any fetch call',()=>{
  for (const path of ['https://attacker.example','//attacker.example','/../secret','/foo/../../bar','/bad\\route','']) {
    assert.throws(()=>safeApiPath(path),/không hợp lệ/);
  }
});

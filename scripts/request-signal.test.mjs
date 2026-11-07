import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRequestSignal } from '../apps/web/src/request-signal.js';

test('request signal follows component cancellation',()=>{
  const controller=new AbortController();
  const signal=makeRequestSignal(controller.signal);
  assert.equal(signal.aborted,false);
  controller.abort();
  assert.equal(signal.aborted,true);
});
test('request signal accepts missing cancellation signal',()=>{
  const signal=makeRequestSignal(undefined,20_000);
  assert.equal(signal.aborted,false);
});
test('request signal sanitizes invalid timeout rather than throwing',()=>{
  assert.doesNotThrow(()=>makeRequestSignal(undefined,NaN));
  assert.doesNotThrow(()=>makeRequestSignal(undefined,Infinity));
  assert.doesNotThrow(()=>makeRequestSignal(undefined,-50));
});
test('already aborted component prevents starting late requests',()=>{
  const controller=new AbortController();controller.abort();
  const signal=makeRequestSignal(controller.signal);
  assert.equal(signal.aborted,true);
});

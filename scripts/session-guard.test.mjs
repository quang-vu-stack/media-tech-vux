import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionRequestGuard } from '../apps/web/src/session-guard.js';

test('a previous CEO session cannot commit data after account switch', () => {
  const gate=createSessionRequestGuard();
  gate.setOwner('ceo-alpha');
  const old=gate.begin('ceo-alpha');
  gate.setOwner('ceo-beta');
  assert.equal(gate.isCurrent(old),false);
  assert.equal(gate.begin('ceo-alpha'),null);
  const current=gate.begin('ceo-beta');
  assert.equal(gate.isCurrent(current),true);
});

test('a delayed earlier request cannot overwrite newer company state', () => {
  const gate=createSessionRequestGuard();
  gate.setOwner('ceo-one');
  const slow=gate.begin('ceo-one');
  const fast=gate.begin('ceo-one');
  assert.equal(gate.isCurrent(slow),false);
  assert.equal(gate.isCurrent(fast),true);
});

test('logout invalidates all outstanding protected responses', () => {
  const gate=createSessionRequestGuard();
  gate.setOwner('ceo-one');
  const pending=gate.begin('ceo-one');
  gate.setOwner(null);
  assert.equal(gate.isCurrent(pending),false);
  assert.equal(gate.begin(null),null);
});

test('cancellation invalidates a pending response without changing user', () => {
  const gate=createSessionRequestGuard();
  gate.setOwner('ceo-one');
  const pending=gate.begin('ceo-one');
  gate.cancel();
  assert.equal(gate.isCurrent(pending),false);
  const fresh=gate.begin('ceo-one');
  assert.equal(gate.isCurrent(fresh),true);
});

test('request tickets do not expose mutable state', () => {
  const gate=createSessionRequestGuard();
  gate.setOwner('ceo-one');
  const pending=gate.begin('ceo-one');
  assert(Object.isFrozen(pending));
  assert.equal(gate.isCurrent({...pending,sequence:pending.sequence+1}),false);
});

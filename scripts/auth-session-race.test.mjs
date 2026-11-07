import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthSessionResolver } from '../apps/web/src/auth-session-race.js';

test('latest auth event wins against a late getSession result', () => {
  const seen=[];
  const resolver=createAuthSessionResolver(session=>seen.push(session));
  resolver.onEvent({user:'new-ceo'});
  resolver.onInitial({user:'former-ceo'});
  assert.deepEqual(seen,[{user:'new-ceo'}]);
});
test('initial session is allowed when no auth event occurred',()=>{
  const seen=[];const resolver=createAuthSessionResolver(s=>seen.push(s));
  resolver.onInitial({user:'ceo'});
  assert.deepEqual(seen,[{user:'ceo'}]);
});
test('SIGNED_OUT supersedes delayed getSession and keeps user logged out',()=>{
  const seen=[];const resolver=createAuthSessionResolver(s=>seen.push(s));
  resolver.onEvent({user:'ceo'});resolver.onEvent(null);resolver.onInitial({user:'ceo'});
  assert.equal(seen.at(-1),null);assert.equal(seen.length,2);
});
test('unmount invalidates both auth callbacks',()=>{
  const seen=[];const resolver=createAuthSessionResolver(s=>seen.push(s));
  resolver.dispose();resolver.onEvent({user:'ceo'});resolver.onInitial(null);
  assert.equal(seen.length,0);
});
test('non-function commit is rejected',()=>{
  assert.throws(()=>createAuthSessionResolver(null),TypeError);
});

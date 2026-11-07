import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectBuildPreflight, validateApiEndpoint, validateClientRoutingFromSources } from './build-preflight-rules.mjs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('same-origin API /api accepted with trailing slash',()=>{
  assert.equal(validateApiEndpoint('/api').ok,true);
  assert.equal(validateApiEndpoint('/api/').normalized,'/api');
});
test('mixed content and malformed URLs rejected',()=>{
  assert.equal(validateApiEndpoint('http://api.example.com/api','https://game.example.com').code,'MIXED_CONTENT');
  assert.equal(validateApiEndpoint('https://api.example.com/admin','https://game.example.com').ok,false);
  assert.equal(validateApiEndpoint('https://user:pass@game.example.com/api','https://game.example.com').ok,false);
});
test('cross-origin URL requires explicit CORS review, never assumed safe',()=>{
  assert.equal(validateApiEndpoint('https://api.example.com/api','https://game.example.com').code,'CROSS_ORIGIN_REQUIRES_CORS');
});
test('frontend and Vite proxy share a relative /api route',()=>{
  const result=validateClientRoutingFromSources({client:read('apps/web/src/lib.ts'),vite:read('apps/web/vite.config.ts'),example:read('apps/web/.env.example')});
  assert.equal(result.ok,true,result.issues.join('; '));
});
test('build checker reports unavailable packages instead of false success',()=>{
  const result=collectBuildPreflight({root:new URL('../',import.meta.url).pathname,resolvePackage:()=>{throw Error('missing')},nodeVersion:'22.16.0'});
  assert.equal(result.ok,false);
  assert(result.missing.includes('react'));
});
test('build checker warns on outdated Node versions',()=>{
  const result=collectBuildPreflight({root:new URL('../',import.meta.url).pathname,resolvePackage:()=>'/ok',nodeVersion:'20.18.0'});
  assert(result.issues.some(issue=>issue.includes('Node >=22.12.0')));
});
test('build checker never includes environment values in output',()=>{
  const result=collectBuildPreflight({root:new URL('../',import.meta.url).pathname,resolvePackage:()=>'/ok',apiUrl:'https://api.example.com/api'});
  assert(!JSON.stringify(result).includes('SUPABASE_SERVICE_ROLE_KEY'));
});

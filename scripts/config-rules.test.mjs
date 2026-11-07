import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEnv,checkConfiguration} from './config-rules.mjs';
const url='https://vus-test.supabase.co';
const web=()=>({VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:'publishable-test-key'});
const api=()=>({SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:'secret-test-key',WEB_ORIGIN:'http://localhost:5173',ENABLE_BACKGROUND_WORKER:'false'});
test('parses quoted, export and CRLF variables without exposing comments',()=> {
 assert.deepEqual(parseEnv('export PORT=4000\r\nKEY="value with spaces"\r\n# IGNORE=1\r\n'),{PORT:'4000',KEY:'value with spaces'});
});
test('valid local settings pass validation',()=>assert.equal(checkConfiguration(web(),api()).ok,true));
test('placeholder values fail validation',()=>{
 const r=checkConfiguration({VITE_SUPABASE_URL:'https://YOUR_PROJECT.supabase.co'},{});
 assert.equal(r.ok,false);assert(r.failures.length>=3);
});
test('two separate Supabase project URLs cannot be mixed',()=>{
 const r=checkConfiguration(web(),{...api(),SUPABASE_URL:'https://other.supabase.co'});
 assert(r.failures.some(s=>s.includes('hai project')));
});
test('front-end cannot embed service role or AI secrets',()=>{
 const r=checkConfiguration({...web(),VITE_GEMINI_API_KEY:'some-key',SUPABASE_SERVICE_ROLE_KEY:'bad'},api());
 assert.equal(r.ok,false);
 assert(r.failures.some(s=>s.includes('VITE_GEMINI_API_KEY')));
});
test('config diagnostics never print secrets',()=>{
 const r=checkConfiguration({...web(),VITE_OPENAI_API_KEY:'my-ultra-sensitive-secret'},api());
 assert(!JSON.stringify(r).includes('my-ultra-sensitive-secret'));
});
test('bad protocol is rejected for Supabase',()=>{
 assert(checkConfiguration({...web(),VITE_SUPABASE_URL:'http://vus-test.supabase.co'},api()).failures.some(s=>s.includes('HTTPS')));
});
test('multiple worker instances warning is explicit',()=>{
 assert(checkConfiguration(web(),{...api(),ENABLE_BACKGROUND_WORKER:'true'}).warnings.some(s=>s.includes('API instance')));
});

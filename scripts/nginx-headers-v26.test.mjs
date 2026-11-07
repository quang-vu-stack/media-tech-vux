import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config=readFileSync(new URL('../deploy/nginx.conf',import.meta.url),'utf8');
function locationBlock(path){
  const prefix=`  location ${path} {`;
  const start=config.indexOf(prefix);
  assert(start>=0,`missing location ${path}`);
  const remainder=config.slice(start+prefix.length);
  const end=remainder.indexOf('\n  }');
  assert(end>=0,`missing closing location for ${path}`);
  return remainder.slice(0,end);
}

test('static asset location does not lose Nginx inherited security headers',()=>{
  const block=locationBlock('/assets/');
  assert.match(block,/add_header X-Content-Type-Options "nosniff" always/);
  assert.match(block,/add_header Referrer-Policy/);
  assert.match(block,/add_header X-Frame-Options/);
  assert.match(block,/try_files \$uri =404/);
});

test('HTML entry point is not cached indefinitely and is protected by nosniff',()=>{
  const block=locationBlock('/');
  assert.match(block,/add_header Cache-Control "no-cache" always/);
  assert.match(block,/add_header X-Content-Type-Options "nosniff" always/);
});

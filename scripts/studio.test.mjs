import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSoftwareArtifact, demoSoftwareArtifact, softwarePrompt } from '../apps/api/src/software-studio.js';
const sample=demoSoftwareArtifact('Create a sample task planner application for the CEO');
test('demo source has all 3 required files',()=>{
 assert.deepEqual(Object.keys(sample.files),['index.html','style.css','app.js']);
 assert.match(sample.files['app.js'],/addEventListener/);
});
test('reject non-whitelisted source file',()=>{
 assert.throws(()=>validateSoftwareArtifact({...sample,files:{...sample.files,'server.js':'node server'}}));
});
test('reject overlong source',()=>{
 assert.throws(()=>validateSoftwareArtifact({...sample,files:{...sample.files,'app.js':'a'.repeat(16001)}}));
});
test('reject invalid malformed JSON',()=>assert.throws(()=>validateSoftwareArtifact('not json')));
test('AI system instruction mandates no deployment and no network',()=>{
 const {instructions}=softwarePrompt('Create a task planner',{full_name:'Quân',role:'Engineer'});
 assert.match(instructions,/KHÔNG sử dụng CDN/);
 assert.match(instructions,/không khẳng định đã triển khai/);
});
test('project endpoints enforce auth and owner boundaries',()=>{
 const src=readFileSync(new URL('../apps/api/src/index.js',import.meta.url),'utf8');
 assert.match(src,/app\.use\('\/api', auth\)/);
 assert.match(src,/\.eq\('company_id',company\.id\)\.eq\('id',input\.data\.employeeId\)/);
 assert.match(src,/studio_review_v8/);
});
test('preview sandbox never grants same origin',()=>{
 const component=readFileSync(new URL('../apps/web/src/components/SoftwareStudio.tsx',import.meta.url),'utf8');
 assert.match(component,/sandbox="allow-scripts"/);
 assert.doesNotMatch(component, /sandbox="[^"]*allow-same-origin/);
 assert.match(component,/connect-src 'none'/);
});
test('database prohibits direct user modification',()=>{
 const sql=readFileSync(new URL('../supabase/upgrade_software_studio_v7.sql',import.meta.url),'utf8');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke insert,update,delete/);
});

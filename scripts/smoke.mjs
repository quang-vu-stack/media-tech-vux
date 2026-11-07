// Run with: node scripts/smoke.mjs. No external dependencies required.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(resolve(root, rel), 'utf8');
const required = [
  'package.json','apps/web/package.json','apps/web/src/App.tsx',
  'apps/web/src/components/OfficeScene.tsx','apps/web/src/lib.ts','apps/web/src/styles.css',
  'apps/web/.env.example','apps/api/src/index.js','apps/api/.env.example',
  'supabase/schema.sql','README.md','HUONG_DAN_WINDOWS.md',
];
for (const item of required) assert(existsSync(resolve(root, item)), `Missing: ${item}`);
const schema = read('supabase/schema.sql');
for (const name of ['bootstrap_company','create_employee_task','advance_employee_task','enable row level security','for update of t','service_role']) {
  assert(schema.toLowerCase().includes(name.toLowerCase()), `Schema check: ${name}`);
}
const frontend = read('apps/web/src/App.tsx') + read('apps/web/src/lib.ts');
assert(!frontend.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Secret env var in frontend');
assert(!frontend.includes('GEMINI_API_KEY'), 'Gemini secret in frontend');
assert(!frontend.includes('OPENAI_API_KEY'), 'OpenAI secret in frontend');
assert(read('apps/api/src/index.js').includes('db.auth.getUser(jwt)'), 'Missing JWT verification');
console.log(`PASS: ${required.length} files + database RPCs + secret boundary + JWT verification`);
console.log('NOTE: Structural smoke test only, not a dependency build or Supabase integration test.');

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from './config-rules.mjs';
import { validateDeployConfig } from './deploy-rules.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, '.env.deploy');
if (!existsSync(file)) {
  console.error('FAIL: .env.deploy missing. Copy .env.deploy.example and fill required values.');
  process.exitCode = 1;
} else {
  const result = validateDeployConfig(parseEnv(readFileSync(file,'utf8')));
  console.log('MEDIA TECH VUS v14 — deployment prerequisites (keys are not printed)');
  for (const e of result.errors) console.log('ERROR:',e);
  for (const w of result.warnings) console.log('WARN:',w);
  console.log(result.ok ? 'PASS: deployment settings appear valid (no live connection was tested).' : 'FAIL: correct errors before deploying.');
  if (!result.ok) process.exitCode = 1;
}

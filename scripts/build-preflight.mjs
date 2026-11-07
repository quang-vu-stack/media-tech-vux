import { collectBuildPreflight, validateClientRoutingFromSources } from './build-preflight-rules.mjs';
import { readFileSync } from 'node:fs';

const root = new URL('../',import.meta.url);
const read = file => readFileSync(new URL(file,root),'utf8');
const result = collectBuildPreflight({root:process.cwd(), apiUrl:process.env.VITE_API_URL || '/api'});
const routing = validateClientRoutingFromSources({
  client:read('apps/web/src/lib.ts'),vite:read('apps/web/vite.config.ts'),example:read('apps/web/.env.example')
});
for(const message of result.issues.concat(routing.issues))console.error('BLOCK:',message);
for(const message of result.warnings)console.warn('NOTE:',message);
if(result.ok && routing.ok) console.log('PASS: Build dependency/config preflight. Ready to attempt npm run build.');
else {
  console.error('STOP: Preflight cannot certify a build. This is not an actual frontend build result.');
  process.exitCode=2;
}

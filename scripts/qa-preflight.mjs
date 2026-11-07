import { validateIntegrationQaEnv } from './qa-preflight-rules.mjs';

const result = validateIntegrationQaEnv(process.env);
if (result.ok) {
  console.log(`PASS QA environment guard: expected Supabase project ${result.projectRef}, API host ${result.apiHost}.`);
  console.log('NOTE: No network was contacted. Confirm this is not a production project before running test:integration.');
} else {
  for (const message of result.errors) console.error('BLOCK:', message);
  for (const message of result.warnings) console.error('NOTE:', message);
  console.error('STOP: Live integration testing was not permitted. No account or company was created.');
  process.exitCode = 2;
}

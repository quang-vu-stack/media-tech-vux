import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const script = resolve(dirname(fileURLToPath(import.meta.url)), 'http-smoke.mjs');
async function runScenario(ready) {
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/health') return res.end(JSON.stringify({ok:true}));
    if (req.url === '/api/ready') {
      res.statusCode = ready ? 200 : 503;
      return res.end(JSON.stringify({ok:ready,checks:[{component:'companies',ok:ready}]}));
    }
    res.statusCode = 401;
    res.end(JSON.stringify({error:'Unauthorized'}));
  });
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const port = server.address().port;
  try {
    const child = spawn(process.execPath, [script], {
      env: {...process.env, SMOKE_API_BASE:`http://127.0.0.1:${port}/api`, SMOKE_JWT:''},
      stdio:['ignore','pipe','pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk);
    child.stderr.on('data', chunk => stderr += chunk);
    const code = await new Promise((resolveExit,reject) => {
      child.on('error', reject);
      child.on('exit', resolveExit);
    });
    return {code,stdout,stderr};
  } finally { await new Promise(resolveClose => server.close(resolveClose)); }
}
test('HTTP smoke checks four critical API routes and exits 0 on success', async () => {
  const result = await runScenario(true);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /HTTP SMOKE PASS/);
});
test('HTTP smoke fails if database is not ready', async () => {
  const result = await runScenario(false);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /HTTP SMOKE FAIL/);
});

/**
 * Real HTTP smoke for an already-running v11 API.
 * Zero packages needed; run with `npm run smoke:http`.
 * Optional SMOKE_JWT checks a protected API using an existing user token.
 */
import assert from 'node:assert/strict';
const base = (process.env.SMOKE_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const fetchJson = async (path, options = {}) => {
  const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(6000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw Error(`${path} did not return JSON (HTTP ${response.status})`); }
  return { status: response.status, body };
};
try {
  const live = await fetchJson('/health');
  assert.equal(live.status, 200, 'API process not healthy');
  assert.equal(live.body.ok, true);
  console.log('PASS /health (liveness)');

  const ready = await fetchJson('/ready');
  assert.equal(ready.status, 200, `Database not ready: ${JSON.stringify(ready.body.checks)}`);
  assert.equal(ready.body.ok, true);
  console.log('PASS /ready (Supabase + migrations)');

  const unauthorized = await fetchJson('/state');
  assert.equal(unauthorized.status, 401, 'Protected state endpoint must reject anonymous requests');
  console.log('PASS /state rejects anonymous requests');

  const studioAnon = await fetchJson('/studio/projects');
  assert.equal(studioAnon.status, 401, 'Protected studio endpoint must reject anonymous requests');
  console.log('PASS /studio/projects rejects anonymous requests');

  if (process.env.SMOKE_JWT) {
    const authorized = await fetchJson('/state', { headers: { Authorization: `Bearer ${process.env.SMOKE_JWT}` } });
    assert.equal(authorized.status, 200, 'Authenticated state fetch failed');
    assert('company' in authorized.body);
    console.log('PASS authenticated /state');
  } else {
    console.log('SKIP authenticated /state (set SMOKE_JWT to exercise this)');
  }
  console.log('HTTP SMOKE PASS');
} catch (error) {
  console.error('HTTP SMOKE FAIL:', error.message);
  process.exitCode = 1;
}

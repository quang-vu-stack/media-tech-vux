import { checkDeployedSite, checkDeployedAssets } from './deploy-smoke-core.mjs';
const target = process.env.VUS_PUBLIC_URL || 'http://localhost:8080/';
const result = await checkDeployedSite(target);
for (const c of result.checks) console.log(c.ok ? 'PASS' : 'FAIL', c.name, c.code);
const assets = await checkDeployedAssets(target);
for (const c of assets.checks) console.log(c.ok ? 'PASS' : 'FAIL', c.name, c.code);
const ok = result.ok && assets.ok;
console.log(ok ? 'ALL LIVE SMOKE CHECKS PASSED' : 'LIVE SMOKE FAILED: inspect Docker logs, /api/ready and missing /assets bundles.');
if (!ok) process.exitCode = 1;

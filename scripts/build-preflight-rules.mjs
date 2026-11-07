/** No network requests. Detect missing dependencies and unsafe browser API routing. */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const requireFromRoot = createRequire(new URL('../package.json', import.meta.url));
export const BUILD_PACKAGES = ['react','react-dom','vite','typescript','@react-three/fiber','@react-three/drei','@supabase/supabase-js'];

export function validateApiEndpoint(value = '/api', browserOrigin = 'https://game.example.com') {
  const raw = String(value ?? '').trim();
  if (raw === '/api' || raw === '/api/') return { ok: true, normalized: '/api', sameOrigin: true };
  try {
    const endpoint = new URL(raw);
    const browser = new URL(browserOrigin);
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      endpoint.pathname.replace(/\/+$/, '') !== '/api') return { ok: false, code: 'INVALID_API_URL' };
    if (browser.protocol === 'https:' && endpoint.protocol === 'http:') return { ok: false, code: 'MIXED_CONTENT' };
    if (endpoint.origin !== browser.origin) return { ok: false, code: 'CROSS_ORIGIN_REQUIRES_CORS' };
    return { ok: true, normalized: endpoint.origin + '/api', sameOrigin: true };
  } catch { return { ok: false, code: 'INVALID_API_URL' }; }
}

export function collectBuildPreflight({ root = process.cwd(), resolvePackage = (pkg) => requireFromRoot.resolve(pkg), nodeVersion = process.versions.node, apiUrl = '/api' } = {}) {
  const issues = [], warnings = [];
  const major = Number.parseInt(nodeVersion.split('.')[0], 10);
  const minor = Number.parseInt(nodeVersion.split('.')[1], 10);
  if (!Number.isFinite(major) || major < 22 || (major === 22 && minor < 12)) issues.push('Node >=22.12.0 required.');
  const missing = [];
  for (const name of BUILD_PACKAGES) {
    try { resolvePackage(name); } catch { missing.push(name); }
  }
  if (missing.length) issues.push('Missing npm packages: ' + missing.join(', ') + '. Run npm install with registry access.');
  const apiCheck = validateApiEndpoint(apiUrl);
  if (!apiCheck.ok && apiCheck.code === 'CROSS_ORIGIN_REQUIRES_CORS') warnings.push('API uses a different origin: configure HTTPS and CORS for the deployed frontend. Prefer /api.');
  else if (!apiCheck.ok) issues.push('Unsafe VITE_API_URL (' + apiCheck.code + '): prefer /api.');
  for (const file of ['package.json','apps/web/src/App.tsx','apps/web/vite.config.ts','apps/api/src/index.js']) {
    if (!existsSync(resolve(root, file))) issues.push('Missing project file: ' + file);
  }
  // Version lock absent => reproducibility warning, not a fabricated build failure.
  if (!existsSync(resolve(root,'package-lock.json'))) warnings.push('No package-lock.json present. Generate and commit one in an npm-connected environment; then use npm ci.');
  return { ok: issues.length === 0, missing, issues, warnings, nodeVersion };
}

export function validateClientRoutingFromSources({ client, vite, example }) {
  const issues = [];
  // v26 uses a fail-closed same-origin resolver rather than a raw env URL.
  if (!(client.includes("|| '/api'") || client.includes('safeApiBase(import.meta.env.VITE_API_URL'))) issues.push('Frontend default API path is not same-origin /api.');
  if (!vite.includes("'/api'") || !vite.includes('127.0.0.1:4000')) issues.push('Vite dev API proxy is missing.');
  if (!/^VITE_API_URL=\/api\/?$/m.test(example)) issues.push('Frontend env example must use /api.');
  return { ok: issues.length===0, issues };
}

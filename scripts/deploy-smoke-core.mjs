/** Active HTTP smoke: tests proxy, liveness, readiness, authentication boundary. */
export async function checkDeployedSite(baseUrl, fetcher = fetch) {
  const base = new URL(baseUrl);
  if (!['http:','https:'].includes(base.protocol)) throw new Error('Invalid scheme');
  const checks = [];
  async function check(path, expected, parse, label) {
    try {
      const response = await fetcher(new URL(path, base), {
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'application/json, text/html' },
      });
      if (response.status !== expected) {
        checks.push({ name: label, ok: false, code: `STATUS_${response.status}` }); return;
      }
      const value = await parse(response);
      checks.push({ name: label, ok: value, code: value ? 'OK' : 'CONTENT_INVALID' });
    } catch { checks.push({ name: label, ok: false, code: 'NETWORK_OR_TIMEOUT' }); }
  }
  await check('/', 200, async r => (await r.text()).includes('id="root"'), 'frontend');
  await check('/api/health', 200, async r => (await r.json()).ok === true, 'api_liveness');
  await check('/api/ready', 200, async r => (await r.json()).ok === true, 'database_readiness');
  await check('/api/state', 401, async r => typeof (await r.json()).error === 'string', 'auth_boundary');
  return { ok: checks.every(x => x.ok), checks };
}

/**
 * Verify the *published* frontend loads its hashed JS/CSS assets. This catches a
 * common production outage where Nginx serves index.html for missing bundle URLs.
 * Does not execute JavaScript, use cookies or contact external origins.
 */
export async function checkDeployedAssets(baseUrl, fetcher = fetch) {
  const base = new URL(baseUrl);
  const loopback = ['localhost','127.0.0.1','[::1]','::1'].includes(base.hostname);
  if (!['http:','https:'].includes(base.protocol) || base.username || base.password ||
      (!loopback && base.protocol !== 'https:')) throw Error('Only HTTPS public targets or local HTTP targets are allowed.');
  const checks = [];
  let html = '';
  try {
    const res = await fetcher(new URL('/',base),{redirect:'manual',signal:AbortSignal.timeout(10_000)});
    if (res.status !== 200) throw Error('Index page did not respond HTTP 200');
    html = await res.text();
  } catch { return {ok:false,checks:[{name:'index',ok:false,code:'NETWORK_OR_HTTP'}]}; }
  const candidates = new Set();
  // Only same-origin, hashed Vite build assets. Ignore external references.
  for (const match of html.matchAll(/(?:src|href)=["'](\/assets\/[^"'<>\s]+\.(?:js|css))["']/g)) candidates.add(match[1]);
  if (![...candidates].some(path=>path.endsWith('.js'))) {
    return {ok:false,checks:[{name:'bundle_manifest',ok:false,code:'NO_BUILD_JS_ASSET'}]};
  }
  for (const path of [...candidates].slice(0,12)) {
    const url = new URL(path,base);
    if(url.origin !== base.origin || !/^\/assets\/[\w.\/-]+\.(js|css)$/.test(url.pathname) || url.pathname.includes('..')) {
      checks.push({name:'asset',ok:false,code:'UNSAFE_ASSET_PATH'}); continue;
    }
    try {
      const res = await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(10_000)});
      const content = await res.text();
      const notHtml = !/^\s*<(?:!doctype|html)/i.test(content);
      const headers = res.headers;
      const mime = headers && typeof headers.get === 'function'
        ? String(headers.get('content-type') || '').toLowerCase() : '';
      const nosniff = headers && typeof headers.get === 'function'
        ? String(headers.get('x-content-type-options') || '').toLowerCase() : '';
      const correctMime = path.endsWith('.js')
        ? /(?:javascript|ecmascript)/.test(mime) : mime.startsWith('text/css');
      const valid = res.status===200 && notHtml && content.trim().length>0 && correctMime && nosniff==='nosniff';
      const code = !notHtml || res.status!==200 ? 'MISSING_OR_SPA_FALLBACK'
        : !correctMime ? 'INVALID_ASSET_MIME' : nosniff!=='nosniff' ? 'NO_NOSNIFF' : 'OK';
      checks.push({name:url.pathname,ok:valid,code});
    } catch { checks.push({name:url.pathname,ok:false,code:'NETWORK_OR_TIMEOUT'}); }
  }
  return {ok:checks.length>0&&checks.every(x=>x.ok),checks};
}

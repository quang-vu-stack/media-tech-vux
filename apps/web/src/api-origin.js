/**
 * MEDIA TECH VUS v26 browser network boundary.
 * Always use the reverse-proxied same-origin /api endpoint. Never send a CEO
 * bearer token to an arbitrary host supplied by a build-time environment var.
 */
export function safeApiBase(configuredBase, browserOrigin = 'https://local.invalid') {
  const value = String(configuredBase ?? '').trim();
  if (!value || value === '/api' || value === '/api/') return '/api';
  try {
    const wanted = new URL(value);
    const current = new URL(browserOrigin);
    if (!['https:', 'http:'].includes(wanted.protocol) ||
        wanted.origin !== current.origin ||
        wanted.username || wanted.password || wanted.search || wanted.hash ||
        wanted.pathname.replace(/\/+$/, '') !== '/api') return '/api';
    return '/api'; // Canonical same-origin route even for a valid absolute URL.
  } catch { return '/api'; }
}

/** Relative application routes only; reject dangerous or ambiguous paths. */
export function safeApiPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') ||
      /[\\\u0000-\u001f\u007f]/.test(path) ||
      /(?:^|\/)\.\.(?:\/|\?|$)/.test(path) ||
      /^[^?]*\/(?:%2e%2e|%2f)/i.test(path)) {
    throw new Error('Đường dẫn API không hợp lệ.');
  }
  return path;
}

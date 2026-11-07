/** Deployment configuration validator. Pure functions, no secrets in diagnostics. */
export function validateDeployConfig(env = {}) {
  const errors = [];
  const warnings = [];
  for (const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']) {
    const value = String(env[key] || '').trim();
    if (!value || /YOUR_|example\.supabase\.co/i.test(value)) errors.push(`Missing or placeholder: ${key}`);
  }
  if (env.SUPABASE_URL && !/YOUR_|example\.supabase\.co/i.test(env.SUPABASE_URL)) {
    try {
      const url = new URL(env.SUPABASE_URL);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password || url.search || url.hash) {
        errors.push('SUPABASE_URL must be HTTPS Supabase project URL');
      }
    } catch { errors.push('SUPABASE_URL must be a URL'); }
  }
  const port = Number(env.WEB_PORT ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('WEB_PORT must be a valid TCP port');
  const origin = env.WEB_ORIGIN || 'http://localhost:8080';
  try {
    const u = new URL(origin);
    if (!['http:', 'https:'].includes(u.protocol) || u.pathname !== '/' || u.search || u.hash || u.username || u.password) {
      errors.push('WEB_ORIGIN must be a single HTTP(S) origin with no path');
    } else if (u.protocol === 'http:' && !['localhost','127.0.0.1'].includes(u.hostname)) {
      errors.push('Public WEB_ORIGIN must use HTTPS (configure external TLS proxy)');
    }
  } catch { errors.push('WEB_ORIGIN must be a valid origin'); }
  if (env.ENABLE_BACKGROUND_WORKER && env.ENABLE_BACKGROUND_WORKER !== 'true') {
    warnings.push('compose.yaml manages worker inside one API replica and ignores custom worker flags');
  }
  if (String(env.SUPABASE_ANON_KEY||'').trim() === String(env.SUPABASE_SERVICE_ROLE_KEY||'').trim() && env.SUPABASE_ANON_KEY) {
    errors.push('Supabase publishable key and service-role key must be different');
  }
  if (!env.GEMINI_API_KEY && !env.OPENAI_API_KEY) warnings.push('AI API keys absent; AI generation endpoints will not be available');
  warnings.push('Docker Compose binds web to localhost. Configure TLS reverse proxy and backups for Internet deployment');
  warnings.push('Enable only ONE background worker replica; process-local schedule is not distributed-safe');
  return { ok: errors.length === 0, errors, warnings };
}

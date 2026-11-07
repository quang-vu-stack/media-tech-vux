/**
 * v24: pure, offline validation for the destructive two-user integration test.
 * It does not contact Supabase or print credentials.
 */
export function validateIntegrationQaEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  if (env.INTEGRATION_ALLOW_CREATE_USERS !== 'YES_TEST_PROJECT') {
    errors.push('Set INTEGRATION_ALLOW_CREATE_USERS=YES_TEST_PROJECT only for a disposable QA project.');
  }

  let projectRef = '';
  try {
    const url = new URL(env.SUPABASE_URL || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !/^[a-z0-9-]{8,}\.supabase\.co$/.test(url.hostname)) {
      throw new Error('invalid project URL');
    }
    projectRef = url.hostname.slice(0, -'.supabase.co'.length);
  } catch {
    errors.push('SUPABASE_URL must be an HTTPS project URL such as https://your-qa-project.supabase.co/.');
  }

  if (!env.INTEGRATION_EXPECTED_PROJECT_REF || env.INTEGRATION_EXPECTED_PROJECT_REF !== projectRef) {
    errors.push('INTEGRATION_EXPECTED_PROJECT_REF must exactly match the disposable QA Supabase project ref.');
  }
  if ((env.INTEGRATION_EXPECTED_PROJECT_REF || '').toLowerCase().includes('prod')) {
    errors.push('The declared QA project ref must not contain a production marker.');
  }

  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = env.SUPABASE_ANON_KEY;
  if (!secret || /^(your_|replace|example|dummy)/i.test(secret)) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder.');
  }
  if (!publicKey || /^(your_|replace|example|dummy)/i.test(publicKey)) {
    errors.push('SUPABASE_ANON_KEY is required; a service-role key cannot substitute for an anon/publishable key.');
  }
  if (secret && publicKey && secret === publicKey) {
    errors.push('SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be different.');
  }

  let apiHost = '';
  try {
    const api = new URL(env.INTEGRATION_API_BASE || '');
    if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password || api.search || api.hash || api.pathname.replace(/\/$/, '') !== '/api') {
      throw new Error('invalid API origin');
    }
    apiHost = api.hostname;
    const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(apiHost);
    if (!isLocal && (api.protocol !== 'https:' || env.INTEGRATION_EXPECTED_API_HOST !== apiHost || env.INTEGRATION_ALLOW_REMOTE_API !== 'YES_ISOLATED_QA_API')) {
      errors.push('Remote test API needs HTTPS, matching INTEGRATION_EXPECTED_API_HOST and INTEGRATION_ALLOW_REMOTE_API=YES_ISOLATED_QA_API.');
    }
  } catch {
    errors.push('INTEGRATION_API_BASE must be a local or explicitly approved QA URL ending in /api.');
  }

  if (!env.INTEGRATION_ISOLATED_PROJECT_LABEL || env.INTEGRATION_ISOLATED_PROJECT_LABEL.trim() !== 'MEDIA_TECH_VUS_QA_ONLY') {
    errors.push('Set INTEGRATION_ISOLATED_PROJECT_LABEL=MEDIA_TECH_VUS_QA_ONLY after checking the project in your Supabase dashboard.');
  }
  if (!env.SUPABASE_URL || !env.INTEGRATION_API_BASE) warnings.push('No network request was made; this is only a local configuration check.');
  return { ok: errors.length === 0, projectRef, apiHost, errors, warnings };
}

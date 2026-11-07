/**
 * Production release gate. It consumes evidence, but deliberately NEVER runs
 * migrations, publishes deployments, calls APIs, or changes saved game data.
 * Any unexecuted step is a blocker for a full release.
 */
export const RELEASE_LEVELS = Object.freeze({
  logic: Object.freeze(['node_tests','structure','backend_syntax']),
  build: Object.freeze(['node_tests','structure','backend_syntax','web_production_build']),
  production: Object.freeze([
    'node_tests','structure','backend_syntax','web_production_build',
    'real_browser_e2e','real_supabase_integration','deployed_bundle_assets',
  ]),
});
export function assessReleaseReadiness(report, level='production') {
  if (!Object.prototype.hasOwnProperty.call(RELEASE_LEVELS, level)) {
    throw new Error('Unknown release gate. Choose logic, build or production.');
  }
  if (!report || typeof report !== 'object' || Array.isArray(report) ||
    !report.checks || typeof report.checks !== 'object') {
    throw new Error('QA evidence is missing or invalid.');
  }
  const rows = RELEASE_LEVELS[level].map(name => {
    const raw = report.checks[name];
    const status = raw && typeof raw.status === 'string' ? raw.status : 'NOT_RUN';
    const pass = status === 'PASS';
    return {name,status: ['PASS','FAIL','NOT_RUN'].includes(status)?status:'NOT_RUN',pass};
  });
  return {
    level,
    version: typeof report.version === 'string' ? report.version : 'unknown',
    passed: rows.filter(row=>row.pass).length,
    required: rows.length,
    ready: rows.every(row=>row.pass),
    blockers: rows.filter(row=>!row.pass),
    checks: rows,
  };
}

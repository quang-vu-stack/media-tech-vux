/**
 * Dependency readiness checks. Unlike process liveness, this probes the live
 * Supabase database and the latest migration required through v23 game features (v24 adds no migration).
 * Safe result contains only allowlisted status codes; never database messages.
 * `query` is injected to make failure paths testable without real credentials.
 */
export const requiredTables = Object.freeze(['companies', 'software_projects', 'software_release_events', 'company_meetings', 'meeting_ai_debates', 'meeting_action_items_v20', 'meeting_work_reports_v21', 'meeting_handoffs_v22', 'meeting_handoff_versions_v23']);

export async function checkReadiness({ query, tables = requiredTables, deadlineMs = 4000 }) {
  if (typeof query !== 'function') throw new TypeError('readiness query must be a function');
  if (!Number.isInteger(deadlineMs) || deadlineMs < 100) throw new RangeError('invalid readiness deadline');
  const checks = [];
  for (const table of tables) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(table)) throw new TypeError('invalid readiness table name');
    let timeout;
    try {
      const outcome = await Promise.race([
        Promise.resolve().then(() => query(table)),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('TIMEOUT')), deadlineMs); }),
      ]);
      checks.push({ component: table, ok: outcome?.error == null, code: outcome?.error ? 'DB_QUERY_FAILED' : 'OK' });
    } catch (error) {
      checks.push({ component: table, ok: false, code: error?.message === 'TIMEOUT' ? 'DB_TIMEOUT' : 'DB_UNAVAILABLE' });
    } finally {
      clearTimeout(timeout);
    }
  }
  return { ok: checks.every(check => check.ok), checks };
}

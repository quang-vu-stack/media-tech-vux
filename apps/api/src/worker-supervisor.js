/**
 * Operational diagnostics for one Node.js process, not a durable distributed queue.
 * Each task is isolated from failures in other tasks, and cycles never overlap.
 * Never include secrets, request bodies or arbitrary database error messages in snapshots.
 */
export function createWorkerSupervisor({ jobs, intervalMs = 30_000, now = () => Date.now(), log = console }) {
  if (!Array.isArray(jobs) || jobs.length === 0) throw new Error('At least one job is required');
  if (!Number.isInteger(intervalMs) || intervalMs < 1000) throw new Error('Interval must be >= 1000ms');
  if (new Set(jobs.map(job => job.name)).size !== jobs.length) throw new Error('Duplicate job names');
  for (const job of jobs) if (typeof job.name !== 'string' || !/^[a-z_]+$/.test(job.name) || typeof job.run !== 'function') throw new Error('Invalid job');
  let busy = false;
  let timer;
  let startedAt = null;
  let lastCycleAt = null;
  let cycles = 0;
  let skipped = 0;
  const steps = Object.fromEntries(jobs.map(job => [job.name, {
    state: 'pending', runs: 0, successes: 0, failures: 0, consecutiveFailures: 0,
    lastAttemptAt: null, lastSuccessAt: null, lastDurationMs: null, lastErrorCode: null,
  }]));
  const iso = time => new Date(time).toISOString();
  async function tick() {
    if (busy) { skipped++; return false; }
    busy = true;
    try {
      for (const job of jobs) {
        const row = steps[job.name];
        const before = now();
        row.runs++;
        row.lastAttemptAt = iso(before);
        row.state = 'running';
        try {
          await job.run();
          row.successes++;
          row.consecutiveFailures = 0;
          row.lastErrorCode = null;
          row.lastSuccessAt = iso(now());
          row.state = 'ok';
        } catch (error) {
          row.failures++;
          row.consecutiveFailures++;
          row.lastErrorCode = typeof error?.code === 'string' && /^[A-Z0-9_]{1,30}$/.test(error.code) ? error.code : 'JOB_FAILED';
          row.state = 'error';
          log.error('[WORKER]', job.name, row.lastErrorCode);
        } finally {
          row.lastDurationMs = Math.max(0, now() - before);
        }
      }
      cycles++;
      lastCycleAt = iso(now());
      return true;
    } finally { busy = false; }
  }
  function snapshot() {
    // Cloned results: callers cannot mutate internal counters.
    return {
      enabled: startedAt !== null,
      running: busy,
      intervalMs,
      startedAt,
      lastCycleAt,
      cycles,
      skipped,
      jobs: Object.fromEntries(Object.entries(steps).map(([name, status]) => [name, { ...status }])),
    };
  }
  function start({ immediate = true } = {}) {
    if (timer) return;
    startedAt = iso(now());
    timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    if (immediate) void tick();
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = undefined;
    startedAt = null;
  }
  return { tick, snapshot, start, stop };
}

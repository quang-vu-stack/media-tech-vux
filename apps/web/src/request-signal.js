/** Compose a bounded timeout with component/unmount cancellation. */
export function makeRequestSignal(cancelSignal, timeoutMs = 20_000) {
  const ms = Number.isFinite(timeoutMs) ? Math.max(1_000, Math.min(75_000, Math.floor(timeoutMs))) : 20_000;
  const timeoutSignal = AbortSignal.timeout(ms);
  return cancelSignal ? AbortSignal.any([cancelSignal, timeoutSignal]) : timeoutSignal;
}

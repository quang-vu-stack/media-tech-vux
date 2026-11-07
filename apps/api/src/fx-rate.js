// USD/VND reference quotes are presentation-only. No game balance is converted in DB.
// Provider: https://www.exchangerate-api.com/docs/free (attribution required).
const REFERENCE = Object.freeze({ usdVnd: 25739, asOf: '2026-11-04T02:33:00.000Z', source: 'reference', isFallback: true });
export function makeFxRateService({ fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
  let lastGood = null;
  let nextRefreshAt = 0;
  let pending = null;
  return async function getRate() {
    if (pending) return pending;
    if (now() < nextRefreshAt) return lastGood ?? REFERENCE;
    pending = (async () => {
      nextRefreshAt = now() + 60 * 60 * 1000; // failure: retry no sooner than 1h
      try {
        const response = await fetchImpl('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(7000) });
        if (!response.ok) throw new Error('provider unavailable');
        const payload = await response.json();
        const rate = payload?.rates?.VND;
        const lastUpdate = Number(payload?.time_last_update_unix);
        if (payload?.result !== 'success' || payload.base_code !== 'USD' ||
            typeof rate !== 'number' || !Number.isFinite(rate) || rate < 1000 || rate > 100000 ||
            !Number.isSafeInteger(lastUpdate) || lastUpdate < 1000000000) throw new Error('invalid provider response');
        lastGood = { usdVnd: rate, asOf: new Date(lastUpdate * 1000).toISOString(), source: 'exchange-rate-api', isFallback: false };
        nextRefreshAt = now() + 24 * 60 * 60 * 1000; // published daily
      } catch (_e) {
        if (lastGood) lastGood = { ...lastGood, isFallback: true }; // provider failed, keep the dated quote but mark stale
      }
      return lastGood ?? REFERENCE;
    })();
    try { return await pending; }
    finally { pending = null; }
  };
}
export const getUsdVndRate = makeFxRateService();

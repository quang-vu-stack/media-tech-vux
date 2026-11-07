import { useSyncExternalStore } from 'react';
import { REFERENCE_USD_VND, validUsdVndRate, formatGameMoney, formatVnd as formatOriginalVnd, formatUsdFromVnd } from './money.js';

export type DisplayCurrency = 'VND' | 'USD';
export type CurrencyRate = { usdVnd: number; asOf: string; source: 'exchange-rate-api' | 'reference'; isFallback: boolean };
export type CurrencySettings = { mode: DisplayCurrency; rate: CurrencyRate };
const STORAGE_KEY = 'media_tech_vus_currency_preference_v16';
const FALLBACK_RATE: CurrencyRate = {
  usdVnd: REFERENCE_USD_VND,
  asOf: '2026-11-04T02:33:00.000Z',
  source: 'reference',
  isFallback: true,
};
function storedMode(): DisplayCurrency {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'USD' ? 'USD' : 'VND'; }
  catch { return 'VND'; }
}
let snapshot: CurrencySettings = { mode: storedMode(), rate: FALLBACK_RATE };
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => snapshot;
const notify = () => { for (const cb of listeners) cb(); };
export function useCurrencySettings() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function setDisplayCurrency(mode: DisplayCurrency) {
  if (mode !== 'USD' && mode !== 'VND') return;
  if (snapshot.mode === mode) return;
  snapshot = { ...snapshot, mode };
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* persistence is cosmetic */ }
  notify();
}
export function setRateFromServer(data: unknown) {
  if (!data || typeof data !== 'object') return false;
  const result = data as Partial<CurrencyRate>;
  if (!validUsdVndRate(result.usdVnd) || typeof result.asOf !== 'string' || !Number.isFinite(Date.parse(result.asOf)) ||
    (result.source !== 'reference' && result.source !== 'exchange-rate-api') || typeof result.isFallback !== 'boolean') return false;
  const rate: CurrencyRate = { usdVnd: result.usdVnd, asOf: result.asOf, source: result.source, isFallback: result.isFallback };
  snapshot = { ...snapshot, rate };
  notify();
  return true;
}
// Backward-compatible formatter; all game accounting stays in VND.
export const vnd = (value: number) => formatGameMoney(value, snapshot.mode, snapshot.rate.usdVnd);
export const exactVnd = (value: number | bigint) => formatOriginalVnd(value);
export const usd = (value: number) => formatUsdFromVnd(value, snapshot.rate.usdVnd);
export const fxRateText = () => formatOriginalVnd(snapshot.rate.usdVnd);

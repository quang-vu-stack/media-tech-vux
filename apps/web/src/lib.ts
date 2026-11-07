import { createClient } from '@supabase/supabase-js';
import { safeApiBase, safeApiPath } from './api-origin.js';
import { makeRequestSignal } from './request-signal.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const configured = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_PROJECT'));
export const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null;
// Relative API base works behind both Vite's local proxy and the production Nginx proxy.
// Never hardcode localhost:4000 into a production browser bundle.
export const API_URL = safeApiBase(import.meta.env.VITE_API_URL, typeof window === 'undefined' ? undefined : window.location.origin);

export { vnd } from './currency';
export const numberVi = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

export async function request<T>(path: string, token: string, body?: unknown, method?: string, timeoutMs = 20_000, cancelSignal?: AbortSignal): Promise<T> {
  // Abort hung requests. POST is intentionally not auto-retried: repeating a
  // mutation could create duplicate tasks or financial actions.
  const res = await fetch(`${API_URL}${safeApiPath(path)}`, {
    signal: makeRequestSignal(cancelSignal, timeoutMs),
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Máy chủ trả về HTTP ${res.status}`);
  if (data === null) throw new Error('Máy chủ trả dữ liệu không hợp lệ (không phải JSON).');
  return data as T;
}

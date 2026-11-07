/** Canonical local reverse-proxied endpoint, never an external origin. */
export function safeApiBase(configuredBase: unknown, browserOrigin?: string): string;
export function safeApiPath(path: string): string;

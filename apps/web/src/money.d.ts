export const REFERENCE_USD_VND: number;
export function validUsdVndRate(value: unknown): value is number;
export function formatVnd(value: number | bigint): string;
export function amountInUsd(valueVnd: number, usdVndRate: number): number;
export function formatUsdFromVnd(valueVnd: number, usdVndRate: number): string;
export function formatGameMoney(valueVnd: number, displayCurrency: 'USD' | 'VND', usdVndRate: number): string;

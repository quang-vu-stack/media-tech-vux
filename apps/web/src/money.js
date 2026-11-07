// Pure display helpers. The financial ledger always uses integer VND.
export const REFERENCE_USD_VND = 25739;

export function validUsdVndRate(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1000 && value <= 100000;
}

export function formatVnd(value) {
  if (typeof value === 'bigint') return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Math.round(value)) + ' ₫';
}

export function amountInUsd(valueVnd, usdVndRate) {
  if (!Number.isFinite(valueVnd) || !validUsdVndRate(usdVndRate)) return NaN;
  return valueVnd / usdVndRate;
}

export function formatUsdFromVnd(valueVnd, usdVndRate) {
  const amount = amountInUsd(valueVnd, usdVndRate);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatGameMoney(valueVnd, displayCurrency, usdVndRate) {
  return displayCurrency === 'USD' ? formatUsdFromVnd(valueVnd, usdVndRate) : formatVnd(valueVnd);
}

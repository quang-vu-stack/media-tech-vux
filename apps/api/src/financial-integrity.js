/** Financial verification v15; exact integer amounts are returned as strings. */
export function validateFinancialAudit(raw) {
  if (!raw || typeof raw !== 'object' || !['matched', 'mismatch'].includes(raw.status)) {
    throw new TypeError('Invalid audit payload');
  }
  const fields = ['treasury_vnd', 'ledger_total_vnd', 'difference_vnd'];
  for (const field of fields) {
    if (typeof raw[field] !== 'string' || !/^-?\d+$/.test(raw[field])) {
      throw new TypeError(`Invalid decimal field: ${field}`);
    }
  }
  if (!Number.isSafeInteger(raw.ledger_entries) || raw.ledger_entries < 0) {
    throw new TypeError('Invalid ledger count');
  }
  const treasury = BigInt(raw.treasury_vnd);
  const total = BigInt(raw.ledger_total_vnd);
  const difference = BigInt(raw.difference_vnd);
  if (treasury - total !== difference) throw new TypeError('Inconsistent audit calculation');
  if ((difference === 0n) !== (raw.status === 'matched')) throw new TypeError('Inconsistent audit status');
  return {
    status: raw.status,
    treasury_vnd: treasury.toString(),
    ledger_total_vnd: total.toString(),
    difference_vnd: difference.toString(),
    ledger_entries: raw.ledger_entries,
    checked_at: raw.checked_at,
  };
}

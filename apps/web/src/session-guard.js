/**
 * Per-resource, latest-request-wins guard for asynchronous UI results.
 * Tokens are kept only in memory and are never logged or persisted.
 * Each instance guards one data stream (company state, meetings, etc.).
 */
export function createSessionRequestGuard() {
  let owner = null;
  let sequence = 0;
  return {
    setOwner(nextOwner) {
      const normalized = nextOwner || null;
      if (normalized !== owner) {
        owner = normalized;
        sequence += 1;
      }
    },
    begin(requestOwner) {
      const normalized = requestOwner || null;
      if (!normalized || normalized !== owner) return null;
      sequence += 1;
      return Object.freeze({ owner: normalized, sequence });
    },
    isCurrent(ticket) {
      return ticket !== null && ticket !== undefined &&
        owner !== null && ticket.owner === owner && ticket.sequence === sequence;
    },
    cancel() {
      sequence += 1;
    },
  };
}

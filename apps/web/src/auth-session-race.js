/**
 * Supabase emits auth events (including INITIAL_SESSION), while getSession()
 * may resolve later. An older getSession response must never undo a newer
 * SIGNED_IN / SIGNED_OUT event.
 *
 * This helper holds session objects only in memory and does not log tokens.
 */
export function createAuthSessionResolver(commit) {
  if (typeof commit !== 'function') throw new TypeError('commit must be a function');
  let active = true;
  let authEventSeen = false;
  return {
    onEvent(session) {
      if (!active) return;
      authEventSeen = true;
      commit(session);
    },
    onInitial(session) {
      if (!active || authEventSeen) return;
      commit(session);
    },
    dispose() {
      active = false;
    },
  };
}

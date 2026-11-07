// Reference to the authoritative SQL world rules. Pure functions are used in tests and UI docs.
export const STRATEGIES = Object.freeze({
  marketing: {cost:80_000_000,reputation:2},
  research: {cost:120_000_000,reputation:3},
  reserve: {cost:0,reputation:0},
});
export function strategyPreview(action, cash, reputation) {
  const rule=STRATEGIES[action];
  if(!rule || !Number.isSafeInteger(cash) || cash<0 || !Number.isInteger(reputation) || reputation<0 || reputation>100) {
    throw new Error('Invalid strategy input');
  }
  return {allowed:cash>=rule.cost,cost:rule.cost,remaining:cash-rule.cost,reputation:Math.min(100,reputation+rule.reputation)};
}
export function worldBidAdvantage(rivalBid,level,reputation) {
  if(!Number.isSafeInteger(rivalBid)||rivalBid<0||!Number.isInteger(level)||level<1||!Number.isInteger(reputation)||reputation<0||reputation>100) throw new Error('Invalid bid input');
  return Math.floor(Math.min(level,5)*rivalBid/100)+Math.floor(reputation*rivalBid/5000);
}

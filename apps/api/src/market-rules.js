// Pure reference implementation of the public SQL bidding rules, for unit tests/UI docs.
// SQL function submit_market_bid remains the authoritative source of game state.
export function validateMarketBid(bid, cost, budget) {
  return [bid,cost,budget].every(x=>Number.isSafeInteger(x)) && cost>=0 && budget>0 && bid>=cost && bid<=budget;
}
export function marketAdvantage(rivalBid, level) {
  if (!Number.isSafeInteger(rivalBid) || rivalBid<0 || !Number.isInteger(level) || level<1) throw new Error('Invalid inputs');
  return Math.floor(Math.min(level,5)*rivalBid/100);
}
export function evaluateMarketBid({bid,cost,budget,rivalBid,level}) {
  if (!validateMarketBid(bid,cost,budget)) throw new Error('Giá chào không hợp lệ');
  return {won: bid <= rivalBid+marketAdvantage(rivalBid,level),grossProfit:bid-cost};
}

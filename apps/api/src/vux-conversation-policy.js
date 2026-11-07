/** Server-owned budget and UX status; does not call a model or database. */
export const VUX_DAILY_CAPS=Object.freeze({adaptive:12,quiet:2,off:0});
export const VUX_QUIET_GAP_MS=60*60*1000;

export function conversationDailyCap(mode){return VUX_DAILY_CAPS[mode]??0;}
export function conversationRuntimeStatus({mode='adaptive',serverEnabled=false,hasGeminiKey=false,dailyUsed=0,eligibleAgents=0}){
  const dailyCap=conversationDailyCap(mode);
  const used=Number.isFinite(Number(dailyUsed))?Math.max(0,Math.floor(Number(dailyUsed))):0;
  const remaining=Math.max(0,dailyCap-used);
  let reason='ready';
  if(mode==='off')reason='ceo_paused';
  else if(!serverEnabled)reason='worker_disabled';
  else if(!hasGeminiKey)reason='missing_gemini_key';
  else if(!remaining)reason='daily_limit';
  else if(eligibleAgents<2)reason='no_available_pair';
  return {enabled:reason==='ready',reason,dailyCap,dailyUsed:used,remaining,provider:'gemini'};
}
export function isQuietModeCooldown(mode,lastConversationAt,nowMs=Date.now()){
  if(mode!=='quiet')return false;
  const time=Date.parse(lastConversationAt??'');
  return Number.isFinite(time) && nowMs>=time && nowMs-time<VUX_QUIET_GAP_MS;
}

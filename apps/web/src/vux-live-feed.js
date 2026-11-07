/**
 * VUX live feed. Pure, testable projection of confirmed, saved conversations.
 * No generated placeholder dialogue: only text returned by the backend can appear.
 */
export const VUX_BUBBLE_TTL_MS = 150_000;
export const VUX_MAX_RECENT_ITEMS = 20;

export function normalizeVuxConversations(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows.filter(row => {
    if (!row || typeof row.id !== 'string' || seen.has(row.id)) return false;
    if (!row.speaker_a_id || !row.speaker_b_id || !Array.isArray(row.dialogue)) return false;
    if (!Number.isFinite(Date.parse(row.created_at))) return false;
    seen.add(row.id);
    return true;
  }).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)).slice(0,VUX_MAX_RECENT_ITEMS);
}

export function recentVuxSpeechByAgent(rows, nowMs=Date.now(), ttlMs=VUX_BUBBLE_TTL_MS) {
  const latest = new Map();
  if (!Number.isFinite(nowMs)) return latest;
  const valid = normalizeVuxConversations(rows);
  for(const row of valid){
    const age=nowMs-Date.parse(row.created_at);
    if(age < 0 || age > ttlMs)continue;
    // First matching utterance in newest record becomes the visible speech.
    // This is read-only; never synthesize speech or repeat Gemini calls.
    for(const turn of row.dialogue){
      const speaker=turn?.speaker;
      if(speaker!==row.speaker_a_id && speaker!==row.speaker_b_id)continue;
      if(latest.has(speaker))continue;
      const words=typeof turn.text==='string'?turn.text.trim():'';
      if(!words)continue;
      latest.set(speaker, words.slice(0,110));
    }
  }
  return latest;
}

export function getVuxLiveSummary(rows,nowMs=Date.now()){
  const sorted=normalizeVuxConversations(rows);
  const latest=sorted[0];
  return {
    totalRecent:sorted.length,
    latestAt:latest?.created_at??null,
    speakers:recentVuxSpeechByAgent(sorted,nowMs).size,
    hasRecentActivity:latest?nowMs-Date.parse(latest.created_at)<=VUX_BUBBLE_TTL_MS:false,
  };
}

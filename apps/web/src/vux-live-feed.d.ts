export interface VuxSpeechRecord {
  id: string;
  topic?: string;
  speaker_a_id: string;
  speaker_b_id: string;
  dialogue: Array<{speaker: string;text: string}>;
  created_at: string;
}
export const VUX_BUBBLE_TTL_MS:number;
export const VUX_MAX_RECENT_ITEMS:number;
export function normalizeVuxConversations(rows:VuxSpeechRecord[]|null|undefined):VuxSpeechRecord[];
export function recentVuxSpeechByAgent(rows:VuxSpeechRecord[]|null|undefined,nowMs?:number,ttlMs?:number):Map<string,string>;
export function getVuxLiveSummary(rows:VuxSpeechRecord[]|null|undefined,nowMs?:number):{totalRecent:number;latestAt:string|null;speakers:number;hasRecentActivity:boolean};

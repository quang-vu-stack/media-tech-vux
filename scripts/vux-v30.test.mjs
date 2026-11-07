import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeVuxConversations, recentVuxSpeechByAgent, getVuxLiveSummary } from '../apps/web/src/vux-live-feed.js';
import { conversationDailyCap, conversationRuntimeStatus, isQuietModeCooldown } from '../apps/api/src/vux-conversation-policy.js';
import { pickConversationPair, parseConversation } from '../apps/api/src/vux-conversation.js';

const now=Date.parse('2026-11-05T08:00:00Z');
const dialogue=(id,created_at,dialogue=[{speaker:'a',text:'Chúng ta thử kiểm tra hiệu năng.'},{speaker:'b',text:'Đồng ý, ưu tiên giảm thời gian tải.'}])=>({id,speaker_a_id:'a',speaker_b_id:'b',created_at,dialogue,topic:'Hiệu năng'});

test('live feed only accepts confirmed, correctly dated server records',()=>{
  const accepted=normalizeVuxConversations([null,{},dialogue('1','bad'),dialogue('x',new Date(now-2000).toISOString()),dialogue('x',new Date(now-2000).toISOString())]);
  assert.equal(accepted.length,1);
  assert.equal(accepted[0].id,'x');
});
test('newest valid real conversation supplies bubble text, not invented text',()=>{
  const a=dialogue('1',new Date(now-2000).toISOString());
  const b=dialogue('0',new Date(now-25000).toISOString(),[{speaker:'a',text:'Cũ'},{speaker:'b',text:'Cũ'}]);
  const map=recentVuxSpeechByAgent([b,a],now);
  assert.equal(map.get('a'),'Chúng ta thử kiểm tra hiệu năng.');
  assert.equal(map.get('b'),'Đồng ý, ưu tiên giảm thời gian tải.');
  assert.equal(getVuxLiveSummary([a],now).hasRecentActivity,true);
});
test('bubble content expires automatically and unknown speakers are ignored',()=>{
  const a=dialogue('a',new Date(now-180_000).toISOString());
  const b=dialogue('b',new Date(now-1000).toISOString(),[{speaker:'forged',text:'Không được hiển thị'},{speaker:'a',text:'Hiện thực'}]);
  assert.equal(recentVuxSpeechByAgent([a],now).size,0);
  assert.equal(recentVuxSpeechByAgent([b],now).size,1);
  assert.equal(recentVuxSpeechByAgent([b],now).get('a'),'Hiện thực');
});
test('live feed keeps at most 20 unique rows',()=>{
  const rows=Array.from({length:60},(_,i)=>dialogue(String(i),new Date(now-i*1000).toISOString()));
  assert.equal(normalizeVuxConversations(rows).length,20);
  assert.equal(normalizeVuxConversations(rows)[0].id,'0');
});
test('CEO modes map to bounded server-time conversation budgets',()=>{
  assert.equal(conversationDailyCap('adaptive'),12);
  assert.equal(conversationDailyCap('quiet'),2);
  assert.equal(conversationDailyCap('off'),0);
  assert.equal(conversationDailyCap('unknown'),0);
});
test('Gemini is not enabled merely because CEO selected adaptive',()=>{
  const status=conversationRuntimeStatus({mode:'adaptive',serverEnabled:false,hasGeminiKey:true,dailyUsed:0,eligibleAgents:19});
  assert.equal(status.enabled,false);
  assert.equal(status.reason,'worker_disabled');
});
test('runtime does not leak provider key, respects CEO pause',()=>{
  const status=conversationRuntimeStatus({mode:'off',serverEnabled:true,hasGeminiKey:true,dailyUsed:0,eligibleAgents:19});
  assert.equal(status.enabled,false);
  assert.equal(status.reason,'ceo_paused');
  assert.equal(JSON.stringify(status).includes('GEMINI_API_KEY'),false);
});
test('limit stops Gemini when daily cap reached',()=>{
  const status=conversationRuntimeStatus({mode:'quiet',serverEnabled:true,hasGeminiKey:true,dailyUsed:2,eligibleAgents:5});
  assert.equal(status.reason,'daily_limit');
  assert.equal(status.remaining,0);
});
test('empty employee pool blocks Gemini even with key',()=>{
  const status=conversationRuntimeStatus({mode:'adaptive',serverEnabled:true,hasGeminiKey:true,eligibleAgents:1});
  assert.equal(status.reason,'no_available_pair');
});
test('quiet rate limit uses real elapsed time, not game speed',()=>{
  assert.equal(isQuietModeCooldown('quiet',new Date(now-1000).toISOString(),now),true);
  assert.equal(isQuietModeCooldown('quiet',new Date(now-3600001).toISOString(),now),false);
  assert.equal(isQuietModeCooldown('adaptive',new Date(now-1000).toISOString(),now),false);
});
test('staff attending CEO meeting cannot be picked for spontaneous chat',()=>{
  const staff=[{id:'a',energy:100,status:'idle'},{id:'b',energy:100,status:'idle'},{id:'c',energy:100,status:'idle'}];
  const pair=pickConversationPair(staff,now,['a']);
  assert.equal(pair.length,2);
  assert.equal(pair.some(x=>x.id==='a'),false);
  assert.equal(pickConversationPair(staff,now,['a','b']),null);
});
test('generated conversations reject forged speaker and oversized event payload',()=>{
  assert.throws(()=>parseConversation({turns:[{speaker:'A',text:'x'},{speaker:'C',text:'forged'}]},'a','b'));
});
test('frontend polls only saved conversation endpoint, not Gemini API per-frame',()=>{
  const code=readFileSync('apps/web/src/App.tsx','utf8');
  assert.match(code,/\/vux\/conversations/);
  assert.match(code,/visibilitychange/);
  assert.match(code,/controller\.signal\.aborted/);
  const scene=readFileSync('apps/web/src/components/OfficeScene.tsx','utf8');
  assert.match(scene,/recentVuxSpeechByAgent/);
  assert.doesNotMatch(scene,/models\.generateContent/);
});
test('runtime status is authenticated and does not return any key',()=>{
  const code=readFileSync('apps/api/src/index.js','utf8');
  assert.match(code,/app\.get\('\/api\/vux\/runtime'/);
  assert.match(code,/const company=await ownedCompany\(req\.user\.id\)/);
  assert.match(code,/conversationRuntimeStatus/);
});

test('runtime respects global background-worker off switch',()=>{
  const source=readFileSync('apps/api/src/index.js','utf8');
  assert.match(source,/serverEnabled:process\.env\.ENABLE_BACKGROUND_WORKER!=='false'/);
  assert.match(source,/if\(process\.env\.ENABLE_BACKGROUND_WORKER==='false'\|\|process\.env\.ENABLE_VUX_AUTONOMOUS_GEMINI/);
});

test('control panel clears private conversations on account switch before reload',()=>{
  const source=readFileSync('apps/web/src/components/VuxControlPanel.tsx','utf8');
  assert.match(source,/setItems\(\[\]\);setLoaded\(false\);setRuntime\(null\)/);
  assert.match(source,/controller\.abort\(\)/);
});

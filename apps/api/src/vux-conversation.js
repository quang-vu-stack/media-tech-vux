/** V29: all AI usage is server-side, bounded, opt-in and independent from render FPS. */
export const VUX_DAILY_GEMINI_CAP = 12;
export const VUX_MAX_DIALOGUE_TURNS = 4;
export const VUX_MIN_COOLDOWN_MS = 15*60*1000;

export function pickConversationPair(employees, now = Date.now(), excludedIds = []) {
  const excluded=new Set(excludedIds);
  const available = (Array.isArray(employees)?employees:[]).filter(e=>e?.id && !excluded.has(e.id) && Number(e.energy??90)>=35 && e.status!=='working');
  if(available.length<2)return null;
  const cursor=Math.floor(now/VUX_MIN_COOLDOWN_MS);
  const a=available[cursor%available.length];
  const b=available[(cursor+1+Math.floor(cursor/available.length)%(available.length-1))%available.length];
  if(!b||a.id===b.id)return null;
  return [a,b];
}
export function dynamicTopic(a,b,tasks=[],previous=[]){
  const relevant=tasks.find(t=>t.status==='in_progress' && [a.id,b.id].includes(t.employee_id));
  const options=[
    `Phối hợp giữa ${a.department} và ${b.department}`,
    `Ý tưởng cải thiện trải nghiệm khách hàng và chất lượng sản phẩm`,
    `Mẹo xử lý công việc và giảm rủi ro dự án`,
    `Chia sẻ kinh nghiệm nghề nghiệp trong giờ nghỉ`,
  ];
  if(relevant)options.unshift(`Tiến độ và cách hỗ trợ dự án: ${relevant.title}`);
  const previousTopics=new Set(previous.map(x=>x.topic));
  return options.find(x=>!previousTopics.has(x))||options[0];
}
export function personalityForAgent(employee){
  const text=`${employee.role} ${employee.department}`.toLowerCase();
  if(/cfo|finance|tài chính/.test(text))return 'Cẩn thận, phân tích chi phí và rủi ro';
  if(/cto|tech|kỹ thuật|dev|ai/.test(text))return 'Logic, thích dữ kiện và giải pháp kỹ thuật';
  if(/marketing|truyền thông|content/.test(text))return 'Sáng tạo, thân thiện, đưa ví dụ thực tế';
  if(/sales|kinh doanh/.test(text))return 'Thực tế, thuyết phục, chú trọng khách hàng';
  return 'Thân thiện, xây dựng, biết lắng nghe';
}
export function buildGeminiConversationPrompt({agents,topic,memory=[]}){
  const [a,b]=agents;
  const memories=memory.map(x=>String(x).slice(0,160)).slice(-4);
  return `Bạn đang viết một đoạn hội thoại MÔ PHỎNG trong game MEDIA TECH VUX. Không thực thi bất kỳ tác vụ bên ngoài nào.\n`+
    `Nhân viên A: ${a.full_name} (${a.role}); tính cách ${personalityForAgent(a)}.\n`+
    `Nhân viên B: ${b.full_name} (${b.role}); tính cách ${personalityForAgent(b)}.\n`+
    `Chủ đề: ${topic}\nBối cảnh gần đây: ${JSON.stringify(memories)}\n`+
    `Trả JSON đúng dạng {"turns":[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}],"summary":"..."}.\n`+
    `Có 2-4 lượt tự nhiên tiếng Việt, có một lượt hỏi hoặc phản biện, kết thúc hợp lý, không quá 180 ký tự mỗi lượt. `+
    `Không tiết lộ dữ liệu riêng hoặc đề nghị chuyển tiền.`;
}
export function parseConversation(raw,agentAId,agentBId){
  const obj=typeof raw==='string'?JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/```\s*$/,'').trim()):raw;
  if(!obj||!Array.isArray(obj.turns)||obj.turns.length<2||obj.turns.length>VUX_MAX_DIALOGUE_TURNS)throw new Error('Invalid AI dialogue');
  const turns=obj.turns.map(item=>({speaker:item.speaker==='A'?agentAId:item.speaker==='B'?agentBId:null,text:String(item.text??'').trim().slice(0,180)}));
  if(turns.some(t=>!t.speaker||!t.text))throw new Error('Invalid speaker or text');
  return {turns,summary:String(obj.summary??'').trim().slice(0,260)};
}
export function shouldEnableAutonomousAI({enabled,apiKey,mode}){
  return enabled===true&&Boolean(apiKey)&&(mode==='adaptive'||mode==='quiet');
}

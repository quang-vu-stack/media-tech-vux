// Pure plan validation: independent of network and runtime packages, easy to unit-test.
function fail(message){throw new Error('Kế hoạch AI không hợp lệ: '+message)}
function limitedText(value,min,max,label){
  if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(label);
  return value.trim();
}
export function safePlan(raw){
  const data=typeof raw==='string'?JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')):raw;
  if(!data||typeof data!=='object'||Array.isArray(data))fail('kiểu dữ liệu');
  const title=limitedText(data.title,3,120,'title');
  const description=limitedText(data.description,8,900,'description');
  if(!Number.isSafeInteger(data.rewardVnd)||data.rewardVnd<0||data.rewardVnd>5_000_000)fail('rewardVnd');
  if(!Array.isArray(data.steps)||data.steps.length<2||data.steps.length>5)fail('steps');
  const steps=data.steps.map((step,i)=>{
    if(!step||typeof step!=='object')fail('step '+i);
    const title=limitedText(step.title,4,120,'step title');
    if(!Number.isSafeInteger(step.durationMinutes)||step.durationMinutes<1||step.durationMinutes>480)fail('durationMinutes');
    return {title,durationMinutes:step.durationMinutes};
  });
  if(steps.reduce((sum,x)=>sum+x.durationMinutes,0)>1440)fail('total minutes');
  return {title,description,rewardVnd:data.rewardVnd,steps};
}
export function offlinePlan(objective,employee){
  const clean=objective.trim().slice(0,120);
  return safePlan({
    title:clean,
    description:`Kế hoạch mô phỏng công việc cho ${employee.full_name}. Đây là gameplay, không phải sản phẩm được AI tạo ngoài đời.`,
    rewardVnd:300000,
    steps:[
      {title:'Phân tích yêu cầu và chuẩn bị nguồn lực',durationMinutes:2},
      {title:'Thực hiện công việc mô phỏng theo chuyên môn',durationMinutes:3},
      {title:'Kiểm tra và viết báo cáo hoàn thành',durationMinutes:2},
    ],
  });
}
export function stepsWithProgress(plan,startTime,now,isComplete){
  const parsed=safePlan(plan);
  let elapsed=Math.max(0,Math.floor((new Date(now).getTime()-new Date(startTime).getTime())/60000));
  return parsed.steps.map(step=>{
    const status=isComplete||elapsed>=step.durationMinutes?'completed':elapsed>0?'working':'queued';
    elapsed-=step.durationMinutes;
    return {...step,status};
  });
}

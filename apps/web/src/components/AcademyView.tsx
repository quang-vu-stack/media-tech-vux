import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, GraduationCap, LockKeyhole, Printer, Trophy } from 'lucide-react';
import { request } from '../lib';
import type { AcademyChapter, GameState } from '../types';

type Props = { token:string; game:GameState; refresh:()=>Promise<void>; notify:(message:string)=>void };
type Grade = {score:number;correct:number;total:number;passed:boolean;xp_awarded:number;feedback:{isCorrect:boolean;correctIndex:number}[]};
export default function AcademyView({token,game,refresh,notify}:Props) {
  const [chapters,setChapters]=useState<AcademyChapter[]>([]);
  const [chapter,setChapter]=useState('');
  const [lessonId,setLessonId]=useState('');
  const [answers,setAnswers]=useState<Record<number,number>>({});
  const [grade,setGrade]=useState<Grade|null>(null);
  const [busy,setBusy]=useState(false);
  const [showCertificate,setShowCertificate]=useState(false);
  useEffect(()=>{
    let alive=true;
    request<{chapters:AcademyChapter[]}>('/academy',token).then(data=>{
      if(!alive)return;
      setChapters(data.chapters);
      setChapter(prev=>prev||data.chapters[0]?.id||'');
      setLessonId(prev=>prev||data.chapters[0]?.lessons[0]?.id||'');
    }).catch(error=>notify(error.message));
    return ()=>{alive=false};
  },[token,notify]);
  const lessons=useMemo(()=>chapters.flatMap(x=>x.lessons),[chapters]);
  const current=lessons.find(x=>x.id===lessonId);
  const completed=new Set((game.learning||[]).map(x=>x.lesson_id));
  const passed=completed.size;
  const progress=Math.round(100*passed/Math.max(1,lessons.length));
  const currentIndex=lessons.findIndex(x=>x.id===lessonId);
  function select(id:string){const owner=chapters.find(x=>x.lessons.some(l=>l.id===id));if(owner)setChapter(owner.id);setLessonId(id);setAnswers({});setGrade(null);setShowCertificate(false);}
  async function submit() {
    if(!current||Object.keys(answers).length!==current.questions.length)return;
    setBusy(true);
    try {
      const result=await request<Grade>('/academy/submit',token,{lessonId:current.id,answers:current.questions.map((_,i)=>answers[i])});
      setGrade(result);
      if(result.passed){await refresh();notify(`Hoàn thành: ${current.title}. +${result.xp_awarded} XP`)}
    }catch(error){notify(error instanceof Error?error.message:'Không thể lưu bài học')}
    finally{setBusy(false)}
  }
  async function certificate(){setBusy(true);try{
    await request('/academy/certificate',token,{});await refresh();setShowCertificate(true);
  }catch(error){notify(error instanceof Error?error.message:'Chưa thể cấp chứng nhận')}finally{setBusy(false)}}
  const cert=game.certificate;
  return <>
    <div className="page-title"><div><p className="eyebrow">VUX LEADERSHIP ACADEMY</p><h1><GraduationCap size={28} className="inline-icon"/> Học viện CEO</h1><p>Học để điều hành thực tế: kiến thức, bài tập và 60 câu hỏi tình huống.</p></div><div className="level-pill">{passed}/{lessons.length||30} BÀI <span>{progress}%</span></div></div>
    <div className="panel academy-hero">
      <div><p className="eyebrow">CHƯƠNG TRÌNH NỘI BỘ MEDIA TECH VUX</p><h2>Từ nhà sáng lập đến người lãnh đạo</h2><p>Lộ trình 10 chương, 30 bài, mỗi bài có lý thuyết, ví dụ, bài tập và quiz. Đạt 100% câu trả lời đúng để hoàn thành bài và nhận 75 XP.</p></div>
      <div className="academy-big-progress"><strong>{progress}%</strong><span>ĐÃ HOÀN THÀNH</span></div>
      <div className="academy-progress-line"><span style={{width:`${progress}%`}} /></div>
    </div>
    {showCertificate && cert && <div className="certificate" id="ceo-certificate">
      <div className="certificate-icon">✦ VUX</div><p>MEDIA TECH VUX · CEO ACADEMY</p><h1>CHỨNG NHẬN HOÀN THÀNH</h1><p>Trân trọng ghi nhận</p><h2>{game.ceoProfile?.display_name||'Người sáng lập'}</h2>
      <p>Đã hoàn thành chương trình học tập CEO nội bộ gồm 30 bài và 60 câu hỏi.</p><strong>{cert.code}</strong><small>Ngày cấp: {new Date(cert.issued_at).toLocaleDateString('vi-VN')}</small>
      <small>Chứng nhận trong game, không phải văn bằng được công nhận.</small>
      <button className="secondary print-hide" onClick={()=>window.print()}><Printer size={16}/> In / Lưu PDF</button>
    </div>}
    {cert && !showCertificate && <div className="panel row-line"><span className="mint"><Trophy size={18} className="inline-icon"/> Bạn đã đạt chứng nhận CEO Academy</span><button className="secondary" onClick={()=>setShowCertificate(true)}>Xem chứng nhận</button></div>}
    <div className="academy-layout">
      <aside className="panel academy-toc"><h2><BookOpen size={18} className="inline-icon"/> Giáo trình CEO</h2>
        {chapters.map((unit,index)=><div key={unit.id} className="academy-chapter"><button className={`academy-chapter-title ${chapter===unit.id?'active':''}`} onClick={()=>{setChapter(unit.id);select(unit.lessons[0].id)}}><b>{String(index+1).padStart(2,'0')}</b><span>{unit.title}<small>{unit.lessons.filter(x=>completed.has(x.id)).length}/3 hoàn thành</small></span><ChevronRight size={16}/></button>
          {chapter===unit.id && <div className="academy-lessons">{unit.lessons.map((l,i)=><button key={l.id} className={`academy-lesson-link ${lessonId===l.id?'active':''}`} onClick={()=>select(l.id)}><span>{completed.has(l.id)?<CheckCircle2 size={15}/>:<span className="lesson-number">{i+1}</span>}</span>{l.title}</button>)}</div>}
        </div>)}
      </aside>
      <div className="panel lesson-content">{current?<>
        <p className="eyebrow">BÀI {currentIndex+1} / {lessons.length||30} · {chapters.find(x=>x.id===chapter)?.title}</p><h2>{current.title} {completed.has(current.id)&&<CheckCircle2 size={19} className="mint inline-icon"/>}</h2>
        <section className="learning-section"><h3>01. Kiến thức trọng tâm</h3><p>{current.theory}</p></section>
        <section className="learning-section"><h3>02. Ví dụ từ MEDIA TECH VUX</h3><p>{current.example}</p></section>
        <section className="learning-section"><h3>03. Bài tập CEO</h3><p>{current.exercise}</p><div className="hint">Gợi ý: ghi câu trả lời vào sổ tay của bạn và áp dụng vào những quyết định trong game.</div></section>
        <section className="learning-section"><h3><CircleHelp size={19} className="inline-icon"/> 04. Kiểm tra kiến thức</h3>
          {current.questions.map((q,qi)=><div className="quiz-question" key={qi}><strong>{qi+1}. {q.q}</strong><div className="quiz-options">
            {q.options.map((option,oi)=><label className={`quiz-option ${answers[qi]===oi?'chosen':''} ${grade&&grade.feedback[qi]?.correctIndex===oi?'correct':''} ${grade&&answers[qi]===oi&&!grade.feedback[qi]?.isCorrect?'incorrect':''}`} key={oi}>
              <input type="radio" name={`q${qi}`} checked={answers[qi]===oi} onChange={()=>{setAnswers(p=>({...p,[qi]:oi}));setGrade(null)}}/><span>{String.fromCharCode(65+oi)}.</span>{option}
            </label>)}
          </div></div>)}
          {grade&&<div className={grade.passed?'success':'error'}>Kết quả {grade.score}% ({grade.correct}/{grade.total} câu). {grade.passed?`Đã đạt! +${grade.xp_awarded} XP`:'Cần đúng cả 2 câu. Hãy ôn nội dung và thử lại.'}</div>}
          <button className="primary" disabled={busy||Object.keys(answers).length!==current.questions.length} onClick={()=>void submit()}>{busy?'Đang chấm…':completed.has(current.id)?'Kiểm tra lại':'Nộp bài kiểm tra'} <Arrow size={16}/></button>
        </section>
        <div className="academy-lesson-nav"><button className="secondary" disabled={currentIndex<=0} onClick={()=>select(lessons[currentIndex-1].id)}><ChevronLeft size={16}/> Bài trước</button><button className="secondary" disabled={currentIndex>=lessons.length-1} onClick={()=>select(lessons[currentIndex+1].id)}>Bài tiếp <ChevronRight size={16}/></button></div>
      </>:<div className="empty-state"><BookOpen size={28}/><strong>Đang tải giáo trình CEO...</strong></div>}</div>
    </div>
    <div className="panel row-line"><div><h2><Award size={18} className="inline-icon"/> Chứng nhận CEO Academy</h2><p>Hoàn thành toàn bộ 30 bài để mở khóa chứng nhận nội bộ và 500 XP thưởng.</p></div><button className="primary" disabled={busy||passed<lessons.length||!lessons.length||Boolean(cert)} onClick={()=>void certificate()}>{cert?<><CheckCircle2 size={17}/> Đã cấp</>:<><LockKeyhole size={16}/> {passed}/{lessons.length||30} bài</>}</button></div>
  </>;
}
function Arrow({size}:{size:number}){return <ChevronRight size={size}/>}

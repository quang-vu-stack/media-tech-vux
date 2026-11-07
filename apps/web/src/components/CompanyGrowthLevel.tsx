import { TrendingUp, Building2, Rocket, Trophy } from 'lucide-react';
import type { Company } from '../types';
import { numberVi } from '../lib';
import { COMPANY_LEVEL_MAX, XP_PER_LEVEL, unlockedOfficeFeatures, nextOfficeUnlock } from '../office-simulation';


const STAGES = [
  {min:1,max:10,label:'Startup Studio',desc:'Khởi nghiệp VUX và tổ chức nhân sự.'},
  {min:11,max:25,label:'Growing Company',desc:'Xây dựng quy trình, khách hàng và sản phẩm.'},
  {min:26,max:50,label:'Technology Scale-up',desc:'Tăng tốc nền tảng công nghệ và AI.'},
  {min:51,max:75,label:'National Enterprise',desc:'Mở rộng quy mô tập đoàn.'},
  {min:76,max:100,label:'Legendary VUX Empire',desc:'Đế chế công nghệ cấp cao nhất.'},
];

function getStage(level: number) {
  return STAGES.find(stage => level >= stage.min && level <= stage.max) ?? STAGES[0];
}

export function getCompanyGrowthSnapshot(company: Company | null) {
  const maxLevel=company?.name?.toLowerCase().startsWith('media tech vux')===false ? 30 : COMPANY_LEVEL_MAX;
  const level = Math.max(1, Math.min(maxLevel, company?.level ?? 1));
  const totalXp = Math.max(0, company?.xp ?? 0);
  const stage = getStage(level);
  const isMax = level >= maxLevel;
  const progressXp = isMax ? XP_PER_LEVEL : totalXp % XP_PER_LEVEL;
  const progressPercent = isMax ? 100 : Math.round((progressXp / XP_PER_LEVEL) * 100);
  const nextLevel = isMax ? maxLevel : level + 1;
  return { level, totalXp, stage, isMax, progressXp, progressPercent, nextLevel, maxLevel, xpPerLevel: XP_PER_LEVEL };
}

export default function CompanyGrowthLevel({ company }: { company: Company | null }) {
  const snapshot = getCompanyGrowthSnapshot(company);
  const milestones = snapshot.maxLevel===100 ? [1,10,25,50,75,90,100] : [1,5,10,15,20,25,30];
  const unlocked = unlockedOfficeFeatures(snapshot.level);
  const nextUnlock = nextOfficeUnlock(snapshot.level);
  return (
    <section className="panel growth-panel" aria-label="Tiến trình phát triển công ty từ Level 1 đến Level Max">
      <div className="section-heading">
        <div>
          <p className="eyebrow">VIP COMPANY EVOLUTION</p>
          <h2><TrendingUp size={20} className="inline-icon" /> Tiến trình phát triển công ty</h2>
        </div>
        <span className="live-chip">LEVEL {snapshot.level} / {snapshot.maxLevel}</span>
      </div>
      <div className="growth-grid">
        <div className="growth-main-card">
          <div className="growth-level-badge"><Building2 size={18} /> {snapshot.stage.label}</div>
          <strong>{company?.name ?? "MEDIA TECH VUX"} đang ở cấp độ {snapshot.level}</strong>
          <p>{snapshot.stage.desc}</p>
          <div className="growth-progress-line">
            <div className="bar growth-bar"><span style={{ width: `${snapshot.progressPercent}%` }} /></div>
            <b>{snapshot.isMax ? 'ĐÃ ĐẠT LEVEL MAX' : `${numberVi(snapshot.progressXp)} / ${numberVi(snapshot.xpPerLevel)} XP đến Level ${snapshot.nextLevel}`}</b>
          </div>
        </div>
        <div className="growth-side-stats">
          <div><small>Tổng XP công ty</small><strong>{numberVi(snapshot.totalXp)}</strong></div>
          <div><small>Level hiện tại</small><strong>{snapshot.level}</strong></div>
          <div><small>Level tối đa</small><strong>{snapshot.maxLevel}</strong></div>
          <div><small>Trạng thái</small><strong>{snapshot.isMax ? 'VIP MAX' : 'Đang phát triển'}</strong></div>
        </div>
      </div>
      <div className="milestones-row">
        {milestones.map(mark => {
          const active = snapshot.level >= mark;
          return (
            <div key={mark} className={`milestone-chip ${active ? 'active' : ''}`}>
              <span>{mark}</span>
              <small>{mark === 1 ? 'Khởi đầu' : mark === snapshot.maxLevel ? 'Max' : `Mốc ${mark}`}</small>
            </div>
          );
        })}
      </div>
      <div className="v18-unlocks"><strong>TIẾN TRÌNH MỞ KHÓA VĂN PHÒNG 3D</strong>
        <div className="v18-unlock-cards">
          {unlocked.map(item=><div key={item.level} className="v18-unlock-card"><span>LV {item.level} ✓</span><b>{item.title}</b><small>{item.feature}</small></div>)}
          {nextUnlock&&<div className="v18-unlock-card next"><span>TIẾP THEO · LV {nextUnlock.level}</span><b>{nextUnlock.title}</b><small>{nextUnlock.feature}</small></div>}
        </div>
      </div>
      <div className="growth-notes">
        <div><Rocket size={16} /> Tăng XP bằng nhiệm vụ, hợp đồng, học viện CEO và các hoạt động điều hành.</div>
        <div><Trophy size={16} /> Level Max thể hiện phiên bản phát triển cao nhất của tập đoàn trong game.</div>
      </div>
    </section>
  );
}

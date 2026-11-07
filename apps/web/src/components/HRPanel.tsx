import {useState,type FormEvent} from 'react';
import {UserPlus,Users,Coins} from 'lucide-react';
import {request,vnd} from '../lib';
import type {GameState} from '../types';
type Props={token:string;game:GameState;refresh:()=>Promise<void>;notify:(text:string)=>void};
export default function HRPanel({token,game,refresh,notify}:Props){
 const [fullName,setName]=useState('Nguyễn Đức Minh'); const [role,setRole]=useState('Kỹ sư phần mềm');
 const [department,setDepartment]=useState('Công nghệ & AI'); const [salary,setSalary]=useState(20000000);
 const [busy,setBusy]=useState(false);
 const total=game.employees.reduce((n,e)=>n+e.salary_vnd,0);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);try{
   await request('/employees/hire',token,{fullName,role,department,salaryVnd:salary});await refresh();notify('Đã tuyển dụng nhân viên mới. Chi phí tuyển: 2.000.000 VNĐ')
 }catch(e){notify(e instanceof Error?e.message:'Không thể tuyển nhân viên')}finally{setBusy(false)}}
 return <section className="panel"><div className="section-heading"><h2><UserPlus size={20} className="inline-icon"/> Tuyển dụng & nhân sự</h2><span className="count">Tối đa 20 nhân viên trong phiên bản hiện tại</span></div>
   <div className="hr-layout"><form className="task-form" onSubmit={submit}><label>Họ và tên<input minLength={3} maxLength={65} required value={fullName} onChange={e=>setName(e.target.value)}/></label><label>Chức vụ<input minLength={3} maxLength={60} required value={role} onChange={e=>setRole(e.target.value)}/></label><label>Phòng ban<select value={department} onChange={e=>setDepartment(e.target.value)}>{['Ban điều hành','Công nghệ & AI','Truyền thông','Marketing','Kinh doanh','Tài chính & Nhân sự'].map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Lương tháng (VNĐ)<input type="number" min={8000000} max={100000000} step={1000000} value={salary} onChange={e=>setSalary(Number(e.target.value))}/></label><button type="submit" className="primary" disabled={busy||game.employees.length>=20}><UserPlus size={17}/> CEO phê duyệt tuyển dụng</button></form>
     <div className="hr-summary"><p className="eyebrow">BÁO CÁO NHÂN LỰC</p><h2><Users size={20} className="inline-icon"/>{game.employees.length} nhân viên</h2><div><span>Quỹ lương ước tính mỗi tháng</span><strong>{vnd(total)}</strong></div><div><span>Chi phí tuyển dụng một người</span><strong>{vnd(2000000)}</strong></div><div><span>Năng suất bình quân theo kỹ năng</span><strong>{Math.round(game.employees.reduce((n,e)=>n+e.skill,0)/Math.max(1,game.employees.length))}/100</strong></div><p><Coins size={15} className="inline-icon"/> Lương chỉ được trừ khi CEO phê duyệt trong mục Tài chính. Đó là tiền mô phỏng.</p></div>
   </div>
 </section>
}

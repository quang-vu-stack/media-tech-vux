import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Activity, ArrowRight, Bot, BriefcaseBusiness, Building2, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, Coins, FolderKanban, LayoutDashboard, LogOut, Menu,
  Plus, RefreshCw, Send, ShieldCheck, Sparkles, UsersRound, Wallet, X,
  Crown, GraduationCap, FileText, Timer, ChartNoAxesCombined, Swords, Globe2, Code2, Server,
} from 'lucide-react';
import OfficeScene from './components/OfficeScene';
import VuxLiveActivity from './components/VuxLiveActivity';
import AcademyView from './components/AcademyView';
import CeoOffice from './components/CeoOffice';
import ContractsView from './components/ContractsView';
import AiPlanner from './components/AiPlanner';
import AgentWorkforce from './components/AgentWorkforce';
import MarketView from './components/MarketView';
import WorldView from './components/WorldView';
import SoftwareStudio from './components/SoftwareStudio';
import HRPanel from './components/HRPanel';
import ExecutiveAnalytics from './components/ExecutiveAnalytics';
import SystemStatus from './components/SystemStatus';
import FinancialIntegrity from './components/FinancialIntegrity';
import CompanyGrowthLevel from './components/CompanyGrowthLevel';
import MeetingsView from './components/MeetingsView';
import VuxControlPanel, { DEFAULT_VUX_SETTINGS, type VuxGameSettings, type VuxConversation } from './components/VuxControlPanel';
import { normalizeVuxConversations } from './vux-live-feed.js';
import { configured, supabase, request, vnd, numberVi } from './lib';
import { useCurrencySettings, setDisplayCurrency, setRateFromServer, exactVnd, usd, fxRateText, type CurrencyRate } from './currency';
import type { ChatMessage, Employee, GameState, Task, MeetingFeed } from './types';
import { createSessionRequestGuard } from './session-guard.js';
import { createAuthSessionResolver } from './auth-session-race.js';

type Tab = 'vux' | 'dashboard' | 'meetings' | 'ceo' | 'academy' | 'employees' | 'tasks' | 'contracts' | 'ai' | 'finance' | 'analytics' | 'market' | 'world' | 'studio' | 'system';
type Provider = 'gemini' | 'openai';
const menu: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'vux', label: 'VUX · AI tự chủ', icon: Bot },
  { id: 'ceo', label: 'Phòng Chủ tịch & CEO', icon: Crown },
  { id: 'meetings', label: 'Phòng họp CEO · VIP', icon: UsersRound },
  { id: 'academy', label: 'Học viện CEO', icon: GraduationCap },
  { id: 'employees', label: 'Nhân sự', icon: UsersRound },
  { id: 'tasks', label: 'Dự án & nhiệm vụ', icon: FolderKanban },
  { id: 'contracts', label: 'Hợp đồng kinh doanh', icon: FileText },
  { id: 'market', label: 'Thị trường & đối thủ', icon: Swords },
  { id: 'world', label: 'Thế giới kinh doanh', icon: Globe2 },
  { id: 'ai', label: 'AI nhân viên', icon: Bot },
  { id: 'studio', label: 'Xưởng phần mềm AI', icon: Code2 },
  { id: 'finance', label: 'Tài chính', icon: Wallet },
  { id: 'analytics', label: 'Phân tích & thành tựu', icon: ChartNoAxesCombined },
  { id: 'system', label: 'Vận hành hệ thống', icon: Server },
];
const initialState: GameState = { company: null, employees: [], tasks: [], transactions: [] };

function Metric({ icon: Icon, label, value, foot }: { icon: typeof Wallet; label: string; value: string; foot: string }) {
  return <article className="metric">
    <div className="metric-top"><span>{label}</span><Icon size={19} /></div>
    <div className="metric-value">{value}</div><div className="metric-foot">{foot}</div>
  </article>;
}

function SetupScreen() {
  return <main className="auth-page"><div className="auth-card">
    <div className="brand-icon"><Building2 size={30}/></div>
    <p className="eyebrow">CÀI ĐẶT LẦN ĐẦU</p>
    <h1>MEDIA TECH <em>VUX</em></h1>
    <p>Chưa tìm thấy cấu hình Supabase. Hãy tạo file <code>apps/web/.env</code>, điền <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code>, sau đó khởi động lại Vite.</p>
    <div className="hint">Xem <code>HUONG_DAN_WINDOWS.md</code> trong file ZIP để thiết lập database và backend.</div>
  </div></main>;
}

function AuthScreen() {
  const [isSignUp, setSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      if (isSignUp) setNotice('Đã gửi đăng ký. Hãy kiểm tra email xác nhận nếu dự án yêu cầu. Sau đó đăng nhập.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể xác thực.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page">
    <div className="auth-decoration" />
    <form className="auth-card" onSubmit={submit}>
      <div className="brand-icon"><Building2 size={30}/></div>
      <p className="eyebrow">AI BUSINESS SIMULATOR · PHASE 01</p>
      <h1>MEDIA TECH <em>VUX</em></h1>
      <p className="intro">Xây dựng đế chế truyền thông & công nghệ của riêng bạn.</p>
      <div className="auth-switch"><button type="button" className={!isSignUp ? 'active' : ''} onClick={() => setSignUp(false)}>Đăng nhập</button><button type="button" className={isSignUp ? 'active' : ''} onClick={() => setSignUp(true)}>Đăng ký</button></div>
      <label>Email<input type="email" placeholder="ceo@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
      <label>Mật khẩu<input type="password" minLength={6} placeholder="Tối thiểu 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={isSignUp ? 'new-password' : 'current-password'} /></label>
      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}
      <button className="primary wide" disabled={busy} type="submit">{busy ? 'Đang xử lý…' : (isSignUp ? 'Tạo tài khoản' : 'Vào trụ sở CEO')} <ArrowRight size={17}/></button>
      <p className="auth-note"><ShieldCheck size={14}/> Dữ liệu công ty gắn với tài khoản Supabase.</p>
    </form>
  </main>;
}

function CompanyOnboarding({ token, onCreated }: { token: string; onCreated: () => Promise<void> }) {
  const name = 'MEDIA TECH VUX';
  const [ceoName,setCeoName]=useState('Quang Vũ');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await request('/company', token, { name });
      await request('/ceo/profile',token,{displayName:ceoName,bio:'Nhà sáng lập và người điều hành MEDIA TECH VUX'},'PUT');
      await onCreated(); }
    catch(e) { setError(e instanceof Error ? e.message : 'Không thể khởi tạo'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={create}>
    <div className="brand-icon"><BriefcaseBusiness size={30}/></div>
    <p className="eyebrow">CHÀO MỪNG CEO</p>
    <h1>Bạn là người đứng đầu</h1>
    <p className="intro">Vốn ban đầu: <strong className="mint">2.000.000.000 ₫</strong>. Cùng 19 nhân viên mẫu và hệ thống thưởng nhiệm vụ.</p>
    <label>Danh xưng CEO của bạn<input value={ceoName} minLength={2} maxLength={60} required onChange={e=>setCeoName(e.target.value)}/></label>
    <label>Tên tập đoàn<input value={name} minLength={3} maxLength={70} readOnly title="Tên VUX được cố định để tránh tạo nhầm công ty VUS 10 tỷ" /></label>
    {error && <div className="error">{error}</div>}
    <button className="primary wide" type="submit" disabled={busy}>{busy ? 'Đang khởi tạo…' : 'Thành lập MEDIA TECH VUX'} <ArrowRight size={17}/></button>
  </form></main>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [vuxSettings,setVuxSettings]=useState<VuxGameSettings>(DEFAULT_VUX_SETTINGS);
  const [vuxConversations,setVuxConversations]=useState<VuxConversation[]>([]);
  const moneySettings = useCurrencySettings();
  const [authReady, setAuthReady] = useState(false);
  const [game, setGame] = useState<GameState>(initialState);
  const [meetingFeed,setMeetingFeed]=useState<MeetingFeed>({active:null,history:[]});
  const [loading, setLoading] = useState(true);
  // Gate company data by the exact auth session token so a former CEO's data
  // cannot briefly appear while another account is loading.
  const [loadedForToken, setLoadedForToken] = useState<string | null>(null);
  const gameGate = useRef(createSessionRequestGuard());
  const gameAbortRef = useRef<AbortController | null>(null);
  const meetingGate = useRef(createSessionRequestGuard());
  const meetingAbortRef = useRef<AbortController | null>(null);
  const chatGate = useRef(createSessionRequestGuard());
  const [historyScope, setHistoryScope] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice,setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskReward, setTaskReward] = useState(500000);
  const [taskEmployee, setTaskEmployee] = useState('');
  const [payrollBusy,setPayrollBusy] = useState(false);
  const [autoTask,setAutoTask] = useState(true);
  const [durationMinutes,setDurationMinutes] = useState(5);
  const [provider, setProvider] = useState<Provider>('gemini');
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    // Auth events must override a delayed getSession response (account switch).
    const resolver=createAuthSessionResolver<Session>(next=>{
      setSession(next);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      resolver.onEvent(next);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      resolver.onInitial(sessionError ? null : data.session);
    }).catch(() => resolver.onInitial(null));
    return () => { resolver.dispose(); subscription.unsubscribe(); };
  }, []);

  const token = session?.access_token;
  // Poll saved AI conversations while the VUX company is loaded. Never generate
  // speculative dialogue, fetch data belonging to an old CEO, or call Gemini in-browser.
  const vuxCompanyId = loadedForToken === token && game.company?.name.toLowerCase().startsWith('media tech vux') ? game.company.id : null;
  const vuxConversationAbort=useRef<AbortController|null>(null);
  const refreshVuxConversations=useCallback(async()=>{
    if(!token||!vuxCompanyId||vuxConversationAbort.current)return;
    const controller=new AbortController();vuxConversationAbort.current=controller;
    try{
      const result=await request<{conversations:VuxConversation[]}>('/vux/conversations',token,undefined,undefined,20_000,controller.signal);
      if(!controller.signal.aborted)setVuxConversations(normalizeVuxConversations(result.conversations));
    }catch{ /* Settings view shows actionable errors; no fake chat bubbles on failure. */ }
    finally{if(vuxConversationAbort.current===controller)vuxConversationAbort.current=null;}
  },[token,vuxCompanyId]);
  useEffect(()=>{
    setVuxSettings(DEFAULT_VUX_SETTINGS);setVuxConversations([]);
    if(!token||!vuxCompanyId)return;
    const controller=new AbortController();
    void request<{settings:VuxGameSettings}>('/vux/settings',token,undefined,undefined,20_000,controller.signal)
      .then(r=>{if(!controller.signal.aborted)setVuxSettings({...DEFAULT_VUX_SETTINGS,...r.settings});}).catch(()=>{});
    void refreshVuxConversations();
    const interval=window.setInterval(()=>{
      if(!document.hidden)void refreshVuxConversations();
    },25_000);
    const visible=()=>{if(!document.hidden)void refreshVuxConversations();};
    document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',visible);controller.abort();vuxConversationAbort.current?.abort();vuxConversationAbort.current=null;};
  },[token,vuxCompanyId,refreshVuxConversations]);

  gameGate.current.setOwner(token);
  meetingGate.current.setOwner(token);
  const chatScope = token && selectedId ? `${token}::${selectedId}` : null;
  chatGate.current.setOwner(chatScope);
  useEffect(() => {
    if (!token) return;
    let mounted = true;
    request<CurrencyRate>('/fx/usd-vnd', token).then(rate => { if (mounted) setRateFromServer(rate); }).catch(() => { /* explicit dated fallback remains visible */ });
    return () => { mounted = false; };
  }, [token]);
  const reloadMeetings=useCallback(async()=>{
    if(!token)return;
    const ticket=meetingGate.current.begin(token);
    if(!ticket)return;
    meetingAbortRef.current?.abort();
    const controller = new AbortController();
    meetingAbortRef.current = controller;
    try {
      const next=await request<MeetingFeed>('/meetings',token,undefined,undefined,20_000,controller.signal);
      if(meetingGate.current.isCurrent(ticket)) setMeetingFeed(next);
    } finally {
      if(meetingAbortRef.current===controller) meetingAbortRef.current=null;
    }
  },[token]);
  useEffect(()=>{
    if(!token){setMeetingFeed({active:null,history:[]});return;}
    // Meetings are optional until v18 SQL migration is applied.
    void reloadMeetings().catch(()=>{});
    const id=window.setInterval(()=>void reloadMeetings().catch(()=>{}),15000);
    return ()=>{window.clearInterval(id);meetingAbortRef.current?.abort();};
  },[token,reloadMeetings]);
  const refresh = useCallback(async () => {
    if (!token) return;
    const ticket=gameGate.current.begin(token);
    if(!ticket) return;
    // Stop an older request so a slow network cannot waste bandwidth or
    // overwrite a more recent state response.
    gameAbortRef.current?.abort();
    const controller = new AbortController();
    gameAbortRef.current = controller;
    try {
      const data = await request<GameState>('/state', token,undefined,undefined,20_000,controller.signal);
      if(!gameGate.current.isCurrent(ticket)) return;
      setGame(data); setLoadedForToken(token); setError('');
      setSelectedId(previous => previous && data.employees.some(e => e.id === previous) ? previous : data.employees[0]?.id ?? null);
      setTaskEmployee(previous => previous && data.employees.some(e => e.id === previous) ? previous : data.employees[0]?.id ?? '');
    } catch(e) {
      if(gameGate.current.isCurrent(ticket)) {
        // A first failed load must show the retry screen, NOT spin forever.
        setLoadedForToken(token);
        setError(e instanceof Error ? e.message : 'Không tải được tiến trình.');
      }
    } finally {
      if(gameAbortRef.current===controller) gameAbortRef.current=null;
      if(gameGate.current.isCurrent(ticket)) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Hide cached company/chat/meeting data while a new token is verified.
    setGame(initialState);
    setMeetingFeed({active:null,history:[]});
    setHistory([]);
    setHistoryScope(null);
    setChatBusy(false);
    setSelectedId(null);
    setTaskEmployee('');
    setLoadedForToken(null);
    setError('');
    setNotice('');
    setLoading(true);
    if (!token) return;
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 30_000);
    return () => {window.clearInterval(interval);gameAbortRef.current?.abort();};
  }, [token, refresh]);

  const selected = useMemo(() => game.employees.find(e => e.id === selectedId) ?? null, [selectedId, game.employees]);
  const activeTasks = game.tasks.filter(task => task.status === 'in_progress');
  const finishedTasks = game.tasks.filter(task => task.status === 'completed');
  const notify = useCallback((message: string) => setNotice(message),[]);

  useEffect(() => {
    if (!token || !selectedId || tab !== 'ai' || !chatScope) return;
    const ticket=chatGate.current.begin(chatScope);
    if(!ticket) return;
    const controller=new AbortController();
    setHistory([]);setHistoryScope(null);
    void request<{ messages: ChatMessage[] }>(`/ai/history?employeeId=${encodeURIComponent(selectedId)}`, token,undefined,undefined,20_000,controller.signal)
      .then(data => { if(chatGate.current.isCurrent(ticket)){setHistory(data.messages);setHistoryScope(chatScope);} })
      .catch(e => { if(chatGate.current.isCurrent(ticket)) setError(e instanceof Error ? e.message : 'Không tải được hội thoại'); });
    return () => {controller.abort();chatGate.current.cancel();};
  }, [token, selectedId, tab, chatScope]);
  const visibleHistory = historyScope === chatScope ? history : [];
  useEffect(() => { setChatBusy(false); }, [chatScope]);

  async function submitTask(event: FormEvent) {
    event.preventDefault(); if (!token || !taskEmployee) return;
    setBusy(true); setError('');
    try {
      await request(autoTask ? '/tasks/auto' : '/tasks', token, { employeeId: taskEmployee, title: taskTitle, description: taskDescription, rewardVnd: taskReward, ...(autoTask ? { durationMinutes } : {}) });
      setTaskTitle(''); setTaskDescription(''); await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Không thể giao việc'); }
    finally { setBusy(false); }
  }
  async function advanceTask(id: string) {
    if (!token) return; setBusy(true); setError('');
    try { await request(`/tasks/${id}/advance`, token, {}, 'POST'); await refresh(); }
    catch(e) { setError(e instanceof Error ? e.message : 'Không thể cập nhật tiến độ'); }
    finally { setBusy(false); }
  }
  async function sendMessage(event: FormEvent) {
    event.preventDefault(); if (!token || !selected || !draft.trim() || !chatScope) return;
    const ticket = chatGate.current.begin(chatScope);
    if(!ticket) return;
    setChatBusy(true); setError('');
    const message = draft.trim(); setDraft('');
    try {
      await request('/ai/chat', token, { employeeId: selected.id, provider, message });
      if(!chatGate.current.isCurrent(ticket)) return;
      const data = await request<{ messages: ChatMessage[] }>(`/ai/history?employeeId=${encodeURIComponent(selected.id)}`, token);
      if(chatGate.current.isCurrent(ticket)) {setHistory(data.messages);setHistoryScope(chatScope);}
    } catch(e) {
      if(chatGate.current.isCurrent(ticket)) {setDraft(message);setError(e instanceof Error ? e.message : 'AI không phản hồi');}
    } finally {
      if(chatGate.current.isCurrent(ticket)) setChatBusy(false);
    }
  }
  async function payPayroll(){
    if(!token)return;
    const dateParts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).formatToParts(new Date());
    const getPart=(type:string)=>dateParts.find(part=>part.type===type)?.value||'';
    const period=`${getPart('year')}-${getPart('month')}`;
    setPayrollBusy(true);setError('');
    try {const result=await request<{payroll:{total_vnd:number}}>('/payroll/pay',token,{period});await refresh();
      setNotice(`Đã trả lương tháng ${period}: ${vnd(result.payroll.total_vnd)}.`);
    } catch(e) {setError(e instanceof Error?e.message:'Không thể thanh toán bảng lương')}
    finally{setPayrollBusy(false)}
  }
  function navigate(next: Tab) { setTab(next); setMenuOpen(false); }
  if (!configured) return <SetupScreen />;
  if (!authReady) return <div className="loading-screen"><span className="spinner" />Đang xác thực...</div>;
  if (!session) return <AuthScreen />;
  if (loading || loadedForToken !== token) return <div className="loading-screen"><span className="spinner" />Đang tải tập đoàn...</div>;
  if (!game.company && !error) return <CompanyOnboarding token={token!} onCreated={refresh} />;
  const company = game.company;
  const tabName = menu.find(item => item.id === tab)?.label ?? 'Tổng quan';
  return <div className="shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="logo"><div className="logo-mark"><Building2 size={23}/></div><div><strong>MEDIA TECH</strong><em>VUX · CEO OS</em></div></div>
      <p className="nav-title">TRUNG TÂM ĐIỀU HÀNH</p>
      <nav aria-label="Điều hướng chính">
        {menu.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-link ${tab === id ? 'selected' : ''}`} onClick={() => navigate(id)}><Icon size={19}/>{label}{tab === id && <ChevronRight size={15} className="nav-chevron"/>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="ceo-sidebar-stamp"><Crown size={16}/> CHỦ TỊCH & CEO</div><div className="status-dot"><span /> DATABASE ONLINE*</div>
        <p>*Khi API & Supabase kết nối thành công</p>
        <button className="logout" onClick={() => void supabase?.auth.signOut()}><LogOut size={17}/> Đăng xuất</button>
      </div>
    </aside>
    {menuOpen && <button className="mobile-overlay" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} />}
    <div className="main-area">
      <header className="topbar"><button className="mobile-menu icon-btn" aria-label="Mở menu" onClick={() => setMenuOpen(true)}><Menu size={22}/></button>
        <div className="breadcrumb">TẬP ĐOÀN <ChevronRight size={13}/> <strong>{tabName}</strong></div>
        <div className="header-actions"><button className="ceo-header-name" onClick={() => navigate('ceo')}><Crown size={15}/> {game.ceoProfile?.display_name || 'CEO'}</button>
          <label className="currency-picker" title="Chọn đơn vị tiền chỉ để hiển thị">Tiền tệ
            <select aria-label="Đơn vị tiền hiển thị" value={moneySettings.mode} onChange={event => setDisplayCurrency(event.target.value as 'USD' | 'VND')}>
              <option value="VND">VNĐ</option><option value="USD">USD ($)</option>
            </select>
          </label>
          <div className="header-balance"><span className="header-money"><Coins size={16}/>{company ? vnd(company.treasury_vnd) : '---'}</span>
            {company && <span className="currency-equivalent" title="Số dư quy đổi tham khảo; tiền gốc luôn là VNĐ">≈ {moneySettings.mode === 'USD' ? exactVnd(company.treasury_vnd) : usd(company.treasury_vnd)}</span>}
          </div>
          <button className="icon-btn" aria-label="Tải lại dữ liệu" title="Tải lại" onClick={() => void refresh()}><RefreshCw size={18}/></button>
          <span className="profile">CEO</span>
        </div>
      </header>
      <main className="content">
        {error && <div className="error error-banner"><span>{error}</span><button aria-label="Đóng thông báo" onClick={() => setError('')}><X size={16}/></button></div>}
        {notice && <div className="info-banner"><span>{notice}</span><button aria-label="Đóng thông báo" onClick={()=>setNotice('')}><X size={16}/></button></div>}
        {!company ? <section className="panel"><h2>Chưa tải được tập đoàn</h2><p>Kiểm tra API, Supabase, schema SQL rồi nhấn tải lại.</p><button className="primary" onClick={() => void refresh()}>Thử lại</button></section> : <>
          {tab === 'dashboard' && <>
            <div className="page-title"><div><p className="eyebrow">EXECUTIVE COMMAND CENTER</p><h1>Xin chào, CEO {game.ceoProfile?.display_name && game.ceoProfile.display_name !== 'CEO' ? game.ceoProfile.display_name : ''} <span className="wave">✦</span></h1><p>Đây là toàn cảnh hoạt động của <strong>{company.name}</strong>.</p></div><div className="level-pill">LEVEL {company.level} / {company.name.toLowerCase().startsWith('media tech vux')?100:30}<span> {numberVi(company.xp)} XP</span></div></div>
            <div className="ceo-welcome-panel"><div><p className="eyebrow">BẠN LÀ NGƯỜI ĐỨNG ĐẦU</p><strong><Crown size={21} className="inline-icon"/> Chủ tịch Hội đồng quản trị & Tổng Giám đốc</strong><p>Điều hành tập đoàn, giao việc cho AI, ký hợp đồng và phát triển kỹ năng CEO qua học viện.</p></div><div className="button-row"><button className="primary" onClick={()=>navigate('ceo')}>Phòng CEO <ArrowRight size={16}/></button><button className="secondary" onClick={()=>navigate('academy')}>Học CEO <GraduationCap size={16}/></button></div></div>
            <div className="metrics">
              <Metric icon={Wallet} label="NGÂN QUỸ" value={vnd(company.treasury_vnd)} foot="Vốn và giao dịch thực trong game" />
              <Metric icon={UsersRound} label="NHÂN SỰ" value={String(game.employees.length).padStart(2, '0')} foot={`${game.employees.filter(e => e.status === 'working').length} người đang nhận việc`} />
              <Metric icon={Activity} label="NHIỆM VỤ ĐANG CHẠY" value={String(activeTasks.length).padStart(2, '0')} foot={`${finishedTasks.length} nhiệm vụ đã hoàn thành`} />
              <Metric icon={Sparkles} label="KINH NGHIỆM" value={`${numberVi(company.xp % 500)} / 500`} foot={`Cấp ${company.level} · +120 XP/nhiệm vụ`} />
            </div>
            <CompanyGrowthLevel company={company} />
            {meetingFeed.active&&<div className="v18-meeting-banner"><UsersRound size={19}/><strong>CEO đang họp: {meetingFeed.active.title}</strong><span>{meetingFeed.active.attendee_ids.length} nhân viên tham gia</span><button className="secondary small" onClick={()=>navigate('meetings')}>Quản lý cuộc họp</button></div>}
            <div className="workspace-grid">
              <section className="panel office-panel"><div className="section-heading"><div><p className="eyebrow">SIMULATION VIEW</p><h2>Trụ sở MEDIA TECH VUX</h2></div><span className="live-chip"><span/> 3D VIEW</span></div>
                <OfficeScene onContractsSelect={()=>navigate('contracts')} contracts={game.contracts||[]} timeScale={vuxSettings.time_scale} chatBubbles={vuxSettings.show_chat_bubbles} conversations={vuxConversations} employees={game.employees} tasks={game.tasks} meeting={meetingFeed.active} selectedId={selectedId} ceoName={game.ceoProfile?.display_name||'CEO'} companyLevel={company.level} companyName={company.name} onMeetingSelect={()=>navigate('meetings')} onCeoSelect={()=>navigate('ceo')} onSelect={id => { setSelectedId(id); setTab('employees'); }}/>
                <div className="vux-floating-toolbar"><button onClick={()=>navigate('employees')}>Nhân sự</button><button onClick={()=>navigate('contracts')}>Hợp đồng</button><button onClick={()=>navigate('meetings')}>Phòng họp</button><button onClick={()=>navigate('vux')}>Cài đặt AI</button></div>
              </section>
              <section className="panel info-panel"><div className="section-heading"><div><p className="eyebrow">EMPLOYEE PROFILE</p><h2>Hồ sơ nhân viên</h2></div></div>
                {selected ? <EmployeeDetails employee={selected} /> : <p>Chưa có nhân viên.</p>}
                <button className="secondary wide" onClick={() => navigate('ai')}><Bot size={17}/> Trò chuyện với nhân viên <ArrowRight size={16}/></button>
              </section>
            </div>
            {vuxCompanyId && <VuxLiveActivity items={vuxConversations} employees={game.employees} onOpen={()=>navigate('vux')} onRefresh={()=>void refreshVuxConversations()} />}
            <section className="panel"><div className="section-heading"><div><p className="eyebrow">WORK QUEUE</p><h2>Nhiệm vụ gần đây</h2></div><button className="secondary" onClick={() => navigate('tasks')}>Quản lý <ArrowRight size={16}/></button></div>
              <TaskList tasks={game.tasks.slice(0, 5)} employees={game.employees} advance={advanceTask} busy={busy} />
            </section>
          </>}
          {tab === 'meetings' && <MeetingsView token={token!} employees={game.employees} tasks={game.tasks} companyName={company.name} companyLevel={company.level} ceoName={game.ceoProfile?.display_name||'CEO'} onEmployeeSelect={id=>{setSelectedId(id);navigate('employees');}} onCeoSelect={()=>navigate('ceo')} feed={meetingFeed} reload={reloadMeetings} refreshGame={refresh} notify={notify}/>}
          {tab === 'vux' && <VuxControlPanel token={token!} employees={game.employees} settings={vuxSettings} setSettings={setVuxSettings} setConversations={setVuxConversations} companyName={company.name} onRefresh={refresh} notify={notify}/> }
          {tab === 'ceo' && <CeoOffice token={token!} game={game} refresh={refresh} notify={notify}/>}
          {tab === 'academy' && <AcademyView token={token!} game={game} refresh={refresh} notify={notify}/>}
          {tab === 'contracts' && <ContractsView token={token!} game={game} refresh={refresh} notify={notify}/>}
          {tab === 'employees' && <>
            <div className="page-title"><div><p className="eyebrow">HUMAN RESOURCES</p><h1>Đội ngũ nhân sự</h1><p>Chọn nhân viên trong mô hình 3D hoặc danh sách.</p></div></div>
            <section className="panel office-panel"><OfficeScene onContractsSelect={()=>navigate('contracts')} contracts={game.contracts||[]} timeScale={vuxSettings.time_scale} chatBubbles={vuxSettings.show_chat_bubbles} conversations={vuxConversations} employees={game.employees} tasks={game.tasks} meeting={meetingFeed.active} selectedId={selectedId} ceoName={game.ceoProfile?.display_name||'CEO'} companyLevel={company.level} companyName={company.name} onMeetingSelect={()=>navigate('meetings')} onCeoSelect={()=>navigate('ceo')} onSelect={setSelectedId}/></section>
            <div className="employee-grid">{game.employees.map((employee, index) => <button key={employee.id} className={`employee-card ${selectedId === employee.id ? 'picked' : ''}`} onClick={() => setSelectedId(employee.id)}>
              <span className={`avatar avatar-${index % 5}`}>{employee.full_name.split(' ').slice(-2).map(part => part[0]).join('')}</span><strong>{employee.full_name}</strong><span>{employee.role}</span><small>{employee.department}</small><span className={`tiny-status ${employee.status}`}>{employee.status === 'working' ? '● Đang làm việc' : '● Sẵn sàng'}</span>
            </button>)}</div>
            {selected && <section className="panel"><EmployeeDetails employee={selected}/><div className="button-row"><button className="primary" onClick={() => { setTaskEmployee(selected.id); navigate('tasks'); }}><Plus size={16}/> Giao nhiệm vụ</button><button className="secondary" onClick={() => navigate('ai')}><Bot size={16}/> Nói chuyện AI</button></div></section>}
            <HRPanel token={token!} game={game} refresh={refresh} notify={notify}/>
          </>}
          {tab === 'tasks' && <>
            <div className="page-title"><div><p className="eyebrow">PROJECT MANAGEMENT</p><h1>Giao việc và thưởng</h1><p>Chọn tự động để nhân viên hoàn thành theo thời hạn, hoặc thủ công để CEO theo dõi từng mốc.</p></div></div>
            <div className="tasks-layout"><section className="panel"><div className="section-heading"><h2>Tạo nhiệm vụ</h2><Plus size={20}/></div>
              <form className="task-form" onSubmit={submitTask}>
                <label>Nhân viên<select value={taskEmployee} onChange={e => setTaskEmployee(e.target.value)}>{game.employees.map(employee => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.role}</option>)}</select></label>
                <label>Tên nhiệm vụ<input required minLength={3} maxLength={120} value={taskTitle} placeholder="VD: Hoàn thiện website khách hàng" onChange={e => setTaskTitle(e.target.value)}/></label>
                <label>Mô tả<textarea value={taskDescription} maxLength={1000} rows={4} placeholder="Mục tiêu, tiêu chí hoàn thành..." onChange={e => setTaskDescription(e.target.value)}/></label>
                <label>Thưởng khi hoàn thành (VNĐ)<input required type="number" step={100000} min={0} max={5000000} value={taskReward} onChange={e => setTaskReward(Number(e.target.value))}/></label>
                <label>Chế độ thực hiện<select value={autoTask?'auto':'manual'} onChange={e=>setAutoTask(e.target.value==='auto')}><option value="auto">Tự động theo thời hạn (server)</option><option value="manual">CEO cập nhật từng mốc 25%</option></select></label>
                {autoTask&&<label>Thời gian thực hiện (phút)<input type="number" min={1} max={1440} step={1} value={durationMinutes} onChange={e=>setDurationMinutes(Number(e.target.value))}/></label>}
                <div className="hint">{autoTask?'Nhiệm vụ được hoàn thành khi đến hạn, ngay cả khi trình duyệt đóng, miễn backend còn chạy. Nếu backend tắt, sẽ xử lý bù khi bật lại.':'Bạn trực tiếp bấm tiến độ từng 25%.'} Thưởng chỉ trừ ngân quỹ khi đạt 100%, tối đa 5 triệu/nhiệm vụ.</div>
                <button className="primary wide" disabled={busy} type="submit"><Plus size={17}/> {busy ? 'Đang xử lý…' : 'CEO phê duyệt & giao việc'}</button>
              </form></section>
              <section className="panel"><div className="section-heading"><h2>Danh sách nhiệm vụ</h2><span className="count">{game.tasks.length} nhiệm vụ</span></div><TaskList tasks={game.tasks} employees={game.employees} advance={advanceTask} busy={busy}/></section>
            </div>
          </>}
          {tab === 'ai' && <>
            <div className="page-title"><div><p className="eyebrow">DUAL AI PROVIDER</p><h1>Phòng họp AI <Sparkles size={24}/></h1><p>Chat với nhân viên sử dụng API phía máy chủ. Hội thoại được lưu theo tài khoản.</p></div></div>
            <div className="ai-layout"><section className="panel ai-side"><h2>Nhân viên AI</h2><label>Chọn nhân viên<select value={selectedId || ''} onChange={e => setSelectedId(e.target.value)}>{game.employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></label>
              <label>Nhà cung cấp<select value={provider} onChange={e => setProvider(e.target.value as Provider)}><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></label>
              {selected && <EmployeeDetails employee={selected}/>}<div className="hint">Hội thoại AI tư vấn; bên dưới có hệ thống lập kế hoạch nhiều bước và mô phỏng tiến độ tự động sau khi CEO duyệt.</div>
            </section><section className="panel chat-panel"><div className="section-heading"><h2><Bot size={21}/> Hội thoại với {selected?.full_name ?? 'nhân viên'}</h2><span className="live-chip">{provider.toUpperCase()}</span></div>
              <div className="chat-history" role="log" aria-live="polite">{visibleHistory.length === 0 && <div className="chat-empty"><Bot size={33}/><strong>Bắt đầu cuộc họp</strong><span>Ví dụ: Hãy đề xuất kế hoạch phát triển sản phẩm mới cho tập đoàn.</span></div>}
                {visibleHistory.map(message => <div key={message.id} className={`chat-bubble ${message.actor}`}>{message.content}</div>)}
                {chatBusy && <div className="chat-bubble assistant">AI đang suy nghĩ...</div>}
              </div><form className="chat-send" onSubmit={sendMessage}><input aria-label="Nội dung nhắn cho AI" placeholder="Nhập chỉ đạo hoặc câu hỏi..." maxLength={1500} value={draft} onChange={e => setDraft(e.target.value)} /><button className="primary" type="submit" disabled={chatBusy || !draft.trim()} aria-label="Gửi tin nhắn"><Send size={18}/></button></form>
            </section></div>
            <AiPlanner token={token!} employees={game.employees} refresh={refresh} notify={notify}/>
            <AgentWorkforce token={token!} employees={game.employees} refresh={refresh} notify={notify}/>
          </>}
          {tab === 'studio' && <SoftwareStudio token={token!} employees={game.employees} notify={notify}/>}
          {tab === 'analytics' && <ExecutiveAnalytics game={game}/>}
          {tab === 'system' && <SystemStatus token={token!}/>}
          {tab === 'finance' && <FinancialIntegrity token={token!}/>}
          {tab === 'market' && <MarketView token={token!} refresh={refresh} notify={notify}/>}
          {tab === 'world' && <WorldView token={token!} refresh={refresh} notify={notify}/>}
          {tab === 'finance' && <>
            <section className="panel currency-report" aria-label="Cài đặt tiền tệ và tỷ giá quy đổi">
              <div className="section-heading"><h2>Quy đổi tiền tệ của CEO</h2><span className="live-chip">{moneySettings.mode === 'USD' ? 'USD ($)' : 'VNĐ (₫)'}</span></div>
              <div className="currency-summary"><div><small>Ngân quỹ hiển thị</small><strong>{vnd(company.treasury_vnd)}</strong></div><div><small>Giá trị tương đương</small><strong>{moneySettings.mode === 'USD' ? exactVnd(company.treasury_vnd) : usd(company.treasury_vnd)}</strong></div></div>
              <p className="fx-rate-note">1 USD ≈ {fxRateText()} · Cập nhật {new Date(moneySettings.rate.asOf).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. {moneySettings.rate.isFallback ? 'Đang dùng tỷ giá dự phòng có ngày ghi nhận; KHÔNG phải tỷ giá trực tiếp.' : 'Tỷ giá tham khảo từ nhà cung cấp, cập nhật mỗi ngày.'}</p>
              <p className="fx-rate-note">Chuyển USD/VNĐ chỉ đổi cách hiển thị; không mua bán ngoại tệ và không thay đổi số dư, lương, hợp đồng hoặc sổ cái. Ô nhập ngân sách vẫn dùng VNĐ như nhãn.</p>
              <a className="fx-attribution" href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Rates By Exchange Rate API</a>
            </section>
            <div className="page-title"><div><p className="eyebrow">FINANCIAL CONTROL</p><h1>Báo cáo tài chính</h1><p>Sổ cái ghi lại toàn bộ thay đổi ngân quỹ.</p></div></div>
            <div className="metrics two-metrics"><Metric icon={CircleDollarSign} label="SỐ DƯ HIỆN TẠI" value={vnd(company.treasury_vnd)} foot="Không sửa trực tiếp từ frontend" /><Metric icon={Coins} label="ĐÃ CHI THƯỞNG" value={vnd(game.transactions.filter(t => t.kind === 'task_bonus').reduce((sum,t)=>sum+Math.abs(t.amount_vnd),0))} foot="Trong 40 giao dịch gần nhất" /></div>
            <section className="panel"><div className="section-heading"><h2>Lịch sử giao dịch</h2><span className="count">40 giao dịch gần nhất</span></div>
              <div className="ledger-table"><div className="ledger-head"><span>THỜI GIAN / NỘI DUNG</span><span>BIẾN ĐỘNG</span><span>SỐ DƯ</span></div>
                {game.transactions.map(tx => <div className="ledger-row" key={tx.id}><div><strong>{tx.note}</strong><small>{new Date(tx.created_at).toLocaleString('vi-VN')}</small></div><strong className={tx.amount_vnd > 0 ? 'mint' : 'rose'}>{tx.amount_vnd > 0 ? '+' : ''}{vnd(tx.amount_vnd)}</strong><span>{vnd(tx.balance_after_vnd)}</span></div>)}
              </div>
            </section>
            <section className="panel payroll-box"><div><p className="eyebrow">CEO PAYROLL APPROVAL</p><h2>Thanh toán lương nhân viên</h2><p>Tổng quỹ lương tháng hiện tại: <strong className="mint">{vnd(game.employees.reduce((sum,e)=>sum+e.salary_vnd,0))}</strong></p><p>Mỗi tháng chỉ thanh toán một lần. Tài chính và bảng lương sẽ được lưu vào Supabase.</p><small>Đã thanh toán: {(game.payrolls||[]).map(x=>x.period).join(', ')||'Chưa có kỳ lương'}</small></div><button className="primary" disabled={payrollBusy} onClick={()=>void payPayroll()}><CircleDollarSign size={17}/> {payrollBusy?'Đang trả…':'CEO duyệt trả lương tháng này'}</button></section>
          </>}
        </>}
        <footer>MEDIA TECH VUX © 2026 · CEO EMPIRE v30 · Game mô phỏng không dùng tiền thật · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Rates By Exchange Rate API</a></footer>
      </main>
    </div>
  </div>;
}

function EmployeeDetails({ employee }: { employee: Employee }) {
  return <div className="employee-details">
    <div className="detail-person"><div className="detail-avatar">{employee.full_name.slice(-1)}</div><div><strong>{employee.full_name}</strong><span>{employee.role}</span><small>{employee.department}</small></div></div>
    <div className="skill"><div><span>Năng lực chuyên môn</span><b>{employee.skill}/100</b></div><div className="bar"><span style={{width:`${employee.skill}%`}}/></div></div>
    <div className="skill"><div><span>Tinh thần làm việc</span><b>{employee.morale}/100</b></div><div className="bar morale"><span style={{width:`${employee.morale}%`}}/></div></div>
    <div className="details-row"><span><Clock3 size={15}/> {employee.status === 'working' ? 'Đang làm nhiệm vụ' : 'Sẵn sàng nhận việc'}</span><strong>{vnd(employee.salary_vnd)}/tháng</strong></div>
  </div>;
}

function TaskList({ tasks, employees, advance, busy }: { tasks: Task[]; employees: Employee[]; advance: (id: string) => void; busy: boolean }) {
  if (!tasks.length) return <div className="empty-state"><FolderKanban size={27}/><strong>Chưa có nhiệm vụ</strong><span>Vào mục Dự án & nhiệm vụ để bắt đầu giao việc.</span></div>;
  return <div className="task-list">{tasks.map(task => <article className="task-row" key={task.id}>
    <div className="task-main"><div className="task-title"><span className={`task-icon ${task.status}`} >{task.status === 'completed' ? <CheckCircle2 size={20}/> : <Activity size={20}/>}</span><div><strong>{task.title}</strong><small>{employees.find(e => e.id === task.employee_id)?.full_name ?? 'Nhân viên'} {task.auto_mode?'· Chạy tự động':'· Thủ công'}</small></div></div>
      {task.description && <p>{task.description}</p>}<div className="progress-row"><div className="bar"><span style={{ width: `${task.progress}%` }}/></div><b>{task.progress}%</b></div>
    </div><div className="task-action"><span className="task-reward">Thưởng {vnd(task.reward_vnd)}</span>{task.status === 'completed' ? <span className="done-label"><CheckCircle2 size={15}/> Hoàn thành</span> : task.status === 'cancelled' ? <span className="auto-deadline">Đã từ chối · Không thưởng</span> : task.auto_mode ? <span className="auto-deadline"><Timer size={15}/> Tự động: {task.due_at?new Date(task.due_at).toLocaleString('vi-VN'):'Đang xử lý'}</span> : <button disabled={busy} className="secondary small" onClick={() => advance(task.id)}>Tiến độ +25% <ArrowRight size={14}/></button>}</div>
  </article>)}</div>;
}

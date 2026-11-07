import { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { request, vnd } from '../lib';
import { useCurrencySettings, exactVnd } from '../currency';

type Audit = {
  status: 'matched' | 'mismatch';
  treasury_vnd: string;
  ledger_total_vnd: string;
  difference_vnd: string;
  ledger_entries: number;
  checked_at: string;
  note: string;
};
const money = (s: string, mode: 'VND' | 'USD') => {
  try {
    const exact = BigInt(s);
    if (mode === 'USD' && exact <= BigInt(Number.MAX_SAFE_INTEGER) && exact >= -BigInt(Number.MAX_SAFE_INTEGER)) return vnd(Number(exact));
    return exactVnd(exact);
  } catch { return s + ' VNĐ'; }
};
export default function FinancialIntegrity({ token }: { token: string }) {
  const { mode } = useCurrencySettings();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try { setAudit(await request<Audit>('/ceo/financial-audit', token)); }
    catch (e) { setAudit(null); setError(e instanceof Error ? e.message : 'Không thể đối soát.'); }
    finally { setBusy(false); }
  }, [token]);
  return <section className="panel" aria-label="Kiểm toán ngân quỹ">
    <div className="section-heading">
      <div><p className="eyebrow">FINANCIAL INTEGRITY · v15</p><h2>Đối soát ngân quỹ CEO</h2></div>
      <button type="button" className="secondary" onClick={() => void refresh()} disabled={busy}>
        <RefreshCw size={16}/> {busy ? 'Đang kiểm tra…' : 'Đối soát ngay'}
      </button>
    </div>
    <p style={{fontSize:12, color:'#9eb4cf'}}>Đối chiếu số dư với <strong>toàn bộ</strong> sổ cái trên máy chủ. Không tự ý sửa tiền hoặc chỉnh sửa lịch sử.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {audit && <>
      <div className="audit-status" role="status">
        {audit.status === 'matched' ? <CheckCircle2 color="#66e0bb" size={22}/> : <AlertTriangle color="#f0bd7b" size={22}/>}
        <strong>{audit.status === 'matched' ? 'Số dư khớp sổ cái' : 'Phát hiện số dư không khớp'}</strong>
      </div>
      <div className="audit-grid">
        <div><small>Ngân quỹ hiện tại</small><strong>{money(audit.treasury_vnd, mode)}</strong></div>
        <div><small>Tổng thu chi trong sổ cái</small><strong>{money(audit.ledger_total_vnd, mode)}</strong></div>
        <div><small>Chênh lệch</small><strong>{money(audit.difference_vnd, mode)}</strong></div>
        <div><small>Số giao dịch đã đối chiếu</small><strong>{audit.ledger_entries.toLocaleString('vi-VN')}</strong></div>
      </div>
      <p className="audit-note">Số dư kế toán gốc luôn tính bằng VNĐ. Đổi USD chỉ quy đổi hiển thị; số tiền vượt giới hạn chính xác của JavaScript sẽ hiển thị VNĐ gốc.</p><p className="audit-note"><ShieldCheck size={15}/> Kiểm tra lúc {new Date(audit.checked_at).toLocaleString('vi-VN')}. {audit.status === 'mismatch' ? 'Không tiếp tục điều chỉnh ngân quỹ thủ công; hãy kiểm tra nhật ký và bản sao lưu Supabase.' : 'Đây là phép đối soát một thời điểm, không thay thế sao lưu hay kiểm toán độc lập.'}</p>
    </>}
  </section>;
}

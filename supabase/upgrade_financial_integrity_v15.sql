-- MEDIA TECH VUS v15: Kiểm tra đối soát ngân quỹ chỉ đọc, theo công ty.
-- Chạy sau tất cả migrations tới v14. Không xóa hoặc sửa dữ liệu hiện tại.
-- Kết quả là tổng của TOÀN BỘ sổ cái, không phải 40 bản ghi gần nhất.
-- Một câu SELECT đảm bảo đối chiếu công ty và ledger trong cùng snapshot SQL.
CREATE OR REPLACE FUNCTION public.audit_company_finances_v15(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'status', CASE
      WHEN c.treasury_vnd::numeric = COALESCE(SUM(l.amount_vnd::numeric), 0) THEN 'matched'
      ELSE 'mismatch'
    END,
    'treasury_vnd', c.treasury_vnd::text,
    'ledger_total_vnd', COALESCE(SUM(l.amount_vnd::numeric), 0)::text,
    'difference_vnd', (c.treasury_vnd::numeric - COALESCE(SUM(l.amount_vnd::numeric), 0))::text,
    'ledger_entries', COUNT(l.id),
    'checked_at', statement_timestamp()
  )
  FROM public.companies AS c
  LEFT JOIN public.ledger_entries AS l ON l.company_id = c.id
  WHERE c.owner_id = p_user_id
  GROUP BY c.id, c.treasury_vnd;
$$;

-- Backend xác thực JWT lấy user_id, sau đó dùng service_role gọi RPC.
-- Người chơi không có quyền gọi trực tiếp hàm SECURITY DEFINER.
REVOKE ALL ON FUNCTION public.audit_company_finances_v15(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_company_finances_v15(uuid)
  TO service_role;

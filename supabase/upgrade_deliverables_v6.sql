-- MEDIA TECH VUS v6: CEO-controlled deliverables. Apply AFTER all v5 migrations.
-- Phase-1 agent orders completed before v6 remain completed; no data destroyed.
ALTER TABLE public.agent_orders DROP CONSTRAINT IF EXISTS agent_orders_status_check;
ALTER TABLE public.agent_orders ADD CONSTRAINT agent_orders_status_check
  CHECK(status IN ('pending','running','drafting','awaiting_review','revision_requested','generation_failed','completed','rejected'));
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS deliverable jsonb;
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS review_notes text NOT NULL DEFAULT '';
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS revision_no integer NOT NULL DEFAULT 0;
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS generation_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS lease_until timestamptz;
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.agent_orders ADD COLUMN IF NOT EXISTS last_generation_error text;
ALTER TABLE public.agent_orders ADD CONSTRAINT agent_orders_revision_nonnegative CHECK(revision_no BETWEEN 0 AND 3);
ALTER TABLE public.agent_events DROP CONSTRAINT IF EXISTS agent_events_event_type_check;
ALTER TABLE public.agent_events ADD CONSTRAINT agent_events_event_type_check
 CHECK(event_type IN ('proposed','approved','rejected','completed','draft_ready','revision_requested','draft_failed'));
-- Event type is unique per order, so revision-specific details live in agent_orders;
-- event rows for revisions are inserted only once per type.

-- Prevent existing automated completion from paying out AI orders before CEO accepts the deliverable.
-- Other auto tasks retain their v5 behavior.
CREATE OR REPLACE FUNCTION public.process_due_auto_tasks(p_limit integer DEFAULT 50)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t public.tasks; c public.companies; processed integer:=0;
BEGIN
 IF p_limit<1 OR p_limit>100 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
 UPDATE public.tasks t SET progress=least(99,greatest(0,floor(100*extract(epoch from(now()-t.created_at))/(t.duration_minutes*60))::integer)),updated_at=now()
 WHERE t.auto_mode=true AND t.status='in_progress' AND t.due_at>now()
 AND t.progress<least(99,greatest(0,floor(100*extract(epoch from(now()-t.created_at))/(t.duration_minutes*60))::integer));
 -- AI orders stay at 99% until review; never award a task from the agent worker prematurely.
 UPDATE public.tasks t SET progress=99,updated_at=now()
 WHERE t.auto_mode=true AND t.status='in_progress' AND t.due_at<=now()
 AND EXISTS(SELECT 1 FROM public.agent_orders a WHERE a.task_id=t.id)
 AND t.progress<99;
 FOR t IN SELECT x.* FROM public.tasks x
 WHERE x.auto_mode=true AND x.status='in_progress' AND x.due_at<=now()
 AND NOT EXISTS(SELECT 1 FROM public.agent_orders a WHERE a.task_id=x.id)
 ORDER BY x.due_at,x.id LIMIT p_limit FOR UPDATE OF x SKIP LOCKED LOOP
  UPDATE public.companies SET treasury_vnd=treasury_vnd-t.reward_vnd,xp=xp+120,
    level=(1+(xp+120)/500)::integer,updated_at=now()
    WHERE id=t.company_id AND treasury_vnd>=t.reward_vnd RETURNING * INTO c;
  IF FOUND THEN
    IF t.reward_vnd>0 THEN
      INSERT INTO public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note,task_id)
      VALUES(t.company_id,-t.reward_vnd,c.treasury_vnd,'task_bonus','Thưởng nhiệm vụ tự động: '||t.title,t.id);
    END IF;
    UPDATE public.tasks SET progress=100,status='completed',completed_at=now(),updated_at=now() WHERE id=t.id;
    UPDATE public.employees SET status='idle' WHERE id=t.employee_id;
    processed:=processed+1;
  END IF;
 END LOOP;
 RETURN processed;
END; $$;

-- Legacy agent orders can still be reconciled; only completed tasks from old versions are marked complete.
-- New tasks cannot become completed before CEO acceptance.

CREATE OR REPLACE FUNCTION public.claim_agent_draft(p_limit integer DEFAULT 5)
RETURNS SETOF public.agent_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.agent_orders;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
 FOR o IN SELECT a.* FROM public.agent_orders a LEFT JOIN public.tasks t ON t.id=a.task_id
  WHERE (a.status='running' AND t.due_at<=now())
     OR a.status='revision_requested'
     OR (a.status='drafting' AND a.lease_until<now())
  ORDER BY a.created_at,a.id LIMIT p_limit FOR UPDATE OF a SKIP LOCKED LOOP
  UPDATE public.agent_orders SET status='drafting',lease_until=now()+interval '3 minutes',
    generation_attempts=generation_attempts+1,last_generation_error=NULL WHERE id=o.id RETURNING * INTO o;
  RETURN NEXT o;
 END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.save_agent_draft(p_order_id uuid,p_attempt integer,p_document jsonb)
RETURNS public.agent_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.agent_orders;
BEGIN
 SELECT * INTO o FROM public.agent_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.status<>'drafting' OR o.generation_attempts<>p_attempt THEN RAISE EXCEPTION 'Stale draft claim'; END IF;
 IF jsonb_typeof(p_document)<>'object' OR length(p_document::text)>16000
 OR jsonb_typeof(p_document->'sections')<>'array' OR jsonb_array_length(p_document->'sections') NOT BETWEEN 2 AND 6
 THEN RAISE EXCEPTION 'Invalid document'; END IF;
 UPDATE public.agent_orders SET deliverable=p_document,status='awaiting_review',
   lease_until=NULL,submitted_at=now(),last_generation_error=NULL WHERE id=o.id RETURNING * INTO o;
 INSERT INTO public.agent_events(company_id,order_id,event_type,details)
 VALUES(o.company_id,o.id,'draft_ready','Nhân viên đã nộp tài liệu; chờ CEO nghiệm thu.') ON CONFLICT(order_id,event_type) DO NOTHING;
 RETURN o;
END; $$;

CREATE OR REPLACE FUNCTION public.fail_agent_draft(p_order_id uuid,p_attempt integer,p_error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.agent_orders;
BEGIN
 SELECT * INTO o FROM public.agent_orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.status<>'drafting' OR o.generation_attempts<>p_attempt THEN RETURN; END IF;
 UPDATE public.agent_orders SET status='generation_failed',lease_until=NULL,
  last_generation_error=left(coalesce(p_error,'Lỗi sinh nội dung'),400) WHERE id=o.id;
 INSERT INTO public.agent_events(company_id,order_id,event_type,details)
 VALUES(o.company_id,o.id,'draft_failed','Sinh tài liệu thất bại; cần CEO yêu cầu thử lại.')
 ON CONFLICT(order_id,event_type) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.review_agent_draft(p_user_id uuid,p_order_id uuid,p_action text,p_feedback text DEFAULT '')
RETURNS public.agent_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o public.agent_orders; t public.tasks; c public.companies;
BEGIN
 SELECT a.* INTO o FROM public.agent_orders a JOIN public.companies c0 ON c0.id=a.company_id
  WHERE a.id=p_order_id AND c0.owner_id=p_user_id FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found or unauthorized'; END IF;
 IF p_action NOT IN ('accept','revise','retry') OR length(coalesce(p_feedback,''))>1000 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 IF p_action='retry' THEN
  IF o.status<>'generation_failed' THEN RAISE EXCEPTION 'Not failed'; END IF;
  UPDATE public.agent_orders SET status='revision_requested' WHERE id=o.id RETURNING * INTO o;
  RETURN o;
 END IF;
 IF o.status<>'awaiting_review' THEN RAISE EXCEPTION 'Order not ready for review'; END IF;
 IF p_action='revise' THEN
  IF o.revision_no>=3 THEN RAISE EXCEPTION 'Maximum 3 revisions'; END IF;
  IF length(trim(coalesce(p_feedback,'')))<10 THEN RAISE EXCEPTION 'Please give actionable feedback (min 10 chars)'; END IF;
  UPDATE public.agent_orders SET status='revision_requested',review_notes=trim(p_feedback),
   revision_no=revision_no+1 WHERE id=o.id RETURNING * INTO o;
  INSERT INTO public.agent_events(company_id,order_id,event_type,details)
  VALUES(o.company_id,o.id,'revision_requested','CEO yêu cầu chỉnh sửa bản bàn giao.')
  ON CONFLICT(order_id,event_type) DO NOTHING;
  RETURN o;
 END IF;
 -- Atomic and idempotent payout only after CEO acceptance. Lock order and task.
 SELECT * INTO t FROM public.tasks WHERE id=o.task_id AND company_id=o.company_id FOR UPDATE;
 IF NOT FOUND OR t.status<>'in_progress' THEN RAISE EXCEPTION 'Task unavailable for review'; END IF;
 UPDATE public.companies SET treasury_vnd=treasury_vnd-t.reward_vnd,xp=xp+120,
   level=(1+(xp+120)/500)::integer,updated_at=now()
   WHERE id=o.company_id AND treasury_vnd>=t.reward_vnd RETURNING * INTO c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient company balance'; END IF;
 IF t.reward_vnd>0 THEN
  INSERT INTO public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note,task_id)
   VALUES(o.company_id,-t.reward_vnd,c.treasury_vnd,'task_bonus','CEO nghiệm thu: '||t.title,t.id);
 END IF;
 UPDATE public.tasks SET progress=100,status='completed',completed_at=now(),updated_at=now() WHERE id=t.id;
 UPDATE public.employees SET status='idle' WHERE id=t.employee_id;
 UPDATE public.agent_orders SET status='completed',completed_at=now(),accepted_at=now(),review_notes=coalesce(p_feedback,'') WHERE id=o.id RETURNING * INTO o;
 INSERT INTO public.agent_events(company_id,order_id,event_type,details)
 VALUES(o.company_id,o.id,'completed','CEO đã nghiệm thu tài liệu và duyệt thưởng/XP.')
 ON CONFLICT(order_id,event_type) DO NOTHING;
 RETURN o;
END; $$;

REVOKE ALL ON FUNCTION public.claim_agent_draft(integer) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_agent_draft(uuid,integer,jsonb) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.fail_agent_draft(uuid,integer,text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.review_agent_draft(uuid,uuid,text,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agent_draft(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_agent_draft(uuid,integer,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_agent_draft(uuid,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_agent_draft(uuid,uuid,text,text) TO service_role;

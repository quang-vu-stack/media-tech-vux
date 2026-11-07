-- MEDIA TECH VUS v21 VIP — simulated work reports and CEO review.
-- REQUIRE: v20 (and all earlier migrations). Backup DB before running.
-- No existing balance, XP or completed task is changed by this migration.
-- IMPORTANT: only future / still-in-progress v20 action tasks enter this gate.
-- Previously COMPLETED v20 actions keep their historical payouts and are NOT paid again.

create table if not exists public.meeting_work_reports_v21 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  action_id uuid not null unique references public.meeting_action_items_v20(id) on delete cascade,
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  status text not null default 'awaiting_review'
    check (status in ('awaiting_review','revision_requested','approved','rejected')),
  revision_no integer not null default 0 check (revision_no between 0 and 3),
  content text not null check (char_length(content) between 20 and 4000),
  review_notes text not null default '' check (char_length(review_notes) <= 1000),
  source text not null default 'time_simulation' check (source='time_simulation'),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists work_reports_company_v21
  on public.meeting_work_reports_v21(company_id,submitted_at desc);
alter table public.meeting_work_reports_v21 enable row level security;
drop policy if exists work_reports_owner_read_v21 on public.meeting_work_reports_v21;
create policy work_reports_owner_read_v21 on public.meeting_work_reports_v21 for select to authenticated
using (exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())));
grant select on public.meeting_work_reports_v21 to authenticated;
revoke insert,update,delete on public.meeting_work_reports_v21 from anon,authenticated;

-- Distinguish a rejected task from a completed task and release employee's task slot.
-- No existing rows need conversion.
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('in_progress','completed','cancelled'));

-- Close a possible bypass from old task progress endpoints/RPCs: council tasks
-- cannot reach terminal task status or 100% until their report decision has been
-- committed in the SAME transaction. Legacy v20 completed tasks are untouched.
create or replace function public.enforce_meeting_report_gate_v21()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if exists(select 1 from public.meeting_action_items_v20 a where a.task_id=new.id)
     and (new.progress=100 or new.status in ('completed','cancelled')) then
    if new.status='completed' and exists (
      select 1 from public.meeting_work_reports_v21 r
      where r.task_id=new.id and r.status='approved'
    ) then return new; end if;
    if new.status='cancelled' and exists (
      select 1 from public.meeting_work_reports_v21 r
      where r.task_id=new.id and r.status='rejected'
    ) then return new; end if;
    raise exception 'Meeting task requires CEO report review';
  end if;
  return new;
end;
$$;
drop trigger if exists meeting_report_gate_v21 on public.tasks;
create trigger meeting_report_gate_v21
  before update of status,progress on public.tasks
  for each row execute function public.enforce_meeting_report_gate_v21();
revoke all on function public.enforce_meeting_report_gate_v21() from public,anon,authenticated;

-- Never auto-award council action tasks in v21. Regular and agent tasks keep
-- exactly the old v6 semantics. In-progress meeting actions stop at 99% and
-- get ONE simulated report after their deadline. Revision requests resubmit
-- a new report without any token or money cost. All writes are transactional.
create or replace function public.process_due_auto_tasks(p_limit integer default 50)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare
  t public.tasks;
  c public.companies;
  a public.meeting_action_items_v20;
  r public.meeting_work_reports_v21;
  v_content text;
  processed integer:=0;
begin
  if p_limit not between 1 and 100 then raise exception 'Invalid batch size'; end if;
  update public.tasks x set
    progress=least(99,greatest(0,floor(100*extract(epoch from (now()-x.created_at))/(x.duration_minutes*60))::integer)),
    updated_at=now()
  where x.auto_mode=true and x.status='in_progress' and x.due_at>now()
    and x.progress<least(99,greatest(0,floor(100*extract(epoch from (now()-x.created_at))/(x.duration_minutes*60))::integer));

  -- AI agent orders from v6 continue to await their own deliverable acceptance.
  update public.tasks x set progress=99,updated_at=now()
  where x.auto_mode=true and x.status='in_progress' and x.due_at<=now()
    and exists(select 1 from public.agent_orders o where o.task_id=x.id)
    and x.progress<99;

  for t in select x.* from public.tasks x
    where x.auto_mode=true and x.status='in_progress' and x.due_at<=now()
      and not exists(select 1 from public.agent_orders o where o.task_id=x.id)
      and not exists (
        select 1 from public.meeting_work_reports_v21 z
        where z.task_id=x.id and z.status='awaiting_review'
      )
    order by x.due_at,x.id limit p_limit for update of x skip locked
  loop
    select * into a from public.meeting_action_items_v20 where task_id=t.id;
    if found then
      -- The report is only a GAME SIMULATION; no external work evidence exists.
      update public.tasks set progress=99,updated_at=now() where id=t.id and progress<99;
      select * into r from public.meeting_work_reports_v21 where action_id=a.id for update;
      if not found then
        v_content := left('BÁO CÁO MÔ PHỎNG — KHÔNG PHẢI KẾT QUẢ CÔNG VIỆC NGOÀI ĐỜI.' || E'\n' ||
          'Nhiệm vụ: '||t.title||E'\n' || 'Mô tả CEO giao: '||left(t.description,600)||E'\n' ||
          'Nhân viên đã hoàn tất chu kỳ mô phỏng theo thời hạn. '||
          'Đề nghị CEO kiểm tra và quyết định nghiệm thu hoặc yêu cầu sửa.',4000);
        insert into public.meeting_work_reports_v21(company_id,action_id,task_id,content)
          values(t.company_id,a.id,t.id,v_content);
      elsif r.status='revision_requested' and r.revision_no < 3 then
        v_content := left('BÁO CÁO MÔ PHỎNG — BẢN CHỈNH SỬA '||(r.revision_no+1)||E'\n' ||
          'Nhiệm vụ: '||t.title||E'\n' ||
          'Phản hồi của CEO: '||left(r.review_notes,800)||E'\n' ||
          'Đã cập nhật bản mô phỏng theo yêu cầu; chưa xác nhận kết quả ngoài game. '||
          'CEO vui lòng nghiệm thu lại hoặc từ chối.',4000);
        update public.meeting_work_reports_v21
          set content=v_content,revision_no=revision_no+1,status='awaiting_review',
              submitted_at=now(),reviewed_at=null,updated_at=now()
          where id=r.id;
      end if;
      processed:=processed+1;
      continue;
    end if;

    -- Original v6 regular auto-task payout, unchanged.
    update public.companies set treasury_vnd=treasury_vnd-t.reward_vnd,xp=xp+120,
      level=(1+(xp+120)/500)::integer,updated_at=now()
      where id=t.company_id and treasury_vnd>=t.reward_vnd returning * into c;
    if found then
      if t.reward_vnd>0 then
        insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note,task_id)
          values(t.company_id,-t.reward_vnd,c.treasury_vnd,'task_bonus','Thưởng nhiệm vụ tự động: '||t.title,t.id);
      end if;
      update public.tasks set progress=100,status='completed',completed_at=now(),updated_at=now() where id=t.id;
      update public.employees set status='idle' where id=t.employee_id;
      processed:=processed+1;
    end if;
  end loop;
  return processed;
end;
$$;

-- Atomic, owner-authenticated CEO decision. Lock TASK first, then REPORT, to
-- agree with the worker's lock order and avoid a task/report deadlock.
-- Approved payout is exactly once and uses the existing ledger task_id UNIQUE.
create or replace function public.review_meeting_work_report_v21(
  p_user_id uuid,p_report_id uuid,p_expected_revision integer,
  p_decision text,p_notes text
) returns public.meeting_work_reports_v21
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  r public.meeting_work_reports_v21;
  t public.tasks;
  c public.companies;
  v_notes text:=trim(coalesce(p_notes,''));
begin
  if p_decision is null or p_decision not in ('approve','revise','reject') or p_expected_revision is null
      or p_expected_revision not between 0 and 3 or char_length(v_notes)>1000 then
    raise exception 'Invalid CEO review';
  end if;
  if p_decision='revise' and char_length(v_notes)<8 then
    raise exception 'Revision request needs feedback';
  end if;
  -- A nonlocking lookup obtains task id; the authoritative rows are locked below.
  select z.* into r from public.meeting_work_reports_v21 z
    join public.companies c0 on c0.id=z.company_id
    where z.id=p_report_id and c0.owner_id=p_user_id;
  if not found then raise exception 'Report not found or unauthorized'; end if;
  select * into t from public.tasks where id=r.task_id and company_id=r.company_id for update;
  if not found then raise exception 'Task not found'; end if;
  select * into r from public.meeting_work_reports_v21 where id=p_report_id for update;
  if r.status='approved' and p_decision='approve' then return r; end if;
  if r.status='rejected' and p_decision='reject' then return r; end if;
  if r.status<>'awaiting_review' or r.revision_no<>p_expected_revision
      or t.status<>'in_progress' or t.progress<>99 then
    raise exception 'Review conflict: refresh before retry';
  end if;
  if p_decision='revise' then
    if r.revision_no>=3 then raise exception 'Maximum three revisions'; end if;
    update public.meeting_work_reports_v21
      set status='revision_requested',review_notes=v_notes,reviewed_at=now(),updated_at=now()
      where id=r.id returning * into r;
    return r;
  end if;
  if p_decision='approve' then
    update public.companies set treasury_vnd=treasury_vnd-t.reward_vnd,
      xp=xp+120,level=(1+(xp+120)/500)::integer,updated_at=now()
      where id=t.company_id and treasury_vnd>=t.reward_vnd returning * into c;
    if not found then raise exception 'Insufficient company funds'; end if;
    if t.reward_vnd>0 then
      insert into public.ledger_entries(company_id,amount_vnd,balance_after_vnd,kind,note,task_id)
        values(t.company_id,-t.reward_vnd,c.treasury_vnd,'task_bonus','CEO nghiệm thu sau họp: '||t.title,t.id);
    end if;
    -- Report status first: the task trigger requires an approved report.
    update public.meeting_work_reports_v21
      set status='approved',review_notes=v_notes,reviewed_at=now(),updated_at=now()
      where id=r.id returning * into r;
    update public.tasks set progress=100,status='completed',completed_at=now(),updated_at=now()
      where id=t.id;
    update public.employees set status='idle' where id=t.employee_id;
    return r;
  end if;
  -- Rejection ends this simulated task without reward or XP.
  update public.meeting_work_reports_v21
    set status='rejected',review_notes=v_notes,reviewed_at=now(),updated_at=now()
    where id=r.id returning * into r;
  update public.tasks set status='cancelled',updated_at=now() where id=t.id;
  update public.employees set status='idle' where id=t.employee_id;
  return r;
end;
$$;

revoke all on function public.process_due_auto_tasks(integer) from public,anon,authenticated;
grant execute on function public.process_due_auto_tasks(integer) to service_role;
revoke all on function public.review_meeting_work_report_v21(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.review_meeting_work_report_v21(uuid,uuid,integer,text,text) to service_role;

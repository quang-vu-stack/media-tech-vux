-- V8: one immutable source snapshot + report for each version.
-- Apply AFTER upgrade_software_studio_v7.sql. Back up the database first.
alter table public.software_projects
  add column if not exists current_version integer not null default 1;
create table if not exists public.software_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.software_projects(id) on delete cascade,
  version_number integer not null check(version_number between 1 and 6),
  title text not null,
  summary text not null,
  files jsonb not null check(jsonb_typeof(files)='object'),
  provider text not null check(provider in ('simulated','gemini','openai')),
  feedback text not null default '',
  quality_report jsonb,
  created_at timestamptz not null default now(),
  unique(project_id,version_number)
);
create index if not exists software_versions_project_idx on public.software_project_versions(project_id,version_number desc);
alter table public.software_project_versions enable row level security;
-- Repeatable migration: policy block checks existence first.
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='software_project_versions' and policyname='software_versions_owner_read') then
    create policy software_versions_owner_read on public.software_project_versions for select to authenticated
      using(exists(select 1 from public.software_projects p join public.companies c on c.id=p.company_id
        where p.id=project_id and c.owner_id=(select auth.uid())));
  end if;
end $$;
grant select on public.software_project_versions to authenticated;
revoke insert,update,delete on public.software_project_versions from authenticated,anon;
-- Backfill all existing v7 projects with version 1. Old projects need first-time quality check.
insert into public.software_project_versions(project_id,version_number,title,summary,files,provider)
 select p.id,1,p.title,p.summary,p.files,p.provider from public.software_projects p
 on conflict (project_id,version_number) do nothing;

-- Create a project and its first version atomically; only callable from verified backend service role.
create or replace function public.studio_create_v8(p_user_id uuid,p_employee_id uuid,p_prompt text,p_provider text,
  p_title text,p_summary text,p_files jsonb,p_report jsonb)
returns public.software_projects language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.software_projects; v_company uuid;
begin
  select id into v_company from public.companies where owner_id=p_user_id;
  if v_company is null or not exists(select 1 from public.employees where id=p_employee_id and company_id=v_company)
    then raise exception 'Unauthorized employee'; end if;
  if char_length(p_prompt) not between 12 and 1000 or p_provider not in ('simulated','gemini','openai')
    or jsonb_typeof(p_files)<>'object' or jsonb_typeof(p_report)<>'object'
    or not (p_report ? 'passed') then raise exception 'Invalid studio input'; end if;
  insert into public.software_projects(company_id,employee_id,prompt,provider,title,summary,files)
    values(v_company,p_employee_id,p_prompt,p_provider,p_title,p_summary,p_files) returning * into p;
  insert into public.software_project_versions(project_id,version_number,title,summary,files,provider,quality_report)
    values(p.id,1,p_title,p_summary,p_files,p_provider,p_report);
  return p;
end $$;

-- Optimistic concurrency ensures two AI completions do not overwrite a newer version.
create or replace function public.studio_revise_v8(p_user_id uuid,p_project_id uuid,p_expected_version integer,
  p_feedback text,p_provider text,p_title text,p_summary text,p_files jsonb,p_report jsonb)
returns public.software_projects language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.software_projects; v_number integer;
begin
  select s.* into p from public.software_projects s join public.companies c on c.id=s.company_id
    where s.id=p_project_id and c.owner_id=p_user_id for update of s;
  if not found then raise exception 'Unauthorized project'; end if;
  if p.current_version <> p_expected_version or p.current_version>=6 then raise exception 'Stale version or revision limit'; end if;
  if char_length(trim(p_feedback)) not between 8 and 1000 or p_provider not in ('simulated','gemini','openai')
    or jsonb_typeof(p_files)<>'object' or jsonb_typeof(p_report)<>'object' or not(p_report ? 'passed') then
    raise exception 'Invalid revision input'; end if;
  v_number:=p.current_version+1;
  insert into public.software_project_versions(project_id,version_number,title,summary,files,provider,feedback,quality_report)
    values(p.id,v_number,p_title,p_summary,p_files,p_provider,trim(p_feedback),p_report);
  update public.software_projects set title=p_title,summary=p_summary,files=p_files,provider=p_provider,
    status='awaiting_review',reviewed_at=null,current_version=v_number where id=p.id returning * into p;
  return p;
end $$;

-- First-time quality analysis for migrated v7 projects; never modifies source or earlier versions.
create or replace function public.studio_record_quality_v8(p_user_id uuid,p_project_id uuid,p_version integer,p_report jsonb)
returns public.software_project_versions language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.software_projects; v public.software_project_versions;
begin
  select s.* into p from public.software_projects s join public.companies c on c.id=s.company_id
    where s.id=p_project_id and c.owner_id=p_user_id for update of s;
  if not found or p.current_version<>p_version then raise exception 'Project version changed'; end if;
  if jsonb_typeof(p_report)<>'object' or not(p_report ? 'passed') then raise exception 'Invalid report'; end if;
  update public.software_project_versions set quality_report=p_report
    where project_id=p.id and version_number=p_version returning * into v;
  if not found then raise exception 'Version not found'; end if;
  return v;
end $$;

-- Server-authoritative review: only current, checked, error-free version can be approved.
create or replace function public.studio_review_v8(p_user_id uuid,p_project_id uuid,p_expected_version integer,p_decision text)
returns public.software_projects language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.software_projects; v public.software_project_versions;
begin
  select s.* into p from public.software_projects s join public.companies c on c.id=s.company_id
    where s.id=p_project_id and c.owner_id=p_user_id for update of s;
  if not found then raise exception 'Unauthorized project'; end if;
  if p.status<>'awaiting_review' or p.current_version<>p_expected_version then raise exception 'Already reviewed or version changed'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  select * into v from public.software_project_versions where project_id=p.id and version_number=p.current_version;
  if not found or v.quality_report is null then raise exception 'Run quality checks before reviewing'; end if;
  if p_decision='approved' and (v.quality_report->>'passed')::boolean is distinct from true then
    raise exception 'Blocking quality errors; please revise'; end if;
  update public.software_projects set status=p_decision,reviewed_at=now() where id=p.id returning * into p;
  return p;
end $$;

revoke execute on function public.studio_create_v8(uuid,uuid,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.studio_revise_v8(uuid,uuid,integer,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.studio_record_quality_v8(uuid,uuid,integer,jsonb) from public,anon,authenticated;
revoke execute on function public.studio_review_v8(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.studio_create_v8(uuid,uuid,text,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.studio_revise_v8(uuid,uuid,integer,text,text,text,text,jsonb,jsonb) to service_role;
grant execute on function public.studio_record_quality_v8(uuid,uuid,integer,jsonb) to service_role;
grant execute on function public.studio_review_v8(uuid,uuid,integer,text) to service_role;

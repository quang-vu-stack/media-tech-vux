-- V7 / software studio: owner-bound source-only artifacts. Apply AFTER previous migrations.
-- Preview only in sandboxed iframe. No code is executed by the server.
create table if not exists public.software_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  prompt text not null check (char_length(prompt) between 12 and 1000),
  provider text not null check (provider in ('simulated','gemini','openai')),
  title text not null check (char_length(title) between 5 and 120),
  summary text not null,
  files jsonb not null,
  status text not null default 'awaiting_review' check(status in ('awaiting_review','approved','rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint software_project_files_shape check (jsonb_typeof(files)='object')
);
create index if not exists software_projects_company on public.software_projects(company_id,created_at desc);
alter table public.software_projects enable row level security;
create policy "software_projects_owner_read" on public.software_projects for select to authenticated
  using (exists(select 1 from public.companies c where c.id=company_id and c.owner_id=(select auth.uid())));
grant select on public.software_projects to authenticated;
revoke insert,update,delete on public.software_projects from authenticated,anon;

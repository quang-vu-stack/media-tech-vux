-- MEDIA TECH VUS v9: Internal releases, audit trail and rollback.
-- Run AFTER v7 + v8 migrations; make a backup first.
-- A release is an INTERNAL SNAPSHOT in the game. It is NOT a public web deployment.

alter table public.software_projects
  add column if not exists published_version integer;

create table if not exists public.software_release_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.software_projects(id) on delete cascade,
  version_number integer not null check(version_number between 1 and 6),
  action text not null check(action in ('release','rollback')),
  source_sha256 text not null check(source_sha256 ~ '^[0-9a-f]{64}$'),
  note text not null default '' check(char_length(note) <= 500),
  created_at timestamptz not null default now(),
  foreign key(project_id,version_number) references public.software_project_versions(project_id,version_number)
);
create index if not exists studio_release_history_idx
  on public.software_release_events(project_id,created_at desc);

alter table public.software_release_events enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public'
    and tablename='software_release_events' and policyname='studio_release_owner_read') then
    create policy studio_release_owner_read on public.software_release_events for select to authenticated
      using(exists(select 1 from public.software_projects s
        join public.companies c on c.id=s.company_id
        where s.id=project_id and c.owner_id=(select auth.uid())));
  end if;
end $$;
grant select on public.software_release_events to authenticated;
revoke insert, update, delete on public.software_release_events from authenticated, anon;

-- By locking project row, concurrent release/rollback requests cannot race.
-- Source hash is copied only from quality_report of the immutable version.
create or replace function public.studio_release_v9(
 p_user_id uuid, p_project_id uuid, p_expected_version integer, p_note text default ''
) returns public.software_projects language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.software_projects; v public.software_project_versions; v_sha text;
begin
  select s.* into p from public.software_projects s join public.companies c on c.id=s.company_id
    where s.id=p_project_id and c.owner_id=p_user_id for update of s;
  if not found then raise exception 'Unauthorized project'; end if;
  if p.status <> 'approved' or p.current_version <> p_expected_version then
    raise exception 'CEO must approve latest version before release'; end if;
  if p.published_version = p.current_version then raise exception 'This version is already released'; end if;
  select * into v from public.software_project_versions
    where project_id=p.id and version_number=p.current_version;
  if not found then raise exception 'Version not found'; end if;
  if (v.quality_report->>'passed')::boolean is distinct from true then
    raise exception 'Cannot release without a passing static quality report'; end if;
  v_sha:=v.quality_report->>'source_sha256';
  if v_sha is null or v_sha !~ '^[0-9a-f]{64}$' then raise exception 'Missing valid source digest'; end if;
  if char_length(coalesce(p_note,'')) > 500 then raise exception 'Note too long'; end if;
  update public.software_projects set published_version=p.current_version where id=p.id returning * into p;
  insert into public.software_release_events(project_id,version_number,action,source_sha256,note)
    values(p.id,p.current_version,'release',v_sha,coalesce(p_note,''));
  return p;
end $$;

-- Rollback only targets a version that was released earlier, NOT an arbitrary draft.
-- A rollback does not alter the newer source, approval, or revision history.
create or replace function public.studio_rollback_v9(
 p_user_id uuid, p_project_id uuid, p_target_version integer, p_expected_published_version integer,
 p_note text default ''
) returns public.software_projects language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.software_projects; v public.software_project_versions; v_sha text;
begin
  select s.* into p from public.software_projects s join public.companies c on c.id=s.company_id
    where s.id=p_project_id and c.owner_id=p_user_id for update of s;
  if not found then raise exception 'Unauthorized project'; end if;
  if p.published_version is distinct from p_expected_published_version then
    raise exception 'Release changed; please refresh'; end if;
  if p_target_version = p.published_version or p_target_version < 1 then
    raise exception 'Target version is already active or invalid'; end if;
  if not exists(select 1 from public.software_release_events
    where project_id=p.id and version_number=p_target_version and action='release') then
    raise exception 'Can rollback only to an already released version'; end if;
  select * into v from public.software_project_versions
    where project_id=p.id and version_number=p_target_version;
  if not found then raise exception 'Version not found'; end if;
  v_sha:=v.quality_report->>'source_sha256';
  if v_sha is null or v_sha !~ '^[0-9a-f]{64}$' then raise exception 'Missing release digest'; end if;
  if char_length(coalesce(p_note,'')) > 500 then raise exception 'Note too long'; end if;
  update public.software_projects set published_version=p_target_version where id=p.id returning * into p;
  insert into public.software_release_events(project_id,version_number,action,source_sha256,note)
    values(p.id,p_target_version,'rollback',v_sha,coalesce(p_note,''));
  return p;
end $$;

revoke execute on function public.studio_release_v9(uuid,uuid,integer,text) from public,anon,authenticated;
revoke execute on function public.studio_rollback_v9(uuid,uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.studio_release_v9(uuid,uuid,integer,text) to service_role;
grant execute on function public.studio_rollback_v9(uuid,uuid,integer,integer,text) to service_role;

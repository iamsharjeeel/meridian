-- MERIDIAN Phase 1 schema (reconstructed for local development)
-- Derived from the app's Supabase queries/RPCs. Not the production schema of record.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'employee',
  team_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  manager_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_team_id_fkey;
alter table public.profiles
  add constraint profiles_team_id_fkey
  foreign key (team_id) references public.teams (id) on delete set null;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'employee',
  team_id uuid references public.teams (id) on delete set null,
  token text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper (SECURITY DEFINER avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.invites enable row level security;

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations
  for update to authenticated
  using (id = public.current_org_id())
  with check (id = public.current_org_id());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or org_id = public.current_org_id());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams
  for all to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (org_id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- RPCs used by the app
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_org_name text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.organizations (name) values (p_org_name) returning id into v_org_id;

  insert into public.profiles (id, org_id, email, full_name, role)
  values (v_uid, v_org_id, v_email, p_full_name, 'owner')
  on conflict (id) do update
    set org_id = excluded.org_id,
        email = excluded.email,
        full_name = excluded.full_name,
        role = 'owner';

  return v_org_id;
end;
$$;

create or replace function public.accept_invite(p_token text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.invites;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite from public.invites where token = p_token;
  if not found then
    raise exception 'Invite not found';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Invite already accepted';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.profiles (id, org_id, email, full_name, role, team_id)
  values (v_uid, v_invite.org_id, v_email, p_full_name, v_invite.role, v_invite.team_id)
  on conflict (id) do update
    set org_id = excluded.org_id,
        email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        team_id = excluded.team_id;

  update public.invites set accepted_at = now() where id = v_invite.id;

  return v_invite.org_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (RLS still governs anon/authenticated row access; service_role bypasses RLS)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;

grant execute on function public.current_org_id() to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.accept_invite(text, text) to authenticated;

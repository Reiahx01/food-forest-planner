-- 0001_accounts.sql -- accounts table + RLS + auth.users mirror trigger (#5)
--
-- One row per signed-in user. The primary key is the same UUID as
-- `auth.users.id`, so RLS predicates can compare `auth.uid() = id` without
-- an indirection. A SECURITY DEFINER trigger on `auth.users` creates the
-- matching row -- if it ever fails, the auth insert rolls back, ruling out
-- the "logged-in user with no accounts row" failure mode.
--
-- ADR-0003: RLS is the security boundary. Only `select` and `update` are
-- exposed to the user. Inserts are trigger-only (service-role bypass);
-- deletes cascade from `auth.users` (`on delete cascade` on the FK).

create table public.accounts (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  role          text not null default 'hobbyist'
                check (role in ('hobbyist', 'pro')),
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index accounts_email_idx on public.accounts (email);

alter table public.accounts enable row level security;

create policy "accounts: self-select"
  on public.accounts
  for select
  using (auth.uid() = id);

create policy "accounts: self-update"
  on public.accounts
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- handle_new_user: mirror auth.users -> public.accounts on insert.
--
-- SECURITY DEFINER + a fixed search_path is the standard defence against the
-- search_path attack (CVE class where a malicious schema can shadow function
-- lookups). The function runs as the migration owner, so the insert bypasses
-- RLS (the row's owner doesn't exist yet at insert time).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.accounts (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- set_updated_at: bump `updated_at` on every row update. Cheap and standard.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row
  execute function public.set_updated_at();

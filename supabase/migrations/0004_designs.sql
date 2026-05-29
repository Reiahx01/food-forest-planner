-- 0004_designs.sql -- designs table + RLS via Property ownership (#13)
--
-- A Design is a named plan overlaid on a Property. One Property carries many
-- Designs. v1 stores just metadata; the elements that live on a Design
-- (Guild, Pond, Swale, Path, Bed, Building) land in #14.
--
-- ADR-0003: RLS is the security boundary. Designs are visible / editable only
-- when the authenticated user owns the parent Property. The four policies
-- below each EXISTS-query `public.properties` against `auth.uid()`. Index on
-- `property_id` keeps the EXISTS join cheap.

create table public.designs (
  id            uuid primary key default extensions.uuid_generate_v4(),
  property_id   uuid not null references public.properties (id) on delete cascade,
  name          text not null,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index designs_property_idx on public.designs (property_id);

alter table public.designs enable row level security;

-- Helper predicate inlined as EXISTS in each policy. We accept the small
-- amount of SQL duplication for two reasons:
--   1. Per-op policies are easier to audit individually.
--   2. A single all-ops policy would mean the WITH CHECK + USING clauses
--      diverge in only one branch (insert); explicit per-op is clearer.

create policy "designs: owner-select"
  on public.designs
  for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = designs.property_id
        and p.owner_account_id = auth.uid()
    )
  );

create policy "designs: owner-insert"
  on public.designs
  for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = designs.property_id
        and p.owner_account_id = auth.uid()
    )
  );

create policy "designs: owner-update"
  on public.designs
  for update
  using (
    exists (
      select 1 from public.properties p
      where p.id = designs.property_id
        and p.owner_account_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = designs.property_id
        and p.owner_account_id = auth.uid()
    )
  );

create policy "designs: owner-delete"
  on public.designs
  for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = designs.property_id
        and p.owner_account_id = auth.uid()
    )
  );

-- Reuse the set_updated_at trigger function from 0001_accounts.sql.
create trigger designs_set_updated_at
  before update on public.designs
  for each row
  execute function public.set_updated_at();

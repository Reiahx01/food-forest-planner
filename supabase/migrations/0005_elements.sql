-- 0005_elements.sql -- polymorphic elements table + element_type enum (#14)
--
-- An Element is something the user drops on a Design (a Guild, Pond, Swale,
-- Path, Bed, or Building). One polymorphic row -- the per-type shape lives
-- in `attributes` jsonb, validated at write-time by the matching
-- ElementTypeModule's Zod schema (see lib/elements/types.ts).
--
-- #14 ships the architectural slice with `element_type` containing just
-- `'guild'`. #16 -> #20 add the remaining five via subsequent enum-extend
-- migrations -- adding a value to a Postgres enum is a single-statement,
-- backwards-compatible change.
--
-- Geometry is stored as GeoJSON in `geometry` jsonb (not a PostGIS column).
-- Reason: each element type has a different shape (Point / Polygon / Line)
-- and the editor needs to read/write it the same way for each. We pay a
-- spatial-index cost (no GiST), which is acceptable because per-design
-- element counts are small (<100s); when a query needs a bbox filter we
-- can add a generated PostGIS column.
--
-- ADR-0003: RLS gates Elements through the Design -> Property -> owner
-- chain. Each policy EXISTS-joins both parent tables to confirm the
-- authenticated user owns the Property that owns the Design that owns
-- the Element.

create type public.element_type as enum ('guild');

create table public.elements (
  id            uuid primary key default extensions.uuid_generate_v4(),
  design_id     uuid not null references public.designs (id) on delete cascade,
  type          public.element_type not null,
  geometry      jsonb not null,
  attributes    jsonb not null default '{}'::jsonb,
  label         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index elements_design_idx on public.elements (design_id);
create index elements_type_idx   on public.elements (type);

alter table public.elements enable row level security;

-- The owner-via-Design-via-Property predicate. Duplicated across the four
-- per-op policies for the same reason designs are split per-op
-- (auditability + explicit USING vs WITH CHECK).

create policy "elements: owner-select"
  on public.elements
  for select
  using (
    exists (
      select 1
      from public.designs d
      join public.properties p on p.id = d.property_id
      where d.id = elements.design_id
        and p.owner_account_id = auth.uid()
    )
  );

create policy "elements: owner-insert"
  on public.elements
  for insert
  with check (
    exists (
      select 1
      from public.designs d
      join public.properties p on p.id = d.property_id
      where d.id = elements.design_id
        and p.owner_account_id = auth.uid()
    )
  );

create policy "elements: owner-update"
  on public.elements
  for update
  using (
    exists (
      select 1
      from public.designs d
      join public.properties p on p.id = d.property_id
      where d.id = elements.design_id
        and p.owner_account_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.designs d
      join public.properties p on p.id = d.property_id
      where d.id = elements.design_id
        and p.owner_account_id = auth.uid()
    )
  );

create policy "elements: owner-delete"
  on public.elements
  for delete
  using (
    exists (
      select 1
      from public.designs d
      join public.properties p on p.id = d.property_id
      where d.id = elements.design_id
        and p.owner_account_id = auth.uid()
    )
  );

create trigger elements_set_updated_at
  before update on public.elements
  for each row
  execute function public.set_updated_at();

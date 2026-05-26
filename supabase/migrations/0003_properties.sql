-- 0003_properties.sql -- properties table + RLS (#10)
--
-- A Property is a plot of land the user designs for. The row owns the
-- geographic identity (address, center point, optional parcel outline),
-- USDA zone (auto-populated from coords in #10 part 2), and a jsonb bag
-- of climate facts for downstream sectoring overlays (#22 sun, #23 wind).
--
-- ADR-0003: RLS is the security boundary. Owners read/write their own rows
-- via the user JWT; service-role bypasses RLS for cron jobs (none yet).
-- Pro users assigning a Property to a Client gets surfaced in #12; for now
-- the `client_id` column exists but is always null because there's no
-- clients table yet.

create table public.properties (
  id                uuid primary key default extensions.uuid_generate_v4(),
  owner_account_id  uuid not null references public.accounts (id) on delete cascade,
  client_id         uuid,  -- FK added in #11 when the clients table lands.
  name              text not null,
  address           text,
  -- PostGIS geometry columns (#4 enabled the extension). Center is the
  -- geocoded point; parcel_outline is the user-drawn polygon (added in
  -- #10 part 2). Both nullable: a Property can exist with just a name +
  -- address while the user is still finding the right parcel.
  center            geometry(Point, 4326),
  parcel_outline    geometry(Polygon, 4326),
  usda_zone         text,
  climate_facts     jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Spatial indexes for the geometry columns -- used by future sectoring
-- queries that filter Properties within a bounding box.
create index properties_center_idx          on public.properties using gist (center);
create index properties_parcel_outline_idx  on public.properties using gist (parcel_outline);
create index properties_owner_idx           on public.properties (owner_account_id);
create index properties_client_idx          on public.properties (client_id) where client_id is not null;

alter table public.properties enable row level security;

-- The four CRUD policies are each scoped to "this row belongs to the
-- authenticated user". Insert uses WITH CHECK; the rest use USING.
create policy "properties: owner-select"
  on public.properties
  for select
  using (auth.uid() = owner_account_id);

create policy "properties: owner-insert"
  on public.properties
  for insert
  with check (auth.uid() = owner_account_id);

create policy "properties: owner-update"
  on public.properties
  for update
  using (auth.uid() = owner_account_id)
  with check (auth.uid() = owner_account_id);

create policy "properties: owner-delete"
  on public.properties
  for delete
  using (auth.uid() = owner_account_id);

-- Reuse the set_updated_at trigger function defined in 0001_accounts.sql.
create trigger properties_set_updated_at
  before update on public.properties
  for each row
  execute function public.set_updated_at();

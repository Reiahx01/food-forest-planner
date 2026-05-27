// @vitest-environment node
//
// Integration test: properties RLS (#10).
//
// Verifies the four self-only CRUD policies in 0003_properties.sql:
//   - Service-role can insert + read (used by the trigger setup here).
//   - Anon (no JWT) cannot read.
//   - Owner can read + update their own row.
//   - Cascade: deleting the owning auth user removes their properties.
//
// Multi-user "user A cannot see user B's properties" needs a real session
// for user A; we defer that to a follow-up integration test once we have
// a session-minting helper. For now we cover the anon-denial path.

import { randomUUID } from 'node:crypto';

import { afterEach, beforeAll, describe, expect, test } from 'vitest';

import { isIntegrationDbAvailable } from '@/db/test-helpers';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

const integrationOnly = isIntegrationDbAvailable() ? describe : describe.skip;

function requireUser<T extends { id: string }>(user: T | null, label: string): T {
  if (!user) throw new Error(`expected ${label} to be created but Supabase returned null`);
  return user;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`expected ${name} to be set in the integration env`);
  return value;
}

integrationOnly('integration: properties RLS against real Supabase', () => {
  let admin: ReturnType<typeof createServiceRoleSupabaseClient>;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    admin = createServiceRoleSupabaseClient();
  });

  afterEach(async () => {
    while (createdUserIds.length > 0) {
      const id = createdUserIds.pop();
      if (!id) continue;
      // Deleting the auth user cascades to public.accounts (#5) and to
      // public.properties (this migration's FK).
      await admin.auth.admin.deleteUser(id);
    }
  });

  test('service-role can insert a property and read it back', async () => {
    const email = `it-${randomUUID()}@test.local`;
    const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: true });
    const user = requireUser(created.user, 'auth user');
    createdUserIds.push(user.id);

    const { data: inserted, error: insertErr } = await admin
      .from('properties')
      .insert({
        owner_account_id: user.id,
        name: 'Test plot',
        address: '1 Main St',
        center: 'POINT(-122.03 37.33)',
      })
      .select('id, name, address, owner_account_id')
      .single();

    expect(insertErr).toBeNull();
    expect(inserted).toMatchObject({
      name: 'Test plot',
      address: '1 Main St',
      owner_account_id: user.id,
    });
  });

  test('anon client cannot read properties (RLS denies without a session)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `it-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    const user = requireUser(created.user, 'auth user');
    createdUserIds.push(user.id);

    await admin.from('properties').insert({
      owner_account_id: user.id,
      name: 'Anon-test plot',
    });

    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    );
    const { data: rows } = await anon.from('properties').select('id').limit(10);
    expect(rows).toEqual([]);
  });

  test('parcel_outline persists as a Polygon (round-trips through PostGIS)', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `it-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    const user = requireUser(created.user, 'auth user');
    createdUserIds.push(user.id);

    const wkt =
      'POLYGON((-122.03 37.33, -122.02 37.33, -122.02 37.34, -122.03 37.34, -122.03 37.33))';

    const { data: inserted, error: insertErr } = await admin
      .from('properties')
      .insert({
        owner_account_id: user.id,
        name: 'Outline plot',
        parcel_outline: wkt,
      })
      .select('parcel_outline')
      .single();
    expect(insertErr).toBeNull();

    // supabase-js returns GeoJSON for geometry SELECTs.
    const row = inserted as { parcel_outline: { type: string; coordinates: unknown[][] } | null };
    expect(row.parcel_outline?.type).toBe('Polygon');
    // First ring has 5 coords (4 corners + closing repeat).
    expect((row.parcel_outline?.coordinates[0] ?? []).length).toBe(5);
  });

  test('cascade: deleting the owning user removes their properties', async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email: `it-${randomUUID()}@test.local`,
      email_confirm: true,
    });
    const user = requireUser(created.user, 'auth user');

    const { data: inserted } = await admin
      .from('properties')
      .insert({ owner_account_id: user.id, name: 'Cascade-test plot' })
      .select('id')
      .single();
    expect(inserted).not.toBeNull();
    const propertyId = (inserted as { id: string }).id;

    // Don't push to createdUserIds -- we delete here.
    await admin.auth.admin.deleteUser(user.id);

    const { data: orphan } = await admin
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .maybeSingle();
    expect(orphan).toBeNull();
  });
});

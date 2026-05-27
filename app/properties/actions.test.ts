// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => undefined })),
}));

const fromBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

const supabaseStub: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
} = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => fromBuilder),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/geo/esri-geocode', () => ({
  geocodeAddress: vi.fn(),
}));

vi.mock('@/lib/geo/usda-zone', () => ({
  lookupUsdaZone: vi.fn(),
}));

import { createProperty, deleteProperty, updateProperty } from './actions';

import { geocodeAddress } from '@/lib/geo/esri-geocode';
import { lookupUsdaZone } from '@/lib/geo/usda-zone';


const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  supabaseStub.auth.getUser.mockReset();
  supabaseStub.from.mockClear().mockImplementation(() => fromBuilder);
  for (const fn of [fromBuilder.select, fromBuilder.insert, fromBuilder.update, fromBuilder.delete, fromBuilder.eq, fromBuilder.single]) {
    fn.mockReset();
    if (fn !== fromBuilder.single) fn.mockReturnThis();
  }
  vi.mocked(geocodeAddress).mockReset();
  vi.mocked(lookupUsdaZone).mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

function withAuthedUser(id = 'u-1') {
  supabaseStub.auth.getUser.mockResolvedValue({
    data: { user: { id, email: 'a@b.co' } },
    error: null,
  });
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('app/properties/actions — createProperty', () => {
  test('geocodes the address, looks up USDA zone, inserts the row', async () => {
    withAuthedUser('u-1');
    vi.mocked(geocodeAddress).mockResolvedValueOnce({
      label: '1 Apple St, Cupertino, CA',
      lat: 37.33,
      lon: -122.03,
    });
    vi.mocked(lookupUsdaZone).mockResolvedValueOnce('9b');
    fromBuilder.single.mockResolvedValueOnce({ data: { id: 'p-new' }, error: null });

    await expect(
      createProperty(form({ name: 'Home', address: '1 Apple St' })),
    ).rejects.toThrow(/NEXT_REDIRECT:\/properties\/p-new/);

    expect(geocodeAddress).toHaveBeenCalledWith('1 Apple St');
    expect(lookupUsdaZone).toHaveBeenCalledWith(37.33, -122.03);
    expect(fromBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_account_id: 'u-1',
        name: 'Home',
        address: '1 Apple St, Cupertino, CA',
        center: expect.stringContaining('POINT(-122.03 37.33)'),
        usda_zone: '9b',
      }),
    );
  });

  test('persists a drawn parcel outline as a WKT POLYGON', async () => {
    withAuthedUser('u-1');
    fromBuilder.single.mockResolvedValueOnce({ data: { id: 'p-3' }, error: null });

    const polygon = JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [-122.03, 37.33],
          [-122.02, 37.33],
          [-122.02, 37.34],
          [-122.03, 37.34],
          [-122.03, 37.33],
        ],
      ],
    });

    await expect(
      createProperty(form({ name: 'Outlined', parcel_outline: polygon })),
    ).rejects.toThrow(/NEXT_REDIRECT/);

    const insertedArg = (fromBuilder.insert.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(insertedArg.parcel_outline).toBe(
      'POLYGON((-122.03 37.33, -122.02 37.33, -122.02 37.34, -122.03 37.34, -122.03 37.33))',
    );
  });

  test('rejects a malformed parcel outline (not GeoJSON Polygon)', async () => {
    withAuthedUser('u-1');
    await expect(
      createProperty(form({ name: 'Bad', parcel_outline: '{"type":"LineString","coordinates":[]}' })),
    ).rejects.toThrow(/parcel outline must be a geojson polygon/i);
    expect(fromBuilder.insert).not.toHaveBeenCalled();
  });

  test('rejects a polygon with fewer than three corners', async () => {
    withAuthedUser('u-1');
    const tiny = JSON.stringify({
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 1], [0, 0]]],
    });
    await expect(createProperty(form({ name: 'Tiny', parcel_outline: tiny }))).rejects.toThrow(
      /at least three corners/i,
    );
  });

  test('accepts a property without an address (just a name)', async () => {
    withAuthedUser('u-1');
    fromBuilder.single.mockResolvedValueOnce({ data: { id: 'p-2' }, error: null });

    await expect(createProperty(form({ name: 'Untitled' }))).rejects.toThrow(/NEXT_REDIRECT/);

    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(lookupUsdaZone).not.toHaveBeenCalled();
    const insertedArg = (fromBuilder.insert.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(insertedArg.center).toBeNull();
    expect(insertedArg.parcel_outline).toBeNull();
    expect(insertedArg.usda_zone).toBeNull();
  });

  test('survives a USDA-zone API outage (zone = null, insert still succeeds)', async () => {
    withAuthedUser('u-1');
    vi.mocked(geocodeAddress).mockResolvedValueOnce({
      label: '1 Apple St',
      lat: 37.33,
      lon: -122.03,
    });
    vi.mocked(lookupUsdaZone).mockResolvedValueOnce(null);
    fromBuilder.single.mockResolvedValueOnce({ data: { id: 'p-4' }, error: null });

    await expect(createProperty(form({ name: 'NoZone', address: '1 Apple St' }))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    const insertedArg = (fromBuilder.insert.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(insertedArg.usda_zone).toBeNull();
  });

  test('rejects a missing name', async () => {
    withAuthedUser();
    await expect(createProperty(form({ name: '   ' }))).rejects.toThrow(/name/i);
    expect(fromBuilder.insert).not.toHaveBeenCalled();
  });

  test('unauth -> /signup, no DB touch', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(createProperty(form({ name: 'X' }))).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });

  test('surfaces a clean error if the insert fails (RLS denial or duplicate)', async () => {
    withAuthedUser();
    fromBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'rls denied' } });
    await expect(createProperty(form({ name: 'X' }))).rejects.toThrow(/could not save/i);
  });
});

describe('app/properties/actions — updateProperty', () => {
  test('updates the row and redirects to the show page', async () => {
    withAuthedUser('u-1');
    fromBuilder.eq.mockResolvedValueOnce({ error: null });

    await expect(
      updateProperty('p-1', form({ name: 'New Name' })),
    ).rejects.toThrow(/NEXT_REDIRECT:\/properties\/p-1/);

    expect(fromBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' }),
    );
    expect(fromBuilder.eq).toHaveBeenCalledWith('id', 'p-1');
  });

  test('rejects an empty name', async () => {
    withAuthedUser();
    await expect(updateProperty('p-1', form({ name: '' }))).rejects.toThrow(/name/i);
    expect(fromBuilder.update).not.toHaveBeenCalled();
  });
});

describe('app/properties/actions — deleteProperty', () => {
  test('deletes the row and redirects to /properties', async () => {
    withAuthedUser('u-1');
    fromBuilder.eq.mockResolvedValueOnce({ error: null });

    await expect(deleteProperty('p-1')).rejects.toThrow(/NEXT_REDIRECT:\/properties/);
    expect(fromBuilder.delete).toHaveBeenCalled();
    expect(fromBuilder.eq).toHaveBeenCalledWith('id', 'p-1');
  });

  test('unauth -> /signup', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(deleteProperty('p-1')).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
    expect(fromBuilder.delete).not.toHaveBeenCalled();
  });
});

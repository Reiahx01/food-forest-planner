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

import { createElement, deleteElement, updateElement } from './actions';

const ORIGINAL_ENV = { ...process.env };
const VALID_UUID = '11111111-2222-4333-8444-555555555555';
const POLYGON = {
  type: 'Polygon',
  coordinates: [[[-122.03, 37.33], [-122.02, 37.33], [-122.02, 37.34], [-122.03, 37.33]]],
};

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
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

function authed() {
  supabaseStub.auth.getUser.mockResolvedValue({
    data: { user: { id: 'u-1', email: 'a@b.co' } },
    error: null,
  });
}

describe('app/elements/actions — createElement', () => {
  test('happy path: validates via Guild Zod, inserts, returns { ok, id }', async () => {
    authed();
    fromBuilder.single.mockResolvedValueOnce({ data: { id: 'e-1' }, error: null });

    const result = await createElement({
      designId: 'd-1',
      type: 'guild',
      geometry: POLYGON,
      attributes: { centerTreeSpeciesId: VALID_UUID, companionSpeciesIds: [] },
    });

    expect(result).toEqual({ ok: true, id: 'e-1' });
    expect(supabaseStub.from).toHaveBeenCalledWith('elements');
    expect(fromBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        design_id: 'd-1',
        type: 'guild',
        geometry: POLYGON,
        attributes: expect.objectContaining({ centerTreeSpeciesId: VALID_UUID }),
      }),
    );
  });

  test('Zod failure: center tree missing -> structured fieldErrors, no DB write', async () => {
    authed();
    const result = await createElement({
      designId: 'd-1',
      type: 'guild',
      geometry: POLYGON,
      attributes: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/invalid attributes/i);
      expect(result.fieldErrors).toBeDefined();
      expect(Object.keys(result.fieldErrors ?? {})).toContain('centerTreeSpeciesId');
    }
    expect(fromBuilder.insert).not.toHaveBeenCalled();
  });

  test('Zod failure: non-uuid centerTreeSpeciesId', async () => {
    authed();
    const result = await createElement({
      designId: 'd-1',
      type: 'guild',
      geometry: POLYGON,
      attributes: { centerTreeSpeciesId: 'not-a-uuid' },
    });
    expect(result.ok).toBe(false);
  });

  test('unauthenticated: returns { ok: false, error: "Sign in required." }, no DB touch', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await createElement({
      designId: 'd-1',
      type: 'guild',
      geometry: POLYGON,
      attributes: { centerTreeSpeciesId: VALID_UUID },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sign in/i);
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });

  test('RLS denial surfaces a generic save error', async () => {
    authed();
    fromBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'rls denied' } });
    const result = await createElement({
      designId: 'd-foreign',
      type: 'guild',
      geometry: POLYGON,
      attributes: { centerTreeSpeciesId: VALID_UUID },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/could not save/i);
  });
});

describe('app/elements/actions — updateElement', () => {
  test('updates attributes after re-validating via the module', async () => {
    authed();
    fromBuilder.eq.mockResolvedValueOnce({ error: null });
    const result = await updateElement({
      id: 'e-1',
      type: 'guild',
      attributes: { centerTreeSpeciesId: VALID_UUID, companionSpeciesIds: [] },
    });
    expect(result).toEqual({ ok: true, id: 'e-1' });
    expect(fromBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ attributes: expect.objectContaining({ centerTreeSpeciesId: VALID_UUID }) }),
    );
  });

  test('rejects invalid attributes without touching the DB', async () => {
    authed();
    const result = await updateElement({
      id: 'e-1',
      type: 'guild',
      attributes: {},
    });
    expect(result.ok).toBe(false);
    expect(fromBuilder.update).not.toHaveBeenCalled();
  });

  test('label-only update writes label without touching attributes', async () => {
    authed();
    fromBuilder.eq.mockResolvedValueOnce({ error: null });
    const result = await updateElement({ id: 'e-1', type: 'guild', label: 'apple guild' });
    expect(result).toEqual({ ok: true, id: 'e-1' });
    const payload = (fromBuilder.update.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(payload).toEqual({ label: 'apple guild' });
  });

  test('no-op when no fields are present (returns ok without a DB call)', async () => {
    authed();
    const result = await updateElement({ id: 'e-1', type: 'guild' });
    expect(result).toEqual({ ok: true, id: 'e-1' });
    expect(fromBuilder.update).not.toHaveBeenCalled();
  });
});

describe('app/elements/actions — deleteElement', () => {
  test('deletes by id', async () => {
    authed();
    fromBuilder.eq.mockResolvedValueOnce({ error: null });
    const result = await deleteElement('e-1');
    expect(result).toEqual({ ok: true, id: 'e-1' });
    expect(fromBuilder.delete).toHaveBeenCalled();
    expect(fromBuilder.eq).toHaveBeenCalledWith('id', 'e-1');
  });

  test('unauth -> sign-in-required error', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await deleteElement('e-1');
    expect(result.ok).toBe(false);
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });
});

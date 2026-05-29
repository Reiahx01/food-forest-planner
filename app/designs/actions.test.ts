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
}));

import { createDesign, deleteDesign, updateDesign } from './actions';

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
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

function authed(id = 'u-1') {
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

describe('app/designs/actions — createDesign', () => {
  test('inserts the row and redirects to the editor', async () => {
    authed();
    fromBuilder.single.mockResolvedValueOnce({ data: { id: 'd-1' }, error: null });

    await expect(
      createDesign('p-1', form({ name: 'Spring 2026', description: 'first pass' })),
    ).rejects.toThrow(/NEXT_REDIRECT:\/designs\/d-1\/edit/);

    expect(supabaseStub.from).toHaveBeenCalledWith('designs');
    expect(fromBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        property_id: 'p-1',
        name: 'Spring 2026',
        description: 'first pass',
      }),
    );
  });

  test('accepts a missing description (writes null)', async () => {
    authed();
    fromBuilder.single.mockResolvedValueOnce({ data: { id: 'd-2' }, error: null });

    await expect(createDesign('p-1', form({ name: 'Untitled' }))).rejects.toThrow(/NEXT_REDIRECT/);

    const arg = (fromBuilder.insert.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(arg.description).toBeNull();
  });

  test('rejects an empty name', async () => {
    authed();
    await expect(createDesign('p-1', form({ name: '   ' }))).rejects.toThrow(/name/i);
    expect(fromBuilder.insert).not.toHaveBeenCalled();
  });

  test('unauth -> /signup, no DB touch', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(createDesign('p-1', form({ name: 'X' }))).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });

  test('surfaces a clean error if the insert fails (RLS denial)', async () => {
    authed();
    fromBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'rls denied' } });
    await expect(createDesign('p-1', form({ name: 'X' }))).rejects.toThrow(/could not save/i);
  });
});

describe('app/designs/actions — updateDesign', () => {
  test('updates the row and redirects to the show page', async () => {
    authed();
    fromBuilder.eq.mockResolvedValueOnce({ error: null });

    await expect(
      updateDesign('d-1', form({ name: 'Renamed', description: 'newer pass' })),
    ).rejects.toThrow(/NEXT_REDIRECT:\/designs\/d-1/);

    expect(fromBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Renamed', description: 'newer pass' }),
    );
    expect(fromBuilder.eq).toHaveBeenCalledWith('id', 'd-1');
  });

  test('rejects an empty name', async () => {
    authed();
    await expect(updateDesign('d-1', form({ name: '' }))).rejects.toThrow(/name/i);
    expect(fromBuilder.update).not.toHaveBeenCalled();
  });
});

describe('app/designs/actions — deleteDesign', () => {
  test('deletes the row and redirects back to the parent Property', async () => {
    authed();
    // SELECT chain: .eq() returns this (chainable), .single() resolves.
    fromBuilder.eq.mockReturnValueOnce(fromBuilder as never);
    fromBuilder.single.mockResolvedValueOnce({
      data: { property_id: 'p-77' },
      error: null,
    });
    // DELETE chain: .eq() is the terminal mock and resolves with the error shape.
    fromBuilder.eq.mockResolvedValueOnce({ error: null });

    await expect(deleteDesign('d-1')).rejects.toThrow(/NEXT_REDIRECT:\/properties\/p-77/);
    expect(fromBuilder.delete).toHaveBeenCalled();
  });

  test('falls back to /properties when the parent lookup fails', async () => {
    authed();
    fromBuilder.eq.mockReturnValueOnce(fromBuilder as never);
    fromBuilder.single.mockResolvedValueOnce({ data: null, error: { message: 'no row' } });
    fromBuilder.eq.mockResolvedValueOnce({ error: null });

    await expect(deleteDesign('d-1')).rejects.toThrow(/NEXT_REDIRECT:\/properties$/);
  });

  test('unauth -> /signup', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(deleteDesign('d-1')).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
  });
});

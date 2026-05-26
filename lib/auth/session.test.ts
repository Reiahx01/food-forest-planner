// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const cookieStoreMock = {
  getAll: vi.fn(() => [{ name: 'sb-access-token', value: 'fake-jwt' }]),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStoreMock),
}));

const supabaseStub = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

import { getCurrentAccount, getCurrentUser } from './session';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  cookieStoreMock.getAll.mockClear();
  cookieStoreMock.set.mockClear();
  supabaseStub.auth.getUser.mockReset();
  supabaseStub.from.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

describe('lib/auth/session — getCurrentUser', () => {
  test('returns the user when Supabase Auth resolves one', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    });

    const user = await getCurrentUser();
    expect(user).toEqual({ id: 'u-1', email: 'a@b.co' });
  });

  test('returns null when no user is signed in', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await getCurrentUser()).toBeNull();
  });

  test('returns null when Supabase returns an error', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'jwt expired' },
    });
    expect(await getCurrentUser()).toBeNull();
  });
});

describe('lib/auth/session — getCurrentAccount', () => {
  function mockAccountQuery(returns: { data: unknown; error: unknown }) {
    supabaseStub.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(returns),
        }),
      }),
    }));
  }

  test('returns { user, account } when both resolve', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    });
    mockAccountQuery({
      data: {
        id: 'u-1',
        email: 'a@b.co',
        role: 'hobbyist',
        display_name: null,
        created_at: '2026-05-26T00:00:00Z',
        updated_at: '2026-05-26T00:00:00Z',
      },
      error: null,
    });

    const result = await getCurrentAccount();
    expect(result?.account.role).toBe('hobbyist');
    expect(result?.user.id).toBe('u-1');
    expect(supabaseStub.from).toHaveBeenCalledWith('accounts');
  });

  test('returns null when no user is signed in (does not hit the DB)', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await getCurrentAccount()).toBeNull();
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });

  test('returns null when the accounts row does not exist (RLS or race)', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    });
    mockAccountQuery({ data: null, error: { code: 'PGRST116' } });

    expect(await getCurrentAccount()).toBeNull();
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: () => undefined })),
}));

const updateBuilder = {
  eq: vi.fn().mockReturnThis(),
};
const supabaseStub: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
} = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({ update: vi.fn(() => updateBuilder) })),
};
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import { redirect } from 'next/navigation';

import { chooseRole } from './actions';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  supabaseStub.auth.getUser.mockReset();
  supabaseStub.from.mockClear();
  updateBuilder.eq.mockClear().mockReturnThis();
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

describe('app/onboarding/actions — chooseRole', () => {
  test('updates accounts.role + onboarded_at and redirects to /dashboard', async () => {
    withAuthedUser('u-1');
    const updateFn = vi.fn<(payload: Record<string, unknown>) => typeof updateBuilder>(
      () => updateBuilder,
    );
    supabaseStub.from.mockReturnValue({ update: updateFn });
    updateBuilder.eq.mockResolvedValueOnce({ error: null });

    await expect(chooseRole('hobbyist')).rejects.toThrow(/NEXT_REDIRECT:\/dashboard/);

    expect(supabaseStub.from).toHaveBeenCalledWith('accounts');
    const [call] = updateFn.mock.calls[0] ?? [{}];
    expect(call.role).toBe('hobbyist');
    expect(call.onboarded_at).toBeTruthy();
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'u-1');
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  test('accepts pro as well as hobbyist', async () => {
    withAuthedUser('u-2');
    const updateFn = vi.fn<(payload: Record<string, unknown>) => typeof updateBuilder>(
      () => updateBuilder,
    );
    supabaseStub.from.mockReturnValue({ update: updateFn });
    updateBuilder.eq.mockResolvedValueOnce({ error: null });

    await expect(chooseRole('pro')).rejects.toThrow(/NEXT_REDIRECT:\/dashboard/);

    const [call] = updateFn.mock.calls[0] ?? [{}];
    expect(call.role).toBe('pro');
  });

  test('rejects an invalid role without touching the DB', async () => {
    withAuthedUser();
    await expect(chooseRole('admin' as never)).rejects.toThrow(/invalid role/i);
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });

  test('redirects to /signup if no user is signed in', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(chooseRole('hobbyist')).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
    expect(supabaseStub.from).not.toHaveBeenCalled();
  });

  test('throws when the DB update fails (caller surfaces a clean error)', async () => {
    withAuthedUser('u-3');
    const updateFn = vi.fn(() => updateBuilder);
    supabaseStub.from.mockReturnValue({ update: updateFn });
    updateBuilder.eq.mockResolvedValueOnce({ error: { message: 'rls denied' } });

    await expect(chooseRole('hobbyist')).rejects.toThrow(/could not save your role/i);
  });
});

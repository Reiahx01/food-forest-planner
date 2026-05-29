// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const cookieStoreMock = {
  getAll: vi.fn(() => []),
  set: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStoreMock),
}));

const supabaseStub = {
  auth: { signInWithPassword: vi.fn() },
};
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import { signIn } from './actions';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  supabaseStub.auth.signInWithPassword.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('app/signin/actions — signIn', () => {
  test('happy path: calls signInWithPassword + redirects to /dashboard', async () => {
    supabaseStub.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

    await expect(
      signIn(form({ email: 'a@b.co', password: 'correcthorse' })),
    ).rejects.toThrow(/NEXT_REDIRECT:\/dashboard/);

    expect(supabaseStub.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'correcthorse',
    });
  });

  test('lowercases + trims the email', async () => {
    supabaseStub.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

    await expect(
      signIn(form({ email: '  A@B.CO  ', password: 'pw' })),
    ).rejects.toThrow(/NEXT_REDIRECT/);
    expect(supabaseStub.auth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.co' }),
    );
  });

  test('rejects a missing email', async () => {
    const result = await signIn(form({ email: '', password: 'pw' }));
    expect(result).toEqual({ ok: false, error: 'Please enter a valid email address.' });
    expect(supabaseStub.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test('rejects an empty password', async () => {
    const result = await signIn(form({ email: 'a@b.co', password: '' }));
    expect(result).toEqual({ ok: false, error: 'Please enter your password.' });
    expect(supabaseStub.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test('maps wrong-credentials errors to a generic message (no user enumeration)', async () => {
    supabaseStub.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    const result = await signIn(form({ email: 'a@b.co', password: 'wrong' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/email or password is incorrect/i) });
  });

  test('falls back to a generic message on unknown Supabase errors', async () => {
    supabaseStub.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'rate limit exceeded for IP 1.2.3.4' },
    });

    const result = await signIn(form({ email: 'a@b.co', password: 'correcthorse' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/1\.2\.3\.4/);
      expect(result.error).toMatch(/try again/i);
    }
  });
});

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
  auth: { signUp: vi.fn() },
};
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import { signUp } from './actions';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  supabaseStub.auth.signUp.mockReset();
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

describe('app/signup/actions — signUp', () => {
  test('happy path: calls supabase signUp + redirects to /dashboard', async () => {
    supabaseStub.auth.signUp.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });

    await expect(
      signUp(form({ email: 'a@b.co', password: 'correcthorse' })),
    ).rejects.toThrow(/NEXT_REDIRECT:\/dashboard/);

    expect(supabaseStub.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'correcthorse',
    });
  });

  test('lowercases + trims the email', async () => {
    supabaseStub.auth.signUp.mockResolvedValue({ data: {}, error: null });
    await expect(signUp(form({ email: '  A@B.CO  ', password: 'correcthorse' }))).rejects.toThrow(
      /NEXT_REDIRECT/,
    );
    expect(supabaseStub.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.co' }),
    );
  });

  test('rejects missing or malformed email without hitting Supabase', async () => {
    expect(await signUp(form({ email: '', password: 'longenough' }))).toEqual({
      ok: false,
      error: expect.stringMatching(/valid email/i),
    });
    expect(await signUp(form({ email: 'no-at-sign', password: 'longenough' }))).toEqual({
      ok: false,
      error: expect.stringMatching(/valid email/i),
    });
    expect(supabaseStub.auth.signUp).not.toHaveBeenCalled();
  });

  test('rejects passwords shorter than 8 chars', async () => {
    const result = await signUp(form({ email: 'a@b.co', password: 'short' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/at least 8/i) });
    expect(supabaseStub.auth.signUp).not.toHaveBeenCalled();
  });

  test('maps "already exists" to a friendly "sign in instead" message', async () => {
    supabaseStub.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });

    const result = await signUp(form({ email: 'a@b.co', password: 'longenough' }));
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/already exists.*sign in/i),
    });
  });

  test('weak-password feedback maps to a clean hint', async () => {
    supabaseStub.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'Password does not meet requirements: too short' },
    });

    const result = await signUp(form({ email: 'a@b.co', password: 'longenough' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/too weak/i) });
  });

  test('falls back to a generic message on unknown Supabase errors (no leak)', async () => {
    supabaseStub.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'rate limit exceeded for IP 1.2.3.4' },
    });

    const result = await signUp(form({ email: 'a@b.co', password: 'longenough' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/1\.2\.3\.4/);
      expect(result.error).toMatch(/try again/i);
    }
  });
});

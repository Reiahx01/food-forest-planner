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
  auth: { signInWithOtp: vi.fn() },
};
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

import { requestMagicLink } from './actions';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  process.env.NEXT_PUBLIC_SITE_ORIGIN = 'http://localhost:3000';
  supabaseStub.auth.signInWithOtp.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

function formDataWith(email: string): FormData {
  const fd = new FormData();
  fd.set('email', email);
  return fd;
}

describe('app/signup/actions — requestMagicLink', () => {
  test('returns { ok: true } and instructs Supabase to send a magic-link email', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({ error: null });

    const result = await requestMagicLink(formDataWith('a@b.co'));

    expect(result).toEqual({ ok: true, email: 'a@b.co' });
    expect(supabaseStub.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.co',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
        shouldCreateUser: true,
      },
    });
  });

  test('lowercases + trims the submitted email before sending', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({ error: null });

    await requestMagicLink(formDataWith('  A@B.CO  '));

    expect(supabaseStub.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.co' }),
    );
  });

  test('rejects a missing or empty email', async () => {
    const result = await requestMagicLink(formDataWith(''));
    expect(result).toEqual({ ok: false, error: 'Please enter a valid email address.' });
    expect(supabaseStub.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  test('rejects a syntactically invalid email', async () => {
    const result = await requestMagicLink(formDataWith('not-an-email'));
    expect(result.ok).toBe(false);
    expect(supabaseStub.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  test('surfaces a generic error when Supabase fails (no leak of internal message)', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'rate limit exceeded for IP 1.2.3.4' },
    });

    const result = await requestMagicLink(formDataWith('a@b.co'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/1\.2\.3\.4/);
      expect(result.error).toMatch(/try again/i);
    }
  });
});

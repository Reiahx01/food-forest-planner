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

import { signIn } from './actions';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  process.env.NEXT_PUBLIC_SITE_ORIGIN = 'http://localhost:3000';
  // The dev-mode override in `siteOrigin()` keys off NODE_ENV — explicitly
  // pin to 'test' here so we're exercising the env-var path, not the
  // localhost fallback.
  vi.stubEnv('NODE_ENV', 'test');
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

describe('app/signin/actions — signIn', () => {
  test('calls Supabase with shouldCreateUser: false (the signin/signup distinction)', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({ error: null });

    const result = await signIn(formDataWith('a@b.co'));

    expect(result).toEqual({ ok: true, email: 'a@b.co' });
    expect(supabaseStub.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.co',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
        shouldCreateUser: false,
      },
    });
  });

  test('lowercases + trims the email before sending', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({ error: null });

    await signIn(formDataWith('  A@B.CO  '));

    expect(supabaseStub.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.co' }),
    );
  });

  test('rejects a missing or empty email', async () => {
    const result = await signIn(formDataWith(''));
    expect(result).toEqual({ ok: false, error: 'Please enter a valid email address.' });
    expect(supabaseStub.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  test('rejects a syntactically invalid email', async () => {
    const result = await signIn(formDataWith('not-an-email'));
    expect(result.ok).toBe(false);
    expect(supabaseStub.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  test('returns the no-account hint when Supabase signals signups are disabled', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'Signups not allowed for otp' },
    });

    const result = await signIn(formDataWith('a@b.co'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/don't recognise/i);
    }
  });

  test('returns the no-account hint when Supabase signals user not found', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'User not found' },
    });

    const result = await signIn(formDataWith('a@b.co'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/don't recognise/i);
    }
  });

  test('returns the generic error for unrecognised Supabase failures', async () => {
    supabaseStub.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'rate limit exceeded for IP 1.2.3.4' },
    });

    const result = await signIn(formDataWith('a@b.co'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/1\.2\.3\.4/);
      expect(result.error).toMatch(/try again/i);
    }
  });
});

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
  auth: { exchangeCodeForSession: vi.fn() },
};
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

import { GET } from './route';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  supabaseStub.auth.exchangeCodeForSession.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

function get(url: string): Request {
  return new Request(url);
}

describe('app/auth/callback/route — magic-link code exchange', () => {
  test('exchanges the ?code= for a session, then redirects to /dashboard', async () => {
    supabaseStub.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });

    const res = await GET(get('http://localhost:3000/auth/callback?code=abc123'));

    expect(supabaseStub.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    // NextResponse.redirect defaults to 307 (temporary, preserve method).
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  test('honours a ?next= param when present (e.g. deep-link return)', async () => {
    supabaseStub.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });

    const res = await GET(get('http://localhost:3000/auth/callback?code=abc&next=/properties'));

    expect(res.headers.get('location')).toBe('http://localhost:3000/properties');
  });

  test('rejects open-redirect via absolute ?next= URLs', async () => {
    supabaseStub.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });

    const res = await GET(
      get('http://localhost:3000/auth/callback?code=abc&next=https://evil.example.com'),
    );

    // Must NOT redirect off-origin -- fall back to /dashboard.
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  test('redirects to /signup with ?error when no code is present', async () => {
    const res = await GET(get('http://localhost:3000/auth/callback'));

    expect(supabaseStub.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toMatch(/\/signup\?error=/);
  });

  test('redirects to /signup with ?error when the exchange fails', async () => {
    supabaseStub.auth.exchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: 'link expired' },
    });

    const res = await GET(get('http://localhost:3000/auth/callback?code=abc'));
    expect(res.headers.get('location')).toMatch(/\/signup\?error=/);
  });
});

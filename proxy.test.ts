// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const fromBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};
const supabaseStub = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => fromBuilder),
};
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => supabaseStub),
}));

import { config, proxy } from './proxy';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  supabaseStub.auth.getUser.mockReset();
  supabaseStub.from.mockClear();
  fromBuilder.select.mockClear().mockReturnThis();
  fromBuilder.eq.mockClear().mockReturnThis();
  fromBuilder.single.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllEnvs();
});

class FakeNextRequest {
  cookies = {
    getAll: () => [] as { name: string; value: string }[],
    set: () => undefined,
  };

  constructor(public nextUrl: URL, public url: string = nextUrl.toString()) {}
}

function req(path: string): FakeNextRequest {
  return new FakeNextRequest(new URL(`http://localhost:3000${path}`));
}

function withAuthedUser(id = 'u-1') {
  supabaseStub.auth.getUser.mockResolvedValue({
    data: { user: { id, email: 'a@b.co' } },
    error: null,
  });
}

function withAccount(onboardedAt: string | null) {
  fromBuilder.single.mockResolvedValue({
    data: { onboarded_at: onboardedAt },
    error: null,
  });
}

describe('proxy.ts — auth gate (Next 16 replacement for middleware.ts)', () => {
  test('matcher excludes _next assets so the proxy does not fire on every static file', () => {
    const matchers = Array.isArray(config.matcher) ? config.matcher : [config.matcher];
    const matcherStr = matchers.join('|');
    expect(matcherStr).toMatch(/_next\\?\/static/);
    expect(matcherStr).toMatch(/_next\\?\/image/);
    expect(matcherStr).toMatch(/favicon/);
  });

  test('anon -> /dashboard redirects to /signup with ?next= preserving the path', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await proxy(req('/dashboard') as never);
    const location = res?.headers.get('location') ?? '';
    expect(location).toMatch(/^http:\/\/localhost:3000\/signup(\?|$)/);
    expect(location).toMatch(/next=%2Fdashboard/);
  });

  test('authed + onboarded -> /dashboard passes through (no redirect)', async () => {
    withAuthedUser();
    withAccount('2026-01-01T00:00:00Z');

    const res = await proxy(req('/dashboard') as never);
    expect(res?.headers.get('location')).toBeNull();
  });

  test('authed + NOT onboarded -> /dashboard redirects to /onboarding', async () => {
    withAuthedUser();
    withAccount(null);

    const res = await proxy(req('/dashboard') as never);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/onboarding');
  });

  test('authed + onboarded -> /onboarding redirects forward to /dashboard', async () => {
    withAuthedUser();
    withAccount('2026-01-01T00:00:00Z');

    const res = await proxy(req('/onboarding') as never);
    expect(res?.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  test('authed + NOT onboarded -> /onboarding passes through (the user belongs here)', async () => {
    withAuthedUser();
    withAccount(null);

    const res = await proxy(req('/onboarding') as never);
    expect(res?.headers.get('location')).toBeNull();
  });

  test('anon -> /onboarding redirects to /signup', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await proxy(req('/onboarding') as never);
    expect(res?.headers.get('location')).toMatch(/\/signup(\?|$)/);
  });

  test('?next= survives the /dashboard subpath case', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await proxy(req('/dashboard/properties') as never);
    expect(res?.headers.get('location')).toMatch(/next=%2Fdashboard%2Fproperties/);
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const supabaseStub = {
  auth: { getUser: vi.fn() },
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

describe('proxy.ts — auth-gate for protected paths (Next 16 replacement for middleware.ts)', () => {
  test('matcher excludes _next assets so the proxy doesn\'t fire on every static file', () => {
    const matchers = Array.isArray(config.matcher) ? config.matcher : [config.matcher];
    const matcherStr = matchers.join('|');
    // The matcher is a negative-lookahead pattern that excludes asset paths.
    // We assert the exclusion list contains the expected entries; the inclusion
    // side is "everything else".
    expect(matcherStr).toMatch(/_next\\?\/static/);
    expect(matcherStr).toMatch(/_next\\?\/image/);
    expect(matcherStr).toMatch(/favicon/);
  });

  test('redirects an anonymous request to /signup (with ?next= preserving the path)', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await proxy(req('/dashboard') as never);
    const location = res?.headers.get('location') ?? '';
    expect(location).toMatch(/^http:\/\/localhost:3000\/signup(\?|$)/);
    expect(location).toMatch(/next=%2Fdashboard/);
  });

  test('lets through an authenticated request (no redirect, returns the passthrough response)', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u-1', email: 'a@b.co' } },
      error: null,
    });

    const res = await proxy(req('/dashboard') as never);
    // No location header means the proxy let the request pass through.
    expect(res?.headers.get('location')).toBeNull();
  });

  test('redirect target preserves the request path so users land where they tried to go', async () => {
    supabaseStub.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await proxy(req('/dashboard/properties') as never);
    const location = res?.headers.get('location') ?? '';
    expect(location).toContain('/signup');
    // The eventual UX is "post-signup, send me back to /dashboard/properties".
    // We carry the intended path via ?next=.
    expect(location).toMatch(/next=%2Fdashboard%2Fproperties/);
  });
});

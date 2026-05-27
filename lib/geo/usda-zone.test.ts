// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { lookupUsdaZone } from './usda-zone';

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
});

function mockJson(payload: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
  global.fetch = fn as unknown as typeof global.fetch;
  return fn;
}

describe('lib/geo/usda-zone — Plant Hardiness Zone lookup', () => {
  test('returns the zone string from the API', async () => {
    const fetchSpy = mockJson({ zone: '9a', coordinates: { lat: 37.33, lon: -122.03 } });
    const zone = await lookupUsdaZone(37.33, -122.03);
    expect(zone).toBe('9a');

    const [url] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain('37.33');
    expect(String(url)).toContain('-122.03');
  });

  test('returns null on HTTP error (graceful, not thrown)', async () => {
    global.fetch = vi.fn(async () => new Response('Not Found', { status: 404 })) as never;
    expect(await lookupUsdaZone(0, 0)).toBeNull();
  });

  test('returns null on network failure', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as never;
    expect(await lookupUsdaZone(37.33, -122.03)).toBeNull();
  });

  test('returns null when the response lacks a zone field', async () => {
    mockJson({ something_else: true });
    expect(await lookupUsdaZone(37.33, -122.03)).toBeNull();
  });

  test('rejects invalid coords without making a network call', async () => {
    const fetchSpy = mockJson({ zone: '9a' });
    expect(await lookupUsdaZone(NaN, -122)).toBeNull();
    expect(await lookupUsdaZone(91, 0)).toBeNull(); // out of lat range
    expect(await lookupUsdaZone(0, 181)).toBeNull(); // out of lon range
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

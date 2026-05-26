// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { geocodeAddress, suggestAddresses } from './esri-geocode';

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
});

function mockFetchJson(payload: unknown): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
  global.fetch = fn as unknown as typeof global.fetch;
  return fn;
}

describe('lib/geo/esri-geocode — geocodeAddress (forward geocode)', () => {
  test('returns the top candidate as { lat, lon, label }', async () => {
    mockFetchJson({
      candidates: [
        {
          address: '1 Apple St, Cupertino, CA',
          location: { x: -122.0312, y: 37.3318 },
          score: 99,
        },
        { address: 'Other', location: { x: -1, y: -1 }, score: 50 },
      ],
    });

    const result = await geocodeAddress('1 Apple St');
    expect(result).toEqual({
      label: '1 Apple St, Cupertino, CA',
      lat: 37.3318,
      lon: -122.0312,
    });
  });

  test('returns null when Esri returns zero candidates', async () => {
    mockFetchJson({ candidates: [] });
    expect(await geocodeAddress('asdf')).toBeNull();
  });

  test('returns null on HTTP error (graceful, not a thrown exception)', async () => {
    global.fetch = vi.fn(async () =>
      new Response('Service Unavailable', { status: 503 }),
    ) as unknown as typeof global.fetch;
    expect(await geocodeAddress('addr')).toBeNull();
  });

  test('rejects empty / whitespace-only input without making a network call', async () => {
    const fetchSpy = mockFetchJson({ candidates: [] });
    expect(await geocodeAddress('')).toBeNull();
    expect(await geocodeAddress('   ')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('uses Esri\'s findAddressCandidates endpoint', async () => {
    const fetchSpy = mockFetchJson({ candidates: [] });
    await geocodeAddress('1 Main St');
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain('geocode.arcgis.com');
    expect(String(url)).toContain('findAddressCandidates');
    expect(String(url)).toContain('singleLine=1%20Main%20St');
    expect(String(url)).toContain('f=json');
  });
});

describe('lib/geo/esri-geocode — suggestAddresses (autocomplete)', () => {
  test('returns the suggestion strings only', async () => {
    mockFetchJson({
      suggestions: [
        { text: '1 Main St, Cupertino, CA', magicKey: 'k1', isCollection: false },
        { text: '1 Main St, Boulder, CO', magicKey: 'k2', isCollection: false },
      ],
    });

    const result = await suggestAddresses('1 Main');
    expect(result).toEqual([
      '1 Main St, Cupertino, CA',
      '1 Main St, Boulder, CO',
    ]);
  });

  test('returns [] for empty input (no network call)', async () => {
    const fetchSpy = mockFetchJson({ suggestions: [] });
    expect(await suggestAddresses('')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/**
 * Esri World Geocoding service wrapper.
 *
 * ADR-0001 + ADR-0006: Esri is the v1 tile + geocode provider. We use the
 * free non-commercial tier; commercial-tier evaluation is on the roadmap
 * once we exceed the free quota (~20k geocodes/month). Documented in
 * CONTRIBUTING.md.
 *
 * Endpoints used:
 *   - findAddressCandidates -- forward geocode an address -> { lat, lon }
 *   - suggest -- autocomplete (typeahead) suggestions
 *
 * Free-tier guidance: do not persist the resolved coordinates if you can
 * help it. We DO persist `properties.center` (the user's plot location) as
 * a v1 simplification -- the issue notes this and the
 * commercial-tier rev-eval is roadmapped.
 *
 * No API key is required for low-volume non-commercial use. An optional
 * `ESRI_API_KEY` env var bumps the quota; we read it if set.
 */

const FIND_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';
const SUGGEST_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest';

export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return entries.map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join('&');
}

function apiKey(): string | undefined {
  const key = process.env.ESRI_API_KEY;
  return key && key.length > 0 ? key : undefined;
}

/**
 * Forward-geocode a single address string into a coordinate. Returns the
 * top-scoring candidate (Esri orders them by score descending), or null if
 * the service returns no candidates, fails, or the input is empty.
 *
 * Discipline: never throws. Callers get a clean `null` and surface their
 * own UI message ("Address not found").
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;

  const url = `${FIND_URL}?${buildQuery({
    singleLine: trimmed,
    f: 'json',
    maxLocations: '1',
    outFields: 'Match_addr',
    token: apiKey(),
  })}`;

  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      candidates?: { address: string; location: { x: number; y: number }; score: number }[];
    };
    const top = body.candidates?.[0];
    if (!top) return null;
    return { label: top.address, lat: top.location.y, lon: top.location.x };
  } catch {
    return null;
  }
}

/**
 * Typeahead suggestions for an address-in-progress. Returns just the
 * display strings; consumers feeding them back into a `geocodeAddress`
 * call get the lat/lon.
 *
 * The Esri suggest endpoint accepts ?text=. Empty input short-circuits.
 */
export async function suggestAddresses(prefix: string): Promise<string[]> {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) return [];

  const url = `${SUGGEST_URL}?${buildQuery({
    text: trimmed,
    f: 'json',
    token: apiKey(),
  })}`;

  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return [];
    const body = (await res.json()) as { suggestions?: { text: string }[] };
    return (body.suggestions ?? []).map((s) => s.text);
  } catch {
    return [];
  }
}

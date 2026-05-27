/**
 * USDA Plant Hardiness Zone lookup by coordinate.
 *
 * Uses the community phzmapi.org service (no key required) which wraps the
 * USDA Plant Hardiness Zone GIS dataset. Returns the zone string (e.g. `9a`,
 * `5b`) or null if the coord is out of range / the service is unreachable /
 * the response shape is unexpected.
 *
 * Discipline: never throws. Callers treat null as "zone unknown" and continue.
 *
 * Coverage limitation: USDA zones are defined for the United States. For
 * non-US Properties the API returns 404; we surface that as null. The roadmap
 * has Köppen / ISO-3166-aware climate classifications post-v1; until then,
 * non-US users see "Zone not available" in the UI.
 */

const PHZ_BASE = process.env.PHZ_API_BASE ?? 'https://phzmapi.org';

function isValidLat(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLon(lon: number): boolean {
  return Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

export async function lookupUsdaZone(lat: number, lon: number): Promise<string | null> {
  if (!isValidLat(lat) || !isValidLon(lon)) return null;

  const url = `${PHZ_BASE}/${lat}/${lon}.json`;

  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const body = (await res.json()) as { zone?: string };
    if (typeof body.zone !== 'string' || body.zone.length === 0) return null;
    return body.zone;
  } catch {
    return null;
  }
}

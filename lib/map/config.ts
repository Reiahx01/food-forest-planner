/**
 * Shared MapLibre + Esri map config (#10, ADR-0006).
 *
 * One module owns the base-style construction so element-module map
 * renderers (#14+) inherit the same imagery + attribution.
 *
 * Esri ToS requires the attribution string be visible on every map view --
 * MapLibre renders it via the `attribution` field on the raster source.
 */

export const ESRI_IMAGERY_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

/**
 * Minimal MapLibre style spec. Returns a fresh object each call so callers
 * can mutate (add layers, sources) without poisoning the shared instance.
 */
export interface BaseStyleSource {
  type: 'raster';
  tiles: string[];
  tileSize: number;
  attribution: string;
}

export interface BaseStyle {
  version: 8;
  sources: { 'esri-imagery': BaseStyleSource } & Record<string, unknown>;
  layers: { id: string; type: 'raster'; source: string }[];
}

export function buildBaseStyle(): BaseStyle {
  return {
    version: 8,
    sources: {
      'esri-imagery': {
        type: 'raster',
        tiles: [ESRI_IMAGERY_TILE_URL],
        tileSize: 256,
        attribution: ESRI_ATTRIBUTION,
      },
    },
    layers: [{ id: 'esri-imagery-base', type: 'raster', source: 'esri-imagery' }],
  };
}

/**
 * Initial map view when no Property is selected -- US continental center
 * with a wide zoom level. Property show pages override with the property's
 * center coords.
 */
export const DEFAULT_VIEW = {
  center: [-98.5795, 39.8283] as [number, number],
  zoom: 3,
};

import { describe, expect, test } from 'vitest';

import { ESRI_ATTRIBUTION, ESRI_IMAGERY_TILE_URL, buildBaseStyle } from './config';

describe('lib/map/config — shared MapLibre + Esri config', () => {
  test('Esri World Imagery tile URL contains the {z}/{y}/{x} template', () => {
    expect(ESRI_IMAGERY_TILE_URL).toContain('{z}');
    expect(ESRI_IMAGERY_TILE_URL).toContain('{y}');
    expect(ESRI_IMAGERY_TILE_URL).toContain('{x}');
    expect(ESRI_IMAGERY_TILE_URL).toMatch(/server\.arcgisonline\.com/);
  });

  test('Esri attribution credits Esri + Maxar + Earthstar + GIS User Community (per ToS)', () => {
    expect(ESRI_ATTRIBUTION).toMatch(/Esri/i);
    expect(ESRI_ATTRIBUTION).toMatch(/Maxar|Earthstar|GIS User/i);
  });

  test('buildBaseStyle produces a MapLibre style with the Esri raster source + attribution', () => {
    const style = buildBaseStyle();
    expect(style.version).toBe(8);
    expect(style.sources).toHaveProperty('esri-imagery');
    const source = style.sources['esri-imagery'];
    expect(source.type).toBe('raster');
    expect(source.tileSize).toBe(256);
    expect(source.attribution).toBe(ESRI_ATTRIBUTION);
    expect(source.tiles).toEqual([ESRI_IMAGERY_TILE_URL]);

    // Exactly one base layer, referencing the source.
    expect(style.layers).toHaveLength(1);
    expect(style.layers[0]).toMatchObject({
      id: 'esri-imagery-base',
      type: 'raster',
      source: 'esri-imagery',
    });
  });
});

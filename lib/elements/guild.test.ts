// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { guildAttributesSchema, guildModule } from './guild';

// Zod v4 enforces RFC 4122 -- third group must start with [1-8] (version)
// and fourth group with [89ab] (variant). This is a valid v4 UUID.
const VALID_UUID = '11111111-2222-4333-8444-555555555555';

describe('lib/elements/guild — module shape', () => {
  test('registers as type guild with polygon geometry', () => {
    expect(guildModule.type).toBe('guild');
    expect(guildModule.geometry).toBe('polygon');
  });

  test('default attributes leave centerTreeSpeciesId empty (forces user to pick)', () => {
    const defaults = guildModule.defaultAttributes() as { centerTreeSpeciesId: string; companionSpeciesIds: string[] };
    expect(defaults.centerTreeSpeciesId).toBe('');
    expect(defaults.companionSpeciesIds).toEqual([]);
  });

  test('domain rule returns [] for any valid input (Zod is the gate today)', () => {
    expect(guildModule.validateDomainRules?.({
      centerTreeSpeciesId: VALID_UUID,
      companionSpeciesIds: [],
    }, { geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,0]]] } })).toEqual([]);
  });
});

describe('lib/elements/guild — buildMapLayers (#14 part 2)', () => {
  const polygon = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };

  test('wraps the element geometry in a per-element GeoJSON source', () => {
    const render = guildModule.buildMapLayers({ id: 'el-1', geometry: polygon });
    expect(render.source.id).toBe('element-el-1');
    expect(render.source.data).toMatchObject({ type: 'Feature', geometry: polygon });
  });

  test('emits gold fill + line layers bound to the element source', () => {
    const render = guildModule.buildMapLayers({ id: 'el-1', geometry: polygon });
    const fill = render.layers.find((l) => l.type === 'fill');
    const line = render.layers.find((l) => l.type === 'line');
    expect(fill?.id).toBe('element-el-1-fill');
    expect(line?.id).toBe('element-el-1-line');
    expect(fill?.source).toBe('element-el-1');
    expect(line?.source).toBe('element-el-1');
    // brand accent.gold — same literal PropertyMap paints the parcel with
    expect(fill?.paint['fill-color']).toBe('oklch(72% 0.13 80)');
    expect(line?.paint['line-color']).toBe('oklch(72% 0.13 80)');
  });

  test('namespaces ids per element so two guilds never collide', () => {
    const a = guildModule.buildMapLayers({ id: 'aaa', geometry: polygon });
    const b = guildModule.buildMapLayers({ id: 'bbb', geometry: polygon });
    expect(a.source.id).not.toBe(b.source.id);
    expect(a.layers[0].id).not.toBe(b.layers[0].id);
  });
});

describe('lib/elements/guild — Zod schema', () => {
  test('accepts a minimal valid payload (center tree only)', () => {
    const result = guildAttributesSchema.safeParse({ centerTreeSpeciesId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      // Defaults: companionSpeciesIds becomes [] when omitted.
      expect(result.data.companionSpeciesIds).toEqual([]);
    }
  });

  test('rejects when centerTreeSpeciesId is missing', () => {
    const result = guildAttributesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test('rejects a non-uuid centerTreeSpeciesId', () => {
    const result = guildAttributesSchema.safeParse({ centerTreeSpeciesId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  test('rejects a negative spacingMeters', () => {
    const result = guildAttributesSchema.safeParse({
      centerTreeSpeciesId: VALID_UUID,
      spacingMeters: -1,
    });
    expect(result.success).toBe(false);
  });

  test('accepts an optional notes string', () => {
    const result = guildAttributesSchema.safeParse({
      centerTreeSpeciesId: VALID_UUID,
      notes: 'mulch heavily',
    });
    expect(result.success).toBe(true);
  });

  test('caps notes at 2000 chars', () => {
    const result = guildAttributesSchema.safeParse({
      centerTreeSpeciesId: VALID_UUID,
      notes: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

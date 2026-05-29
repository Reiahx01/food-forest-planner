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

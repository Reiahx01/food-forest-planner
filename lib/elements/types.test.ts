// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import type { ElementGeometryKind, ElementTypeModule } from './types';

describe('lib/elements/types — ElementTypeModule contract', () => {
  test('ElementGeometryKind is a string union of point | polygon | line', () => {
    const kinds: ElementGeometryKind[] = ['point', 'polygon', 'line'];
    expect(kinds).toEqual(['point', 'polygon', 'line']);
  });

  test('a minimal module compiles against the interface', () => {
    const stub: ElementTypeModule<{ name: string }> = {
      type: 'guild',
      label: 'Stub',
      summary: 'Test only',
      geometry: 'polygon',
      attributesSchema: z.object({ name: z.string() }),
      defaultAttributes: () => ({ name: '' }),
      buildMapLayers: () => ({ source: { id: 'stub', data: null }, layers: [] }),
    };
    expect(stub.type).toBe('guild');
    expect(stub.geometry).toBe('polygon');
  });

  test('validateDomainRules is optional', () => {
    const stub: ElementTypeModule<{ x: number }> = {
      type: 'guild',
      label: 'Stub',
      summary: 'Test only',
      geometry: 'point',
      attributesSchema: z.object({ x: z.number() }),
      defaultAttributes: () => ({ x: 0 }),
      buildMapLayers: () => ({ source: { id: 'stub', data: null }, layers: [] }),
    };
    expect(stub.validateDomainRules).toBeUndefined();
  });
});

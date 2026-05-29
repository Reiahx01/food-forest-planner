// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { getElementModule, listElementModules } from './registry';

describe('lib/elements/registry', () => {
  test('returns the Guild module for type "guild"', () => {
    const m = getElementModule('guild');
    expect(m.type).toBe('guild');
    expect(m.label).toBe('Guild');
  });

  test('listElementModules() includes guild (and only guild, in #14)', () => {
    const all = listElementModules();
    expect(all.map((m) => m.type)).toEqual(['guild']);
  });
});

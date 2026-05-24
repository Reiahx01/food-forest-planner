import { describe, expect, test } from 'vitest';
import { tokens } from './tokens';

describe('brand/tokens — canonical brand system contract', () => {
  test('exposes the v1 token categories', () => {
    expect(tokens).toHaveProperty('surface');
    expect(tokens).toHaveProperty('accent');
    expect(tokens).toHaveProperty('border');
    expect(tokens).toHaveProperty('text');
    expect(tokens).toHaveProperty('state');
    expect(tokens).toHaveProperty('shadow');
  });

  test('surface.base is obsidian (the dominant nocturnal base)', () => {
    expect(tokens.surface.base).toBe('oklch(11% 0.01 280)');
  });

  test('accent.gold is warm amber (the load-bearing brand accent)', () => {
    expect(tokens.accent.gold).toBe('oklch(72% 0.13 80)');
  });

  test('accent.goldBright is sunlit gold (used by sun-path overlay)', () => {
    expect(tokens.accent.goldBright).toBe('oklch(82% 0.14 75)');
  });

  test('accent.water is distinct from gold (Pond + Swale elements)', () => {
    expect(tokens.accent.water).toBe('oklch(70% 0.10 230)');
  });

  test('accent.earth is distinct from gold (Bed element)', () => {
    expect(tokens.accent.earth).toBe('oklch(45% 0.04 50)');
  });

  test('surface category contains base, raised, glass, glow', () => {
    expect(Object.keys(tokens.surface).sort()).toEqual(['base', 'glass', 'glow', 'raised']);
  });

  test('accent category contains gold variants + chrome + water + earth', () => {
    expect(Object.keys(tokens.accent).sort()).toEqual([
      'chrome',
      'earth',
      'gold',
      'goldBright',
      'goldDim',
      'water',
    ]);
  });
});

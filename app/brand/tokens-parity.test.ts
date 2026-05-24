import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { tokens } from './tokens';

const __dirname = dirname(fileURLToPath(import.meta.url));
const globalsCss = readFileSync(join(__dirname, '../globals.css'), 'utf-8');

/**
 * Parity test enforcing the single-source-of-truth claim from docs/v1-plan.md §8:
 * canonical brand tokens live in `app/brand/tokens.ts`; Tailwind v4 @theme in
 * `app/globals.css` mirrors them. Drift here = visual regression risk + brand
 * incoherence. The naive contains-check catches most drift; a stricter parser
 * would be over-engineering for v1.
 */
describe('brand/tokens — globals.css @theme parity', () => {
  test('globals.css imports tailwindcss (v4 entry)', () => {
    expect(globalsCss).toContain('@import "tailwindcss"');
  });

  test('globals.css declares a @theme inline block', () => {
    expect(globalsCss).toMatch(/@theme\s+inline\s*\{/);
  });

  test('globals.css contains surface.base obsidian literal', () => {
    expect(globalsCss).toContain(tokens.surface.base);
  });

  test('globals.css contains accent.gold literal', () => {
    expect(globalsCss).toContain(tokens.accent.gold);
  });

  test('globals.css contains accent.goldBright literal (sun-path)', () => {
    expect(globalsCss).toContain(tokens.accent.goldBright);
  });

  test('globals.css contains accent.water literal (Pond + Swale)', () => {
    expect(globalsCss).toContain(tokens.accent.water);
  });

  test('globals.css contains accent.earth literal (Bed)', () => {
    expect(globalsCss).toContain(tokens.accent.earth);
  });

  test('globals.css contains text.primary literal (warm white)', () => {
    expect(globalsCss).toContain(tokens.text.primary);
  });

  test('globals.css does NOT use default Tailwind dark-mode hex (bg #0a0a0a)', () => {
    // The scaffold ships a prefers-color-scheme: dark with #0a0a0a. Our brand
    // is single-mode nocturnal — these scaffold defaults must be removed.
    expect(globalsCss).not.toContain('#0a0a0a');
    expect(globalsCss).not.toContain('#ededed');
  });
});

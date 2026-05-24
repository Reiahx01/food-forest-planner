import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsSource = readFileSync(join(__dirname, 'fonts.ts'), 'utf-8');
const layoutSource = readFileSync(join(__dirname, '../layout.tsx'), 'utf-8');

/**
 * Structural tests for the next/font wiring. Source-text assertions chosen
 * over mocking next/font/google because the latter couples to Next internals
 * that change across majors; the former asserts intent (which fonts, which
 * exports, which usages) and lets the runtime smoke (`next build`) catch
 * Next-internal misuse.
 */
describe('brand/fonts — next/font wiring', () => {
  test('imports Cormorant_Garamond, Inter, JetBrains_Mono from next/font/google', () => {
    expect(fontsSource).toMatch(/from\s+["']next\/font\/google["']/);
    expect(fontsSource).toContain('Cormorant_Garamond');
    expect(fontsSource).toContain('Inter');
    expect(fontsSource).toContain('JetBrains_Mono');
  });

  test('exports display, body, mono font configs', () => {
    expect(fontsSource).toMatch(/export\s+const\s+display\s*=/);
    expect(fontsSource).toMatch(/export\s+const\s+body\s*=/);
    expect(fontsSource).toMatch(/export\s+const\s+mono\s*=/);
  });

  test('exports a fontVariables string aggregating all three .variable strings', () => {
    expect(fontsSource).toMatch(/export\s+const\s+fontVariables\s*=/);
    expect(fontsSource).toContain('display.variable');
    expect(fontsSource).toContain('body.variable');
    expect(fontsSource).toContain('mono.variable');
  });

  test('declares the canonical CSS variable names used by globals.css @theme', () => {
    expect(fontsSource).toContain("'--font-cormorant'");
    expect(fontsSource).toContain("'--font-inter'");
    expect(fontsSource).toContain("'--font-jetbrains-mono'");
  });
});

describe('layout.tsx — font wiring consumed', () => {
  test('imports fontVariables from brand/fonts', () => {
    expect(layoutSource).toMatch(/from\s+["']@\/app\/brand\/fonts["']/);
    expect(layoutSource).toContain('fontVariables');
  });

  test('applies fontVariables to the html element className', () => {
    expect(layoutSource).toMatch(/<html[^>]*className\s*=\s*\{[^}]*fontVariables/);
  });

  test('does NOT import Geist or Geist_Mono (scaffold defaults removed)', () => {
    expect(layoutSource).not.toContain('Geist');
  });
});

import { Linter } from 'eslint';
import { describe, expect, test } from 'vitest';

import rawConfig from './eslint.config.mjs';

// `tseslint.config()` returns a `ConfigArray` typed by @typescript-eslint/utils,
// which is structurally identical to but nominally distinct from the `Config[]`
// expected by Linter.verify() (typed by @eslint/core). Cast once at the boundary.
const config = rawConfig as Linter.Config[];

const linter = new Linter({ configType: 'flat' });

/**
 * Fixture-based tests for the project ESLint config. The point is to catch
 * "I configured the wrong rule" silently — a misconfigured rule that NEVER
 * fires looks the same as a working rule until a violation actually appears.
 * Each test feeds the linter a snippet with a known violation and asserts
 * the expected ruleId surfaces.
 */
describe('eslint.config.mjs — rule firing contract', () => {
  test('@typescript-eslint/no-explicit-any fires on `any` usage', () => {
    const messages = linter.verify('export const x: any = 1;\n', config, {
      filename: 'test.ts',
    });
    expect(
      messages.some((m) => m.ruleId === '@typescript-eslint/no-explicit-any'),
    ).toBe(true);
  });

  test('@typescript-eslint/no-unused-vars fires on unused declaration', () => {
    const messages = linter.verify('export function f() { const x = 1; }\n', config, {
      filename: 'test.ts',
    });
    expect(
      messages.some((m) => m.ruleId === '@typescript-eslint/no-unused-vars'),
    ).toBe(true);
  });

  test('react/jsx-key fires on array of elements without key', () => {
    const code =
      'export default function X() { return <>{[<div>a</div>, <div>b</div>]}</>; }\n';
    const messages = linter.verify(code, config, { filename: 'test.tsx' });
    expect(messages.some((m) => m.ruleId === 'react/jsx-key')).toBe(true);
  });

  test('jsx-a11y/alt-text fires on img without alt', () => {
    const code = 'export default function X() { return <img src="/x.png" />; }\n';
    const messages = linter.verify(code, config, { filename: 'test.tsx' });
    expect(messages.some((m) => m.ruleId === 'jsx-a11y/alt-text')).toBe(true);
  });

  test('import-x/order warns on out-of-order imports', () => {
    const code =
      "import { join } from './local';\nimport { readFileSync } from 'node:fs';\nexport const x = readFileSync(join);\n";
    const messages = linter.verify(code, config, { filename: 'test.ts' });
    expect(messages.some((m) => m.ruleId === 'import-x/order')).toBe(true);
  });
});

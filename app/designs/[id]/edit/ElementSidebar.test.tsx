import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { ElementSidebar } from './ElementSidebar';

describe('app/designs/[id]/edit/ElementSidebar', () => {
  test('renders six element-type buttons in the documented order', () => {
    render(<ElementSidebar />);
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    // The order matches the v1 docs / docs/v1-plan.md §4 element listing.
    expect(labels.map((s) => s.split(/(?=[A-Z])/)[0].trim())).toEqual([
      'Guild',
      'Pond',
      'Swale',
      'Path',
      'Bed',
      'Building',
    ]);
  });

  test('every button is disabled in the editor shell (placement lands in #14)', () => {
    render(<ElementSidebar />);
    for (const b of screen.getAllByRole('button')) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute('title', expect.stringMatching(/#14/i));
    }
  });

  test('uses no default Tailwind palette utilities (brand discipline)', () => {
    const { container } = render(<ElementSidebar />);
    const html = container.innerHTML;
    for (const banned of [
      /\bbg-zinc-/,
      /\bbg-gray-/,
      /\btext-zinc-/,
      /\btext-gray-/,
      /\bshadow-md\b/,
      /\btransition-all\b/,
    ]) {
      expect(html).not.toMatch(banned);
    }
  });
});

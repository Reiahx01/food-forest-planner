import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Nav } from './Nav';

describe('app/components/Nav', () => {
  test('hides the /clients link for hobbyist users', () => {
    render(<Nav accountRole="hobbyist" />);
    expect(screen.queryByRole('link', { name: /clients/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
  });

  test('shows the /clients link for pro users', () => {
    render(<Nav accountRole="pro" />);
    expect(screen.getByRole('link', { name: /clients/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /clients/i })).toHaveAttribute('href', '/clients');
  });

  test('uses no default Tailwind palette utilities (brand discipline)', () => {
    const { container } = render(<Nav accountRole="pro" />);
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

import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Home from './page';

describe('Home — landing page brand chrome', () => {
  test('renders the project name as a top-level heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/food.forest.planner/i);
  });

  test('renders a tagline mentioning planning a food forest', () => {
    render(<Home />);
    expect(screen.getByText(/plan your food forest/i)).toBeInTheDocument();
  });

  test('renders the brand glass panel (gold border + glass surface fill)', () => {
    render(<Home />);
    const panel = screen.getByTestId('brand-glass-panel');
    expect(panel).toBeInTheDocument();
    expect(panel.className).toMatch(/border-border-(solid|glass)/);
    expect(panel.className).toMatch(/bg-surface-glass/);
  });

  test('renders the sunlight radial-gradient moment (hero glow)', () => {
    render(<Home />);
    expect(screen.getByTestId('brand-sunlight')).toBeInTheDocument();
  });

  test('renders a chrome-styled CTA link to the repo', () => {
    render(<Home />);
    const cta = screen.getByRole('link', { name: /view on github/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href');
    expect(cta.getAttribute('href')).toContain('github.com/Reiahx01/food-forest-planner');
  });

  // Codifies AGENTS.md DON'T list as a CI gate. Per vault concept
  // `codified-design-principles`: yes/no conditions over adjectives.
  test('does NOT use any default Tailwind palette utility class (anti-generic guard)', () => {
    const { container } = render(<Home />);
    const html = container.innerHTML;
    // Background utilities
    expect(html).not.toMatch(
      /\bbg-(zinc|gray|slate|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    );
    // Text utilities
    expect(html).not.toMatch(
      /\btext-(zinc|gray|slate|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    );
    // Border utilities
    expect(html).not.toMatch(
      /\bborder-(zinc|gray|slate|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    );
    // Pure black / white
    expect(html).not.toMatch(/\bbg-(black|white)\b/);
    // Generic shadow utilities
    expect(html).not.toMatch(/\bshadow-(sm|md|lg|xl|2xl)\b/);
    // transition-all
    expect(html).not.toContain('transition-all');
  });
});

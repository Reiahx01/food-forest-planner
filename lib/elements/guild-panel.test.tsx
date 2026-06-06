import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { guildModule } from './guild';
import { GuildPanel } from './guild-panel';

const base = { centerTreeSpeciesId: '', companionSpeciesIds: [] as string[] };

describe('lib/elements/guild-panel — GuildPanel (#14 part 2)', () => {
  test('the Guild module exposes GuildPanel as its panel', () => {
    expect(guildModule.panel).toBe(GuildPanel);
  });

  test('renders a required center-tree field bound to value', () => {
    render(<GuildPanel value={{ ...base, centerTreeSpeciesId: 'oak-id' }} onChange={vi.fn()} />);
    const input = screen.getByLabelText(/center tree/i);
    expect(input).toBeRequired();
    expect(input).toHaveValue('oak-id');
  });

  test('editing the center tree calls onChange, preserving other fields', () => {
    const onChange = vi.fn();
    render(<GuildPanel value={{ ...base, companionSpeciesIds: ['c1'] }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/center tree/i), { target: { value: 'apple-id' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ centerTreeSpeciesId: 'apple-id', companionSpeciesIds: ['c1'] }),
    );
  });

  test('surfaces a server-side error for the center tree', () => {
    render(
      <GuildPanel
        value={base}
        onChange={vi.fn()}
        errors={{ centerTreeSpeciesId: ['A center tree species is required.'] }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/center tree species is required/i);
    expect(screen.getByLabelText(/center tree/i)).toHaveAttribute('aria-invalid', 'true');
  });

  test('uses no default Tailwind palette utilities (brand discipline)', () => {
    const { container } = render(<GuildPanel value={base} onChange={vi.fn()} />);
    const html = container.innerHTML;
    for (const banned of [/\bbg-zinc-/, /\bbg-gray-/, /\btext-zinc-/, /\btext-gray-/, /\bshadow-md\b/, /\btransition-all\b/]) {
      expect(html).not.toMatch(banned);
    }
  });
});

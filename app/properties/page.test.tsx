// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  getCurrentAccount: vi.fn(),
}));

vi.mock('@/lib/properties/queries', () => ({
  listProperties: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import PropertiesPage from './page';

import { getCurrentAccount } from '@/lib/auth/session';
import { listProperties } from '@/lib/properties/queries';


const getCurrentAccountMock = vi.mocked(getCurrentAccount);
const listPropertiesMock = vi.mocked(listProperties);

function authedAccount() {
  return {
    user: { id: 'u-1', email: 'a@b.co' } as never,
    account: {
      id: 'u-1',
      email: 'a@b.co',
      role: 'hobbyist' as const,
      displayName: null,
      onboardedAt: new Date('2026-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

describe('app/properties/page', () => {
  test('redirects to /signup when not authenticated', async () => {
    getCurrentAccountMock.mockResolvedValue(null);

    await expect(PropertiesPage()).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
  });

  test('renders the empty state when the user has no Properties', async () => {
    getCurrentAccountMock.mockResolvedValue(authedAccount());
    listPropertiesMock.mockResolvedValue([]);

    const ui = await PropertiesPage();
    render(ui);

    expect(screen.getByText(/no properties yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create your first property/i })).toHaveAttribute(
      'href',
      '/properties/new',
    );
  });

  test('renders the list when Properties exist', async () => {
    getCurrentAccountMock.mockResolvedValue(authedAccount());
    listPropertiesMock.mockResolvedValue([
      {
        id: 'p-1',
        name: 'Home Acreage',
        address: '1 Apple St',
        usdaZone: null,
        createdAt: new Date('2026-05-01'),
      },
      {
        id: 'p-2',
        name: 'River Plot',
        address: null,
        usdaZone: null,
        createdAt: new Date('2026-04-15'),
      },
    ]);

    const ui = await PropertiesPage();
    render(ui);

    expect(screen.getByText('Home Acreage')).toBeInTheDocument();
    expect(screen.getByText('River Plot')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Home Acreage/i })).toHaveAttribute(
      'href',
      '/properties/p-1',
    );
  });
});

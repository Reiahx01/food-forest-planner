import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  getCurrentAccount: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import { redirect } from 'next/navigation';

import OnboardingPage from './page';

import { getCurrentAccount } from '@/lib/auth/session';


const getCurrentAccountMock = vi.mocked(getCurrentAccount);
const redirectMock = vi.mocked(redirect);

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'u-1', email: 'a@b.co' } as never,
    account: {
      id: 'u-1',
      email: 'a@b.co',
      role: 'hobbyist' as const,
      displayName: null,
      onboardedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  };
}

describe('app/onboarding/page', () => {
  test('redirects to /signup when not authenticated', async () => {
    getCurrentAccountMock.mockResolvedValue(null);

    await expect(OnboardingPage()).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
    expect(redirectMock).toHaveBeenCalledWith('/signup');
  });

  test('redirects to /dashboard when the user has already onboarded', async () => {
    getCurrentAccountMock.mockResolvedValue(
      makeAccount({ account: { onboardedAt: new Date('2026-01-01T00:00:00Z') } as never }),
    );
    // Use a more direct override; the spread above shouldn't matter for this test.
    getCurrentAccountMock.mockResolvedValue({
      user: { id: 'u-1', email: 'a@b.co' } as never,
      account: {
        id: 'u-1',
        email: 'a@b.co',
        role: 'hobbyist',
        displayName: null,
        onboardedAt: new Date('2026-01-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(OnboardingPage()).rejects.toThrow(/NEXT_REDIRECT:\/dashboard/);
  });

  test('renders two role cards (hobbyist + pro) with submit buttons', async () => {
    getCurrentAccountMock.mockResolvedValue(makeAccount());

    const ui = await OnboardingPage();
    render(ui);

    expect(screen.getByRole('heading', { name: /how will you use/i })).toBeInTheDocument();
    // Title chips are uppercased + spaced; match exactly to disambiguate from
    // incidental "pro" / "hobbyist" substrings in body copy.
    expect(screen.getByText(/^hobbyist$/i)).toBeInTheDocument();
    expect(screen.getByText(/^pro$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /designing for myself/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /designing for clients/i })).toBeInTheDocument();
  });

  test('uses no default Tailwind palette utilities (brand discipline)', async () => {
    getCurrentAccountMock.mockResolvedValue(makeAccount());

    const ui = await OnboardingPage();
    const { container } = render(ui);
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

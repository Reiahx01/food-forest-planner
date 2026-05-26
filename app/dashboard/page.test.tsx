// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  getCurrentAccount: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    // Mirror Next's `redirect()` -- it throws to stop rendering.
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

import { redirect } from 'next/navigation';

import DashboardPage from './page';

import { getCurrentAccount } from '@/lib/auth/session';


const getCurrentAccountMock = vi.mocked(getCurrentAccount);
const redirectMock = vi.mocked(redirect);

describe('app/dashboard/page — authenticated landing', () => {
  test('redirects to /signup when there is no current account', async () => {
    getCurrentAccountMock.mockResolvedValue(null);

    await expect(DashboardPage()).rejects.toThrow(/NEXT_REDIRECT:\/signup/);
    expect(redirectMock).toHaveBeenCalledWith('/signup');
  });

  test('renders a greeting with the user email when authenticated', async () => {
    getCurrentAccountMock.mockResolvedValue({
      user: { id: 'u-1', email: 'a@b.co' } as never,
      account: {
        id: 'u-1',
        email: 'a@b.co',
        role: 'hobbyist',
        displayName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const ui = await DashboardPage();
    const html = JSON.stringify(ui);
    expect(html).toContain('a@b.co');
  });
});

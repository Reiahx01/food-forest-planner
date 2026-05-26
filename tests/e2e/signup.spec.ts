import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import {
  deleteMessage,
  extractMagicLink,
  getMessage,
  waitForMessageTo,
} from './helpers/mailpit';

/**
 * #5 Playwright follow-up: full magic-link signup happy path.
 *
 * Stack involved end-to-end:
 *   - /signup page + requestMagicLink Server Action
 *   - Supabase Auth (signInWithOtp)
 *   - Local Mailpit (where the dev email is captured -- note the container
 *     is still called `supabase_inbucket_*` for backward compat, but the
 *     image is mailpit:v1.x; see helpers/mailpit.ts for context).
 *   - /auth/callback route (exchanges ?code= for a session)
 *   - public.accounts trigger from auth.users
 *   - /dashboard server component (RLS-respecting read of the user's row)
 *
 * Each spec uses a unique `e2e-<uuid>@test.local` so parallel runs don't
 * step on each other's mail.
 */

test.describe('signup magic-link happy path', () => {
  test('email -> Mailpit -> callback -> /dashboard with role=hobbyist', async ({
    page,
    request,
  }) => {
    const email = `e2e-${randomUUID()}@test.local`;

    await test.step('submit the signup form', async () => {
      await page.goto('/signup');
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

      await page.getByLabel(/email/i).fill(email);
      await page.getByRole('button', { name: /send magic link/i }).click();

      await expect(page.getByText(/check your email/i)).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
    });

    // The CI workflow's "Dump Inbucket state on failure" step handles the
    // post-failure diagnostics (it dumps the supabase_auth + supabase_inbucket
    // container logs which are far more useful than the REST API state).
    const header = await test.step(
      'retrieve the magic link from Mailpit',
      async () => waitForMessageTo(request, email),
    );
    const message = await getMessage(request, header.ID);
    const magicLink = extractMagicLink(message);

    await test.step('follow the link and land on /dashboard', async () => {
      await page.goto(magicLink);
      await expect(page).toHaveURL(/\/dashboard(\?|$)/);
      await expect(page.getByRole('heading', { name: new RegExp(`Hi ${escapeRegex(email)}`) })).toBeVisible();
      await expect(page.getByText(/role:\s*hobbyist/i)).toBeVisible();
    });

    await test.step('refresh keeps the session', async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard(\?|$)/);
      await expect(page.getByRole('heading', { name: new RegExp(`Hi ${escapeRegex(email)}`) })).toBeVisible();
    });

    await deleteMessage(request, header.ID);
  });
});

test.describe('unauthenticated access', () => {
  test('/dashboard redirects to /signup with the original path in ?next=', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signup\?next=%2Fdashboard/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

/**
 * Email + password signup happy path.
 *
 * Previous incarnation polled Mailpit for a magic-link email; the email
 * pipeline was fragile (see PRs #40 / #41 / #43). The traditional
 * email+password flow signs the user in synchronously on form submit,
 * so the spec is now a single form interaction + a navigation assertion.
 *
 * Each spec uses a unique `e2e-<uuid>@test.local` so parallel runs don't
 * step on each other's accounts.
 */

test.describe('email + password signup happy path', () => {
  test('signup -> /onboarding (first-sign-in) -> pick role -> /dashboard', async ({ page }) => {
    const email = `e2e-${randomUUID()}@test.local`;
    const password = 'correcthorsebatterystaple';

    await test.step('submit the signup form', async () => {
      await page.goto('/signup');
      await expect(page.getByRole('heading', { level: 1, name: /^sign up$/i })).toBeVisible();

      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole('button', { name: /create account/i }).click();
    });

    await test.step('land on /onboarding (proxy forwards first-sign-in)', async () => {
      // signUp redirects to /dashboard; the proxy then forwards to /onboarding
      // because accounts.onboarded_at is still null at this point.
      await expect(page).toHaveURL(/\/onboarding(\?|$)/);
      await expect(page.getByRole('heading', { name: /how will you use/i })).toBeVisible();
    });

    await test.step('pick hobbyist -> /dashboard', async () => {
      await page.getByRole('button', { name: /designing for myself/i }).click();
      await expect(page).toHaveURL(/\/dashboard(\?|$)/);
      await expect(page.getByRole('heading', { name: new RegExp(`Hi ${escapeRegex(email)}`) })).toBeVisible();
      await expect(page.getByText(/role:\s*hobbyist/i)).toBeVisible();
    });

    await test.step('refresh keeps the session AND skips onboarding (no loop)', async () => {
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard(\?|$)/);
      await expect(page.getByRole('heading', { name: new RegExp(`Hi ${escapeRegex(email)}`) })).toBeVisible();
    });

    await test.step('directly visiting /onboarding after onboarding redirects forward', async () => {
      await page.goto('/onboarding');
      await expect(page).toHaveURL(/\/dashboard(\?|$)/);
    });
  });
});

test.describe('signin happy path', () => {
  test('signup -> sign out -> signin -> /dashboard', async ({ page, context }) => {
    const email = `e2e-${randomUUID()}@test.local`;
    const password = 'correcthorsebatterystaple';

    // Bootstrap an account so we have something to sign into.
    await page.goto('/signup');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
    await page.getByRole('button', { name: /designing for myself/i }).click();
    await expect(page).toHaveURL(/\/dashboard(\?|$)/);

    // Simulate sign-out by clearing cookies (a real Sign Out button lands
    // in a separate small PR; this proves the password sign-in path).
    await context.clearCookies();

    await page.goto('/signin');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Already onboarded -> straight to /dashboard.
    await expect(page).toHaveURL(/\/dashboard(\?|$)/);
    await expect(page.getByRole('heading', { name: new RegExp(`Hi ${escapeRegex(email)}`) })).toBeVisible();
  });
});

test.describe('unauthenticated access', () => {
  test('/dashboard redirects to /signup with the original path in ?next=', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/signup\?next=%2Fdashboard/);
    await expect(page.getByRole('heading', { level: 1, name: /^sign up$/i })).toBeVisible();
  });
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

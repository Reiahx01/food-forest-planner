import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the v1 happy-path e2e suite.
 *
 * Scope today (#5 Playwright follow-up):
 *   - Signup magic-link round-trip (signup -> Inbucket -> callback -> dashboard).
 *   - Unauthenticated /dashboard -> /signup redirect.
 *
 * Issue #24 will expand this to per-element-type happy paths + axe-core
 * accessibility assertions + multi-browser. We avoid pre-building any of that
 * here so the suite stays tight + fast (~30s including app boot).
 *
 * Local: `npm run e2e` boots its own Next dev server.
 * CI: the workflow runs `npm run build && npm run start` separately and
 * passes `PLAYWRIGHT_BASE_URL` in -- so this config skips the webServer
 * block when that env is set.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // 60s per test -- accounts for the 20s Inbucket poll plus the full
  // browser-driven flow (form submit + callback redirect + dashboard render
  // + reload). Test timeout MUST exceed the poll timeout or Playwright kills
  // the request context mid-poll and the real error gets buried under
  // "Target page, context or browser has been closed".
  timeout: 60_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

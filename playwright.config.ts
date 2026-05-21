import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: path.join(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Note: E2E tests use production mode (npm run start) instead of dev mode
 * because Next.js 16's Turbopack in dev mode has known issues with middleware execution.
 * Production mode provides a more accurate representation of the deployed application anyway.
 *
 * The production server runs on port 3999 so it never conflicts with a dev server on 3000.
 * A production build must exist before running tests. Use `npm run test:e2e` which runs
 * `npm run build` automatically. If invoking Playwright directly (e.g. `playwright test --ui`),
 * run `npm run build` first.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  // Run once before/after the whole test suite to create/destroy the test session.
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3999',
    trace: 'on-first-retry',
    // All tests start with a pre-authenticated browser context.
    storageState: path.join(__dirname, 'e2e', '.auth', 'user.json'),
  },

  // Increase assertion timeout from the 5s default to accommodate pages that
  // render their headings only after one or more API calls complete (e.g. Dashboard).
  expect: { timeout: 10_000 },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run start:server',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
        SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET || 'test-secret-for-e2e-tests-must-be-at-least-32-chars-long-1234567890',
        // Always use the no-op test provider for E2E so OTP codes are stored in
        // the DB without any real email being sent. This must be hardcoded because
        // CI sets EMAIL_PROVIDER=brevo for the unit-test step and that value would
        // otherwise bleed through the || 'test' fallback.
        EMAIL_PROVIDER: 'test',
        EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@example.com',
        BREVO_API_KEY: '',
        // Must be 'test' so the /otp/test-peek endpoint is registered by Express.
        NODE_ENV: 'test',
        // Admin portal secrets (optional — admin e2e tests are skipped when unset)
        ADMIN_SESSION_COOKIE_SECRET: process.env.ADMIN_SESSION_COOKIE_SECRET || 'test-admin-secret-for-e2e-tests-must-be-at-least-32-chars-1234',
      },
    },
    {
      // Dedicated port 3999 so this production server never conflicts with a
      // dev server running on 3000. Middleware executes correctly in production —
      // Next.js 16's Turbopack dev mode has a known limitation where it does not.
      // The build is expected to already exist (run via `npm run test:e2e` or `npm run build`).
      command: 'npm run start',
      url: 'http://localhost:3999',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? '',
        SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET || 'test-secret-for-e2e-tests-must-be-at-least-32-chars-long-1234567890',
        EMAIL_PROVIDER: 'test',
        EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@example.com',
        BREVO_API_KEY: '',
        NODE_ENV: 'test',
        PORT: '3999',
        // Admin portal: obscure path + secret for E2E.
        // Set ADMIN_PATH in your .env to enable admin e2e tests locally.
        // In CI, set ADMIN_PATH and ADMIN_SESSION_COOKIE_SECRET as secrets.
        ADMIN_PATH: process.env.ADMIN_PATH || 'e2e-admin-portal',
        ADMIN_SESSION_COOKIE_SECRET: process.env.ADMIN_SESSION_COOKIE_SECRET || 'test-admin-secret-for-e2e-tests-must-be-at-least-32-chars-1234',
      },
    },
  ],
});

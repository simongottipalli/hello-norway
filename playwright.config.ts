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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // All tests start with a pre-authenticated browser context.
    storageState: path.join(__dirname, 'e2e', '.auth', 'user.json'),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev:server',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ...process.env,
        SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET || 'test-secret-for-e2e-tests-must-be-at-least-32-chars-long-1234567890',
      },
    },
    {
      // Use production build for E2E tests to ensure middleware works correctly
      // Next.js 16 dev mode with Turbopack has known issues with middleware execution
      // Build before starting if in CI environment
      command: process.env.CI ? 'npm run build && npm run start' : 'npm run start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000, // Increased timeout to account for build time
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ...process.env,
        SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET || 'test-secret-for-e2e-tests-must-be-at-least-32-chars-long-1234567890',
      },
    },
  ],
});

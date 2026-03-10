import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * See https://playwright.dev/docs/test-configuration.
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
      command: 'SESSION_COOKIE_SECRET="${SESSION_COOKIE_SECRET:-test-secret-for-e2e-tests-must-be-at-least-32-chars-long-1234567890}" npm run dev:client',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});

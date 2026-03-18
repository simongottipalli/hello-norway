import { test, expect } from '@playwright/test';

// All login tests run without an authenticated session.
const unauthenticatedTest = test.extend({
  storageState: { cookies: [], origins: [] },
});

const TEST_LOGIN_EMAIL = 'e2e-test@example.com';
const EXPRESS_API_BASE = 'http://localhost:3001/api';

/**
 * Retrieves the most-recent valid OTP for `email` via the test-only
 * peek endpoint exposed by the Express server when NODE_ENV=test.
 */
async function peekOtp(email: string): Promise<number> {
  const response = await fetch(
    `${EXPRESS_API_BASE}/otp/test-peek?email=${encodeURIComponent(email)}`,
  );
  if (!response.ok) {
    throw new Error(`test-peek failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { code: number };
  return data.code;
}

test.describe('OTP Login flow', () => {
  test.describe('Email step', () => {
    unauthenticatedTest('should display the email step on /login', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Welcome to Hello Norway' })).toBeVisible();
      await expect(page.getByLabel('Email Address')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Send OTP' })).toBeVisible();
    });

    unauthenticatedTest('should show an error when submitting an empty email', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: 'Send OTP' }).click();
      await expect(page.getByRole('alert')).toContainText(/email is required/i);
    });

    unauthenticatedTest('should show an error for an invalid email format', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email Address').fill('not-an-email');
      await page.getByRole('button', { name: 'Send OTP' }).click();
      await expect(page.getByRole('alert')).toContainText(/invalid email format/i);
    });

    unauthenticatedTest('should advance to the OTP step after a valid email is submitted', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email Address').fill(TEST_LOGIN_EMAIL);
      await page.getByRole('button', { name: 'Send OTP' }).click();

      // The OTP input should now be visible
      await expect(page.getByLabel('Verification Code')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: 'Verify & Login' })).toBeVisible();
    });
  });

  test.describe('OTP step', () => {
    unauthenticatedTest('should show an error when submitting an empty OTP', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email Address').fill(TEST_LOGIN_EMAIL);
      await page.getByRole('button', { name: 'Send OTP' }).click();
      await expect(page.getByLabel('Verification Code')).toBeVisible({ timeout: 10_000 });

      await page.getByRole('button', { name: 'Verify & Login' }).click();
      await expect(page.getByRole('alert')).toContainText(/otp code is required/i);
    });

    unauthenticatedTest('should show an error for a wrong OTP code', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email Address').fill(TEST_LOGIN_EMAIL);
      await page.getByRole('button', { name: 'Send OTP' }).click();
      await expect(page.getByLabel('Verification Code')).toBeVisible({ timeout: 10_000 });

      await page.getByLabel('Verification Code').fill('000000');
      await page.getByRole('button', { name: 'Verify & Login' }).click();
      await expect(page.getByRole('alert')).toContainText(/invalid or expired otp/i);
    });

    unauthenticatedTest('should allow going back to the email step via "Change Email"', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email Address').fill(TEST_LOGIN_EMAIL);
      await page.getByRole('button', { name: 'Send OTP' }).click();
      await expect(page.getByLabel('Verification Code')).toBeVisible({ timeout: 10_000 });

      await page.getByRole('button', { name: 'Change Email' }).click();
      await expect(page.getByLabel('Email Address')).toBeVisible();
    });

    unauthenticatedTest(
      'should log in successfully with the correct OTP and redirect to /dashboard',
      async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email Address').fill(TEST_LOGIN_EMAIL);
        await page.getByRole('button', { name: 'Send OTP' }).click();
        await expect(page.getByLabel('Verification Code')).toBeVisible({ timeout: 10_000 });

        // Retrieve the OTP that the test email provider stored in the DB
        const code = await peekOtp(TEST_LOGIN_EMAIL);

        await page.getByLabel('Verification Code').fill(String(code));
        await page.getByRole('button', { name: 'Verify & Login' }).click();

        // Should redirect to dashboard after successful login
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      },
    );
  });

  test.describe('Authenticated user redirect', () => {
    test('should redirect an already-authenticated user away from /login to /dashboard', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});

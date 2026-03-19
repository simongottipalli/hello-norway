import { test, expect, type Page } from '@playwright/test';

/**
 * Selector that targets the application error message while excluding the
 * Next.js route announcer (which also carries role="alert" but is always
 * empty and should not be matched in assertions).
 */
const errorLocator = (page: Page) =>
  page.locator('[role="alert"].text-destructive');

/**
 * Selector that targets a visible sonner success toast notification.
 */
const successToastLocator = (page: Page) =>
  page.locator('[data-sonner-toast][data-type="success"]');

// All profile tests run with the shared authenticated session.
test.describe('Profile editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  });

  test.describe('Profile page rendering', () => {
    test('should display the profile form with all fields', async ({ page }) => {
      await expect(page.getByLabel('Name')).toBeVisible();
      await expect(page.getByLabel('Arrival year')).toBeVisible();
      await expect(page.getByLabel('Employment status')).toBeVisible();
      await expect(page.getByLabel('Has children')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible();
    });

    test('should pre-populate the name field with the existing profile name', async ({ page }) => {
      // The E2E test user is created with name "E2E Test User" in db-setup.ts
      const nameInput = page.getByLabel('Name');
      await expect(nameInput).toHaveValue('E2E Test User');
    });
  });

  test.describe('Profile saving', () => {
    test('should save updated name successfully', async ({ page }) => {
      const nameInput = page.getByLabel('Name');
      const originalName = await nameInput.inputValue();

      // Update name
      await nameInput.fill('Updated E2E Name');
      await page.getByRole('button', { name: 'Save profile' }).click();

      // Success message should appear
      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);

      // Restore original name
      await nameInput.fill(originalName);
      await page.getByRole('button', { name: 'Save profile' }).click();
      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);
    });

    test('should save arrival year and show success', async ({ page }) => {
      await page.getByLabel('Arrival year').fill('2025');
      await page.getByRole('button', { name: 'Save profile' }).click();

      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);

      // Clear arrival year to restore state
      await page.getByLabel('Arrival year').fill('');
      await page.getByRole('button', { name: 'Save profile' }).click();
      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);
    });

    test('should save employment status and show success', async ({ page }) => {
      await page.getByLabel('Employment status').selectOption('EMPLOYED');
      await page.getByRole('button', { name: 'Save profile' }).click();

      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);

      // Restore default
      await page.getByLabel('Employment status').selectOption('');
      await page.getByRole('button', { name: 'Save profile' }).click();
      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);
    });

    test('should save has-children preference and show success', async ({ page }) => {
      await page.getByLabel('Has children').selectOption('yes');
      await page.getByRole('button', { name: 'Save profile' }).click();

      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);

      // Restore default
      await page.getByLabel('Has children').selectOption('');
      await page.getByRole('button', { name: 'Save profile' }).click();
      await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);
    });
  });

  test.describe('Profile validation', () => {
    test('should show an error when name is cleared and form is submitted', async ({ page }) => {
      await page.getByLabel('Name').fill('');
      await page.getByRole('button', { name: 'Save profile' }).click();

      await expect(errorLocator(page)).toContainText(/name is required/i);
    });

    test('should show an error for an out-of-range arrival year', async ({ page }) => {
      await page.getByLabel('Arrival year').fill('1800');
      await page.getByRole('button', { name: 'Save profile' }).click();

      await expect(errorLocator(page)).toContainText(/arrival year must be between/i);
    });

    test('should keep form data intact after a validation error', async ({ page }) => {
      const nameInput = page.getByLabel('Name');
      await nameInput.fill('');
      await page.getByLabel('Arrival year').fill('2025');
      await page.getByRole('button', { name: 'Save profile' }).click();

      // Error shown, arrival year should still be filled
      await expect(errorLocator(page)).toContainText(/name is required/i);
      await expect(page.getByLabel('Arrival year')).toHaveValue('2025');
    });
  });

  test.describe('Delete profile confirmation dialog', () => {
    test('should open the delete confirmation dialog', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete Profile' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Delete Profile' })).toBeVisible();
    });

    test('should close the dialog when Cancel is clicked', async ({ page }) => {
      await page.getByRole('button', { name: 'Delete Profile' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).not.toBeVisible();
    });
  });
});

test.describe('Profile view on dashboard', () => {
  test('should show profile form when clicking Profile in the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    await sidebar.getByRole('button', { name: 'Profile' }).click();

    // Stay on dashboard URL
    await expect(page).toHaveURL(/\/dashboard/);

    // Profile form visible in main area
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Arrival year')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save profile' })).toBeVisible();
  });

  test('should save profile changes from within the dashboard profile view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');

    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    await sidebar.getByRole('button', { name: 'Profile' }).click();

    const nameInput = page.getByLabel('Name');
    const originalName = await nameInput.inputValue();

    await nameInput.fill('Dashboard Profile Update');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);

    // Restore
    await nameInput.fill(originalName);
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(successToastLocator(page)).toContainText(/profile updated successfully/i);
  });
});

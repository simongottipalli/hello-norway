import { test, expect, type Page, type Locator } from '@playwright/test';

test.describe('Dashboard Task Details Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to desktop size for consistency
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should open modal when clicking "View Details" button on dashboard', async ({ page }) => {
    // Store the current URL
    const initialUrl = page.url();

    // Click the first available view button (tasks are pre-seeded by global setup)
    const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    await viewButton.click();

    // Verify modal/dialog is shown
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify URL hasn't changed (stays on /dashboard)
    expect(page.url()).toBe(initialUrl);
    expect(page.url()).toContain('/dashboard');
    expect(page.url()).not.toContain('/tasks');

    // Verify dialog contains task details
    await expect(dialog.getByText('Task details')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('should display task details correctly in modal', async ({ page }) => {
    // Tasks are pre-seeded by global setup
    const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    await viewButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify essential modal content sections
    await expect(dialog.getByText('Task details')).toBeVisible();
    await expect(dialog.getByText('Description')).toBeVisible();
    await expect(dialog.getByText('Category')).toBeVisible();
    await expect(dialog.getByText('Status')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save progress' })).toBeVisible();

    // Verify form controls are present
    await expect(dialog.getByLabel('Status')).toBeVisible();
    await expect(dialog.getByLabel('Personal due date')).toBeVisible();
    await expect(dialog.getByLabel('Private notes')).toBeVisible();
  });

  test.describe('modal dismissal', () => {
    test.beforeEach(async ({ page }) => {
      const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
      const hasButton = await viewButton.isVisible().catch(() => false);
      if (!hasButton) {
        test.skip();
        return;
      }
      await viewButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    const dismissals: Array<[string, (page: Page, dialog: Locator) => Promise<void>]> = [
      ['Close button', (_page, dialog) => dialog.getByRole('button', { name: 'Close' }).click()],
      ['Escape key', (page) => page.keyboard.press('Escape')],
      // x=10 is within the dark overlay but outside the max-w-2xl dialog centered in 1280px
      ['outside click', (page) => page.mouse.click(10, 400)],
    ];

    for (const [label, dismiss] of dismissals) {
      test(`should close modal via ${label}`, async ({ page }) => {
        const dialog = page.getByRole('dialog');
        await dismiss(page, dialog);
        await expect(dialog).not.toBeVisible();
        expect(page.url()).toContain('/dashboard');
      });
    }
  });

  test('should trap focus within modal', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    const hasButton = await viewButton.isVisible().catch(() => false);

    if (!hasButton) {
      test.skip('No tasks available - skipping focus trap test');
      return;
    }

    await viewButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Tab through elements - focus should stay within dialog
    await page.keyboard.press('Tab');

    // The focused element should be within the dialog
    const isWithinDialog = await dialog.locator(':focus').count() > 0;
    expect(isWithinDialog).toBe(true);
  });

  test('should maintain modal state when updating task status', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    const hasButton = await viewButton.isVisible().catch(() => false);

    if (!hasButton) {
      test.skip('No tasks available - skipping state maintenance test');
      return;
    }

    await viewButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Change status
    const statusSelect = dialog.getByLabel('Status');
    await statusSelect.selectOption('in_progress');

    // Add a note
    const notesTextarea = dialog.getByLabel('Private notes');
    await notesTextarea.fill('Test note from e2e test');

    // Save
    const saveButton = dialog.getByRole('button', { name: 'Save progress' });
    await saveButton.click();

    // Wait for save to complete (button text changes back)
    await expect(saveButton).toHaveText('Save progress', { timeout: 10000 });

    // Dialog should still be open after saving
    await expect(dialog).toBeVisible();

    // Close and verify we're still on dashboard
    await page.keyboard.press('Escape');
    expect(page.url()).toContain('/dashboard');
  });
});

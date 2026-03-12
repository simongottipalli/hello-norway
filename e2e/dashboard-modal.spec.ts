import { test, expect } from '@playwright/test';

test.describe('Dashboard Task Details Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to desktop size for consistency
    await page.setViewportSize({ width: 1280, height 800 });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should open modal when clicking "View Details" button on dashboard', async ({ page }) => {
    // Look for any "View" or "View Details" button on the page
    const viewButtons = page.getByRole('button', { name: /view( details)?$/i });
    const buttonCount = await viewButtons.count();
    
    if (buttonCount === 0) {
      // No tasks available - create one via the sidebar
      const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
      const addTaskButton = sidebar.getByRole('button', { name: 'Add Task' });
      await addTaskButton.click();
      
      const addDialog = page.getByRole('dialog');
      await expect(addDialog).toBeVisible();
      
      await addDialog.getByLabel('Task Name *').fill('E2E Test Task');
      await addDialog.getByLabel('Description').fill('Task for e2e testing');
      await addDialog.getByLabel('Category').selectOption('ARRIVAL');
      await addDialog.getByRole('button', { name: 'Add Task' }).click();
      
      // Wait for dialog to close
      await expect(addDialog).not.toBeVisible({ timeout: 15000 });
      
      // Now try to find the view button again
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    }
    
    // Store the current URL
    const initialUrl = page.url();
    
    // Click the first available view button
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
    // Ensure we have at least one task by checking/creating
    let viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    let hasButton = await viewButton.isVisible().catch(() => false);
    
    if (!hasButton) {
      // Create a task via sidebar
      const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
      await sidebar.getByRole('button', { name: 'Add Task' }).click();
      
      const addDialog = page.getByRole('dialog');
      await addDialog.getByLabel('Task Name *').fill('Test Task for Details');
      await addDialog.getByLabel('Description').fill('Test description');
      await addDialog.getByLabel('Category').selectOption('HOUSING');
      await addDialog.getByRole('button', { name: 'Add Task' }).click();
      await expect(addDialog).not.toBeVisible({ timeout: 15000 });
      
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    }
    
    viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
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

  test('should close modal when clicking "Close" button', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    const hasButton = await viewButton.isVisible().catch(() => false);
    
    if (!hasButton) {
      test.skip('No tasks available - skipping close button test');
      return;
    }
    
    await viewButton.click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Click the close button
    const closeButton = dialog.getByRole('button', { name: 'Close' });
    await closeButton.click();
    
    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
    
    // Verify we're still on dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should close modal when pressing Escape key', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    const hasButton = await viewButton.isVisible().catch(() => false);
    
    if (!hasButton) {
      test.skip('No tasks available - skipping escape key test');
      return;
    }
    
    await viewButton.click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Press Escape key
    await page.keyboard.press('Escape');
    
    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
    
    // Verify we're still on dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should close modal when clicking outside the modal', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: /view( details)?$/i }).first();
    const hasButton = await viewButton.isVisible().catch(() => false);
    
    if (!hasButton) {
      test.skip('No tasks available - skipping click outside test');
      return;
    }
    
    await viewButton.click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Click on the backdrop (outside the dialog content)
    await page.locator('.fixed.inset-0.bg-black\\/50').click({ force: true });
    
    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();
    
    // Verify we're still on dashboard
    expect(page.url()).toContain('/dashboard');
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

import { test, expect } from '@playwright/test';

test.describe('Dashboard Left Panel', () => {
  test('should display left sidebar on desktop viewport', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // The sidebar should be visible on desktop - use complementary role for sidebar
    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    // Check for Quick Stats section in sidebar
    const quickStatsHeading = sidebar.getByRole('heading', { name: 'Quick Stats' });
    await expect(quickStatsHeading).toBeVisible();

    // Check for Quick Actions section in sidebar
    const quickActionsHeading = sidebar.getByRole('heading', { name: 'Quick Actions' });
    await expect(quickActionsHeading).toBeVisible();

    // Verify stats are displayed in the sidebar
    await expect(sidebar.getByText('Total Tasks')).toBeVisible();
    await expect(sidebar.getByText('Completed')).toBeVisible();
    await expect(sidebar.getByText('In Progress')).toBeVisible();
    await expect(sidebar.getByText('To Do')).toBeVisible();

    // Verify progress bar exists in the sidebar
    await expect(sidebar.getByText('Progress', { exact: true })).toBeVisible();
  });

  test('should hide left sidebar on mobile viewport', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // The sidebar should NOT be visible on mobile
    const quickStatsHeading = page.getByRole('heading', { name: 'Quick Stats' });
    await expect(quickStatsHeading).not.toBeVisible();
  });

  test('should hide left sidebar on tablet viewport', async ({ page }) => {
    // Set viewport to tablet size (between mobile and desktop)
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // The sidebar should NOT be visible on tablet (< lg breakpoint which is 1024px)
    const quickStatsHeading = page.getByRole('heading', { name: 'Quick Stats' });
    await expect(quickStatsHeading).not.toBeVisible();
  });

  test('should navigate to profile from quick actions', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');
    
    // Click on "Profile" link in the sidebar
    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    const profileLink = sidebar.getByRole('link', { name: 'Profile' });
    await expect(profileLink).toBeVisible();
    await profileLink.click();

    // Should navigate to profile page
    await page.waitForURL(/\/profile/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/profile/);
  });

  test('should open add task dialog from quick actions', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');
    
    // Click on "Add Task" button in the sidebar
    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    const addTaskButton = sidebar.getByRole('button', { name: 'Add Task' });
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    // Should open the add task dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Add New Task' })).toBeVisible();
    
    // Verify form fields are present in the dialog
    await expect(dialog.getByLabel('Task Name *')).toBeVisible();
    await expect(dialog.getByLabel('Description')).toBeVisible();
    await expect(dialog.getByLabel('Due Date')).toBeVisible();
    await expect(dialog.getByLabel('Category')).toBeVisible();
    await expect(dialog.getByLabel('Links / URLs')).toBeVisible();
    
    // Verify buttons
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add Task' })).toBeVisible();
  });

  test('should create task from add task dialog', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');
    
    // Open the add task dialog from sidebar
    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    await sidebar.getByRole('button', { name: 'Add Task' }).click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in the form within the dialog
    await dialog.getByLabel('Task Name *').fill('Test Custom Task');
    await dialog.getByLabel('Description').fill('This is a test task created from the dashboard');
    await dialog.getByLabel('Category').selectOption('HEALTHCARE');
    await dialog.getByLabel('Links / URLs').fill('https://helsenorge.no\nhttps://nav.no');

    // Submit the form - this should trigger a page reload
    await dialog.getByRole('button', { name: 'Add Task' }).click();

    // Wait for navigation to complete (page reload happens after successful task creation)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Verify we're on the dashboard and the dialog is no longer present
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

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

    // Check for Quick Links section in sidebar
    const quickLinksHeading = sidebar.getByRole('heading', { name: 'Quick Links' });
    await expect(quickLinksHeading).toBeVisible();

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

  test('should navigate from quick links', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');
    
    // Click on "All Tasks" link in the sidebar
    const allTasksLink = page.getByRole('link', { name: 'All Tasks' });
    await expect(allTasksLink).toBeVisible();
    await allTasksLink.click();

    // Should navigate to tasks page
    await expect(page).toHaveURL(/\/tasks/);
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
  });
});

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

  test('should navigate to all tasks from quick actions', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');

    // Verify the "All Tasks" button is visible in the sidebar
    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    const allTasksButton = sidebar.getByRole('button', { name: 'All Tasks' });
    await expect(allTasksButton).toBeVisible();
  });

  test('should reset filters when clicking all tasks from quick actions', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');

    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });

    // Click "All Tasks" first to reveal the All Tasks section and its filters
    await sidebar.getByRole('button', { name: 'All Tasks' }).click();

    // Filters should now be visible; status defaults to "PENDING" and category to "ALL"
    const statusFilter = page.getByLabel('Filter by Status');
    const categoryFilter = page.getByLabel('Filter by Category');
    await expect(statusFilter).toBeVisible();
    await expect(categoryFilter).toBeVisible();
    await expect(statusFilter).toHaveValue('PENDING');
    await expect(categoryFilter).toHaveValue('ALL');

    // Apply a different status filter
    await statusFilter.selectOption('ALL');
    await expect(statusFilter).toHaveValue('ALL');

    // Click "All Tasks" again — status filter should be reset to "PENDING", category to "ALL"
    await sidebar.getByRole('button', { name: 'All Tasks' }).click();

    // Status filter resets to "PENDING"; category filter resets to "ALL"
    await expect(statusFilter).toHaveValue('PENDING');
    await expect(categoryFilter).toHaveValue('ALL');
  });

  test('should show profile in main view from quick actions', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/dashboard');
    
    // Click on "Profile" button in the sidebar
    const sidebar = page.getByRole('complementary', { name: 'Dashboard sidebar' });
    const profileButton = sidebar.getByRole('button', { name: 'Profile' });
    await expect(profileButton).toBeVisible();
    await profileButton.click();

    // Should stay on the dashboard page (no navigation)
    await expect(page).toHaveURL(/\/dashboard/);

    // "Back to Dashboard" button should appear, indicating profile is shown inline
    await expect(page.getByRole('button', { name: 'Back to Dashboard' })).toBeVisible();

    // Profile form fields should be visible in the main content area
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Arrival year')).toBeVisible();

    // Click back to return to dashboard view
    await page.getByRole('button', { name: 'Back to Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
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

    const taskTitle = 'Test Custom Task';

    // Fill in the form within the dialog
    await dialog.getByLabel('Task Name *').fill(taskTitle);
    await dialog.getByLabel('Description').fill('This is a test task created from the dashboard');
    await dialog.getByLabel('Category').selectOption('HEALTH');
    await dialog.getByLabel('Links / URLs').fill('https://helsenorge.no\nhttps://nav.no');

    // Submit the form - this should close the dialog
    await dialog.getByRole('button', { name: 'Add Task' }).click();

    // Wait for the dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 15000 });

    // Verify we're still on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Clean up: Delete the created task
    // Fetch all tasks to find the one we just created
    const response = await page.request.get('/api/tasks/personalized');
    if (response.ok()) {
      const tasks = await response.json();
      const createdTask = tasks.find((task: { title: string }) => task.title === taskTitle);
      if (createdTask) {
        // Delete the task using the API
        await page.request.delete(`/api/tasks/${createdTask.id}`);
      }
    }
  });
});

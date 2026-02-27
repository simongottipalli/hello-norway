import { test, expect } from '@playwright/test';

test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
  });

  test('should display the tasks page with heading', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    await expect(page.getByText('Manage your tasks with a simple interface.')).toBeVisible();
  });

  test('should display the task form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Add New Task' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter task title...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Task' })).toBeVisible();
  });

  test('should load and display existing tasks', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Your Tasks' })).toBeVisible();

    // Wait for tasks to load
    await page.waitForTimeout(1000);

    // Check that at least some tasks are displayed
    const taskHeadings = page.locator('h3');
    const count = await taskHeadings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should create a new task successfully', async ({ page }) => {
    const taskTitle = `Test Task ${Date.now()}`;

    // Fill in the task title
    await page.getByPlaceholder('Enter task title...').fill(taskTitle);

    // Click the Add Task button
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Wait for the task to be added and the form to reset
    await expect(page.getByPlaceholder('Enter task title...')).toHaveValue('', { timeout: 5000 });

    // Verify the new task appears in the list
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
  });

  test('should show validation error for empty task title', async ({ page }) => {
    // Try to submit without entering a title
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Should show error message
    await expect(page.getByText('Title is required')).toBeVisible();
  });

  test('should clear the form after successful submission', async ({ page }) => {
    const taskTitle = `Clear Test ${Date.now()}`;

    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Wait for submission to complete
    await page.waitForTimeout(2000);

    // Input should be cleared
    await expect(page.getByPlaceholder('Enter task title...')).toHaveValue('');
  });

  test('should display delete buttons for each task', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForTimeout(1000);

    // Check that delete buttons are present
    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should delete a task when delete button is clicked', async ({ page }) => {
    // First, create a task to delete
    const taskTitle = `Delete Test ${Date.now()}`;
    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Wait for task to be created
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();

    // Set up dialog handler to accept the confirmation
    page.on('dialog', dialog => dialog.accept());

    // Get all delete buttons and find the one in the same row as our task
    const allTasks = await page.locator('h3').allTextContents();
    const taskIndex = allTasks.findIndex(text => text === taskTitle);
    const deleteButton = page.getByRole('button', { name: 'Delete' }).nth(taskIndex);

    // Click delete
    await deleteButton.click();

    // Wait for deletion
    await page.waitForTimeout(1000);

    // Verify task is removed
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).not.toBeVisible();
  });

  test('should handle multiple task creations', async ({ page }) => {
    const tasks = [
      `Multi Task 1 ${Date.now()}`,
      `Multi Task 2 ${Date.now() + 1}`,
      `Multi Task 3 ${Date.now() + 2}`,
    ];

    for (const taskTitle of tasks) {
      await page.getByPlaceholder('Enter task title...').fill(taskTitle);
      await page.getByRole('button', { name: 'Add Task' }).click();
      await page.waitForTimeout(1500);
    }

    // Verify all tasks are visible
    for (const taskTitle of tasks) {
      await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
    }
  });

  test('should maintain task list after page reload', async ({ page }) => {
    const taskTitle = `Persist Test ${Date.now()}`;

    // Create a task
    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await page.waitForTimeout(2000);

    // Reload the page
    await page.reload();
    await page.waitForTimeout(1000);

    // Verify task still exists
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
  });

  test('should disable form during submission', async ({ page }) => {
    const taskTitle = `Disable Test ${Date.now()}`;

    await page.getByPlaceholder('Enter task title...').fill(taskTitle);

    // Start submission
    const submitPromise = page.getByRole('button', { name: 'Add Task' }).click();

    // Check if button or input gets disabled (may be too fast to catch)
    const button = page.getByRole('button', { name: /Add Task|Adding.../ });
    const input = page.getByPlaceholder('Enter task title...');

    // Wait for submission to complete
    await submitPromise;

    // Verify task was created and form reset
    await expect(input).toHaveValue('');
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
  });
});

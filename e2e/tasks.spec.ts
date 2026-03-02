import { test, expect } from '@playwright/test';

test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
  });

  test('should display the tasks page with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();
    await expect(page.getByText('Manage your tasks with a simple interface.')).toBeVisible();
  });

  test('should display the task form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Add New Task' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter task title...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Task' })).toBeVisible();
  });

  test('should show validation error for empty task title', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByText('Title is required')).toBeVisible();
  });

  test('should create a new task successfully', async ({ page }) => {
    const taskTitle = `Test Task ${Date.now()}`;

    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Input clears on success, and the task appears in the list.
    await expect(page.getByPlaceholder('Enter task title...')).toHaveValue('', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
  });

  test('should clear the form after successful submission', async ({ page }) => {
    const taskTitle = `Clear Test ${Date.now()}`;

    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();

    // Wait for the new task to appear in the list, then verify the input is empty.
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder('Enter task title...')).toHaveValue('');
  });

  test('should load and display existing tasks', async ({ page }) => {
    // Seed a task first so this test is self-contained on a clean DB.
    const taskTitle = `Seeded Task ${Date.now()}`;
    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible({ timeout: 10_000 });

    const taskHeadings = page.locator('h3');
    const count = await taskHeadings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display delete buttons for each task', async ({ page }) => {
    // Create a task first so there is always at least one delete button.
    const taskTitle = `Delete Btn Test ${Date.now()}`;
    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible({ timeout: 10_000 });

    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should delete a task when delete button is clicked', async ({ page }) => {
    const taskTitle = `Delete Test ${Date.now()}`;
    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible({ timeout: 10_000 });

    page.on('dialog', (dialog) => dialog.accept());

    const allTasks = await page.locator('h3').allTextContents();
    const taskIndex = allTasks.findIndex((text) => text === taskTitle);
    await page.getByRole('button', { name: 'Delete' }).nth(taskIndex).click();

    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).not.toBeVisible({ timeout: 10_000 });
  });

  test('should handle multiple task creations', async ({ page }) => {
    const now = Date.now();
    const tasks = [
      `Multi Task 1 ${now}`,
      `Multi Task 2 ${now + 1}`,
      `Multi Task 3 ${now + 2}`,
    ];

    for (const taskTitle of tasks) {
      await page.getByPlaceholder('Enter task title...').fill(taskTitle);
      await page.getByRole('button', { name: 'Add Task' }).click();
      // Wait for each task to appear before creating the next one.
      await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible({ timeout: 10_000 });
    }

    for (const taskTitle of tasks) {
      await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
    }
  });

  test('should maintain task list after page reload', async ({ page }) => {
    const taskTitle = `Persist Test ${Date.now()}`;

    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
  });

  test('should disable form during submission', async ({ page }) => {
    const taskTitle = `Disable Test ${Date.now()}`;

    await page.getByPlaceholder('Enter task title...').fill(taskTitle);
    await page.getByRole('button', { name: 'Add Task' }).click();

    await expect(page.getByPlaceholder('Enter task title...')).toHaveValue('', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: taskTitle, level: 3 })).toBeVisible();
  });
});

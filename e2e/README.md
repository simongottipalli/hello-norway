# End-to-End (E2E) Tests

This directory contains end-to-end tests for the Hello Norway application using [Playwright](https://playwright.dev/).

## Overview

E2E tests verify the complete user flow from the browser perspective, testing both the frontend UI and API interactions. These tests run against the actual application with both the backend and frontend servers running.

## Test Files

### `tasks.spec.ts`
Tests for the Tasks page UI functionality:
- Page rendering and layout
- Task form validation
- Creating new tasks
- Displaying task lists
- Deleting tasks
- Form state management
- Multiple task operations
- Data persistence

### `api.spec.ts`
Tests for the API endpoints:
- GET /api/tasks - List all tasks
- POST /api/tasks - Create new task
- GET /api/tasks/[id] - Get specific task
- PUT /api/tasks/[id] - Update task
- DELETE /api/tasks/[id] - Delete task
- Error handling and validation

## Running Tests

### Prerequisites
Make sure you have installed dependencies:
```bash
npm install
```

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Tests with UI Mode (Interactive)
```bash
npm run test:e2e:ui
```
This opens Playwright's UI mode where you can:
- See all tests
- Run tests interactively
- Debug with time-travel
- View test traces

### Run Tests in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Debug Tests
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step debugging.

### Run Specific Test File
```bash
npx playwright test e2e/tasks.spec.ts
```

### Run Specific Test
```bash
npx playwright test -g "should create a new task"
```

### Run All Tests (Unit + E2E)
```bash
npm run test:all
```

## Test Configuration

Configuration is defined in `playwright.config.ts`:

- **Base URL**: http://localhost:3001 (Next.js frontend)
- **Test Directory**: `./e2e`
- **Browser**: Chromium (can be extended to Firefox, WebKit)
- **Auto-start servers**: Both backend (port 3000) and frontend (port 3001) are automatically started before tests run
- **Retries**: 2 retries in CI, 0 locally
- **Reporter**: HTML report (view with `npx playwright show-report`)

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.getByLabel('Input').fill('value');

    // Act
    await page.getByRole('button', { name: 'Submit' }).click();

    // Assert
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### API Testing
```typescript
test('should call API endpoint', async ({ request }) => {
  const response = await request.get('/api/endpoint');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data).toHaveProperty('id');
});
```

## Best Practices

1. **Use Semantic Selectors**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Wait for Elements**: Use `expect().toBeVisible()` instead of manual waits when possible
3. **Unique Test Data**: Use timestamps or random values to avoid conflicts
4. **Clean Up**: Tests should be independent and not rely on other tests
5. **Descriptive Names**: Test names should clearly describe what is being tested
6. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification steps

## Debugging Tips

### View Test Reports
After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Generate Trace
Run with trace on:
```bash
npx playwright test --trace on
```

### Take Screenshots
Add to your test:
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

### Pause Execution
Add to your test for debugging:
```typescript
await page.pause();
```

## CI/CD Integration

The tests are configured to run in CI environments:
- Servers start automatically
- Retries are enabled (2 attempts)
- Single worker to avoid port conflicts
- HTML report is generated

Example GitHub Actions workflow:
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Port Already in Use
If tests fail because ports 3000 or 3001 are in use:
```bash
# Kill processes on those ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Tests Timing Out
Increase timeout in test:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### Database State
Tests use the same database as development. Consider:
- Using a separate test database
- Cleaning up test data after runs
- Using transactions that rollback

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)

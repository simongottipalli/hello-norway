# End-to-End (E2E) Tests

This directory contains end-to-end tests for the Hello Norway application using [Playwright](https://playwright.dev/).

## Overview

E2E tests verify the complete user flow from the browser perspective, focusing on **frontend UI interactions**. These tests run against the actual application with both the backend and frontend servers running.

> **Note**: For API endpoint testing, see the [unit and integration tests](../src/__tests__/README.md) which use Vitest and Supertest.

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
- Browser interactions (clicks, form fills, dialog handling)

## Running Tests

### Prerequisites
Make sure you have installed dependencies:
```bash
npm install
npx playwright install  # Install browser binaries
```

### Unified Test Runner (Recommended)

```bash
npm test                    # Run ALL tests (unit + E2E)
npm test -- --e2e           # Run only E2E tests
npm test -- --e2e --headed  # E2E with visible browser
npm test -- --e2e --ui      # Interactive UI mode
npm test -- --parallel      # Run unit + E2E in parallel
npm test -- --help          # Show all available options
```

### Direct npm Scripts

```bash
npm run test:e2e              # Run E2E tests
npm run test:e2e:ui           # Interactive UI mode
npm run test:e2e:headed       # Show browser during tests
npm run test:e2e:debug        # Debug with Playwright Inspector
npm run test:all              # Run unit + E2E tests (sequential)
npm run test:all:parallel     # Run unit + E2E tests (parallel)
npm run test:ci               # CI mode with coverage
```

### Advanced Playwright Commands

```bash
npx playwright test e2e/tasks.spec.ts           # Run specific file
npx playwright test -g "should create a new task"  # Run matching pattern
npx playwright test --trace on                  # Generate trace files
npx playwright show-report                      # View HTML report
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

### UI Interaction Testing
```typescript
test('should interact with form elements', async ({ page }) => {
  // Fill form
  await page.getByLabel('Task Title').fill('New Task');

  // Click button
  await page.getByRole('button', { name: 'Add Task' }).click();

  // Verify UI update
  await expect(page.getByText('New Task')).toBeVisible();
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

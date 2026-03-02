# Testing Guide

This document provides an overview of the testing strategy and setup for the Hello Norway application.

## Testing Levels

We implement testing at multiple levels to ensure comprehensive coverage:

### 1. Unit & Integration Tests (Backend)

**Framework**: Vitest + Supertest
**Location**: `src/__tests__/`
**Purpose**: Test backend API endpoints, business logic, and data validation

```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

**Coverage**:

- ✅ All CRUD operations (Create, Read, Update, Delete)
- ✅ Error handling and validation
- ✅ Database interactions via Prisma
- ✅ HTTP status codes and response formats

See [Unit Test Documentation](src/__tests__/README.md)

### 2. End-to-End Tests (UI + API)

**Framework**: Playwright
**Location**: `e2e/`
**Purpose**: Test complete user workflows through the browser

```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:headed   # See browser
npm run test:e2e:debug    # Debug mode
```

**Coverage**:

- ✅ UI interactions (forms, buttons, navigation)
- ✅ Task CRUD operations through UI
- ✅ Form validation and error states
- ✅ API endpoint testing
- ✅ Data persistence and reloads

See [E2E Test Documentation](e2e/README.md)

## Quick Start

### First Time Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Install Playwright browsers** (for E2E tests):

   ```bash
   npx playwright install chromium
   ```

3. **Set up database**:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Running Tests

**Run all tests**:

```bash
npm run test:all
```

**Run unit tests only**:

```bash
npm test
```

**Run E2E tests only**:

```bash
npm run test:e2e
```

**Run E2E tests interactively** (recommended for development):

```bash
npm run test:e2e:ui
```

## Test Structure

```code
hello-norway/
├── src/__tests__/           # Unit & Integration tests
│   ├── tasks.test.ts        # API endpoint tests
│   ├── setup.ts             # Test configuration
│   └── README.md            # Documentation
│
├── e2e/                     # End-to-End tests
│   ├── tasks.spec.ts        # UI workflow tests
│   ├── api.spec.ts          # API integration tests
│   └── README.md            # Documentation
│
├── vitest.config.ts         # Unit test config
└── playwright.config.ts     # E2E test config
```

## Writing Tests

### Unit Test Example (Vitest + Supertest)

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('POST /tasks', () => {
  it('should create a new task', async () => {
    const response = await request(app)
      .post('/tasks')
      .send({
        slug: 'test-task',
        title: 'Test Task',
        shortDescription: 'Description',
        body: 'Body',
        category: 'OTHER',
        sortOrder: 100,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Test Task');
  });
});
```

### E2E Test Example (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('should create a new task', async ({ page }) => {
  await page.goto('/tasks');

  await page.getByPlaceholder('Enter task title...').fill('New Task');
  await page.getByRole('button', { name: 'Add Task' }).click();

  await expect(page.getByRole('heading', { name: 'New Task' })).toBeVisible();
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### General

1. **Test Independence**: Each test should be independent and not rely on others
2. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
4. **Clean Up**: Clean up test data to avoid side effects

### Unit Tests

1. **Mock External Dependencies**: Mock database, external APIs, etc.
2. **Test Edge Cases**: Test both happy paths and error scenarios
3. **Fast Execution**: Keep unit tests fast (< 100ms each)

### E2E Tests

1. **Use Semantic Selectors**: Prefer `getByRole`, `getByLabel` over CSS selectors
2. **Wait Properly**: Use `expect().toBeVisible()` instead of manual waits
3. **Unique Test Data**: Use timestamps or UUIDs to avoid conflicts
4. **Test Critical Paths**: Focus on user-critical workflows

## Debugging

### Unit Tests

**Run specific test file**:

```bash
npx vitest run src/__tests__/tasks.test.ts
```

**Run specific test**:

```bash
npx vitest run -t "should create a new task"
```

**Debug in VS Code**:
Add breakpoints and use the "Debug Test" CodeLens

### E2E Tests

**View test report**:

```bash
npx playwright show-report
```

**Run with trace**:

```bash
npx playwright test --trace on
```

**Debug specific test**:

```bash
npx playwright test --debug -g "should create a new task"
```

**Pause execution** (add to test):

```typescript
await page.pause();
```

## Common Issues

### Port Already in Use

```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues

```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Playwright Browser Issues

```bash
# Reinstall browsers
npx playwright install --force chromium
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)

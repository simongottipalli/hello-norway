# Testing Guide

This document provides an overview of the testing strategy and setup for the Hello Norway application.

## Testing Levels

We implement testing at multiple levels to ensure comprehensive coverage:

### 1. Unit & Integration Tests (Backend)

**Framework**: Vitest + Supertest
**Location**: `src/__tests__/`
**Purpose**: Test backend API endpoints, business logic, repository layer, and data validation

```bash
npm run test:unit           # Run once
npm run test:unit:watch     # Watch mode
npm run test:unit:coverage  # With coverage report
```

**Coverage**:

- ✅ All CRUD operations (Create, Read, Update, Delete)
- ✅ Error handling and validation
- ✅ Repository layer (taskRepo, userRepo, sessionRepo, otpRepo)
- ✅ Service layer (authService, taskService, otpService, etc.)
- ✅ HTTP status codes and response formats
- ✅ Profile-based task assignment integration

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
- ✅ Authentication (OTP login flow, session creation, logout)
- ✅ Profile viewing and editing
- ✅ Task interactions through UI (modal, status updates)
- ✅ Onboarding survey flow
- ✅ Form validation and error states
- ✅ Protected and public routing

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

**Run all tests** (build → unit → E2E):

```bash
npm test
```

**Run unit tests only**:

```bash
npm run test:unit
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
├── src/__tests__/                          # Unit & Integration tests
│   ├── setup.ts                            # Test configuration
│   ├── README.md                           # Documentation
│   ├── app-routing.test.ts                 # Route auth policy (public vs protected)
│   ├── authMiddleware.test.ts              # Session authentication middleware
│   ├── authProfile.test.ts                 # Auth profile endpoints (GET/PATCH/DELETE)
│   ├── authSession.test.ts                 # GET /api/auth/session
│   ├── errorHandler.test.ts               # handleDatabaseError utility
│   ├── health.test.ts                      # GET /health
│   ├── otp.test.ts                         # OTP request/verify endpoints
│   ├── otpTestPeek.test.ts                 # GET /otp/test-peek (test-only endpoint)
│   ├── tasks.test.ts                       # Task CRUD API
│   ├── taskStatusUpdate.test.ts            # PATCH /tasks/:id/status
│   ├── taskValidation.test.ts              # CreateTask payload validation
│   ├── taskAssignmentIntegration.test.ts   # Profile-based task assignment (DB)
│   ├── onboardingProfile.test.ts           # Onboarding profile validation
│   ├── seedTasks.test.ts                   # Seed data integrity
│   ├── dateUtils.test.ts                   # Date utility functions
│   ├── dashboard-page.test.tsx             # Dashboard React component
│   ├── onboarding-page.test.tsx            # Onboarding React component
│   ├── landing-page.test.tsx               # Landing page React component
│   ├── lib/                                # lib/ utility tests
│   ├── middleware/                         # Middleware tests
│   ├── repo/                               # Repository layer tests
│   └── services/                          # Service layer tests
│
├── e2e/                     # End-to-End tests (Playwright)
│   ├── navigation.spec.ts        # Navigation, routing, logout, mobile menu
│   ├── dashboard-sidebar.spec.ts # Sidebar, add task, profile view
│   ├── dashboard-modal.spec.ts   # Task detail modal, status updates
│   ├── onboarding.spec.ts        # Onboarding survey, task preview
│   ├── login.spec.ts             # OTP login flow, email/OTP validation
│   ├── profile.spec.ts           # Profile viewing and editing
│   └── README.md                 # Documentation
│
├── vitest.config.ts         # Unit test config
└── playwright.config.ts     # E2E test config
```

## Writing Tests

### Unit Test Example (Vitest + Supertest)

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import * as taskRepo from '../repo/taskRepo';

vi.mock('../repo/taskRepo');
vi.mock('../middleware/authMiddleware', () => ({
  authenticateSession: (_req, _res, next) => next(),
}));

const app = createApp();

describe('POST /api/tasks', () => {
  it('should create a new task', async () => {
    vi.mocked(taskRepo.createTask).mockResolvedValue({
      id: 'task-1',
      slug: 'test-task',
      title: 'Test Task',
      // …other fields
    });

    const response = await request(app)
      .post('/api/tasks')
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
npx vitest run src/__tests__/taskStatusUpdate.test.ts
```

**Run tests matching a pattern**:

```bash
npx vitest run -t "should create"
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

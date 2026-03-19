# End-to-End (E2E) Tests

This directory contains end-to-end tests for the Hello Norway application using [Playwright](https://playwright.dev/).

## Overview

E2E tests verify complete user workflows from the browser perspective, covering UI interactions, navigation, authentication, and data persistence. Tests run against a full production build of the application with both the backend (Express) and frontend (Next.js) servers running.

> **Note**: For API endpoint testing, see the [unit and integration tests](../src/__tests__/README.md) which use Vitest and Supertest.

## Test Files

### `navigation.spec.ts`

Navigation, routing, and authentication redirects:

- Protected route redirects (unauthenticated → `/login`)
- Public route access (`/`, `/login`, `/onboarding`)
- Authenticated redirect (`/login` → `/dashboard`)
- Nav links and active state
- Logout flow
- Mobile hamburger menu (toggle, close via link / Escape / outside click)

### `dashboard-sidebar.spec.ts`

Dashboard sidebar and quick-action flows:

- Sidebar visibility at desktop / tablet / mobile viewports
- "All Tasks" button and filter reset
- "Dashboard" navigation button
- Profile view in the main content area
- Add Task dialog (open, fill form, create task)

### `dashboard-modal.spec.ts`

Task detail modal interactions:

- Open modal via "View Details" button
- Modal content (description, category, status, notes, due date)
- Close via button / Escape / outside click
- Focus trap within modal
- Update status + notes and save

### `onboarding.spec.ts`

Onboarding survey flow:

- Next button disabled until the current question is answered
- Back button disabled on the first question
- Forward/back navigation with answer preservation
- Progress bar
- Conditional questions (job offer for Student vs Skilled worker)
- Task preview after completion
- "Save and continue" button

### `login.spec.ts`

OTP login flow:

- Login page renders the email step
- Validation errors for empty / invalid email
- Transition to OTP step after valid email submission
- Validation errors for empty OTP and wrong OTP code
- "Change Email" navigation back to the email step
- Successful login with correct OTP → redirect to `/dashboard`
- Authenticated users are redirected away from `/login`

### `profile.spec.ts`

Profile viewing and editing:

- Profile page renders all form fields
- Name field is pre-populated from the existing profile
- Save name / arrival year / employment status / has-children
- Validation errors (empty name, out-of-range year)
- Form state preserved after a validation error
- Delete Profile confirmation dialog (open and cancel)
- Profile form accessible from the dashboard sidebar

## Infrastructure

| File | Purpose |
|---|---|
| `global-setup.ts` | Creates the E2E test user, two sessions (main + logout), and seeds UserTask records |
| `global-teardown.ts` | Deletes the test user (cascades to sessions and tasks) |
| `helpers/db-setup.ts` | Prisma helper invoked by global-setup via `tsx` |
| `helpers/db-teardown.ts` | Prisma helper invoked by global-teardown via `tsx` |
| `.auth/user.json` | Persisted auth state shared by all authenticated tests |
| `.auth/user-logout.json` | Isolated auth state used only by the logout test |

### Email mocking for login tests

The Express server is started with `EMAIL_PROVIDER=test` in E2E mode. This activates a no-op email provider that suppresses all outbound email. A test-only endpoint (`GET /api/otp/test-peek?email=…`) is exposed by the server when `NODE_ENV=test`, allowing login E2E tests to retrieve the OTP that was stored in the database without reading a real inbox.

## Running Tests

### Prerequisites

```bash
npm install
npx playwright install chromium   # Install browser binaries
npm run build                      # E2E tests require a production build
```

### Unified Test Runner (Recommended)

```bash
npm run test:e2e              # Build + run all E2E tests
npm run test:e2e:ui           # Interactive Playwright UI mode
npm run test:e2e:headed       # Show browser during tests
npm run test:e2e:debug        # Debug with Playwright Inspector
```

### Advanced Playwright Commands

```bash
npx playwright test e2e/login.spec.ts          # Run a single spec file
npx playwright test -g "should log in"         # Run tests matching a pattern
npx playwright test --trace on                 # Generate trace files
npx playwright show-report                     # View HTML report
```

## Test Configuration

Configuration is defined in `playwright.config.ts`:

- **Base URL**: `http://localhost:3999` (production build, dedicated port)
- **Auth state**: all tests start with a pre-authenticated context via `storageState`
- **Browser**: Chromium (extendable to Firefox/WebKit)
- **Retries**: 2 in CI, 0 locally
- **Reporter**: HTML (run `npx playwright show-report` to view)

## Writing Tests

### Unauthenticated tests

```typescript
const unauthenticatedTest = test.extend({
  storageState: { cookies: [], origins: [] },
});

unauthenticatedTest('unauthenticated scenario', async ({ page }) => {
  await page.goto('/login');
  // …
});
```

### Basic test structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
  });

  test('should do something', async ({ page }) => {
    await page.getByLabel('Input').fill('value');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

## Best Practices

1. **Semantic selectors** — prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
2. **Prefer `expect().toBeVisible()`** over manual waits
3. **Unique test data** — use dedicated test-user email addresses to avoid conflicts
4. **Restore mutated state** — when a test changes profile or task data, restore it in the same test
5. **Descriptive names** — test names should clearly describe the scenario being validated

## Debugging Tips

```bash
# View the HTML test report
npx playwright show-report

# Run with trace collection for post-mortem analysis
npx playwright test --trace on

# Pause execution inside a test
await page.pause();
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)

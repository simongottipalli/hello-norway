---
name: Code Cleanup Round 3
overview: "A third-pass cleanup covering items that remained open from Round 2 plus newly identified issues: unused exports, redundant test assertions, test consolidation, and minor code duplication."
todos:
  - id: unused-validators
    content: Unexport 11 internal helpers in taskValidation.ts; refactor taskValidation.test.ts to test through public API only
    status: completed
  - id: test-loggerRewrite
    content: Remove 3 redundant .not.toBe() lines and 2 trivial existence tests from logger.test.ts
    status: completed
  - id: test-emailDelegation
    content: Remove thin constructor existence test from emailService.test.ts
    status: completed
  - id: test-validationTriple
    content: Remove duplicate constraint assertions from validateCreateTaskBody/validateUpdateTaskFields sections in taskValidation.test.ts
    status: completed
  - id: test-modalClose
    content: Parameterise 3 identical modal-close tests in dashboard-modal.spec.ts with test.each
    status: completed
  - id: test-mobileMenu
    content: Move standalone 'should display all navigation links' test into mobile menu open/close describe block in navigation.spec.ts
    status: completed
  - id: user-test-delete
    content: Delete src/__tests__/user.test.ts — 3 name-field migration verification tests on a stable schema
    status: completed
  - id: integration-parameterize
    content: Collapse 3 identical Error handling scenario tests in integration.test.ts into it.each
    status: completed
  - id: middleware-comment
    content: Fix stale /signup reference in middleware.ts comment on line 58
    status: completed
  - id: ms-per-day
    content: Export MS_PER_DAY from dateUtils.ts and import it in taskAssignmentService.ts to remove duplication
    status: completed
isProject: false
---

# Code Cleanup — Round 3

A few Round 2 items are confirmed still open in the code (marked below). The rest are genuinely new findings.

---

## Carry-overs from Round 2 (confirmed still open)

### 1. Unexport individual validators in `taskValidation.ts`

All 11 internal helper functions are still exported — `validateStringField`, `validateIntegerField`, and all 9 `validateTask*` field validators. Production callers only import `validateCreateTaskBody`, `validateUpdateTaskFields`, and `validateDaysFromArrivalRange`. The individual exports should be removed and the test file `src/__tests__/taskValidation.test.ts` refactored to exercise those helpers only through the public composite functions.

Key file: `[src/controllers/taskValidation.ts](src/controllers/taskValidation.ts)`

### 2. `logger.test.ts` — redundant and trivial assertions

In `[src/__tests__/lib/logger.test.ts](src/__tests__/lib/logger.test.ts)`:

- Each sanitization test includes a `.not.toBe(rawValue)` check that is logically redundant with the positive assertion — if `bindings.otp === '[REDACTED]'` passes, it is impossible for it to also equal `'123456'`.
- `should have child method` (line 47) only checks `typeof logger.child === 'function'` — pure existence check.
- `should create a child logger with context` (line 6) only asserts `.info` and `.error` are functions.

Remove the three redundant `.not.toBe()` lines and the two trivial existence tests.

### 3. `emailService.test.ts` — thin constructor test

In `[src/__tests__/services/email/emailService.test.ts](src/__tests__/services/email/emailService.test.ts)`, the `should create service with provider` test only checks `expect(service).toBeInstanceOf(EmailService)` — it asserts nothing about behaviour. Remove it.

### 4. `taskValidation.test.ts` — triple-level constraint duplication

Constraints like slug length, daysFromArrival range, category values, and boolean fields are each tested at three levels: in the generic utility tests, in the per-field tests, and again in `validateCreateTaskBody` / `validateUpdateTaskFields`. Remove the duplicate assertions in the composite sections; keep them in the per-field sections.

### 5. `dashboard-modal.spec.ts` — parameterise 3 identical close tests

In `[e2e/dashboard-modal.spec.ts](e2e/dashboard-modal.spec.ts)` lines 67–88, all three `modal dismissal` tests have identical assertions (`expect(dialog).not.toBeVisible()` + URL check) and differ only in the dismissal action. Replace with `test.each`:

```typescript
const dismissals: [string, (page: Page) => Promise<void>][] = [
  ['Close button', page => dialog.getByRole('button', { name: 'Close' }).click()],
  ['Escape key',   page => page.keyboard.press('Escape')],
  ['outside click', page => page.mouse.click(10, 400)],
];
for (const [label, dismiss] of dismissals) {
  test(`should close modal via ${label}`, async ({ page }) => { ... });
}
```

### 6. `navigation.spec.ts` — standalone mobile test duplicates setup

`should display all navigation links in mobile menu` (line 166) manually repeats `setViewportSize`, `goto`, toggle click, and `expect(mobileNav).toBeVisible()` — the exact same 4 steps already in the `mobile menu open/close` `beforeEach`. Move this test inside the `mobile menu open/close` describe block so it inherits the shared setup.

---

## New findings

### 7. Delete `user.test.ts`

`[src/__tests__/user.test.ts](src/__tests__/user.test.ts)` contains 3 live-DB tests that verify the `name` column was added to the `User` model. The `name` field migration is long stable and the field's behaviour is exercised by higher-level auth and profile tests. The first test also includes `toHaveProperty("id")` / `toHaveProperty("createdAt")` / `toHaveProperty("updatedAt")` assertions that Prisma always satisfies. Delete the file.

### 8. `integration.test.ts` — collapse 3 structurally identical error tests

In `[src/__tests__/services/email/integration.test.ts](src/__tests__/services/email/integration.test.ts)` lines 63–115, the three `Error handling scenarios` tests are identical: mock `sendTransacEmail` to reject with a message, call `sendEmail`, assert `success: false` and `error` matches the message. They cover no distinct code paths. Collapse into a single `it.each` table.

### 9. Fix stale `/signup` comment in `middleware.ts`

Line 58 of `[middleware.ts](middleware.ts)` reads:

```typescript
// Redirect authenticated users away from login/signup to dashboard
```

The `/signup` page was deleted in Round 2. Update the comment to `// Redirect authenticated users away from login to dashboard`.

### 10. Consolidate `MS_PER_DAY` constant

The same value is defined independently in two places:

- `[src/services/taskAssignmentService.ts](src/services/taskAssignmentService.ts)` line 14: `const MS_PER_DAY = 24 * 60 * 60 * 1000`
- `[src/lib/dateUtils.ts](src/lib/dateUtils.ts)` line ~63: `const msPerDay = 1000 * 60 * 60 * 24` (inside `isTaskUpcoming`)

Export `MS_PER_DAY` from `dateUtils.ts` and import it in `taskAssignmentService.ts`; remove the local variable from `isTaskUpcoming`.

---
name: Code Cleanup Round 2
overview: A refreshed cleanup plan based on the current state of main, covering unused code, duplicated logic, dead code paths, and low-value tests.
todos:
  - id: unused-initializeOtp
    content: Remove initializeOtpService export from otpService.ts and the now-dead lazy-load catch block
    status: completed
  - id: unused-defaultTracking
    content: Unexport or remove DEFAULT_TRACKING_STATE in src/lib/taskHelpers.ts
    status: completed
  - id: unused-validateConfig
    content: Remove validateConfig() from brevoProvider.ts and its test cases
    status: completed
  - id: unused-getTodayUtc
    content: Remove export from getTodayUtc in src/lib/dateUtils.ts
    status: completed
  - id: unused-profileSelect
    content: Remove export from PROFILE_SELECT in src/repo/userRepo.ts
    status: completed
  - id: unused-getEmailService
    content: Remove getEmailService named export from src/services/email/index.ts
    status: completed
  - id: unused-validators
    content: Unexport individual validateTask* functions in taskValidation.ts (public API is the composite functions)
    status: pending
  - id: unused-signup
    content: Delete src/app/signup/page.tsx and remove from middleware authOnlyPaths
    status: completed
  - id: dup-formatEnum
    content: Extract formatCategory/formatEnumKey to src/lib/utils.ts; import in dashboard/page.tsx and AddTaskDialog.tsx
    status: pending
  - id: dup-emailRegex
    content: Move EMAIL_REGEX to src/lib/utils.ts; import in otpController.ts and login/page.tsx
    status: pending
  - id: dup-employmentStatus
    content: Remove local EMPLOYMENT_STATUSES copies in onboardingProfile.ts and authRoutes.ts/taskValidation.ts; import from employmentStatus.ts
    status: pending
  - id: dup-parseDateOnly
    content: Move parseDateOnly to src/lib/dateUtils.ts; remove inline duplicate in taskController.ts
    status: pending
  - id: dup-profileValidation
    content: Refactor PATCH /auth/profile handler to use parseOnboardingProfilePayload instead of re-validating inline
    status: pending
  - id: dup-cookieClearing
    content: Extract clearSessionCookie() helper; use in logout/route.ts and session/route.ts
    status: pending
  - id: dup-rateLimitHeaders
    content: Extract forwardRateLimitHeaders() helper; use in otp/generate and otp/verify routes
    status: pending
  - id: dead-userTasksRoute
    content: Remove GET /user-tasks legacy alias from src/routes/taskRoutes.ts
    status: pending
  - id: dead-undefinedGuards
    content: Remove always-true !== undefined guards on number|null values in taskValidation.ts ~line 370
    status: pending
  - id: dead-badgeVariant
    content: Fix DONE/SAVED badge variant in dashboard/page.tsx — give SAVED a distinct variant
    status: pending
  - id: dead-isAuthenticated
    content: Remove unreachable isAuthenticated branch on src/app/page.tsx landing page
    status: pending
  - id: dead-otpCatch
    content: Remove unreachable catch block in otpService.ts getOtpServiceInstance lazy-load
    status: pending
  - id: dead-taskId
    content: Either wire up taskId query param in dashboard/page.tsx or simplify the tasks/[id] redirect to plain /dashboard
    status: pending
  - id: test-assignmentService
    content: Delete src/__tests__/taskAssignmentService.test.ts (superseded by integration tests)
    status: pending
  - id: test-userTasks
    content: Delete src/__tests__/userTasks.test.ts (Prisma schema tests, not app logic)
    status: pending
  - id: test-userTrivial
    content: Remove trivial schema-verification test cases from user.test.ts
    status: pending
  - id: test-loggerRewrite
    content: Rewrite logger sanitization tests to assert actual redaction; remove trivial method-exists tests
    status: pending
  - id: test-emailDelegation
    content: Remove delegation-only tests from emailService.test.ts and real-world scenarios from integration.test.ts
    status: pending
  - id: test-otpDuplicate
    content: Remove one of the two identical verifyOtp service test cases in otp.test.ts
    status: pending
  - id: test-validationTriple
    content: Remove duplicate constraint assertions from validateCreateTaskBody/validateUpdateTaskFields sections in taskValidation.test.ts
    status: pending
  - id: test-onboardingService
    content: Delete src/__tests__/services/onboardingService.test.ts (single delegation test for a 2-line function)
    status: pending
  - id: test-seedCount
    content: Replace brittle task count toBe(15) in seedTasks.test.ts with toBeGreaterThanOrEqual(1)
    status: pending
  - id: test-modalClose
    content: Consolidate 3 modal-close e2e tests in dashboard-modal.spec.ts into parameterised cases
    status: pending
  - id: test-mobileMenu
    content: Consolidate 4 mobile menu close e2e tests in navigation.spec.ts into shared beforeEach + distinct assertions
    status: pending
isProject: false
---

# Code Cleanup — Round 2

## 1. Unused Code — Delete or Unexport

- `**initializeOtpService**` in `[src/services/otpService.ts](src/services/otpService.ts)` — exported but never called anywhere. The lazy-load `require('./email')` path inside `getOtpServiceInstance` is always taken instead. Remove the export and the supporting lazy-load catch block (which is also unreachable — see section 3).
- `**DEFAULT_TRACKING_STATE**` in `[src/lib/taskHelpers.ts](src/lib/taskHelpers.ts)` — exported but never imported in production code (only in tests). Either unexport it or remove it.
- `**validateConfig()**` on `BrevoProvider` in `[src/services/email/providers/brevoProvider.ts](src/services/email/providers/brevoProvider.ts)` — defined but never invoked in production. Remove the method and its test cases.
- `**getTodayUtc**` in `[src/lib/dateUtils.ts](src/lib/dateUtils.ts)` — only used within the same file. Remove the `export` keyword.
- `**PROFILE_SELECT**` in `[src/repo/userRepo.ts](src/repo/userRepo.ts)` — only used within the same file. Remove the `export` keyword.
- `**getEmailService` named export** in `[src/services/email/index.ts](src/services/email/index.ts)` — not called externally. Remove the named export; only the `emailService` singleton needs to be exported.
- *Individual `validateTask` function exports** in `[src/controllers/taskValidation.ts](src/controllers/taskValidation.ts)` — the individual field validators (e.g. `validateTaskSlug`, `validateTaskCategory`) are exported but only consumed by unit tests. The public API of this module is `validateCreateTaskBody` and `validateUpdateTaskFields`. Unexport the individual validators (tests can restructure to test via the public functions).
- `**/signup` route** (`[src/app/signup/page.tsx](src/app/signup/page.tsx)`) — re-exports the login page and is listed in `middleware.ts` `authOnlyPaths`, but no link in the app navigates to `/signup`. Remove the page file and the `authOnlyPaths` entry.

## 2. Duplicated Code — Consolidate

- `**formatCategory` / `formatEnumKey`** — identical `SNAKE_CASE → Title Case` functions in `[src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)` and `[src/components/AddTaskDialog.tsx](src/components/AddTaskDialog.tsx)`. Extract to `src/lib/utils.ts` and import in both.
- `**EMAIL_REGEX`** — same regex in `[src/controllers/otpController.ts](src/controllers/otpController.ts)` and `[src/app/login/page.tsx](src/app/login/page.tsx)`. Move to `src/lib/utils.ts` and import.
- **Employment status values** — `EMPLOYMENT_STATUS_VALUES` in `[src/lib/employmentStatus.ts](src/lib/employmentStatus.ts)`, `EMPLOYMENT_STATUSES` in `[src/lib/onboardingProfile.ts](src/lib/onboardingProfile.ts)`, and a third independent `EMPLOYMENT_STATUSES` Set in `authRoutes.ts`/`taskValidation.ts`. All should import from `employmentStatus.ts`.
- `**parseDateOnly`** — defined in `[src/routes/authRoutes.ts](src/routes/authRoutes.ts)` and re-implemented inline in `[src/controllers/taskController.ts](src/controllers/taskController.ts)`. Move to `src/lib/dateUtils.ts` and import in both.
- **Profile field validation in PATCH handler** — `[src/routes/authRoutes.ts](src/routes/authRoutes.ts)` `PATCH /auth/profile` manually re-validates `isEU`, `hasChildren`, `employmentStatus`, `arrivalDate`, `plannedArrivalDate` — already handled by `parseOnboardingProfilePayload`. Refactor the PATCH handler to call the existing helper instead.
- **Cookie-clearing pattern** — copy-pasted between `[src/app/api/auth/logout/route.ts](src/app/api/auth/logout/route.ts)` and `[src/app/api/auth/session/route.ts](src/app/api/auth/session/route.ts)`. Extract a `clearSessionCookie()` helper function.
- **Rate-limit header propagation** — copy-pasted between `[src/app/api/otp/generate/route.ts](src/app/api/otp/generate/route.ts)` and `[src/app/api/otp/verify/route.ts](src/app/api/otp/verify/route.ts)`. Extract a `forwardRateLimitHeaders(src, dest)` helper.

## 3. Unreachable / Dead Code — Fix or Remove

- `**/user-tasks` legacy route alias** in `[src/routes/taskRoutes.ts](src/routes/taskRoutes.ts)` — `router.get("/user-tasks", getUserTasks)` has no Next.js proxy and no frontend caller. Delete the line.
- **Dead `!== undefined` guards** in `[src/controllers/taskValidation.ts](src/controllers/taskValidation.ts)` lines ~370–372 — `effectiveMin` and `effectiveMax` are typed `number | null`, so `!== undefined` is always `true`. Remove the dead conditions.
- `**DONE` / `SAVED` badge variant** in `[src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)` lines ~369–374 — both statuses map to `"default"`, making the first ternary branch redundant. Give `SAVED` a distinct variant (e.g. `"secondary"`).
- `**isAuthenticated` branch on landing page** in `[src/app/page.tsx](src/app/page.tsx)` — middleware redirects authenticated users from `/` before this renders. The "Redirecting to your dashboard…" branch is effectively dead. Remove or simplify.
- `**otpService.ts` catch block** in `[src/services/otpService.ts](src/services/otpService.ts)` — the `catch` inside `getOtpServiceInstance` that throws `'OTP service not initialized…'` is unreachable because `require('./email')` always resolves. Once `initializeOtpService` is cleaned up (section 1), the lazy-load block itself can also be removed.
- `**taskId` query param from `/tasks/[id]` redirect** in `[src/app/tasks/[id]/page.tsx](src/app/tasks/[id]/page.tsx)` — the param is appended to the redirect URL (`/dashboard?taskId=${id}`) but is never read in `dashboard/page.tsx`. Either wire it up on the dashboard or simplify the redirect to plain `/dashboard`.

## 4. Low-Value Tests — Remove or Rewrite

**Delete entire files:**

- `**[src/__tests__/taskAssignmentService.test.ts](src/__tests__/taskAssignmentService.test.ts)`** (2 cases) — entirely superseded by `taskAssignmentIntegration.test.ts` (13 real-DB cases). Delete.
- `**[src/__tests__/userTasks.test.ts](src/__tests__/userTasks.test.ts)`** — all four tests go directly to Prisma to verify the schema supports `dueDate`/`personalNotes`. This is Prisma schema acceptance testing, not application logic. The actual behaviour is covered in `taskStatusUpdate.test.ts`. Delete.

**Remove specific test cases:**

- `**src/__tests__/user.test.ts`** — remove `"should have name field in User type"` (tautologically true TypeScript object check), `"should require name field when creating user"` (testing Prisma's own constraint), and `"should have all expected fields in the model"` (testing Prisma schema reflection, not app logic).
- `**src/__tests__/lib/logger.test.ts`** — the three sanitization tests (`"should sanitize email"`, `"should redact OTP"`, `"should handle nested object"`) only assert `expect(childLogger).toBeDefined()` — they don't verify any redaction happened. Rewrite them to assert the sensitive fields are actually masked in the output. Also remove the trivial `"should have standard logging methods"` (tests that pino is pino) and `"should respect LOG_LEVEL"` (only checks `logger.level` is defined, not that it reflects the env var).
- `**src/__tests__/services/email/emailService.test.ts`** — remove the thin-wrapper delegation tests (`"should delegate to provider"`, `"should return false when validation fails"`) that only verify assignment works. Keep factory/env-validation tests.
- `**src/__tests__/services/email/integration.test.ts`** — remove the four "Real-world usage scenarios" tests (`"should send OTP email"`, etc.) — they mock Brevo and assert it was called with the provided strings, adding no coverage beyond `brevoProvider.test.ts`. Keep the singleton identity test.
- `**src/__tests__/otp.test.ts`** — remove one of the two duplicate `verifyOtp` service tests (`"should reject expired OTP"` vs `"should reject invalid OTP code"`) — both mock `findValidOtp → null` and assert the same `401` response; they traverse identical code paths.
- `**src/__tests__/taskValidation.test.ts`** — the same constraint (invalid category, sortOrder out-of-range, requiresEU non-boolean, employment status) is tested three times: once per individual validator, once via `validateCreateTaskBody`, once via `validateUpdateTaskFields`. Remove the duplicates from the composite function sections; keep them in the per-field section.
- `**src/__tests__/services/onboardingService.test.ts`** — single test that only verifies the service delegates to `findOnboardingPreviewTasks`. This is a delegation test for a two-line function. Remove; the route-level test in `authProfile.test.ts` already covers the endpoint.
- `**src/__tests__/seedTasks.test.ts`** — `expect(tasks.length).toBe(15)` is brittle and fails every time a seed task is added. Replace with `expect(tasks.length).toBeGreaterThanOrEqual(1)` or remove the count assertion entirely.

**Consolidate e2e tests:**

- `**[e2e/dashboard-modal.spec.ts](e2e/dashboard-modal.spec.ts)`** — the three modal-close tests (Close button / Escape / click outside) share ~80% identical setup and teardown. Extract the setup into a `beforeEach` helper and parameterise the three dismissal actions.
- `**[e2e/navigation.spec.ts](e2e/navigation.spec.ts)`** — the four mobile menu tests (toggle click / link navigation / Escape / click outside) all open the menu in the same way. Extract the shared setup into a `beforeEach` and keep only the distinct close-action assertion.

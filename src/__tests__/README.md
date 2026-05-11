# Unit & Integration Tests

Tests for backend services and API endpoints using **Vitest** and **Supertest**.

> **Note**: For end-to-end UI tests, see the [e2e/](../../e2e/README.md) directory (Playwright).

## Running Tests

### Unified Test Runner (Recommended)

```bash
npm test                    # Run ALL tests (unit + E2E)
npm test -- --unit          # Run only unit/integration tests
npm test -- --unit --watch  # Watch mode for unit tests
npm test -- --coverage      # Run with coverage report
npm test -- --help          # Show all available options
```

### Direct npm Scripts

```bash
npm run test:unit              # Run unit/integration tests
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # Generate coverage report
npm run test:unit:ui           # Interactive UI mode
npm run test:all               # Run unit + E2E tests (sequential)
npm run test:all:parallel      # Run unit + E2E tests (parallel)
npm run test:ci                # CI mode with coverage
```

### Advanced Vitest Commands

```bash
npx vitest run --reporter=verbose  # Verbose output
npx vitest run src/__tests__/tasks.test.ts  # Run specific file
npx vitest run -t "should create"           # Run matching pattern
```

## Test Structure

```
src/__tests__/
├── setup.ts                          # Test configuration (dotenv)
├── README.md                         # This file
├── app-routing.test.ts               # Route auth policy (public vs protected)
├── authMiddleware.test.ts            # Session authentication middleware
├── authProfile.test.ts               # Auth profile endpoints (GET/PATCH/DELETE)
├── authSession.test.ts               # GET /api/auth/session success-path
├── errorHandler.test.ts              # handleDatabaseError (src/repo/errors)
├── health.test.ts                    # GET /health endpoint
├── otp.test.ts                       # OTP request/verify endpoints
├── otpTestPeek.test.ts               # GET /otp/test-peek test-only endpoint
├── api-docs.test.ts                  # GET /api-docs (Swagger UI endpoint)
├── tasks.test.ts                     # Task API (CRUD)
├── taskStatusUpdate.test.ts          # PATCH task status
├── taskAssignmentIntegration.test.ts # Profile-based task assignment
├── onboardingProfile.test.ts         # Onboarding profile validation
├── onboardingController.test.ts      # OnboardingController (tsoa)
├── seedTasks.test.ts                 # Seed data integrity
├── dateUtils.test.ts                 # Date utility functions
├── task-detail-helpers.test.ts       # Task detail UI helpers
├── dashboard-page.test.tsx           # Dashboard React component
├── onboarding-page.test.tsx          # Onboarding React component
├── landing-page.test.tsx             # Landing page React component
├── footer.test.tsx                   # Footer React component
├── lib/
│   ├── logger.test.ts                # Logger & sanitization
│   └── sessionCookieSig.test.ts      # Session cookie signing
├── middleware/
│   ├── errorLogger.test.ts           # Error logger middleware
│   └── requestLogger.test.ts         # Request logging middleware
├── repo/
│   ├── taskRepo.test.ts              # Task repository
│   ├── userRepo.test.ts              # User repository
│   ├── sessionRepo.test.ts           # Session repository
│   └── otpRepo.test.ts               # OTP repository
└── services/
    ├── authService.test.ts           # Auth service logic
    ├── taskService.test.ts           # Task service logic
    └── email/
        ├── brevoProvider.test.ts     # Brevo email provider
        ├── emailService.test.ts      # Email service abstraction
        └── integration.test.ts       # Email integration
```

## Writing Tests

Follow the **Arrange → Act → Assert** pattern:

```typescript
describe("Feature", () => {
  it("should handle success case", async () => {
    // Arrange: Set up test data
    const input = { ... };

    // Act: Execute the operation
    const response = await request(app).post("/endpoint").send(input);

    // Assert: Verify results
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ... });
  });

  it("should handle error case", async () => {
    // Test error handling
  });
});
```

## Test Coverage Patterns

For each feature, cover:
- ✅ **Happy path**: Successful operations
- ✅ **Validation**: Missing/invalid inputs (400 errors)
- ✅ **Not found**: Non-existent resources (404 errors)
- ✅ **Conflicts**: Duplicate/constraint violations (400/409 errors)
- ✅ **Edge cases**: Boundary conditions, special values

## Test Coverage

Generate coverage reports to see which code is tested:

```bash
npm run test:unit:coverage     # Generate coverage report
```

Coverage reports are generated in:
- `coverage/` - HTML report (open `coverage/index.html` in browser)
- Console output shows coverage summary

## Debugging

```bash
npx vitest run src/__tests__/tasks.test.ts  # Run specific file
npx vitest run -t "should create"           # Run matching pattern
DEBUG=* npm run test:unit                   # Debug output
```

## Notes

- Tests use the development database
- Tests clean up created resources in `afterAll` hooks
- Use `beforeAll` for one-time setup, `beforeEach` for per-test setup

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
├── setup.ts                      # Test configuration
├── tasks.test.ts                 # Task API tests
├── user.test.ts                  # User model tests
└── services/
    └── email/
        ├── emailService.test.ts      # Email service unit tests
        ├── brevoProvider.test.ts     # Brevo provider unit tests
        └── integration.test.ts       # Email integration tests
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

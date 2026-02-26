# Unit & Integration Tests

This directory contains comprehensive unit and integration tests for the Task API endpoints.

## Test Framework

We use **Vitest** with **Supertest** for API testing:
- **Vitest**: Fast, modern test runner with TypeScript support
- **Supertest**: HTTP assertion library for testing Express apps

> **Note**: For end-to-end UI tests, see the [e2e/](../../e2e/README.md) directory which uses Playwright.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with verbose output
npx vitest run --reporter=verbose
```

## Test Coverage

### Health Endpoint
- ✅ GET /health returns status

### GET /tasks
- ✅ Returns all tasks
- ✅ Returns tasks with correct structure
- ✅ Returns tasks ordered by category and sortOrder

### POST /tasks
- ✅ Creates a new task with all fields
- ✅ Creates a task with only required fields
- ✅ Returns 400 when missing required fields
- ✅ Returns 400 when slug already exists

### PATCH /tasks/:id
- ✅ Updates a task
- ✅ Returns 404 when task not found
- ✅ Returns 400 when updating to duplicate slug

### DELETE /tasks/:id
- ✅ Deletes a task
- ✅ Returns 404 when task not found

## Test Structure

```
src/__tests__/
├── README.md           # This file
├── setup.ts           # Test setup (loads environment variables)
└── tasks.test.ts      # Task API test suite
```

## Writing New Tests

When adding new endpoints or features:

1. Add test cases to the appropriate describe block
2. Use `beforeAll` for setup that runs once
3. Use `afterAll` for cleanup (e.g., closing database connections)
4. Follow the existing pattern: Arrange → Act → Assert

Example:

```typescript
it("should do something", async () => {
  // Arrange
  const testData = { ... };

  // Act
  const response = await request(app)
    .post("/endpoint")
    .send(testData);

  // Assert
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("id");
});
```

## Database Considerations

- Tests run against the same database as development
- Tests clean up after themselves (delete created resources)
- Existing seed data is not modified
- Consider using a separate test database for CI/CD

## Debugging Tests

```bash
# Run a specific test file
npx vitest run src/__tests__/tasks.test.ts

# Run tests matching a pattern
npx vitest run -t "should create"

# Run with debug output
DEBUG=* npm test
```

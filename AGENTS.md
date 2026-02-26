# Agent Instructions

## Implementation Workflow

When implementing planned tasks:
- Execute one task at a time
- Wait for user confirmation before proceeding to the next task
- This allows for iterative review and adjustment during implementation

## Testing Requirements

### For Backend Tasks (API Routes, Controllers, Services)

When implementing or modifying backend functionality, **ALWAYS**:

1. **Include Testing in Planning**
   - Add test creation/updates as explicit tasks in the implementation plan
   - Estimate test coverage needed (happy path + error cases)
   - Consider edge cases and validation requirements

2. **Write Tests During Implementation**
   - Create or update test files in `src/__tests__/`
   - Follow the existing test structure and patterns
   - Use Vitest + Supertest for API endpoint testing
   - Cover both success scenarios and error handling

3. **Test Coverage Requirements**
   - ✅ Happy path (successful operations)
   - ✅ Error handling (400, 404, 500 responses)
   - ✅ Data validation (required fields, constraints)
   - ✅ Edge cases (duplicates, not found, etc.)

4. **Run Tests After Implementation**
   - Execute `npm test` to verify all tests pass
   - Fix any failing tests before marking task complete
   - Ensure no regression in existing tests
   - Update test documentation if needed

5. **Test File Organization**
   ```
   src/__tests__/
   ├── setup.ts              # Test configuration
   ├── [feature].test.ts     # Feature-specific tests
   └── README.md             # Test documentation
   ```

### Example Test Structure

```typescript
describe("Feature Name", () => {
  describe("GET /endpoint", () => {
    it("should return success response", async () => {
      // Test implementation
    });

    it("should handle errors correctly", async () => {
      // Error case testing
    });
  });
});
```

### When to Skip Testing

Only skip testing when:
- Making trivial changes (typos, comments)
- Updating documentation only
- Modifying configuration files
- User explicitly requests no tests

**Default behavior: Always include testing for backend changes.**

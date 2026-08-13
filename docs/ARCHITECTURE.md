# Architecture: Prisma Isolation Pattern

## Overview

All Prisma-related code is confined to `src/repo/` and `prisma/`. No other layer (services, controllers, routes, frontend components, or tests) imports directly from `src/generated/prisma/`.

This boundary was established in [issue #165](https://github.com/simongottipalli/hello-norway/issues/165).

## Layer Dependency Map

```
Frontend Components
  └── src/types/enums.ts          (app-owned enums, no Prisma)

Routes / Controllers
  └── src/types/enums.ts
  └── src/repo/errors.ts          (DB error handling, Prisma-free API)
  └── Services

Services
  └── src/types/enums.ts
  └── src/types/models.ts
  └── Repository Layer

Repository Layer  ← only layer that imports from Prisma
  └── src/repo/db.ts              (PrismaClient singleton + withTransaction)
  └── src/generated/prisma/       (generated Prisma client)
```

## Files Allowed to Import Prisma

| File | Reason |
|---|---|
| `src/repo/db.ts` | Prisma client singleton, `withTransaction` helper, shared DB types |
| `src/repo/taskRepo.ts` | `Prisma.TaskWhereInput` for query construction |
| `src/repo/taskAssignmentRepo.ts` | `Prisma.TaskWhereInput` for eligibility filter building |
| `src/repo/userRepo.ts` | `Prisma` namespace types for update input |
| `prisma/seed.ts` | Seed script runs outside the app |
| `e2e/helpers/db-setup.ts` | E2E test database setup |
| `e2e/helpers/db-teardown.ts` | E2E test database teardown |
| `e2e/helpers/admin-db-setup.ts` | Admin portal E2E test database setup |
| `e2e/helpers/admin-db-teardown.ts` | Admin portal E2E test database teardown |

No other file should import from `@prisma/client` or `src/generated/prisma/`.

## Key Files

### `src/repo/db.ts`

The single entry point for the Prisma client. Exports:
- `prisma` — the `PrismaClient` singleton
- `withTransaction(fn)` — wraps `prisma.$transaction` for use in services
- `TransactionClient` — type for the transaction client passed to repo functions
- `DbClient` — type alias for `typeof prisma`

Repos accept an optional `db` parameter (defaulting to `prisma`) so they work inside or outside a transaction without callers needing to know about Prisma:

```typescript
// Service can pass a transaction client transparently
await withTransaction(async (tx) => {
  await userRepo.updateUserProfile(userId, data, tx);
  await syncUserTaskAssignments(profile, { db: tx });
});
```

### `src/types/enums.ts`

Application-owned enums that mirror the Prisma schema enums. Used everywhere outside `src/repo/`:
- `TaskCategory`
- `EmploymentStatus`
- `UserTaskStatus`
- `HousingType`
- `EMPLOYMENT_STATUS_VALUES` / `EMPLOYMENT_STATUS_OPTIONS` — for frontend dropdowns and validation

### `src/types/models.ts`

Application-owned interfaces for data flowing between layers:
- `UserUpdateData` — the shape accepted by `authService.updateProfile` and `userRepo.updateUserProfile`

### `src/repo/errors.ts`

Centralises Prisma error code handling. The `handleDatabaseError` function maps Prisma error codes (`P2002`, `P2025`, `P2003`) to HTTP status codes and messages. Controllers call this in `catch` blocks instead of inspecting Prisma error objects directly.

## Conventions

### Adding a new repo function

1. Add the function to the appropriate file in `src/repo/`.
2. Accept an optional `db` parameter typed as a `Pick<DbClient, "modelName">` (or `TransactionClient` if transaction support is needed).
3. Default `db` to `prisma`.
4. Return plain data — do not expose Prisma types in the function signature visible to services.

### Adding a new enum value

1. Add the value to `src/types/enums.ts`.
2. Update `prisma/schema.prisma` to keep the Prisma enum in sync.
3. Run `prisma migrate dev` to apply the migration.

### Handling new Prisma error codes

Add a new `case` to `handleDatabaseError` in `src/repo/errors.ts`.

---

## Routing & Controllers (tsoa)

The API uses **tsoa** for type-safe, decorator-based routing with auto-generated OpenAPI specification.

### Controller Structure

Controllers live in `src/controllers/` and use tsoa decorators:

```typescript
@Route("tasks")
export class TaskController {
  @Get("personalized")
  @Security("cookie_auth")
  public async getUserTasks(@Request() req: ExpressRequest): Promise<Task[]> {
    // ...
  }
}
```

### Route Generation

Routes are generated at build time by running `npm run tsoa:build`, which creates:
- `src/generated/routes.ts` — Express route registration
- `src/generated/swagger.json` — OpenAPI 3.0 specification

These files are **committed to the repository** (unlike the Prisma-generated client) because the app imports `routes.ts` at runtime. Regenerate them after any controller change.

### Authentication

Protected endpoints use `@Security("cookie_auth")` which triggers the authentication handler in `src/middleware/tsoaAuthentication.ts`. This handler reuses the existing session validation logic from `sessionRepo`.

### Validation

Request validation is handled by:
1. **TypeScript types** — Compile-time type checking via DTOs
2. **tsoa runtime validation** — Validates request body matches DTO shape
3. **Custom validation** — Additional business logic in controller methods

### DTOs

Data Transfer Objects in `src/dto/` define request/response shapes:
- `OtpDto.ts` — OTP generation and verification
- `OnboardingDto.ts` — Onboarding profile
- `AuthDto.ts` — Auth and profile updates
- `TaskDto.ts` — Task creation and status updates

DTOs use JSDoc comments for OpenAPI schema generation.

### Adding a New Endpoint

1. Create or update a controller in `src/controllers/`
2. Add tsoa decorators (`@Get`, `@Post`, etc.)
3. Define request/response DTOs in `src/dto/`
4. Run `npm run tsoa:build` to regenerate routes
5. Test via Swagger UI at `/api-docs` (requires `API_DOCS_ENABLED=true`)

See `docs/API.md` for detailed examples.

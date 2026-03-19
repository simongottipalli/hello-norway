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

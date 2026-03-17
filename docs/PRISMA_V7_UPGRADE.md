# Prisma v6 → v7 Upgrade Plan

## Overview

Upgrade `prisma` and `@prisma/client` from `6.19.2` to `7.x` (latest: `7.5.0` as of March 2026).

This is a **major version bump** with breaking changes. The key architectural shift in v7 is:

- The classic Rust-based query engine is removed
- All database connections now go through a **driver adapter** (e.g. `@prisma/adapter-pg` for PostgreSQL)
- Prisma ships as an **ES module**

---

## What's Already v7-Ready

No changes needed for these — the codebase is already aligned:

| Area | Status |
|---|---|
| `prisma/schema.prisma` uses `provider = "prisma-client"` | Already updated in v6 |
| Custom `output` path (`../src/generated/prisma`) in schema | Already set |
| `prisma.config.ts` exists with `datasource.url` configured | Already in new format |
| `tsconfig.json` has `module: "esnext"` and `moduleResolution: "bundler"` | Meets v7 TypeScript requirements |
| No raw SQL (`$queryRaw` / `$executeRaw`) | Nothing to migrate |
| No client middleware (`$use`) | Removed in v7; not used here |
| No Metrics API usage | Removed in v7; not used here |
| PostgreSQL database | Fully supported in v7 (MongoDB is not yet) |
| `postinstall` and `build` scripts run `prisma generate` | No change needed |

---

## Required Changes

### 1. Package versions — `package.json`

```diff
 "dependencies": {
-  "@prisma/client": "^6.19.2",
+  "@prisma/client": "^7",
+  "@prisma/adapter-pg": "^7",
+  "pg": "^8",
 },
 "devDependencies": {
-  "prisma": "^6.19.2",
+  "prisma": "^7",
+  "@types/pg": "^8",
 }
```

### 2. Remove `engine: "classic"` — `prisma.config.ts`

The classic (Rust-based) query engine is gone in v7. The `engine` field must be removed.

```diff
 export default defineConfig({
   schema: "prisma/schema.prisma",
   migrations: {
     path: "prisma/migrations",
     seed: "tsx prisma/seed.ts",
   },
-  engine: "classic",
   datasource: {
     url: env("DATABASE_URL"),
   },
 });
```

### 3. Wire up the PostgreSQL driver adapter — `src/lib/prisma.ts`

v7 requires a driver adapter for all databases. For PostgreSQL, use `@prisma/adapter-pg`.

```diff
-import { PrismaClient } from "../generated/prisma/client.js";
+import { PrismaClient } from "../generated/prisma/client.js";
+import { PrismaPg } from "@prisma/adapter-pg";

-export const prisma = new PrismaClient();
+const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
+export const prisma = new PrismaClient({ adapter });
```

### 4. Regenerate the Prisma client

```bash
npx prisma generate
```

### 5. Run unit tests

```bash
npm run test:unit
```

---

## ESM Consideration

The Prisma v7 migration guide recommends adding `"type": "module"` to `package.json`. This is **intentionally skipped** for this project because:

- Next.js manages its own module bundling (webpack/turbopack) and handles ESM natively
- The Express server runs via `tsx`, which handles ESM imports in a TypeScript-first context
- Adding `"type": "module"` would require renaming config files (e.g. `vitest.config.ts`, `next.config.ts`) to `.cjs` or migrating all `require()` calls

**If unit tests fail after the upgrade due to ESM-related import errors**, the fallback is to add `"type": "module"` to `package.json` and address any cascading config file changes.

---

## Workflow Change (No Code Change Required)

In v7, `prisma migrate dev` **no longer auto-seeds** after applying migrations. Seeding must now be triggered explicitly:

```bash
npx prisma db seed
```

The seed script is still configured in `prisma.config.ts`:

```ts
migrations: {
  path: "prisma/migrations",
  seed: "tsx prisma/seed.ts",
},
```

---

## Risk Assessment

| Change | Risk | Notes |
|---|---|---|
| Remove `engine: "classic"` | Low | Direct removal, no API surface change |
| Add `PrismaPg` driver adapter | Low | Drop-in for the default connection; connection pool defaults differ (see below) |
| Package version bumps | Low | No query API changes affect the app's usage patterns |
| ESM module format | Medium | Mitigated by `tsx` and Next.js; monitor test output |
| `createMany` with `skipDuplicates` | Low | Stable API, supported in v7 |
| Interactive `$transaction` calls | Low | Stable API since Prisma v4 |
| Nested relation filters in `deleteMany` | Low | Standard feature, no known changes |

### Connection pool note

The `pg` driver has no connection timeout by default (`0`), whereas Prisma v6 used a 5-second timeout. If timeout-related issues appear in production after upgrading, configure the adapter explicitly:

```ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Match v6 behavior: 5 second connection timeout
  connectionTimeoutMillis: 5000,
});
```

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Bump `prisma`, `@prisma/client`; add `@prisma/adapter-pg`, `pg`, `@types/pg` |
| `prisma.config.ts` | Remove `engine: "classic"` |
| `src/lib/prisma.ts` | Add `PrismaPg` adapter |

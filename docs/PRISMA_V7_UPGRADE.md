# Prisma v6 → v7 Upgrade

Upgraded `prisma` and `@prisma/client` from `6.19.2` to `7.8.0` (LTS as of May 2026).

The key architectural shift in v7 is:

- The classic Rust-based query engine is removed
- All database connections now go through a **driver adapter** (`@prisma/adapter-pg` for PostgreSQL)
- Prisma ships as an **ES module**

---

## What Was Already v7-Ready

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
| CI workflow already calls `prisma generate` explicitly | Already v7-compatible |
| CI workflow already calls `prisma db seed` explicitly | Already v7-compatible |
| Node.js 22 used in CI | Meets the v7 minimum of 20.19.0 |

---

## Changes Made

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

### 3. Remove deprecated `url` from `prisma/schema.prisma`

v7 validates `env("DATABASE_URL")` in the schema even during `prisma generate`. Without `DATABASE_URL` set (e.g. during `npm install`), the `postinstall` step fails. Since `prisma.config.ts` already owns the URL, remove it from the schema:

```diff
 datasource db {
   provider = "postgresql"
-  url      = env("DATABASE_URL")
 }
```

### 4. Wire up the PostgreSQL driver adapter

v7 requires a driver adapter for every `PrismaClient` instantiation. Updated all four files that construct their own client:

**`src/repo/db.ts`**
```diff
 import { PrismaClient } from "../generated/prisma/client";
+import { PrismaPg } from "@prisma/adapter-pg";

-export const prisma = new PrismaClient();
+const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
+export const prisma = new PrismaClient({ adapter });
```

Same adapter pattern applied to:
- `prisma/seed.ts`
- `e2e/helpers/db-setup.ts`
- `e2e/helpers/db-teardown.ts`

---

## ESM Consideration

The Prisma v7 migration guide recommends adding `"type": "module"` to `package.json`. This is **intentionally skipped** because:

- Next.js manages its own module bundling and handles ESM natively
- The Express server runs via `tsx`, which handles ESM in a TypeScript-first context
- Adding `"type": "module"` would require renaming config files (e.g. `vitest.config.ts`, `next.config.ts`) to `.cjs` or migrating all `require()` calls

All 34 unit test suites pass without it.

**If tests fail in future due to ESM-related import errors**, the fallback is to add `"type": "module"` and address cascading config changes.

---

## Workflow Change

In v7, `prisma migrate dev` no longer auto-seeds after applying migrations, and no longer auto-runs `prisma generate`. Both must be triggered explicitly:

```bash
npx prisma generate
npx prisma db seed
```

The CI workflow and `setup.sh` already call both steps explicitly — no changes needed. For local development, follow `prisma migrate dev` with those two commands manually.

---

## SSL Certificate Validation

In v6, the Rust query engine silently ignored invalid SSL certificates. In v7, the `pg` driver enforces them by default. If a staging/production database uses a self-signed certificate, connections will fail with `P1010`. Fix by configuring the adapter:

```ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

Local development and CI (plain PostgreSQL container) are unaffected.

---

## Connection Pool Note

The `pg` driver has no connection timeout by default (`0`), whereas Prisma v6 used a 5-second timeout. If timeout-related issues appear in production after upgrading, configure the adapter explicitly:

```ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
```

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Bump `prisma`, `@prisma/client`; add `@prisma/adapter-pg`, `pg`, `@types/pg` |
| `prisma.config.ts` | Remove `engine: "classic"` |
| `prisma/schema.prisma` | Remove deprecated `url` from datasource block |
| `src/repo/db.ts` | Add `PrismaPg` adapter |
| `prisma/seed.ts` | Add `PrismaPg` adapter |
| `e2e/helpers/db-setup.ts` | Add `PrismaPg` adapter |
| `e2e/helpers/db-teardown.ts` | Add `PrismaPg` adapter |

# Hello Norway

Web app helping newcomers navigate essential tasks when moving to Norway.
Two servers: Next.js 16 frontend (port 3000) + Express 5 API backend (port 3001).

## Stack

Next.js 16 (App Router, React 19, TypeScript 5), Tailwind CSS v4 with shadcn/ui (zinc theme), Express 5 backend, Prisma 6 ORM with PostgreSQL 16, OTP-based email auth with cookie sessions, Brevo for email, Pino for structured logging.

## Structure

- `src/app/` — Next.js pages and API route handlers (proxy to Express)
- `src/components/ui/` — shadcn/ui primitives (button, card, input, label, badge)
- `src/components/` — feature components composing ui/ primitives
- `src/server.ts` + `src/app.ts` — Express server entry and config
- `src/routes/` — Express routes (taskRoutes, otpRoutes, authRoutes)
- `src/controllers/` — request handlers
- `src/services/` — business logic (authService, etc.)
- `src/lib/prisma.ts` — Prisma client; `src/lib/utils.ts` — cn() helper
- `src/generated/prisma/` — generated Prisma client (do not edit)
- `src/__tests__/` — Vitest + Supertest unit/integration tests
- `e2e/` — Playwright E2E tests
- `prisma/schema.prisma` — database schema; `prisma/seed.ts` — seed data

## Database Models

User (email, name, profile fields), Task (slug, title, body, category enum, targeting rules, sortOrder), UserTask (userId+taskId unique, status: TODO/SAVED/DONE), OTPCode (email OTP with expiry), Session (cookie sessions).

Task categories: ARRIVAL, IDENTITY_BANKING, HEALTH, TAX_WORK, FAMILY, HOUSING, DRIVING, OTHER.

## Commands

- `npm run dev` — start both servers
- `npm run build` — production build (prisma generate + next build)
- `npm run lint` — ESLint
- `npm test` — unified test runner
- `npm run test:unit` — Vitest only
- `npm run test:e2e` — Playwright only (builds first)

## API Endpoints (Express, base path /api)

- `GET|POST /api/tasks`, `PATCH|DELETE /api/tasks/:id`
- `POST /api/otp/generate`, `POST /api/otp/verify`
- `GET /health`

## Environment

Copy `.env.example` to `.env`. Key vars: DATABASE_URL, SESSION_COOKIE_SECRET, API_PORT (3001), PORT (3000), API_BASE_URL, EMAIL_PROVIDER, EMAIL_FROM, BREVO_API_KEY, LOG_LEVEL.

## Rules

### Workflow
Execute one task at a time. Wait for confirmation before proceeding.

### Testing
Always write tests for backend changes. Use Vitest + Supertest in `src/__tests__/`. Cover happy path, error handling (400/404/500), validation, and edge cases. Run `npm test` after changes. Skip only for trivial changes (typos, docs, config).

### UI
Always use shadcn/ui components from `src/components/ui/`. Never write raw HTML with manual Tailwind classes. Use semantic color tokens (bg-background, text-foreground, bg-primary, bg-muted, text-destructive, border-border). Dark mode is automatic via CSS variables — do not use dark: prefixes. Add new components with `npx shadcn@latest add <name>`. Use cn() from @/lib/utils for className merging.

### Logging
Express controllers use req.logger (Pino, attached by middleware). Request IDs flow via X-Request-ID header. Sensitive data is auto-masked.

### Documentation
Before PRs, check `docs/DOCUMENTATION_MAINTENANCE.md` for which docs to update based on changed files. Key mappings: structure changes → README.md, test changes → TESTING.md, UI changes → README.md + AGENTS.md, agent workflow → AGENTS.md.

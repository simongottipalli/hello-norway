# Hello Norway — Copilot Instructions

## What This Is

A web app helping newcomers navigate essential tasks when moving to Norway.
**Two servers**: Next.js 16 frontend (port 3000) + Express 5 API backend (port 3001).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, Server Components), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, shadcn/ui (zinc theme) |
| Backend | Express 5, Pino (structured logging) |
| ORM | Prisma 6 with PostgreSQL 16 |
| Auth | OTP-based email login, cookie sessions |
| Email | Brevo (formerly Sendinblue) |
| Unit tests | Vitest 4 + Supertest |
| E2E tests | Playwright |

## Project Structure

```
src/
  app/                        # Next.js App Router
    layout.tsx                 # Root layout
    page.tsx                   # Home / landing page
    dashboard/page.tsx         # Dashboard
    login/page.tsx             # OTP login flow
    onboarding/page.tsx        # Onboarding survey
    globals.css                # Design tokens (CSS variables, zinc theme)
    api/                       # Next.js API routes (thin proxies to Express)
      auth/session/route.ts
      auth/profile/route.ts
      auth/logout/route.ts
      otp/generate/route.ts
      otp/verify/route.ts
      tasks/route.ts
      tasks/[id]/route.ts
      tasks/[id]/status/route.ts
      tasks/personalized/route.ts
      onboarding/tasks/route.ts
  components/
    ui/                        # shadcn/ui primitives (DO NOT add business logic here)
      button.tsx, card.tsx, input.tsx, label.tsx, badge.tsx
    [Feature].tsx              # Feature components that compose ui/ primitives
  server.ts                    # Express server entry point
  app.ts                       # Express app configuration
  routes/                      # Express route definitions
    taskRoutes.ts, otpRoutes.ts, authRoutes.ts
  controllers/                 # Request handlers and validation
    taskController.ts, otpController.ts, taskValidation.ts
  services/                    # Business logic
    authService.ts, taskService.ts, taskAssignmentService.ts
    onboardingService.ts, otpService.ts
    email/                     # Email provider abstraction (Brevo)
  repo/                        # Data access layer (ONLY layer that imports Prisma)
    db.ts                      # PrismaClient singleton + withTransaction
    errors.ts                  # DB error-code → HTTP status mapping
    taskRepo.ts, userRepo.ts, sessionRepo.ts, otpRepo.ts
    taskAssignmentRepo.ts      # Eligibility filtering + assignment sync
  types/                       # Application-owned types (no Prisma imports)
    enums.ts                   # TaskCategory, EmploymentStatus, UserTaskStatus, HousingType
    models.ts                  # UserUpdateData interface
    task.ts                    # Task type for frontend
  lib/
    dateUtils.ts, logger.ts, taskHelpers.ts
    utils.ts                   # cn() helper for className merging
  generated/prisma/            # Generated Prisma client (do not edit)
  __tests__/                   # Unit/integration tests (Vitest + Supertest)
    setup.ts                   # Test configuration
    services/email/            # Email service tests

e2e/                           # Playwright E2E tests
prisma/
  schema.prisma                # Database schema
  migrations/                  # Migration history
  seed.ts                      # Seed data
docs/
  ARCHITECTURE.md              # Prisma isolation pattern and layer diagram
  DOCUMENTATION_MAINTENANCE.md
```

## Database Models

- **User** — email, name, profile (isEU, employmentStatus, hasChildren, housingType, dates)
- **Task** — slug, title, shortDescription, body, category (enum: ARRIVAL, IDENTITY_BANKING, HEALTH, TAX_WORK, FAMILY, HOUSING, DRIVING, OTHER), targeting rules, sortOrder
- **UserTask** — join table (userId + taskId unique), status (TODO/SAVED/DONE), personalNotes, dueDate
- **OTPCode** — email-based one-time passwords with expiry
- **Session** — cookie-based sessions linked to User

## Key Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:server` | Express API only |
| `npm run dev:client` | Next.js only |
| `npm run build` | Production build (runs prisma generate + next build) |
| `npm run lint` | ESLint |
| `npm test` | Unified test runner (unit + E2E) |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests (builds first) |
| `npm run test:ci` | CI: unit coverage + E2E |

## API Endpoints (Express, base: /api)

- `GET /api/tasks` — Assigned tasks for the authenticated user
- `POST /api/tasks` — Create a user-defined task
- `GET /api/tasks/:id` — Single task by ID
- `PATCH /api/tasks/:id/status` — Update status, due date, or personal notes
- `GET /api/tasks/personalized` — Re-sync and return profile-matched tasks
- `GET /api/auth/session` — Verify session and return current user
- `GET /api/auth/profile` — Fetch full user profile
- `PATCH /api/auth/profile` — Update profile fields (re-syncs task assignments)
- `DELETE /api/auth/profile` — Delete account and all associated data
- `POST /api/auth/logout` — Invalidate the current session
- `POST /api/otp/generate` — Generate a 6-digit OTP and send it by email
- `POST /api/otp/verify` — Verify OTP and create an authenticated session
- `POST /api/onboarding/tasks` — Task preview for pre-auth onboarding
- `GET /health` — Health check

## Environment Variables

Defined in `.env` (copy from `.env.example`):
`DATABASE_URL`, `SESSION_COOKIE_SECRET`, `API_PORT` (3001), `PORT` (3000), `API_BASE_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `BREVO_API_KEY`, `LOG_LEVEL`, `NODE_ENV`.

## Implementation Rules

### Workflow
- Execute one task at a time; wait for user confirmation before proceeding to the next.

### Testing (REQUIRED for backend changes)
- Write tests in `src/__tests__/` using Vitest + Supertest.
- Cover: happy path, error handling (400/404/500), validation, edge cases.
- Run `npm run test:unit` after changes; fix failures before marking complete.
- Skip tests only for trivial changes (typos, comments, config, docs).

### Architecture: Prisma Isolation
- Only `src/repo/` (and `prisma/`) may import from Prisma or `src/generated/prisma/`.
- Services, controllers, routes, and frontend must use enums from `src/types/enums.ts` and models from `src/types/models.ts`.
- Use `withTransaction` from `src/repo/db.ts` — never call `prisma.$transaction()` directly outside repo.
- See `docs/ARCHITECTURE.md` for the full layer diagram and conventions.

### UI Development
- **Always** use shadcn/ui components from `src/components/ui/` — never write raw HTML with manual Tailwind.
- Available: `Button`, `Card` (+ CardHeader/Content/Footer/Title/Description), `Input`, `Label`, `Badge`.
- Add new components: `npx shadcn@latest add <component-name>` or copy from ui.shadcn.com.
- Use `cn()` from `@/lib/utils` for className merging.
- Use **semantic color tokens** (`bg-background`, `text-foreground`, `bg-primary`, `bg-muted`, `text-destructive`, `border-border`, etc.) — never hardcode colors.
- Dark mode is automatic via `prefers-color-scheme` CSS variables. Do NOT use `dark:` Tailwind prefixes.

### Documentation Maintenance
Before opening a PR, check `docs/DOCUMENTATION_MAINTENANCE.md` for the change-to-doc mapping:
- Structure changes → update `README.md`
- Test changes → update `TESTING.md` and relevant test README
- UI/component changes → update `README.md` UI section + `AGENTS.md` UI guidelines
- Agent workflow changes → update `AGENTS.md`

### Logging
- Use Pino structured logging. In Express controllers, use `req.logger` (attached by middleware).
- Request IDs flow via `X-Request-ID` header from Next.js through Express.
- Sensitive data (emails, OTPs) is auto-masked in logs.

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
    page.tsx                   # Home page
    dashboard/page.tsx         # Dashboard
    globals.css                # Design tokens (CSS variables, zinc theme)
    api/                       # Next.js API routes (proxy to Express)
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
  controllers/                 # Business logic handlers
  services/                    # Service layer (authService, etc.)
  utils/                       # Shared utilities (errorHandler, etc.)
  lib/
    prisma.ts                  # Prisma client instance
    utils.ts                   # cn() helper for className merging
  generated/prisma/            # Generated Prisma client (do not edit)
  __tests__/                   # Unit/integration tests
    setup.ts, tasks.test.ts, otp.test.ts, user.test.ts
    services/email/            # Email service tests

e2e/                           # Playwright E2E tests
prisma/
  schema.prisma                # Database schema
  migrations/                  # Migration history
  seed.ts                      # Seed data
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

- `GET /api/tasks` — All tasks (ordered by category + sortOrder)
- `POST /api/tasks` — Create task
- `PATCH /api/tasks/:id` — Update task
- `POST /api/otp/generate` — Generate and send OTP
- `POST /api/otp/verify` — Verify OTP
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
- Run `npm test` after changes; fix failures before marking complete.
- Skip tests only for trivial changes (typos, comments, config, docs).

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

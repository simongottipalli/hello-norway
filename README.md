# Hello Norway

A Next.js application with Express API backend, helping newcomers navigate essential tasks when moving to Norway.

## Stack

### Frontend

- **[Next.js 16](https://nextjs.org/)** — App Router, Server Components, file-based routing
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS with dark mode
- **[shadcn/ui](https://ui.shadcn.com/)** — Zinc-themed component library (Button, Card, Input, Label, Badge)
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety throughout
- **[ESLint](https://eslint.org/)** — Code linting via `eslint-config-next`

### Backend

- **[Express](https://expressjs.com/)** — Fast, minimalist web framework
- **[Prisma v7](https://www.prisma.io/)** — Type-safe ORM with PostgreSQL via `@prisma/adapter-pg`

### Testing

- **[Vitest](https://vitest.dev/)** — Fast unit testing with TypeScript support
- **[Supertest](https://github.com/ladjs/supertest)** — HTTP assertion library for API testing
- **[Playwright](https://playwright.dev/)** — End-to-end testing for UI and API workflows

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed the database (optional)
npx prisma db seed

# Start the development servers (both frontend and backend)
npm run dev
```

This will start:

- **Frontend (Next.js)**: [http://localhost:3000](http://localhost:3000)
- **Backend (Express API)**: [http://localhost:3001/api](http://localhost:3001/api)

## UI Components

This project uses **[shadcn/ui](https://ui.shadcn.com/)** with a **zinc** color palette. All UI primitives are in `src/components/ui/` and should be used instead of writing raw elements with Tailwind classes.

### Available Components

| Component               | Import                   | Description                                                                                                             |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `Button`                | `@/components/ui/button`   | Actions — supports `variant` (default, outline, ghost, destructive, secondary, link) and `size` (default, sm, lg, icon) |
| `Card` + sub-components | `@/components/ui/card`     | Content containers — use `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                      |
| `Input`                 | `@/components/ui/input`    | Text inputs with consistent focus ring and border styling                                                               |
| `Label`                 | `@/components/ui/label`    | Accessible form labels, pair with `Input` using `htmlFor`                                                               |
| `Badge`                 | `@/components/ui/badge`    | Inline tags — supports `variant` (default, secondary, destructive, outline)                                             |
| `Dialog`                | `@/components/ui/dialog`   | Modal dialogs — use `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`                |
| `Select`                | `@/components/ui/select`   | Native `<select>` wrapper with consistent styling                                                                       |
| `Textarea`              | `@/components/ui/textarea` | Multi-line text inputs with consistent focus ring and border styling                                                    |
| `Spinner`               | `@/components/ui/spinner`  | Loading indicator — supports `size` (sm, md, lg)                                                                        |

### Adding More Components

```bash
npx shadcn@latest add <component-name>
```

Browse available components at [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components).

### Theming

Colors are defined as CSS variables in `src/app/globals.css`. Dark mode switches automatically via `prefers-color-scheme`. Customize the palette by editing the `:root` and `@media (prefers-color-scheme: dark)` blocks.

---

## Project Structure

```code
src/
  app/                      # Next.js App Router pages and API proxies
    layout.tsx              # Root layout with metadata and fonts
    page.tsx                # Home / landing page
    dashboard/page.tsx      # Main dashboard (tasks, profile)
    login/page.tsx          # OTP login flow
    onboarding/page.tsx     # Onboarding survey
    globals.css             # Design tokens (Tailwind directives, CSS variables)
    api/                    # Next.js API routes (thin proxies to Express)
      auth/                 # session, profile, logout
      otp/                  # generate, verify
      tasks/                # list, create, get-by-id, status, personalized
      onboarding/tasks/     # task preview (pre-auth)

  # Express API Backend
  server.ts                 # API server entry point (port 3001)
  app.ts                    # Express app configuration and middleware
  routes/                   # Express route registrations
    otpRoutes.ts            # Legacy OTP routes (pre-tsoa)
  controllers/              # tsoa controllers (decorators → auto-generated routes)
    AuthController.ts, OtpController.ts, TaskController.ts, OnboardingController.ts
  generated/routes.ts       # Auto-generated by tsoa (do not edit)
  generated/swagger.json    # Auto-generated OpenAPI spec (do not edit)
  services/                 # Business logic
    authService.ts, taskService.ts, taskAssignmentService.ts
    onboardingService.ts, otpService.ts
    email/                  # Email provider abstraction (Brevo)

  repo/                     # Data access layer (only layer that imports Prisma)
    db.ts                   # PrismaClient singleton + withTransaction helper
    errors.ts               # DB error-code → HTTP status mapping
    taskRepo.ts, userRepo.ts, sessionRepo.ts, otpRepo.ts
    taskAssignmentRepo.ts   # Eligibility filtering + assignment sync

  types/                    # Application-owned types (Prisma-free)
    enums.ts                # TaskCategory, EmploymentStatus, UserTaskStatus, HousingType
    models.ts               # UserUpdateData interface
    task.ts                 # Task type used by the frontend

  components/               # React feature components
    ui/                     # shadcn/ui primitives (button, card, input, label, badge, dialog, select, textarea, spinner)
  lib/                      # Shared utilities
    dateUtils.ts, logger.ts, taskHelpers.ts, utils.ts (cn helper)

  __tests__/                # Vitest + Supertest unit/integration tests
    README.md               # Test documentation
    setup.ts                # Test configuration

  generated/prisma/         # Generated Prisma client (do not edit)

e2e/                        # Playwright end-to-end tests
  README.md                 # E2E test documentation

prisma/
  schema.prisma             # Database schema
  migrations/               # Migration history
  seed.ts                   # Database seed data

docs/                       # Architecture and upgrade documentation
  ARCHITECTURE.md           # Prisma isolation pattern and layer diagram
  DOCUMENTATION_MAINTENANCE.md
  PRISMA_V7_UPGRADE.md      # Prisma v6 → v7 migration notes
  ESLINT_V10_UPGRADE.md     # ESLint v9 → v10 migration notes

public/                     # Static assets
vitest.config.ts            # Unit test configuration
playwright.config.ts        # E2E test configuration
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable                | Description                                                                       | Example                                       |
| ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------- |
| `NODE_ENV`              | Environment mode                                                                  | `development` or `production`                 |
| `PORT`                  | Port the Next.js frontend server listens on                                       | `3000`                                        |
| `API_PORT`              | Port the Express backend server listens on                                        | `3001`                                        |
| `API_BASE_URL`          | URL Next.js API routes use to forward requests to Express — must match `API_PORT` | `http://localhost:3001/api`                   |
| `NEXT_PUBLIC_SITE_URL`  | Public URL used for Open Graph metadata                                           | `https://your-domain.com`                     |
| `DATABASE_URL`          | Full PostgreSQL connection string (user, password, host, port, and db in one URL) | `postgresql://user:pass@localhost:5432/myapp` |
| `SESSION_COOKIE_SECRET` | Secret used to sign session cookies — **must** be a long random string            | *(generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)* |
| `EMAIL_PROVIDER`        | Email service provider                                                            | `brevo`                                       |
| `EMAIL_FROM`            | Sender address shown to email recipients                                          | `noreply@example.com`                         |
| `BREVO_API_KEY`         | Brevo (formerly Sendinblue) API key                                               | *(from Brevo dashboard → SMTP & API)*         |
| `LOG_LEVEL`             | Logging verbosity (debug, info, warn, error)                                      | `debug` (dev), `info` (prod)                  |

## Deployment

### Docker (recommended)

A `Dockerfile` (multi-stage, Alpine-based) and `docker-compose.yml` are included for containerised deployment.

**Quick start with Docker Compose (includes local PostgreSQL):**

```bash
# 1. Copy and configure environment variables
cp .env.example .env
# Required: update DATABASE_URL with a real password, set SESSION_COOKIE_SECRET and BREVO_API_KEY

# 2. Build and start all services
docker compose up --build -d

# 3. Verify the app is running
curl http://localhost:3001/health   # → {"ok":true}
```

The Compose stack spins up:
- **`app`** — Next.js frontend (port 3000) + Express API (port 3001)
- **`postgres`** — PostgreSQL 16 with a named volume for persistent data

Database migrations run automatically on container start via `prisma migrate deploy`.

---

### Database Hosting

Any PostgreSQL 16-compatible host works. Set `DATABASE_URL` to the connection string provided by your host.

| Provider | Free tier | Notes |
|----------|-----------|-------|
| [Railway](https://railway.app) | ✅ | Add a Postgres plugin; `DATABASE_URL` is set automatically in linked services |
| [Supabase](https://supabase.com) | ✅ | Project Settings → Database → Connection string (URI mode) |
| [Neon](https://neon.tech) | ✅ | Dashboard → Connection Details |

---

### Email Service (Brevo)

1. Sign up at [brevo.com](https://www.brevo.com)
2. Go to **SMTP & API → API Keys** and create a new key
3. Set `BREVO_API_KEY` in your environment
4. Set `EMAIL_FROM` to a verified sender address or domain

---

### Health Check

The Express API exposes a health check endpoint used by load balancers and orchestrators:

```
GET http://<host>:3001/health
→ 200 OK  {"ok":true}
```

## Logging

This project uses **[Pino](https://getpino.io/)** for structured logging with request tracing across Next.js and Express servers.

### Key Features

- **Structured JSON logs** in production for easy parsing and aggregation
- **Pretty-printed logs** in development for better readability
- **Request ID tracing** — Each request gets a unique `X-Request-ID` header that flows through the entire request lifecycle
- **Automatic sanitization** — Sensitive data (emails, OTPs, passwords) are automatically masked in logs
- **Performance metrics** — Request duration and timing information

### Log Levels

Set via `LOG_LEVEL` environment variable:

- `debug` — Verbose logging, useful for development (default in development)
- `info` — Standard logging (default in production)
- `warn` — Warning messages only
- `error` — Error messages only

### Request Tracing Flow

1. **Client → Next.js**: Request arrives at Next.js API route
2. **Next.js generates ID**: `crypto.randomUUID()` → `X-Request-ID` header
3. **Next.js → Express**: Forward request with `X-Request-ID` header
4. **Express middleware**: Extract `X-Request-ID`, attach logger to `req.logger`
5. **Controllers/Services**: Use `req.logger` for all logging
6. **Response**: All logs include same `requestId` for easy tracing

### Example: Tracing a Request

**Development logs (pretty-printed):**

```code
[14:23:45.123] INFO: Incoming request
    requestId: "a1b2c3d4-5678-90ab-cdef-123456789abc"
    method: "POST"
    path: "/api/otp/generate"

[14:23:45.456] INFO: OTP generated
    requestId: "a1b2c3d4-5678-90ab-cdef-123456789abc"
    email: "u***@example.com"
    expiresIn: "10m"

[14:23:45.789] INFO: Outgoing response
    requestId: "a1b2c3d4-5678-90ab-cdef-123456789abc"
    statusCode: 200
    duration: "666ms"
```

**Production logs (JSON):**

```json
{"level":30,"time":1709308800000,"requestId":"a1b2c3d4-5678-90ab-cdef-123456789abc","method":"POST","path":"/api/otp/generate","msg":"Incoming request"}
{"level":30,"time":1709308800456,"requestId":"a1b2c3d4-5678-90ab-cdef-123456789abc","email":"u***@example.com","expiresIn":"10m","msg":"OTP generated"}
{"level":30,"time":1709308800789,"requestId":"a1b2c3d4-5678-90ab-cdef-123456789abc","statusCode":200,"duration":"666ms","msg":"Outgoing response"}
```

### Data Sanitization

Sensitive fields are automatically masked:

- **Email**: `test@example.com` → `t***@example.com`
- **OTP/Code/Password**: `123456` → `[REDACTED]`

### Viewing Logs

**In Docker/Kubernetes:**

```bash
# View container logs
docker logs <container-id>

# Follow logs in real-time
kubectl logs -f <pod-name>
```

**Search logs by Request ID:**

```bash
# JSON logs (production)
cat logs.json | grep "a1b2c3d4-5678-90ab-cdef-123456789abc"

# With jq for better formatting
cat logs.json | jq 'select(.requestId == "a1b2c3d4-5678-90ab-cdef-123456789abc")'
```

### Architecture

```code
Client Request
    ↓
Next.js API Route (generates X-Request-ID)
    ↓ [Forward with X-Request-ID header]
Express Server
    ↓ [Middleware extracts/generates ID]
Request Logger Middleware (attaches req.logger)
    ↓
Router → Controller → Service
    ↓ [All use req.logger with requestId context]
Response (logged with duration, status)
```

All logs from the same request share the same `requestId`, making it easy to trace a request through the entire system.

## Scripts

| Command                        | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `npm run dev`                  | Start both frontend and backend in development mode      |
| `npm run dev:server`           | Start only the Express API server                        |
| `npm run dev:client`           | Start only the Next.js frontend                          |
| `npm run build`                | Production build (runs `prisma generate` + `next build`) |
| `npm run start`                | Start production server locally                          |
| `npm run lint`                 | Run ESLint                                               |
| `npm test`                     | Unified test runner: build → unit tests → E2E tests      |
| `npm run test:unit`            | Run Vitest unit/integration tests once                   |
| `npm run test:unit:watch`      | Run Vitest in watch mode                                 |
| `npm run test:unit:coverage`   | Run unit tests with coverage report                      |
| `npm run test:unit:ui`         | Vitest interactive UI mode                               |
| `npm run test:e2e`             | Build then run all Playwright E2E tests                  |
| `npm run test:e2e:ui`          | Run E2E tests with Playwright interactive UI             |
| `npm run test:e2e:headed`      | Run E2E tests with visible browser                       |
| `npm run test:e2e:debug`       | Debug E2E tests step-by-step                             |
| `npm run test:all`             | Run unit tests then E2E tests sequentially               |
| `npm run test:all:parallel`    | Run unit and E2E tests in parallel                       |
| `npm run test:ci`              | CI mode: unit coverage + E2E                             |

## API Documentation

The API uses [tsoa](https://tsoa-community.github.io/docs/) for type-safe routing and auto-generated OpenAPI specification.

### Swagger UI

Visit `http://localhost:3001/api-docs` to explore the API interactively.

> Swagger UI is only served when `API_DOCS_ENABLED=true` is set. The default `.env.example` enables it for local development.

### Adding Endpoints

See [docs/API.md](docs/API.md) for a detailed guide on adding new endpoints.

### Regenerating Routes

Routes are auto-generated from controller decorators:

```bash
npm run tsoa:build
```

This creates:
- `src/generated/routes.ts` — Route registration
- `src/generated/swagger.json` — OpenAPI 3.0 spec

---

## API Endpoints

All endpoints are served by the Express backend at port 3001. Next.js API routes in `src/app/api/` proxy to them transparently.

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | Fetch all tasks assigned to the authenticated user |
| `POST` | `/api/tasks` | Create a new user-defined task |
| `GET` | `/api/tasks/:id` | Fetch a single task by ID |
| `PATCH` | `/api/tasks/:id/status` | Update task status, due date, or personal notes |
| `GET` | `/api/tasks/personalized` | Re-sync and return tasks matched to the user's profile |

### Auth & Profile

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/session` | Verify session and return current user |
| `GET` | `/api/auth/profile` | Fetch the authenticated user's full profile |
| `PATCH` | `/api/auth/profile` | Update name and profile fields (re-syncs task assignments) |
| `DELETE` | `/api/auth/profile` | Delete account and all associated data |
| `POST` | `/api/auth/logout` | Invalidate the current session |

### OTP (Authentication)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/otp/generate` | Generate a 6-digit OTP and send it to the provided email |
| `POST` | `/api/otp/verify` | Verify OTP and create an authenticated session |

### Onboarding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/onboarding/tasks` | Preview tasks relevant to a given profile (pre-auth) |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | API health check — returns `{"ok":true}` |

See [Unit Test Documentation](src/__tests__/README.md) for detailed endpoint documentation.

See [E2E Test Documentation](e2e/README.md) for browser-level workflow tests.

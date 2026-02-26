# Hello Norway

A Next.js application with Express API backend, helping newcomers navigate essential tasks when moving to Norway.

## Stack

### Frontend
- **[Next.js 16](https://nextjs.org/)** — App Router, Server Components, file-based routing
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS with dark mode
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety throughout
- **[ESLint](https://eslint.org/)** — Code linting via `eslint-config-next`

### Backend
- **[Express](https://expressjs.com/)** — Fast, minimalist web framework
- **[Prisma](https://www.prisma.io/)** — Type-safe ORM with PostgreSQL
- **[Vitest](https://vitest.dev/)** — Fast unit testing with TypeScript support
- **[Supertest](https://github.com/ladjs/supertest)** — HTTP assertion library for API testing

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
- **Backend (Express API)**: [http://localhost:3000/api](http://localhost:3000/api) (or separate port if configured)

## Project Structure

```
src/
  app/                      # Next.js frontend
    layout.tsx              # Root layout with metadata and fonts
    page.tsx                # Home page
    globals.css             # Global styles (Tailwind directives)

  # Express API Backend
  server.ts                 # API server entry point
  app.ts                    # Express app configuration
  routes/                   # API route definitions
    taskRoutes.ts           # Task CRUD routes
  controllers/              # Business logic
    taskController.ts       # Task operations
  utils/                    # Shared utilities
    errorHandler.ts         # Centralized error handling
  lib/                      # Libraries and clients
    prisma.ts               # Prisma client instance
  __tests__/                # Test files
    tasks.test.ts           # Task API tests
    setup.ts                # Test configuration
    README.md               # Testing documentation

prisma/
  schema.prisma             # Database schema
  migrations/               # Migration history
  seed.ts                   # Database seed data

public/                     # Static assets
vitest.config.ts            # Test configuration
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL used for Open Graph metadata | `https://your-domain.com` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/myapp` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:server` | Start only the Express API server |
| `npm run dev:client` | Start only the Next.js frontend |
| `npm run build` | Production build |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |

## API Endpoints

### Tasks
- `GET /tasks` - Fetch all tasks (ordered by category and sortOrder)
- `POST /tasks` - Create a new task
- `PATCH /tasks/:id` - Update an existing task
- `DELETE /tasks/:id` - Delete a task

### Health
- `GET /health` - API health check

See [API Tests](src/__tests__/README.md) for detailed endpoint documentation and examples.

## Testing

We use **Vitest** with **Supertest** for comprehensive API testing.

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run with verbose output
npx vitest run --reporter=verbose
```

**Test Coverage:**
- ✅ 13 test cases covering all CRUD operations
- ✅ Happy path scenarios (create, read, update, delete)
- ✅ Error handling (missing fields, duplicates, not found)
- ✅ Data validation and integrity checks

See [Test Documentation](src/__tests__/README.md) for more details.

## Database

### Migrations

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <migration-name>` locally
3. Commit `prisma/migrations/` and `prisma/schema.prisma`
4. On deploy, run `prisma migrate deploy`

### Seeding

```bash
# Seed the database with sample data
npx prisma db seed
```

The seed file (`prisma/seed.ts`) contains sample tasks for testing and development.

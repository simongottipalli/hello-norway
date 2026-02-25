# Hello Norway

A Next.js boilerplate with App Router, Tailwind CSS v4, TypeScript, and ESLint.

## Stack

- **[Next.js 16](https://nextjs.org/)** — App Router, Server Components, file-based routing
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS with dark mode
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety throughout
- **[ESLint](https://eslint.org/)** — Code linting via `eslint-config-next`

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
  app/
    layout.tsx      # Root layout with metadata and fonts
    page.tsx        # Home page
    globals.css     # Global styles (Tailwind directives)
public/             # Static assets
.env.example        # Environment variable template
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL used for Open Graph metadata | `https://your-domain.com` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |

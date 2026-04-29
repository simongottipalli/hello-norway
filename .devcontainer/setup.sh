#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "▶ Loading environment from .env.test..."
set -a
. "$REPO_ROOT/.env.test"
set +a

echo "▶ Installing dependencies..."
npm ci --ignore-scripts

echo "▶ Generating Prisma client..."
npx prisma generate

echo "▶ Starting PostgreSQL..."
docker compose -f docker-compose.test.yml up -d

echo "▶ Waiting for PostgreSQL to be ready..."
timeout 30 bash -c \
  'until docker compose -f docker-compose.test.yml exec -T postgres pg_isready -U postgres; do sleep 1; done'

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Seeding database..."
npx prisma db seed

echo "✓ Environment ready. Run 'npm run test:unit' to verify."

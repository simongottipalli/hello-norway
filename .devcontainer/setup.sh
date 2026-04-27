#!/usr/bin/env bash
set -euo pipefail

echo "▶ Installing dependencies..."
npm ci

echo "▶ Starting PostgreSQL..."
docker compose -f docker-compose.test.yml up -d

echo "▶ Waiting for PostgreSQL to be ready..."
timeout 30 bash -c \
  'until docker compose -f docker-compose.test.yml exec -T postgres pg_isready -U postgres; do sleep 1; done'

echo "▶ Running database migrations..."
npx prisma migrate deploy

echo "▶ Seeding database..."
npx prisma db seed || echo "[warn] Seed failed — continuing anyway"

echo "✓ Environment ready. Run 'npm run test:unit' to verify."

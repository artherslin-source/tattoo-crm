#!/usr/bin/env bash
set -e

echo "→ Running Prisma migrate deploy..."
npx prisma migrate deploy

if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
  echo "→ Running Prisma seed..."
  npm run prisma:seed || echo "Seed script skipped or failed (non-blocking)."
fi

echo "→ Starting server..."

# NestJS
if [ -f "dist/main.js" ]; then
  node dist/main.js
else
  # fallback 開發型態
  npm run start:prod || npm run start
fi


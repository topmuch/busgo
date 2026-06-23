#!/bin/sh
set -e

echo ">>> Bus Go — Starting..."

# Run Prisma migrations / push on first start
if [ -n "$DATABASE_URL" ]; then
  echo ">>> Running Prisma db push..."
  npx prisma db push --skip-generate 2>/dev/null || \
  bunx prisma db push --skip-generate 2>/dev/null || \
  echo ">>> Warning: Prisma db push failed, trying to continue..."
  echo ">>> Prisma done."
else
  echo ">>> Warning: DATABASE_URL not set, skipping Prisma."
fi

# Start the app
echo ">>> Starting Next.js server on port ${PORT:-3000}..."
exec bun server.js
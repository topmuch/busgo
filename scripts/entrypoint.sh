#!/bin/sh
set -e
mkdir -p /app/db
DATABASE_URL="file:/app/db/custom.db" npx prisma db push --skip-generate 2>/dev/null || true
node /app/scripts/seed-superadmin.cjs 2>/dev/null || true
exec node server.js
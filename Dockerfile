# ─── Bus Go — Coolify Dockerfile ───
# Multi-stage build pour Next.js 16 standalone + Prisma + SQLite

# ── Stage 1: Dependencies ──
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* package-lock.json* ./
RUN bun install --frozen-lockfile --production=false

# ── Stage 2: Build ──
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build Next.js (standalone output)
RUN bun run build

# ── Stage 3: Production ──
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install sqlite3 for prisma db push at runtime
RUN apk add --no-cache sqlite

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static assets (public + .next/static)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema + engine for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

# Copy entrypoint
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Ensure db directory exists for SQLite
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
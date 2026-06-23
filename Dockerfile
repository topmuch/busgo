# ====== STAGE 1: Build ======
FROM node:20-alpine AS builder

RUN apk add --no-cache git libc6-compat sqlite vips-dev build-base python3

WORKDIR /app
RUN git clone https://github.com/topmuch/busgo.git .

RUN npm install
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV DATABASE_URL="file:/app/db/custom.db"

RUN npx next build
RUN cp -r .next/static .next/standalone/.next/
RUN cp -r public .next/standalone/

RUN mkdir -p /app/.next/standalone/scripts
COPY scripts/seed-superadmin.cjs /app/.next/standalone/scripts/
RUN cp -r node_modules/.prisma /app/.next/standalone/node_modules/.prisma
RUN cp -r node_modules/@prisma /app/.next/standalone/node_modules/@prisma
RUN cp -r node_modules/bcryptjs /app/.next/standalone/node_modules/bcryptjs
RUN cp -r node_modules/jose /app/.next/standalone/node_modules/jose
RUN cp -r node_modules/next-auth /app/.next/standalone/node_modules/next-auth

# ====== STAGE 2: Production (minimal) ======
FROM node:20-alpine

RUN apk add --no-cache sqlite

WORKDIR /app
COPY --from=builder /app/.next/standalone ./
RUN mkdir -p /app/db

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/db/custom.db"
ENV NODE_ENV="production"

COPY scripts/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
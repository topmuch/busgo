# Bus Go - Dockerfile for Coolify
FROM node:20-alpine

# Install required packages (vips for sharp, sqlite for prisma)
RUN apk add --no-cache git libc6-compat sqlite vips-dev build-base python3

WORKDIR /app

# Clone the repository
RUN git clone https://github.com/topmuch/busgo.git .

# Install dependencies
RUN npm install -g bun
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV DATABASE_URL="file:/app/db/custom.db"

RUN npx next build
RUN cp -r .next/static .next/standalone/.next/
RUN cp -r public .next/standalone/

# Copy seed script + needed modules into standalone
RUN mkdir -p /app/.next/standalone/scripts
COPY scripts/seed-superadmin.cjs /app/.next/standalone/scripts/
RUN cp -r node_modules/.prisma /app/.next/standalone/node_modules/.prisma
RUN cp -r node_modules/@prisma /app/.next/standalone/node_modules/@prisma
RUN cp -r node_modules/bcryptjs /app/.next/standalone/node_modules/bcryptjs

# Create data directory
RUN mkdir -p /app/db

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/db/custom.db"

# Start command - init DB, seed superadmin if empty, start server
CMD ["sh", "-c", "mkdir -p /app/db && DATABASE_URL=file:/app/db/custom.db npx prisma db push --skip-generate 2>/dev/null || true && node /app/scripts/seed-superadmin.cjs 2>/dev/null || true && exec node .next/standalone/server.js"]
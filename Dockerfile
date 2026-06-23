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
ENV DATABASE_URL=file:/app/db/custom.db
RUN bun run build

# Create data directory
RUN mkdir -p /app/db

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/db/custom.db

# Start command - init DB and start server
CMD ["sh", "-c", "mkdir -p /app/db && export DATABASE_URL=file:/app/db/custom.db && npx prisma db push --skip-generate 2>/dev/null || true && exec node .next/standalone/server.js"]
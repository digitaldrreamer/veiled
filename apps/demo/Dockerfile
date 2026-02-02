# * Multi-stage Dockerfile for Next.js demo app
# * Handles monorepo workspace dependencies using bun

# * Stage 1: Base with bun
FROM oven/bun:1-alpine AS base
WORKDIR /app

# * Copy workspace configuration files
COPY package.json bun.lock* ./
COPY apps/demo/package.json ./apps/demo/
COPY packages/core/package.json ./packages/core/

# * Stage 2: Install dependencies
FROM base AS deps
# * Install build dependencies for native modules (including linux-headers for usb)
RUN apk add --no-cache python3 make g++ linux-headers

# * Remove lockfile to ensure overrides are applied fresh
RUN rm -f bun.lock

# * Install all workspace dependencies (skip optional to avoid native module issues)
RUN bun install --no-optional || bun install

# * Stage 3: Build workspace dependency (@veiled/core)
FROM deps AS build-core
# * Copy anchor package (needed by core for types)
COPY packages/anchor ./packages/anchor

# * Copy core package
COPY packages/core ./packages/core
WORKDIR /app/packages/core

# * Build core package
# * Use skipLibCheck to avoid issues with missing type definitions
RUN bun run build:types --skipLibCheck 2>/dev/null || true && \
    bun run build:bundle

# * Stage 4: Build Next.js app
FROM deps AS build-app
# * Copy built core package
COPY --from=build-core /app/packages/core/dist ./packages/core/dist
COPY --from=build-core /app/packages/core/package.json ./packages/core/package.json

# * Copy app source and config files
COPY apps/demo/app ./apps/demo/app
COPY apps/demo/components ./apps/demo/components
COPY apps/demo/lib ./apps/demo/lib
COPY apps/demo/hooks ./apps/demo/hooks
COPY apps/demo/public ./apps/demo/public
COPY apps/demo/next.config.mjs ./apps/demo/
COPY apps/demo/tsconfig.json ./apps/demo/
COPY apps/demo/postcss.config.mjs ./apps/demo/
COPY apps/demo/components.json ./apps/demo/
COPY apps/demo/package.json ./apps/demo/

WORKDIR /app/apps/demo

# * Build Next.js app with standalone output
RUN bun run build

# * Stage 5: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# * Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# * Copy standalone output (monorepo structure: apps/demo/server.js)
COPY --from=build-app /app/apps/demo/.next/standalone ./

# * Copy static files to the correct location within the monorepo structure
COPY --from=build-app /app/apps/demo/.next/static ./apps/demo/.next/static

# * Copy public files
COPY --from=build-app /app/apps/demo/public ./apps/demo/public

# * Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# * Run from the monorepo app location
CMD ["node", "apps/demo/server.js"]

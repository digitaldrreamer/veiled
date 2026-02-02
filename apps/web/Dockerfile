## * Multi-stage Dockerfile for SvelteKit web app
## * Uses bun for workspace dependency management in the monorepo

## * Stage 1: Base with bun
FROM oven/bun:1-alpine AS base
WORKDIR /app

## * Copy workspace configuration files
COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/
COPY packages/core/package.json ./packages/core/

## * Stage 2: Install dependencies
FROM base AS deps
## * Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ linux-headers

## * Remove lockfile to ensure overrides are applied fresh
RUN rm -f bun.lock

## * Install all workspace dependencies (skip optional to avoid native module issues)
RUN bun install --no-optional || bun install

## * Stage 3: Build workspace dependency (@veiled/core)
FROM deps AS build-core
## * Copy anchor package (needed by core for types)
COPY packages/anchor ./packages/anchor

## * Copy core package
COPY packages/core ./packages/core
WORKDIR /app/packages/core

## * Build core package
## * Uses skipLibCheck to avoid issues with missing type definitions
RUN bun run build:types --skipLibCheck 2>/dev/null || true && \
    bun run build:bundle

## * Stage 4: Build SvelteKit app
FROM deps AS build-app
## * Copy built core package
COPY --from=build-core /app/packages/core/dist ./packages/core/dist
COPY --from=build-core /app/packages/core/package.json ./packages/core/package.json

## * Copy app source and config files
COPY apps/web/src ./apps/web/src
COPY apps/web/static ./apps/web/static
COPY apps/web/svelte.config.js ./apps/web/
COPY apps/web/vite.config.ts ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY apps/web/eslint.config.js ./apps/web/
COPY apps/web/playwright.config.ts ./apps/web/
COPY apps/web/package.json ./apps/web/

WORKDIR /app/apps/web

## * Build SvelteKit app (adapter-node -> Node server in build/)
RUN bun run build

## * Stage 5: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

## * Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 sveltekit

## * Copy server build output and required files
COPY --from=build-app /app/apps/web/build ./apps/web/build
COPY --from=build-app /app/package.json ./package.json
COPY --from=build-app /app/apps/web/package.json ./apps/web/package.json
COPY --from=deps /app/node_modules ./node_modules

## * Set correct permissions
RUN chown -R sveltekit:nodejs /app

USER sveltekit

EXPOSE 4173

ENV PORT=4173
ENV HOSTNAME="0.0.0.0"

## * Run SvelteKit Node adapter server
CMD ["node", "apps/web/build/index.js"]


# Build context: monorepo root
# Railway service: apps/api

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

# ── Install all workspace deps from root ──────────────────────────
FROM base AS deps
WORKDIR /app

# Copy only manifest files first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json          ./packages/types/package.json
COPY apps/api/package.json                ./apps/api/package.json

RUN pnpm install --frozen-lockfile

# ── Build the API ─────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source
COPY tsconfig.base.json                     ./tsconfig.base.json
COPY packages/types/                        ./packages/types/
COPY apps/api/                              ./apps/api/

RUN pnpm --filter @acemate/api build

# ── Production image ──────────────────────────────────────────────
FROM node:22-alpine AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Install production deps only
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json          ./packages/types/package.json
COPY apps/api/package.json                ./apps/api/package.json

RUN pnpm install --frozen-lockfile --prod

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist    ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/index.js"]

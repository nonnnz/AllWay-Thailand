# ── Stage 1: Install dependencies ──────────────────────────────────────────────
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy manifests first for better layer caching
COPY apps/api/package.json apps/api/bun.lock* ./

RUN bun install --frozen-lockfile

# ── Stage 2: Generate Prisma client ────────────────────────────────────────────
FROM deps AS prisma

COPY apps/api/prisma ./prisma

RUN bunx prisma generate

# ── Stage 3: Production image ───────────────────────────────────────────────────
FROM oven/bun:1 AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy installed node_modules (includes generated Prisma client)
COPY --from=prisma /app/node_modules ./node_modules

# Copy source
COPY apps/api/src ./src
COPY apps/api/prisma ./prisma
COPY apps/api/package.json ./

EXPOSE 3001

CMD ["bun", "src/index.ts"]

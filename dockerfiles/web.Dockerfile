FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY apps/web/package.json apps/web/bun.lock* ./

RUN bun install --frozen-lockfile

# Copy source
COPY apps/web/ .

# Build production bundle
# VITE_API_URL is baked in at build time; pass it via --build-arg / docker-compose args
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=${VITE_API_URL}

RUN bun run build

# ── Stage 2: Serve with nginx ───────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: redirect all 404s back to index.html
COPY dockerfiles/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Install all dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Build: Vite frontend + esbuild server bundle
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Vite frontend
RUN npm run build

# Bundle Express server (all TS source compiled to dist/server.js)
RUN npm run build:server

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – Production image (lean, no source files)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser  --system --uid 1001 --ingroup appgroup appuser

# Install production-only deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts && npx prisma generate

# Copy compiled outputs
COPY --from=builder /app/dist           ./dist
COPY --from=builder /app/prisma         ./prisma

# Require the canonical JSON liveness response; reject SPA HTML fallbacks.
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD node -e 'fetch("http://127.0.0.1:"+process.env.PORT+"/api/healthz/live",{signal:AbortSignal.timeout(5000)}).then(async r=>{if(!r.ok||!r.headers.get("content-type")?.includes("application/json")||(await r.json()).status!=="ok")process.exit(1)}).catch(()=>process.exit(1))'

USER appuser
EXPOSE 3000

CMD ["node", "dist/server.js"]

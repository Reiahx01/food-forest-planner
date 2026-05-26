# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the Next.js app. Produces a slim runtime image
# (~150 MB) using Next.js's standalone output mode (configured in
# `next.config.ts`).
#
# Build:
#   docker build -t food-forest-planner .
#
# Run (with a Supabase instance reachable from the container):
#   docker run --rm -p 3000:3000 \
#     -e NEXT_PUBLIC_SUPABASE_URL=... \
#     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     -e SUPABASE_SERVICE_ROLE_KEY=... \
#     -e DATABASE_URL=... \
#     food-forest-planner
#
# This image is the app only. Run the data plane separately via
# `npx supabase start` (local) or point at a hosted Supabase project.

ARG NODE_VERSION=22

# --- base ---------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
# `libc6-compat` is needed by some npm deps (notably `sharp`) on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- deps ---------------------------------------------------------------
FROM base AS deps
# Cache npm install on package*.json changes only. BuildKit caches the npm
# store across builds so warm rebuilds are fast.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# --- builder ------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner -------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as an unprivileged user. Matches the Next.js docs' recommended UID/GID
# (1001) so volume mounts behave predictably across environments.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# `.next/standalone` includes the minimal `node_modules` and a `server.js`
# launcher. The `static` and `public` dirs are not bundled by standalone --
# they must be copied alongside so the runtime can serve them.
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

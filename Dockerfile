# Multi-stage Dockerfile for Next.js 16 (Apex GitHub-RAG)

# Step 1: Dependencies
FROM node:22-alpine AS deps
RUN apk update && apk upgrade --no-cache && apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm install --ignore-scripts

# Step 2: Builder
FROM node:22-alpine AS builder
RUN apk update && apk upgrade --no-cache && apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://postgres:password@db:5432/github-rag"

RUN npx prisma generate
RUN npx next build

# Step 3: Runner
FROM node:22-alpine AS runner
RUN apk update && apk upgrade --no-cache && apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public static files
COPY --from=builder /app/public ./public

# Set right permissions for Next.js cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build and static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema & generated client for runtime DB push / migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

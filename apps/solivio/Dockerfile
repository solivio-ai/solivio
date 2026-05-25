# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable

COPY .yarnrc.yml package.json yarn.lock ./
COPY .yarn/releases ./.yarn/releases
COPY apps/solivio/package.json ./apps/solivio/
COPY apps/docs/package.json ./apps/docs/
COPY packages/domain/package.json ./packages/domain/
COPY packages/theme/package.json ./packages/theme/
COPY sdk/package.json ./sdk/
COPY modules ./modules

RUN yarn install --immutable

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.yarnrc.yml ./

COPY package.json yarn.lock tsconfig.base.json solivio.config.json ./
COPY solivio-logo.png solivio-logo-dark.png favicon.png ./
COPY packages ./packages
COPY sdk ./sdk
COPY modules ./modules
COPY apps/solivio ./apps/solivio

RUN mkdir -p apps/solivio/public \
 && cp -RL apps/solivio/public apps/solivio/public.deref \
 && rm -rf apps/solivio/public \
 && mv apps/solivio/public.deref apps/solivio/public \
 && yarn sdk:build \
 && yarn workspaces foreach -A --include '@solivio/module-*' run build \
 && yarn workspace @solivio/app build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/solivio/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/solivio/.next/static ./apps/solivio/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/solivio/public ./apps/solivio/public
COPY --from=build --chown=nextjs:nodejs /app/apps/solivio/drizzle ./apps/solivio/drizzle
COPY --from=build --chown=nextjs:nodejs /app/apps/solivio/scripts/migrate.mjs ./apps/solivio/scripts/migrate.mjs
COPY --from=build --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=nextjs:nodejs /app/solivio.config.json ./solivio.config.json
COPY --from=build --chown=nextjs:nodejs /app/sdk/dist ./node_modules/@solivio/sdk/dist
COPY --from=build --chown=nextjs:nodejs /app/sdk/package.json ./node_modules/@solivio/sdk/package.json
COPY --from=build --chown=nextjs:nodejs /app/modules/csv-products-importer/dist ./node_modules/@solivio/module-csv-products/dist
COPY --from=build --chown=nextjs:nodejs /app/modules/csv-products-importer/package.json ./node_modules/@solivio/module-csv-products/package.json

USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "cd apps/solivio && node scripts/migrate.mjs && cd /app && exec node apps/solivio/server.js"]

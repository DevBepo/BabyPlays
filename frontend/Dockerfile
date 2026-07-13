FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_BABYPLAYS_WHATSAPP
ARG NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL
ARG FRONTEND_HSTS_SECONDS
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_BABYPLAYS_WHATSAPP=${NEXT_PUBLIC_BABYPLAYS_WHATSAPP}
ENV NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL=${NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL}
ENV FRONTEND_HSTS_SECONDS=${FRONTEND_HSTS_SECONDS}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]

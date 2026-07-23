# PREBUILT=1 → CI/local already ran `next build` (copy .next; skip compile on VPS).
# PREBUILT=0 → npm ci + next build here (optionally with STORY_DATABASE_URL for ISR bake).
FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_READER_WS_URL=
ARG STORY_DATABASE_URL=
ARG PREBUILT=0
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_READER_WS_URL=$NEXT_PUBLIC_READER_WS_URL \
    STORY_DATABASE_URL=$STORY_DATABASE_URL
COPY package.json package-lock.json ./
COPY . .
RUN if [ "$PREBUILT" = "1" ]; then \
      test -f .next/BUILD_ID || { echo "PREBUILT=1 but .next/BUILD_ID missing" >&2; exit 1; }; \
      echo "[builder] using prebuilt .next ($(cat .next/BUILD_ID))"; \
    else \
      npm ci && npx next build; \
    fi

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "run", "start:ws"]

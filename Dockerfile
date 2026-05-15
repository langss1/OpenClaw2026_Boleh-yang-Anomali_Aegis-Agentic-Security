# syntax=docker/dockerfile:1.6

# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ---------- Runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

RUN addgroup -S aegis && adduser -S aegis -G aegis \
 && apk add --no-cache curl tini

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=aegis:aegis . .

RUN mkdir -p logs server/subscription/data \
 && chown -R aegis:aegis logs server/subscription/data

USER aegis
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/index.js"]

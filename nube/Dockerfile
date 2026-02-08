FROM node:20.11-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:20.11-slim AS runtime
WORKDIR /app

# Non-root user
RUN addgroup --system app && adduser --system --ingroup app app

COPY package*.json ./
RUN npm ci --omit=dev && chown -R app:app /app

COPY --from=builder --chown=app:app /app/dist ./dist

USER app

ENV NODE_ENV=production PORT=3000 TRANSPORT=http INFRA_MODE=gcp
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]

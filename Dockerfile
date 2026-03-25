FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY server.ts ./
COPY src/lib/ ./src/lib/
COPY src/types/ ./src/types/
COPY tsconfig.json ./
COPY next.config.ts ./

RUN mkdir -p /app/data

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["npx", "tsx", "server.ts"]

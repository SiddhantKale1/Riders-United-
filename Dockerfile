FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=5001
ENV DATABASE_PATH=/data/riders_united.db

WORKDIR /app
COPY --from=build --chown=node:node /app/backend/package.json ./backend/package.json
COPY --from=build --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node backend/server.js backend/database.js ./backend/
COPY --from=build --chown=node:node /app/frontend/dist ./frontend/dist

RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 5001
CMD ["node", "backend/server.js"]

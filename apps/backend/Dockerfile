FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json apps/backend/
RUN npm install

FROM deps AS build
COPY apps/backend apps/backend
COPY docs docs
RUN npm run build -w apps/backend

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/apps/backend/prisma apps/backend/prisma
COPY --from=build /app/docs docs
CMD ["node", "apps/backend/dist/server.js"]

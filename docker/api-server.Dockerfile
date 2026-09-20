# NestJS API image. Bind 0.0.0.0:$PORT. Run migrations before listen.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api-server/package.json apps/api-server/
COPY packages/database/package.json packages/database/
COPY packages/shared-types/package.json packages/shared-types/
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api-server apps/api-server
COPY packages/database packages/database
COPY packages/shared-types packages/shared-types
# prisma generate reads DATABASE_URL from the schema env() — dummy is fine at build.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
RUN npm run build -w @volleyball-manager/shared-types \
  && npm run generate -w @volleyball-manager/database \
  && npm run build -w @volleyball-manager/api-server

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api-server ./apps/api-server
COPY --from=build /app/packages/database ./packages/database
COPY --from=build /app/packages/shared-types ./packages/shared-types
USER app
EXPOSE 4010
ENV PORT=4010
CMD ["sh", "-c", "npm run migrate -w @volleyball-manager/database && npm run seed -w @volleyball-manager/database && node apps/api-server/dist/main.js"]

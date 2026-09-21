# Next.js web image. Bind 0.0.0.0:$PORT. NEXT_PUBLIC_* is baked at build.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web-client/package.json apps/web-client/
COPY packages/shared-types/package.json packages/shared-types/
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web-client apps/web-client
COPY packages/shared-types packages/shared-types
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build -w @volleyball-manager/shared-types \
  && npm run build -w @volleyball-manager/web-client

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web-client ./apps/web-client
COPY --from=build /app/packages/shared-types ./packages/shared-types
USER app
EXPOSE 3010
ENV PORT=3010
CMD ["sh", "-c", "npm run start -w @volleyball-manager/web-client"]

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# Full install, not --omit=dev: migration:run needs ts-node + the TypeORM CLI
# against the TS migration sources (see data-source.ts), which this image
# also carries so `docker compose run --rm api npm run migration:run` works
# against exactly the code being deployed.
RUN npm ci
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
EXPOSE 3000
CMD ["node", "dist/main.js"]

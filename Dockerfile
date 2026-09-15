# 1. Imagen base
FROM node:22.17.1-alpine3.22 AS base
RUN apk update && apk add --no-cache openssl dumb-init
WORKDIR /home/node/app

# 2. Dependencias de producción
FROM base AS prod-deps
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev

# 3. Compilación de la aplicación NestJS
FROM base AS build
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install
COPY . .
RUN npm run build

# 4. Etapa final de producción y pruebas
FROM base AS release
COPY --from=build --chown=node:node /home/node/app/node_modules /home/node/app/node_modules
COPY --from=build --chown=node:node /home/node/app/dist          /home/node/app/dist
COPY --from=build --chown=node:node /home/node/app/src           /home/node/app/src
COPY --from=build --chown=node:node /home/node/app/test          /home/node/app/test
COPY --from=build --chown=node:node /home/node/app/package.json    /home/node/app/package.json
COPY --from=build --chown=node:node /home/node/app/tsconfig*.json /home/node/app/

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main"]
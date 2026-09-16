
FROM node:22.17.1-alpine3.22 AS base
RUN apk update && apk add --no-cache openssl dumb-init
WORKDIR /home/node/app


FROM base AS prod-deps
COPY --chown=node:node package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev

FROM base AS build
COPY --chown=node:node package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install
COPY --chown=node:node . .
RUN npm run build

FROM base AS release
COPY --from=build --chown=node:node /home/node/app/node_modules /home/node/app/node_modules
COPY --from=build --chown=node:node /home/node/app/dist          /home/node/app/dist
COPY --from=build --chown=node:node /home/node/app/src           /home/node/app/src
COPY --from=build --chown=node:node /home/node/app/test          /home/node/app/test
COPY --from=build --chown=node:node /home/node/app/package.json    /home/node/app/package.json
COPY --from=build --chown=node:node /home/node/app/tsconfig*.json /home/node/app/

RUN mkdir -p /home/node/app/coverage && chown -R node:node /home/node/app/coverage

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/main"]
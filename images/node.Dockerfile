FROM node:16.14.0-alpine3.14 AS only-package-json

USER node
WORKDIR /home/node

COPY --chown=node:node apps ./apps
COPY --chown=node:node libs ./libs
COPY --chown=node:node common ./common
COPY --chown=node:node rush.json ./rush.json

# Keep only package.json and project.json
RUN find libs ! -name "package.json" -type f | xargs rm
RUN find apps ! -name "package.json" -type f | xargs rm

FROM node:16.14.0-alpine3.14 AS build

RUN apk add g++ make py3-pip

USER node
WORKDIR /home/node

COPY --from=only-package-json --chown=node:node /home/node/ .

RUN node common/scripts/install-run-rush.js install

COPY --chown=node:node . ./

RUN node common/scripts/install-run-rush.js build
RUN node common/scripts/install-run-rush.js deploy

FROM node:16.14.0-alpine3.14 AS prod-deps

USER node
WORKDIR /home/node

COPY --from=build --chown=node:node /home/node/common/deploy .

  CMD [ "node", "/home/node/apps/node/dist/main.js" ]

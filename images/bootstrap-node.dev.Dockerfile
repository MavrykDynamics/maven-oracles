FROM node:16.14.0-alpine3.14

WORKDIR /home/node

COPY --chown=node:node . ./

RUN node common/scripts/install-run-rush.js install

WORKDIR /home/node/apps/bootstrap-node

CMD ["node", "/home/node/common/scripts/install-run-rushx.js", "start"]

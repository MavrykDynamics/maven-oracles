FROM node:20.19.3-alpine3.21

WORKDIR /home/node

COPY --chown=node:node . ./

RUN node common/scripts/install-run-rush.js install

WORKDIR /home/node/apps/bootstrap-node

CMD ["node", "/home/node/common/scripts/install-run-rushx.js", "start"]

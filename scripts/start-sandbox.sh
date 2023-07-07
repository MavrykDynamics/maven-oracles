#!/bin/bash

docker-compose -f docker-compose.yml up -d flextesa db api indexer gui

MAIN_SANDBOX_V="3e9dad7a"
APPLE_SANDBOX_V="3e9dad7a"
TZ_NODE_VERSION=$(docker exec -it mavryk-sandbox octez-node --version)
NODE_BOOTSTRAPPED=$(docker exec -it mavryk-sandbox octez-client bootstrapped)
until [[ "$TZ_NODE_VERSION" == *"$MAIN_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]] || [[ "$TZ_NODE_VERSION" == *"$APPLE_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]];
do
  echo "Waiting for Tezos Node to finish starting up......"
  sleep 10
  TZ_NODE_VERSION=$(docker exec -it mavryk-sandbox octez-node --version)
  NODE_BOOTSTRAPPED=$(docker exec -it mavryk-sandbox octez-client bootstrapped)

  if [[ "$TZ_NODE_VERSION" == *"$MAIN_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]] || [[ "$TZ_NODE_VERSION" == *"$APPLE_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]]; then
    echo "Tezos Node is ready"
    TZ_NODE_VERSION=$(docker exec -it mavryk-sandbox octez-node --version)
    echo "Flextesa Tezos Node version $TZ_NODE_VERSION"
    break
  fi
done

# Restart indexer container (needed sometimes)
docker restart mavryk-oracles-indexer-1

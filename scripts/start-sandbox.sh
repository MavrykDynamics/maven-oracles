#!/bin/bash

docker compose -f docker-compose.yml up -d flexmasa db api indexer gui signatory

MAIN_SANDBOX_V="e072107c"
APPLE_SANDBOX_V="e072107c"
MV_NODE_VERSION=$(docker exec -it maven-sandbox mavkit-node --version)
NODE_BOOTSTRAPPED=$(docker exec -it maven-sandbox mavkit-client bootstrapped)
until [[ "$MV_NODE_VERSION" == *"$MAIN_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]] || [[ "$MV_NODE_VERSION" == *"$APPLE_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]];
do
  echo "Waiting for Mavryk Node to finish starting up......"
  sleep 10
  MV_NODE_VERSION=$(docker exec -it maven-sandbox mavkit-node --version)
  NODE_BOOTSTRAPPED=$(docker exec -it maven-sandbox mavkit-client bootstrapped)

  if [[ "$MV_NODE_VERSION" == *"$MAIN_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]] || [[ "$MV_NODE_VERSION" == *"$APPLE_SANDBOX_V"* && "$NODE_BOOTSTRAPPED" == *"Node is bootstrapped."* ]]; then
    echo "Mavryk Node is ready"
    MV_NODE_VERSION=$(docker exec -it maven-sandbox mavkit-node --version)
    echo "Flexmasa Mavryk Node version $MV_NODE_VERSION"
    break
  fi
done

# Restart indexer container (needed sometimes)
docker restart maven-oracles-indexer-1

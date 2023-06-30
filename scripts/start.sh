#!/bin/bash

set -e
set -o pipefail

PRJT_ROOT="$( cd "$(dirname "$0")" >/dev/null 2>&1 || exit 1 ; pwd -P | grep -o '^.*/' )"


# Create env file if not exist
envExample=$PRJT_ROOT/.env.example
env=$PRJT_ROOT/.env
if [ ! -f "$env" ]
then
    cp "$envExample" "$env"
fi

# Start sandbox
bash ./scripts/start-sandbox.sh

# Deploy smart contracts
(cd $PRJT_ROOT/libs/contracts && rushx migrate)

# Start all oracles
docker-compose up -d --build

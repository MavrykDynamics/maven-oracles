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

# Start blockchain only
docker-compose up -d flextesa
sleep 10 # Wait for it to be up

# Deploy smart contracts
(cd $PRJT_ROOT/libs/contracts && rushx migrate)

# Start utilitary stack
docker-compose up -d elastic db api indexer metrics gui signatory
sleep 20

# Start all oracles
docker-compose up -d --build

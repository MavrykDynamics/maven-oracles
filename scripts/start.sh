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

docker-compose up -d flextesa
sleep 10

(cd $PRJT_ROOT/libs/contracts && rushx migrate)
docker-compose up -d elastic db api indexer metrics gui
sleep 20

docker-compose up -d --build

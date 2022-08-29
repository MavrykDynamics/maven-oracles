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

# load envs
if [ ! -f .env ] || export $(grep -v '^/' .env | xargs)
then
  export $(cat .env | xargs)
fi

echo "STEP 1"
docker-compose up -d --build bootstrap oracle-1 oracle-2 oracle-3 oracle-4 oracle-5
echo "waiting 3 min for oracles setup"
sleep 180

echo "Running integration_1 test"
cd apps/node

if node ../../common/scripts/install-run-rushx.js test:integration -t "step-1" -- integration_1.test.ts -factoryAddress=$AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS ; then
    echo "TEST RESULT: SUCCESS"
else
    echo "TEST RESULT: ERROR"
fi

echo "STEP 2"
docker-compose stop oracle-5
echo "waiting 4 min for oracles setup"
sleep 240

if node ../../common/scripts/install-run-rushx.js test:integration -t "step-2" -- integration_1.test.ts -factoryAddress=$AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS ; then
    echo "TEST RESULT: SUCCESS"
else
    echo "TEST RESULT: ERROR"
fi

echo "STEP 3"
docker-compose up -d oracle-5
echo "waiting 4 min for oracles setup"
sleep 240

if node ../../common/scripts/install-run-rushx.js test:integration -t "step-3" -- integration_1.test.ts -factoryAddress=$AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS ; then
    echo "TEST RESULT: SUCCESS"
else
    echo "TEST RESULT: ERROR"
fi

## STOP
/bin/bash $PRJT_ROOT/scripts/stop.sh

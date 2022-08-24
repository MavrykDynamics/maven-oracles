#!/bin/bash
set -e
set -o pipefail

PRJT_ROOT="$( cd "$(dirname "$0")" >/dev/null 2>&1 || exit 1 ; pwd -P | grep -o '^.*/' )"

# start
/bin/bash $PRJT_ROOT/scripts/start.sh

# waiting 3 min
echo "waiting 3 min for oracles setup"
sleep 180

. <(sed -n 's/^\([^#][^=]*\)=\(.*\)$/\1=${\1:-\2}/p' .env 2>/dev/null) || true
# load envs
if [ ! -f .env ] || export $(grep -v '^/' .env | xargs)
then
  export $(cat .env | xargs)
fi

echo "Running integration_1 test"
cd apps/node

if node ../../common/scripts/install-run-rushx.js test:integration -- integration_1.test.ts -factoryAddress=$AGGREGATOR_FACTORY_SMART_CONTRACT_ADDRESS ; then
    echo "TEST RESULT: SUCCESS"
else
    echo "TEST RESULT: ERROR"
fi

# stop
/bin/bash $PRJT_ROOT/scripts/stop.sh

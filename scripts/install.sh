#!/bin/bash

set -e
set -o pipefail

PRJT_ROOT="$( cd "$(dirname "$0")" >/dev/null 2>&1 || exit 1 ; pwd -P | grep -o '^.*/' )"

# Install rush if needed
if ! command -v rush > /dev/null 2>&1
then
    npm i -g rush
fi

rush update
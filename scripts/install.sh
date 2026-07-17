#!/bin/bash

set -e
set -o pipefail

PRJT_ROOT="$( cd "$(dirname "$0")" >/dev/null 2>&1 || exit 1 ; pwd -P | grep -o '^.*/' )"

# Install rush if needed, pinned to the version declared in rush.json
RUSH_VERSION="$(grep -o '"rushVersion"[[:space:]]*:[[:space:]]*"[^"]*"' "${PRJT_ROOT}rush.json" | grep -o '[0-9][0-9.]*')"

if ! command -v rush > /dev/null 2>&1 || [ "$(rush --version 2>/dev/null | grep -o "${RUSH_VERSION}")" != "${RUSH_VERSION}" ]
then
    npm i -g "@microsoft/rush@${RUSH_VERSION}"
fi

rush update

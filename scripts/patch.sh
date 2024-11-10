#!/usr/bin/env bash
set -euo pipefail

git fetch origin

if [[ "$(git rev-parse main)" == "$(git rev-parse origin/main)" ]]; then
  echo "No changes to patch."
  exit 0
fi

docker-compose stop

git pull || docker-compose up -d && echo "Patch failed to be applied."

docker-compose up --build -d
echo "Patch applied."

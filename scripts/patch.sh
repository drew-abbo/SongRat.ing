#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -ne 0 && "$#" -gt 1 ]]; then
  echo "Too many arguments."
  echo "Usage: $0 [--force]"
  exit 1
fi

if [[ "$#" -eq 1 && "$1" != "--force" ]]; then
  echo "Invalid argument: $1"
  echo "Usage: $0 [--force]"
fi

git fetch origin

if [[ "$#" -ne 1 && "$(git rev-parse main)" == "$(git rev-parse origin/main)" ]]; then
  echo "Branch already up to date, no changes being patched (use '--force' to override)."
  exit 0
fi

docker-compose stop

git pull || docker-compose up -d && echo "Patch failed to be applied ('git pull' failed)." && exit 1

docker-compose up --build -d
echo "Patch applied."

#!/usr/bin/env bash

cd "$(dirname "$0")/.."

if [[ "$#" -ne 0 && "$#" -gt 1 ]]; then
  echo "Too many arguments." >&2
  echo "Usage: $0 [--force]" >&2
  exit 1
fi
if [[ "$#" -eq 1 && "$1" != "--force" ]]; then
  echo "Invalid argument: $1" >&2
  echo "Usage: $0 [--force]" >&2
  exit 1
fi

# Start the app if it has yet to be started since the server's last reboot.
STARTUP_FLAG="/run/songrat-startup-flag"
if [[ ! -f "$STARTUP_FLAG" ]]; then
  touch "$STARTUP_FLAG"
  echo "$(date)" >&2
  echo "Startup flag missing, starting services..." >&2
  docker-compose up -d
fi

git fetch origin
if [[ ! $? ]]; then
  echo "$(date)" >&2
  echo "Failed to check for patch ('git fetch origin' failed)." >&2
  exit 1
fi

if [[ "$#" -ne 1 && "$(git rev-parse main)" == "$(git rev-parse origin/main)" ]]; then
  echo "Branch already up to date, no changes being patched (use '--force' to override)."
  exit 0
fi

docker-compose stop

git pull
if [[ ! $? ]]; then
  echo "$(date)" >&2
  echo "Failed to check install patch ('git pull' failed)." >&2
  docker-compose up -d
  exit 1
fi

docker-compose up --build -d
echo "Patch applied."

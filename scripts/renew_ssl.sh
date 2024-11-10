#!/usr/bin/env bash

if [[ "$EUID" -ne 0 ]]; then
  echo "This script must be run as root or with sudo."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# stop frontend (can't renew while port 80 is being used)
docker-compose stop frontend

# renew ssl
certbot renew

# restart frontend
docker-compose up -d frontend

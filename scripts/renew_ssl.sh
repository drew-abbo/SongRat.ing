#!/usr/bin/env bash

if [[ "$EUID" -ne 0 ]]; then
  echo "This script must be run as root or with sudo."
  exit 1
fi

cd "$(dirname "$0")" && cd ..

# stop frontend (can't renew while port 80 is being used)
docker-compose stop frontend

# renew ssl
certbot renew

# restart frontend
docker-compose up -d frontend

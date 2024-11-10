#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")" && cd ..

# set up .env file (if it doesn't exist)
if [[ ! -f ./.env ]]; then
  sudo echo "POSTGRES_USER=username" > ./.env
  sudo echo "POSTGRES_PASSWORD=password" >> ./.env
fi

# The frontend won't work without SSL so you'll need to generate a self signed
# key to work over `localhost` (goes in the same `letsencrypt` folder as the
# production keys, even though it doesn't have anthing to do with Let's
# Encrypt). Browser will still complain but at least it will work.
sudo rm -rf ./frontend/certificates
sudo mkdir -p ./frontend/certificates/live/songrat.ing
sudo openssl req -x509 -nodes -days 36500 -newkey rsa:2048 \
  -keyout ./frontend/certificates/live/songrat.ing/privkey.pem \
  -out ./frontend/certificates/live/songrat.ing/fullchain.pem \
  -subj "/CN=localhost"

#!/usr/bin/env bash
set -euo pipefail

docker-compose stop

git pull

docker-compose up --build -d

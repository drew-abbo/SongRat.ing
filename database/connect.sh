#!/usr/bin/env bash
set -euo pipefail

# setup env for database connection by reading '.env' file
cd "$(dirname "$0")"
export $(grep -v '^\s*#' ../.env | xargs)
export PGPASSWORD=$POSTGRES_PASSWORD
cd - > /dev/null

# open interactive shell
docker exec -it postgres psql -U "$POSTGRES_USER" -d song_rating_db

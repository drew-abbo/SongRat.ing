#!/usr/bin/env bash
set -euo pipefail

# setup env for database connection
cd "$(dirname "$0")" && source ./db_script_setup.sh && cd - > /dev/null

# open interactive shell
docker exec -it postgres psql -U "$POSTGRES_USER" -d song_rating_db

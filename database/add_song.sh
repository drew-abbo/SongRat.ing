#!/usr/bin/env bash
set -euo pipefail

# WARNING: This script does not validate against SQL injection

# setup env for database connection
cd "$(dirname "$0")" && source ./db_script_setup.sh && cd - > /dev/null

print_usage() {
    echo "Usage: $0 <song_id> <rater_player_id> <rating>" >&2
}

# validate argument count
if [[ $# -ne 3 ]]; then
    echo "Error: Invalid argument count: $#" >&2
    print_usage
    exit 1
fi

player_id=$1
title=$2
artist=$3

# validate player id
if [[ ! $player_id =~ ^[1-9][0-9]*$ ]]; then
    echo "Error: <player_id> must be a positive integer" >&2
    print_usage
    exit 1
fi

docker-compose exec postgres \
    psql -U $POSTGRES_USER -d song_rating_db -c \
        "INSERT INTO songs (player_id, title, artist)
        VALUES ($player_id, '$title', '$artist');"

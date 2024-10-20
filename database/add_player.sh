#!/usr/bin/env bash
set -euo pipefail

# WARNING: This script does not validate against SQL injection

# setup env for database connection
cd "$(dirname "$0")" && source ./db_script_setup.sh && cd - > /dev/null

print_usage() {
    echo "Usage: $0 <game_id> <player_name> [player_code] [playlist_link]" >&2
}

# validate argument count
if [[ $# -lt 2 || $# -gt 4 ]]; then
    echo "Error: Invalid argument count: $#" >&2
    print_usage
    exit 1
fi

game_id=$1
player_name=$2

# validate game id
if [[ ! $game_id =~ ^[1-9][0-9]*$ ]]; then
    echo "Error: <game_id> must be a positive integer" >&2
    print_usage
    exit 1
fi

if [[ $# -ge 3 ]]; then
    # validate given player code
    if [[ ! "$3" =~ ^P[a-zA-Z0-9]{15}$ ]]; then
        echo "Error: [player_code] format is invalid" >&2
        print_usage
        exit 1
    fi
    player_code=$3
else
    # generate master code
    player_code="P$(head /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 15)"
fi

if [[ $# -ge 4 ]]; then
    playlist_link=$4
    docker-compose exec postgres \
        psql -U $POSTGRES_USER -d song_rating_db -c \
            "INSERT INTO players (game_id, player_code, player_name, playlist_link)
            VALUES ($game_id, '$player_code', '$player_name', '$playlist_link');"
else
    docker-compose exec postgres \
        psql -U $POSTGRES_USER -d song_rating_db -c \
            "INSERT INTO players (game_id, player_code, player_name)
            VALUES ($game_id, '$player_code', '$player_name');"
fi

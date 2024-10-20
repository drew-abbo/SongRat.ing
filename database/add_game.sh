#!/usr/bin/env bash
set -euo pipefail

# WARNING: This script does not validate against SQL injection

# setup env for database connection
cd "$(dirname "$0")" && source ./db_script_setup.sh && cd - > /dev/null

print_usage() {
    echo "Usage: $0 <game_name> <songs_per_playlist> [master_code]" >&2
}

# validate argument count
if [[ $# -lt 2 || $# -gt 3 ]]; then
    echo "Error: Invalid argument count: $#" >&2
    print_usage
    exit 1
fi

game_name=$1

# validate songs per playlist
if [[ ! "$2" =~ ^[0-9]+$ || $2 -le 0 ]]; then
    echo "Error: <songs_per_playlist> must be a number > 0, got '$2'" >&2
    print_usage
    exit 1;
fi
songs_per_playlist=$2

if [[ $# -ge 3 ]]; then
    # validate given master code
    if [[ ! "$3" =~ ^M[a-zA-Z0-9]{15}$ ]]; then
        echo "Error: [master_code] format is invalid" >&2
        print_usage
        exit 1
    fi
    master_code=$3
else
    # generate master code
    master_code="M$(head /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 15)"
fi

docker-compose exec postgres \
    psql -U $POSTGRES_USER -d song_rating_db -c \
        "INSERT INTO games (game_name, master_code, songs_per_playlist)
        VALUES ('$game_name', '$master_code', '$songs_per_playlist');"

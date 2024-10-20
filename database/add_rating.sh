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

song_id=$1
rater_player_id=$2
rating=$3

# validate song id
if [[ ! $song_id =~ ^[1-9][0-9]*$ ]]; then
    echo "Error: <song_id> must be a positive integer" >&2
    print_usage
    exit 1
fi

# validate rater player id
if [[ ! $rater_player_id =~ ^[1-9][0-9]*$ ]]; then
    echo "Error: <rater_player_id> must be a positive integer" >&2
    print_usage
    exit 1
fi

# validate rating
if [[ ! $rating =~ ^([0-9]((\.[0-9]+)?)|10((\.0+)?))$ ]]; then
    echo "Error: <rating> must be a decimal number in the range [0, 10]" >&2
    print_usage
    exit 1
fi

docker-compose exec postgres \
    psql -U $POSTGRES_USER -d song_rating_db -c \
        "INSERT INTO ratings (song_id, rater_player_id, rating)
        VALUES ($song_id, $rater_player_id, $rating);"

#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Expected 1 argument."
    echo "Usage: $0 <scp_dest>"
    echo "Example: $0 user@123.45.67.89:/path/to/backup/location/"
    exit 1
fi

# setup env for database connection by reading '.env' file
cd "$(dirname "$0")/.."
export $(grep -v '^\s*#' .env | xargs)
export PGPASSWORD=$POSTGRES_PASSWORD

# the backup file name will be the date and time with a `.sql.gz` extension
backup_file="./$(date +"%Y-%m-%d_%H-%M-%S").sql.gz"

# get the backup from the db docker container and compress it
docker exec -t postgres pg_dump -U "$POSTGRES_USER" -d song_rating_db | gzip > "$backup_file"

# copy to remote server (use the ssh key of the user who entered sudo)
scp -i "$(eval echo ~$SUDO_USER)/.ssh/id_ed25519" "$backup_file" "$1"

# remove the backup file from this server
rm "$backup_file"

cd - > /dev/null

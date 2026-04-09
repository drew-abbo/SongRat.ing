#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

parse_args() {
    print_usage() {
        echo "Usage:"
        echo "    $(basename "$0") <dest_dir> <max_backups>"
        echo "    $(basename "$0") [--help|-h]"
    }

    # `--help` / `-h` flags
    for arg in "$@"; do
        if [[ "$arg" == "--help" || "$arg" == "-h" ]]; then
            print_usage "$@"
            [[ $# -eq 1 ]] && exit 0 || exit 1
        fi
    done

    if [[ "$#" -ne 2 ]]; then
        echo "Expected 2 arguments but got $#." >&2
        print_usage "$@"
        exit 1
    fi

    dest_dir=$1
    max_backups=$2

    # `dest_dir` must exist as a dir or be able to be created
    if [[ -e "$dest_dir" ]]; then
        if [[ ! -d "$dest_dir" ]]; then
            echo "'$dest_dir' exists but is not a directory." >&2
            exit 1
        fi
    else
        if [[ ! -d "$(dirname "$dest_dir")" ]]; then
            echo "Parent of '$dest_dir' doesn't exist or isn't a directory." >&2
            exit 1
        fi

        echo "Creating backup directory '$dest_dir'..."
    fi

    # `max_backups` must be a number and positive
    if [[ ! "$max_backups" =~ ^[0-9]+$ ]] || (( "$max_backups" < 1 )); then
        echo "'$max_backups' isn't a positive integer." >&2
        print_usage "$@"
        exit 1
    fi
}

parse_args "$@"

mkdir -p "$dest_dir"
dest_dir="$(realpath "$dest_dir")"

# setup env for database connection by reading `.env` file
cd "$(dirname "$0")/.."
export $(grep -v '^\s*#' .env | xargs)
export PGPASSWORD=$POSTGRES_PASSWORD

echo "Backing up database..."

new_backup_file="$dest_dir/backup-$(date +"%Y-%m-%d_%H-%M-%S").sql"
docker exec -t postgres pg_dump -U "$POSTGRES_USER" -d song_rating_db > "$new_backup_file"
xz -kz "$new_backup_file"

# sort backups by name
backup_files=("$dest_dir"/backup-*.sql.xz)
IFS=$'\n' sorted_backup_files=($(printf "%s\n" "${backup_files[@]}" | sort -r)); unset IFS

# if the last 2 backups are the same keep only keep the newest one
if (( ${#sorted_backup_files[@]} >= 2 )); then
    last_backup_file_compressed="${sorted_backup_files[1]}"
    xz -kd "$last_backup_file_compressed"
    last_backup_file="${last_backup_file_compressed:0:-3}"

    if cmp -s "$new_backup_file" "$last_backup_file"; then
        echo "Discarding previous backup (no changes)..."
        rm "$last_backup_file_compressed"
    fi

    rm "$last_backup_file"
fi

# remove uncompressed backup
rm "$new_backup_file"

# remove all backups except the newest `max_backups`
old_backup_files=("${sorted_backup_files[@]:max_backups}")
old_backup_count=${#old_backup_files[@]}
if (( $old_backup_count > 0 )); then
    echo "Discarding old backups ($old_backup_count over $max_backups)..."
    rm "${old_backup_files[@]}"
fi

cd - > /dev/null

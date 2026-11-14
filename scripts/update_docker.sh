#!/bin/bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."

FORCE=false
if (($#)); then
    if (($# != 1)) || [[ "$1" != "--force" ]]; then
        echo "Usage: $0 [--force]" >&2
        exit 1
    fi
    FORCE=true
fi

# refresh package lists
apt-get -o DPkg::Lock::Timeout=600 update

DOCKER_PACKAGES=(
    docker-ce
    docker-ce-cli
    containerd.io
    docker-buildx-plugin
    docker-compose-plugin
    docker-ce-rootless-extras
)

# find docker packages w/ upgrades
mapfile -t UPGRADES < <(
    apt list --upgradable 2>/dev/null |
    awk -F/ 'NR > 1 {print $1}' |
    sort -u
)
NEEDS_UPDATE=()
for pkg in "${DOCKER_PACKAGES[@]}"; do
    if printf '%s\n' "${UPGRADES[@]}" | grep -Fxq "$pkg"; then
        NEEDS_UPDATE+=("$pkg")
    fi
done

if [[ "$FORCE" == true ]]; then
    echo "--force provided, pretending all packages need update."
    NEEDS_UPDATE=("${DOCKER_PACKAGES[@]}")
fi

if ((${#NEEDS_UPDATE[@]} == 0)); then
    echo "Docker packages are up to date."
    exit 0
fi
echo "Docker upgrade required ($(date))."

# restore the if anything fails after shutdown
restore_app() {
    local exit_status=$?
    trap - EXIT

    echo "Docker upgrade failed, attempting to restore app..." >&2

    systemctl start docker || true
    if ! docker compose up; then
        echo "Could not restore the application." >&2
        ((exit_status == 0)) && exit_status=1
    fi

    exit "$exit_status"
}
trap restore_app EXIT

echo "Stopping app..."
docker compose stop

echo "Installing docker updates..."
apt-get -y -o DPkg::Lock::Timeout=600 \
    install --only-upgrade "${NEEDS_UPDATE[@]}"

echo "Restarting Docker..."
systemctl restart docker

echo "Restarting app..."
docker compose up -d
trap - EXIT # keep exit from starting compose again.

echo "Docker upgrade complete ($(date))."

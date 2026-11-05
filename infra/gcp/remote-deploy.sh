#!/usr/bin/env bash
# Runs on the VM as root, called by infra/gcp/deploy.mjs:
#   remote-deploy.sh <source tar.gz> <web tar.gz> <site domain>
# Unpacks the new release, makes the secrets on the first run, builds the images, migrates, starts.
set -euo pipefail

SRC_TAR=$1
WEB_TAR=$2
DOMAIN=$3
BASE=/opt/collab
ENV_FILE=$BASE/.env

mkdir -p "$BASE"
if [ ! -f "$ENV_FILE" ]; then
  password=$(openssl rand -hex 24)
  umask 077
  cat > "$ENV_FILE" <<EOF
SITE_DOMAIN=$DOMAIN
POSTGRES_PASSWORD=$password
DATABASE_URL=postgresql://collab:$password@postgres:5432/collab?schema=public
JWT_ACCESS_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
CORS_ORIGIN=https://$DOMAIN
RATE_LIMIT_PER_MINUTE=600
RATE_LIMIT_AUTH_PER_MINUTE=20
TRUST_PROXY=true
# Running code and the terminal take this code: the site is public.
RUN_ACCESS_CODE=$(openssl rand -hex 12)
EOF
  echo "created $ENV_FILE with new secrets"
fi
sed -i "s|^SITE_DOMAIN=.*|SITE_DOMAIN=$DOMAIN|; s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" "$ENV_FILE"

rm -rf "$BASE/src.new"
mkdir -p "$BASE/src.new/infra/gcp/web"
tar -xzf "$SRC_TAR" -C "$BASE/src.new"
tar -xzf "$WEB_TAR" -C "$BASE/src.new/infra/gcp/web"
cp "$ENV_FILE" "$BASE/src.new/infra/gcp/.env"
rm -rf "$BASE/src.old"
[ -d "$BASE/src" ] && mv "$BASE/src" "$BASE/src.old"
mv "$BASE/src.new" "$BASE/src"
rm -f "$SRC_TAR" "$WEB_TAR"

cd "$BASE/src"
compose() { docker compose -f infra/gcp/docker-compose.yml "$@"; }
compose build
compose up -d postgres redis
compose run --rm migrate
compose up -d --remove-orphans
docker image prune -f >/dev/null
compose ps

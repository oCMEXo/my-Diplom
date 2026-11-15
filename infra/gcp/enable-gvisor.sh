#!/usr/bin/env bash
# Runs code and terminals under gVisor, a kernel in user space, so a program never talks to the
# host's kernel directly. Run once on the VM, after the first deployment:
#   gcloud compute ssh collab --zone=europe-north1-a --command "sudo bash /opt/collab/src/infra/gcp/enable-gvisor.sh"
# Docker restarts once; the site is back in about a minute.
set -euo pipefail

if ! command -v runsc >/dev/null 2>&1; then
  apt-get update -q
  apt-get install -yq ca-certificates curl gnupg
  curl -fsSL https://gvisor.dev/archive.key | gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" \
    > /etc/apt/sources.list.d/gvisor.list
  apt-get update -q
  apt-get install -yq runsc
fi

runsc install
systemctl restart docker
docker run --rm --runtime=runsc --network none node:22-alpine node -e "console.log('gVisor works')"

ENV_FILE=/opt/collab/.env
if grep -q '^SANDBOX_RUNTIME=' "$ENV_FILE"; then
  sed -i 's/^SANDBOX_RUNTIME=.*/SANDBOX_RUNTIME=runsc/' "$ENV_FILE"
else
  echo 'SANDBOX_RUNTIME=runsc' >> "$ENV_FILE"
fi
cp "$ENV_FILE" /opt/collab/src/infra/gcp/.env
cd /opt/collab/src
docker compose -f infra/gcp/docker-compose.yml up -d runner
echo "Code runs and terminals now use gVisor."

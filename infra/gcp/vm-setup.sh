#!/bin/bash
# Startup script of the VM (runs as root at every boot, so each step checks whether it is done).
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

# 4 GB of memory is enough to run the site; the swap covers building the images.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
swapon --show | grep -q /swapfile || swapon /swapfile

# Images the sandboxes run programs in.
docker pull -q node:22-alpine || true
docker pull -q python:3.12-alpine || true

#!/bin/sh
set -eu

KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}
DIR=/backups
mkdir -p "$DIR"

backup() {
  file="$DIR/collab-$(date -u +%Y-%m-%d).dump"
  if pg_dump --format=custom --no-owner --file="$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "backup: $file ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.tmp"
    echo "backup: pg_dump failed" >&2
  fi
  find "$DIR" -name 'collab-*.dump' -mtime +"$KEEP_DAYS" -delete
}

if [ "${BACKUP_ONCE:-0}" = "1" ]; then
  backup
  exit 0
fi

while true; do
  backup
  sleep 86400
done

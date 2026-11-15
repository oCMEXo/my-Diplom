#!/bin/sh
# Backs up the database once a day and keeps the last BACKUP_KEEP_DAYS days. Runs in the `backup`
# service of the compose files (postgres image, so pg_dump matches the server version).
# BACKUP_ONCE=1 makes one backup and stops, for a manual backup or a test.
#
# Restore a backup (stops nothing; replaces the tables of the database):
#   docker compose exec backup pg_restore --clean --if-exists --no-owner -d "$PGDATABASE" /backups/collab-2026-11-15.dump
set -eu

KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}
DIR=/backups
mkdir -p "$DIR"

backup() {
  file="$DIR/collab-$(date -u +%Y-%m-%d).dump"
  # Written under another name first, so a broken dump never replaces yesterday's good one.
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

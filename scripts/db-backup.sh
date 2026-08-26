#!/usr/bin/env bash
# Daily Postgres backup via the db container, with rotation.
# Usage: COMPOSE_FILE=docker-compose.prod.yml BACKUP_DIR=./backups ./scripts/db-backup.sh
# Restore drill (tested on a scratch database, never the live one):
#   gunzip -c backups/mmcm-<STAMP>.dump.gz | docker compose -f <compose> exec -T db pg_restore -U postgres -d mmcm --clean --if-exists
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/mmcm-$STAMP.dump.gz"

docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U postgres -d mmcm -Fc \
  | gzip > "$OUT"

find "$BACKUP_DIR" -name 'mmcm-*.dump.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup written: $OUT"

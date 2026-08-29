#!/usr/bin/env bash
# Daily Postgres + documents backup via the db/app containers, with rotation.
# Usage: COMPOSE_FILE=docker-compose.prod.yml BACKUP_DIR=./backups ./scripts/db-backup.sh
# Restore drill (tested on a scratch database, never the live one):
#   1. gunzip -c backups/mmcm-<STAMP>.dump.gz | docker compose -f <compose> exec -T db pg_restore -U postgres -d mmcm --clean --if-exists
#   2. tar -xzf backups/mmcm-documents-<STAMP>.tar.gz -C /var/lib/docker/volumes/<project>_documents/_data
#      then verify a restored document downloads and is byte-identical to the original.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DOCUMENTS_VOLUME="${DOCUMENTS_VOLUME:-documents}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"

# ── Database ─────────────────────────────────────────────────────
DB_OUT="$BACKUP_DIR/mmcm-$STAMP.dump.gz"
docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U postgres -d mmcm -Fc \
  | gzip > "$DB_OUT"

# ── Documents volume (tar streamed through a disposable container) ──
DOC_OUT="$BACKUP_DIR/mmcm-documents-$STAMP.tar.gz"
docker run --rm -v "$DOCUMENTS_VOLUME":/data:ro -v "$(cd "$BACKUP_DIR" && pwd)":/backup alpine \
  tar -czf "/backup/$(basename "$DOC_OUT")" -C /data .

find "$BACKUP_DIR" -name 'mmcm-*.dump.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name 'mmcm-documents-*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup written: $DB_OUT"
echo "Backup written: $DOC_OUT"

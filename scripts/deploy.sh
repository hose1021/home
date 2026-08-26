#!/usr/bin/env bash
# One-command production deploy: build, start db, migrate, start app.
# Usage: ./scripts/deploy.sh   (set env vars first: POSTGRES_PASSWORD, BETTER_AUTH_SECRET, ...)
set -euo pipefail

docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d app

echo "Deployed. App: http://$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "Backups: cron daily -> ./scripts/db-backup.sh"

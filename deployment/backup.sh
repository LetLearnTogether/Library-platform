#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
umask 077

if [[ ! -f .env ]]; then
  echo "Missing deployment .env file." >&2
  exit 1
fi

set -a
source .env
set +a

if [[ -z "${MYSQL_DATABASE:-}" || -z "${MYSQL_USER:-}" || -z "${MYSQL_PASSWORD:-}" ]]; then
  echo "MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD must be set in .env." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
WORK_DIR="$(mktemp -d)"
ARCHIVE="$BACKUP_DIR/letlearn-$STAMP.tar.gz"
trap 'rm -rf "$WORK_DIR"' EXIT

docker compose exec -T db sh -c \
  'exec env MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --single-transaction --routines --triggers --user="$MYSQL_USER" "$MYSQL_DATABASE"' \
  > "$WORK_DIR/database.sql"
docker compose exec -T backend tar -C /var/lib/letlearn/uploads -czf - . \
  > "$WORK_DIR/uploads.tar.gz"
tar -czf "$ARCHIVE" -C "$WORK_DIR" database.sql uploads.tar.gz
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
find "$BACKUP_DIR" -type f -name 'letlearn-*.tar.gz*' -mtime "+$RETENTION_DAYS" -delete

echo "Created backup archive: $ARCHIVE"

#!/usr/bin/env bash
# Daily/weekly/monthly rolling backups for School Merit Tracker
# - 7 daily, 4 weekly, 12 monthly (drop anything older)
# Backs up: PostgreSQL DB + public/images (prize images)

set -euo pipefail

# --- Config (override via env) ---
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${PROJECT_ROOT}/backups}"
IMAGES_DIR="${IMAGES_DIR:-${PROJECT_ROOT}/public/images}"

# DB connection (pulled from .env if present, otherwise environment)
if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  # shellcheck disable=SC2046
  export $(grep -E '^(DB_HOST|DB_PORT|DB_USER|DB_PASS|DB_NAME)=' "${PROJECT_ROOT}/.env" | xargs)
fi
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-merit_user}"
DB_PASS="${DB_PASS:-}"
DB_NAME="${DB_NAME:-merits}"

# --- Prep ---
TODAY="$(date +%F)"
TIME_SUFFIX="$(date +%H%M%S)"
DAILY_DIR="${BACKUP_ROOT}/daily"
WEEKLY_DIR="${BACKUP_ROOT}/weekly"
MONTHLY_DIR="${BACKUP_ROOT}/monthly"
TMP_DIR="$(mktemp -d "${BACKUP_ROOT}/tmp.XXXX")"
ARCHIVE_NAME="${TODAY}_${TIME_SUFFIX}_backup.tgz"

mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}" "${MONTHLY_DIR}"

# --- Functions ---
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

log() { echo "[$(date +%F\ %T)] $*"; }

# --- Database dump ---
log "Backing up database ${DB_NAME}"
export PGPASSWORD="${DB_PASS}"
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "${TMP_DIR}/db.dump"
unset PGPASSWORD

# --- Collect files to archive ---
tar_args=()
if [[ -d "${IMAGES_DIR}" ]]; then
  tar_args+=( -C "${PROJECT_ROOT}" "public/images" )
fi

# --- Create archive ---
log "Creating archive ${ARCHIVE_NAME}"
tar -czf "${DAILY_DIR}/${ARCHIVE_NAME}" \
  -C "${TMP_DIR}" "db.dump" \
  "${tar_args[@]:-}"

# --- Promotions ---
DOW="$(date +%u)"   # 1=Mon .. 7=Sun
DOM="$(date +%d)"   # 01..31

if [[ "${DOW}" == "7" ]]; then
  log "Promoting to weekly backups"
  cp "${DAILY_DIR}/${ARCHIVE_NAME}" "${WEEKLY_DIR}/${ARCHIVE_NAME}"
fi

if [[ "${DOM}" == "01" ]]; then
  log "Promoting to monthly backups"
  cp "${DAILY_DIR}/${ARCHIVE_NAME}" "${MONTHLY_DIR}/${ARCHIVE_NAME}"
fi

# --- Retention ---
log "Applying retention (daily=7d, weekly=28d, monthly=400d)"
find "${DAILY_DIR}"   -type f -mtime +6   -print -delete
find "${WEEKLY_DIR}"  -type f -mtime +27  -print -delete
find "${MONTHLY_DIR}" -type f -mtime +400 -print -delete

log "Backup complete"

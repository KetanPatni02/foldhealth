#!/usr/bin/env bash
# scripts/migration/export-supabase-db.sh
#
# Phase 00: dump the production Supabase Postgres into a compressed SQL file
# outside the repo. The dump is the authoritative snapshot we restore into
# RDS in Phase 01.
#
# Uses the Supabase session pooler, matching the connection pattern of the
# project's existing migration runners (supabase/.temp/pooler-url). This
# avoids the IPv6-only direct host that only works on certain networks.
#
# Output: ~/foldhealth-migration/db-YYYYMMDD-HHMM.sql.gz
#
# Notes:
#   - Needs pg_dump 17 locally (brew install postgresql@17).
#   - Does NOT dump auth.users password hashes (Supabase does not expose
#     them through this role; a separate Phase 04 flow handles users).
#   - Excludes the storage.objects table body (we re-upload via export-storage.sh).
#   - Includes extensions, triggers, SECURITY DEFINER functions, and RLS
#     policies, which the restore in Phase 01 needs intact.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${HOME}/foldhealth-migration"
STAMP="$(date +%Y%m%d-%H%M)"
OUT_FILE="${OUT_DIR}/db-${STAMP}.sql.gz"

mkdir -p "$OUT_DIR"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install with: brew install postgresql@17" >&2
  exit 1
fi

PG_DUMP_VERSION="$(pg_dump --version | awk '{print $NF}')"
case "$PG_DUMP_VERSION" in
  17.*) ;;
  *) echo "pg_dump $PG_DUMP_VERSION detected. Need 17.x for the Supabase target. Try: brew install postgresql@17 && brew link --force postgresql@17" >&2; exit 1 ;;
esac

# Pull the pooler URL and inject the DB password from .env, same shape the
# project's _run_hcc_v3_migration.mjs runner uses.
if [[ ! -f "${REPO_ROOT}/supabase/.temp/pooler-url" ]]; then
  echo "Missing supabase/.temp/pooler-url. Run \`supabase link --project-ref <ref>\` first." >&2
  exit 1
fi

POOLER_URL="$(cat "${REPO_ROOT}/supabase/.temp/pooler-url")"
DB_PASSWORD="$(grep -E '^SUPABASE_DB_PASSWORD=' "${REPO_ROOT}/.env" | cut -d= -f2-)"
if [[ -z "$DB_PASSWORD" ]]; then
  echo "SUPABASE_DB_PASSWORD not set in .env" >&2
  exit 1
fi

# URL-encode-safe injection: substitute the %-placeholder-less password in place.
# The pooler-url shape is postgres://USER:PASSWORD@HOST:PORT/DB; we parse by
# splitting on '@' once, then on ':' from the right of the first half.
# Simpler: let psql's PGPASSWORD env carry the password, and strip ':PASSWORD'
# from the URL before passing it in.
CONN_URL_NO_PASS="$(printf '%s' "$POOLER_URL" | sed -E 's#(://[^:]+):[^@]+@#\1@#')"

echo "▶ Dumping to $OUT_FILE"
echo "  (this will take ~30-60 seconds for a ~40 MB database)"

# --exclude-table-data on storage.objects: we migrate blobs via export-storage.sh,
# the pg_dump row would just carry metadata we rebuild in Phase 02.
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --dbname "$CONN_URL_NO_PASS" \
  --no-owner \
  --no-privileges \
  --no-publications \
  --no-subscriptions \
  --exclude-table-data='storage.objects' \
  --exclude-schema='_realtime' \
  --exclude-schema='realtime' \
  --exclude-schema='vault' \
  --exclude-schema='pgsodium' \
  --exclude-schema='pgsodium_masks' \
  --exclude-schema='graphql' \
  --exclude-schema='graphql_public' \
  --exclude-schema='net' \
  --exclude-schema='supabase_functions' \
  --format=plain \
  2>/dev/null \
  | gzip -9 > "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "✓ Done. $OUT_FILE ($SIZE)"

echo
echo "Verify integrity:"
echo "  gunzip -t $OUT_FILE && echo OK"

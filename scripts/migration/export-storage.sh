#!/usr/bin/env bash
# scripts/migration/export-storage.sh
#
# Phase 00: enumerate every Supabase Storage bucket and download its objects
# to ~/foldhealth-migration/storage/<bucket>/. Used in Phase 02 to seed S3.
#
# Hits the Storage REST API with the service role key so it sees every
# object regardless of RLS. The service key is already in .env.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="${HOME}/foldhealth-migration/storage"
mkdir -p "$OUT_DIR"

VITE_SUPABASE_URL="$(grep -E '^VITE_SUPABASE_URL=' "${REPO_ROOT}/.env" | cut -d= -f2-)"
SERVICE_KEY="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "${REPO_ROOT}/.env" | cut -d= -f2-)"

if [[ -z "$VITE_SUPABASE_URL" || -z "$SERVICE_KEY" ]]; then
  echo "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env" >&2
  exit 1
fi

API="${VITE_SUPABASE_URL}/storage/v1"

echo "▶ Listing buckets"
BUCKETS_JSON="$(curl -fsS \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  "$API/bucket")"

BUCKETS=$(echo "$BUCKETS_JSON" | python3 -c "import sys,json;[print(b['name']) for b in json.load(sys.stdin)]")

if [[ -z "$BUCKETS" ]]; then
  echo "No buckets found. Nothing to export."
  exit 0
fi

echo "Buckets to export:"
echo "$BUCKETS" | sed 's/^/  - /'

for BUCKET in $BUCKETS; do
  echo
  echo "▶ Bucket: $BUCKET"
  BUCKET_DIR="${OUT_DIR}/${BUCKET}"
  mkdir -p "$BUCKET_DIR"

  # List objects. The API returns up to 100 at a time; iterate until empty.
  OFFSET=0
  LIMIT=100
  TOTAL=0
  while true; do
    LIST_JSON="$(curl -fsS \
      -H "apikey: $SERVICE_KEY" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"prefix\":\"\",\"limit\":${LIMIT},\"offset\":${OFFSET}}" \
      "$API/object/list/${BUCKET}")"

    COUNT=$(echo "$LIST_JSON" | python3 -c "import sys,json;print(len(json.load(sys.stdin)))")
    if [[ "$COUNT" == "0" ]]; then break; fi

    # Pull each object. Supabase object paths can contain slashes; preserve them.
    echo "$LIST_JSON" | python3 -c "
import sys, json
for o in json.load(sys.stdin):
  # Skip folder placeholder rows (name='' id=None)
  if not o.get('name') or o.get('id') is None: continue
  print(o['name'])
" | while read -r NAME; do
      [[ -z "$NAME" ]] && continue
      LOCAL_PATH="${BUCKET_DIR}/${NAME}"
      mkdir -p "$(dirname "$LOCAL_PATH")"
      curl -fsS \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -o "$LOCAL_PATH" \
        "$API/object/${BUCKET}/${NAME}"
      TOTAL=$((TOTAL + 1))
    done

    OFFSET=$((OFFSET + LIMIT))
  done
  echo "  downloaded $(find "$BUCKET_DIR" -type f | wc -l | tr -d ' ') object(s)"
done

echo
echo "✓ Storage exported to $OUT_DIR"
du -sh "$OUT_DIR"/*

#!/usr/bin/env bash
# Copy the production schema (and, with --with-data, the public data) into
# the dev Supabase project, so local dev never needs the production database.
# See docs/dev-database.md.
#
# Reads production with pg_dump through the session pooler; writes only to the
# dev project. Refuses to run if the target is production.
#
# Usage:  scripts/dev-db-sync.sh [--with-data]
# Needs:  brew install libpq (pg_dump/psql 17+)
#         .env:                   SUPABASE_DB_PASSWORD (production, read only)
#         .env.development.local: DEV_SUPABASE_PROJECT_REF, DEV_SUPABASE_DB_PASSWORD

set -euo pipefail
cd "$(dirname "$0")/.."

PROD_REF=osnihfqqrcchsaqhagcx
PROD_POOLER=aws-1-ap-southeast-1.pooler.supabase.com
DEV_POOLER=aws-0-ap-southeast-1.pooler.supabase.com

WITH_DATA=false
[ "${1:-}" = "--with-data" ] && WITH_DATA=true

PG_BIN="$(brew --prefix libpq 2>/dev/null)/bin"
[ -x "$PG_BIN/pg_dump" ] || { echo "pg_dump not found: brew install libpq"; exit 1; }

envval() { grep -E "^$1=" "$2" 2>/dev/null | head -1 | cut -d= -f2-; }
PROD_PW=$(envval SUPABASE_DB_PASSWORD .env)
DEV_REF=$(envval DEV_SUPABASE_PROJECT_REF .env.development.local)
DEV_PW=$(envval DEV_SUPABASE_DB_PASSWORD .env.development.local)
[ -n "$PROD_PW" ] || { echo "SUPABASE_DB_PASSWORD missing from .env"; exit 1; }
[ -n "$DEV_REF" ] && [ -n "$DEV_PW" ] || { echo "DEV_SUPABASE_PROJECT_REF / DEV_SUPABASE_DB_PASSWORD missing from .env.development.local"; exit 1; }
if [ "$DEV_REF" = "$PROD_REF" ]; then echo "Refusing: the dev target is the production project."; exit 1; fi

enc() { python3 -I -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"; }
PROD_URL="postgresql://postgres.$PROD_REF:$(enc "$PROD_PW")@$PROD_POOLER:5432/postgres?sslmode=require"
DEV_URL="postgresql://postgres.$DEV_REF:$(enc "$DEV_PW")@$DEV_POOLER:5432/postgres?sslmode=require"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "→ Extensions used in production"
"$PG_BIN/psql" "$PROD_URL" -Atc "select format('create extension if not exists %I with schema %I;', e.extname, n.nspname) from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname not in ('plpgsql') order by 1" > "$WORK/extensions.sql"

echo "→ Dumping the public schema from production (read only)"
"$PG_BIN/pg_dump" "$PROD_URL" --schema-only --schema=public --no-owner --quote-all-identifiers -f "$WORK/schema.sql"

echo "→ Resetting the dev public schema"
"$PG_BIN/psql" "$DEV_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
SQL

echo "→ Loading extensions and schema into dev"
"$PG_BIN/psql" "$DEV_URL" -q -f "$WORK/extensions.sql" >/dev/null 2>"$WORK/ext.err" || true
grep -i "error" "$WORK/ext.err" | head -5 || true
# The public schema already exists after the reset; drop the dump's CREATE.
sed -i '' -E '/^CREATE SCHEMA "public";$/d' "$WORK/schema.sql"
"$PG_BIN/psql" "$DEV_URL" -q -v ON_ERROR_STOP=0 -f "$WORK/schema.sql" >/dev/null 2>"$WORK/schema.err" || true
echo "   schema errors: $(grep -c ERROR "$WORK/schema.err" || true) (first few below)"
grep ERROR "$WORK/schema.err" | head -5 || true

echo "→ Matching the realtime publication"
"$PG_BIN/psql" "$PROD_URL" -Atc "select format('alter publication supabase_realtime add table %I.%I;', schemaname, tablename) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'" > "$WORK/realtime.sql"
"$PG_BIN/psql" "$DEV_URL" -q -f "$WORK/realtime.sql" >/dev/null 2>&1 || true

if $WITH_DATA; then
  echo "→ Copying public data (triggers and FK checks off while loading)"
  "$PG_BIN/pg_dump" "$PROD_URL" --data-only --schema=public --no-owner -f "$WORK/data.sql"
  { echo "set session_replication_role = replica;"; cat "$WORK/data.sql"; } > "$WORK/data-replica.sql"
  "$PG_BIN/psql" "$DEV_URL" -q -v ON_ERROR_STOP=0 -f "$WORK/data-replica.sql" >/dev/null 2>"$WORK/data.err" || true
  echo "   data errors: $(grep -c ERROR "$WORK/data.err" || true)"
  grep ERROR "$WORK/data.err" | head -5 || true
fi

echo "→ Reloading the dev API schema cache"
"$PG_BIN/psql" "$DEV_URL" -q -c "notify pgrst, 'reload schema';"
echo "Done. Dev project: https://supabase.com/dashboard/project/$DEV_REF"

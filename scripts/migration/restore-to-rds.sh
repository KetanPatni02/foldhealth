#!/usr/bin/env bash
# scripts/migration/restore-to-rds.sh
#
# Phase 01: restore the Phase 00 pg_dump into the newly provisioned RDS.
# Streams the gzipped dump directly through psql to avoid staging an
# uncompressed copy on disk.
#
# Prerequisites:
#   - Phase 00 dump at ~/foldhealth-migration/db-*.sql.gz
#   - Phase 01 Terraform applied (`terraform apply` from infra/terraform/)
#   - You are on a network that can reach the RDS endpoint. The RDS instance
#     is on private subnets, so from a dev machine you either need:
#       a) An EC2 bastion in the public subnet (not provisioned by TF; add
#          later if needed), OR
#       b) To run this script from inside the VPC (e.g. from a one-off
#          Fargate task or an ECS exec session), OR
#       c) Temporarily flag the DB publicly_accessible=true, restrict the
#          security group to your IP, run the restore, then flip it back.
#
# Fetches the RDS password from Secrets Manager so no credential lives on
# disk. Expects the Terraform outputs `rds_endpoint` and
# `rds_password_secret_arn` to be readable from infra/terraform/.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DUMP_DIR="${HOME}/foldhealth-migration"
TF_DIR="${REPO_ROOT}/infra/terraform"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install with: brew install postgresql@17" >&2
  exit 1
fi

LATEST_DUMP="$(ls -t "${DUMP_DIR}"/db-*.sql.gz 2>/dev/null | head -n1 || true)"
if [[ -z "$LATEST_DUMP" ]]; then
  echo "No dump found in ${DUMP_DIR}. Run export-supabase-db.sh first." >&2
  exit 1
fi

echo "▶ Dump: $LATEST_DUMP ($(du -h "$LATEST_DUMP" | cut -f1))"

RDS_ENDPOINT="$(cd "$TF_DIR" && terraform output -raw rds_endpoint)"
RDS_SECRET_ARN="$(cd "$TF_DIR" && terraform output -raw rds_password_secret_arn)"
RDS_PASSWORD="$(aws secretsmanager get-secret-value --secret-id "$RDS_SECRET_ARN" --query SecretString --output text)"

if [[ -z "$RDS_ENDPOINT" || -z "$RDS_PASSWORD" ]]; then
  echo "Missing RDS endpoint or password. Did `terraform apply` run?" >&2
  exit 1
fi

echo "▶ Target: ${RDS_ENDPOINT}:5432 (database: foldhealth)"
echo
read -rp "Restore into this RDS? Any existing data will be overwritten. [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

export PGPASSWORD="$RDS_PASSWORD"

# Drop and recreate the public schema so a re-run always starts from a known
# state. Everything else (extensions, auth schema, triggers) comes from the
# dump. This matches what Supabase does when you reset a dev branch.
echo "▶ Resetting public schema"
psql --host="$RDS_ENDPOINT" --username=foldhealth --dbname=foldhealth --no-password \
  --set=ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public;"

echo "▶ Restoring (this takes 1-3 minutes)"
gunzip -c "$LATEST_DUMP" | psql \
  --host="$RDS_ENDPOINT" \
  --username=foldhealth \
  --dbname=foldhealth \
  --no-password \
  --set=ON_ERROR_STOP=1 \
  --quiet

echo "✓ Restore complete"
echo
echo "Spot-check:"
psql --host="$RDS_ENDPOINT" --username=foldhealth --dbname=foldhealth --no-password -c "
select
  (select count(*) from information_schema.tables where table_schema='public') as public_tables,
  (select count(*) from pg_policies where schemaname='public') as rls_policies,
  (select count(*) from pg_trigger where tgisinternal=false) as triggers,
  pg_size_pretty(pg_database_size('foldhealth')) as db_size;
"

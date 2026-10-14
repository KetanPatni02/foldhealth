# Migration scripts

One-off scripts for the Supabase → AWS migration. Nothing in this folder is wired into app code; everything is runnable by hand against a developer machine with the right credentials.

| Script | What it does | Phase |
|---|---|---|
| `export-supabase-db.sh` | `pg_dump` the production DB through the Supabase session pooler to `~/foldhealth-migration/db-YYYYMMDD-HHMM.sql.gz` | 00 |
| `export-storage.sh` | List every Supabase Storage bucket and download its contents to `~/foldhealth-migration/storage/<bucket>/` | 00 |
| `export-auth-users.mjs` | Dump the `auth.users` roster (ids, emails, metadata; no password hashes) to `~/foldhealth-migration/auth-users.json` | 00 |

Credentials needed:

- `.env` with `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` (already present for existing scripts).
- `supabase/.temp/pooler-url` (already present; path used by the project's existing migration runners).

Output lives outside the repo (`~/foldhealth-migration/`) so a `pg_dump` never accidentally ends up in git. Verify once with `grep -r foldhealth-migration .gitignore` is unnecessary; the path is outside the repo entirely.

See [docs/migration/00-prep.md](../../docs/migration/00-prep.md) for the runbook.

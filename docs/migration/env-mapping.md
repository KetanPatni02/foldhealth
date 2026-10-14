# Environment variable mapping

Current → target. Fill `TBD` cells as each phase lands.

| Current var | Used by | Target var | Target source | Phase |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | client, `src/lib/supabase.js` | split into `VITE_API_URL` (PostgREST ALB) + `VITE_AUTH_URL` (Cognito domain) | Terraform output + Cognito domain | 01 / 04 |
| `VITE_SUPABASE_ANON_KEY` | client | `VITE_API_ANON_JWT` (JWT signed by PostgREST's secret with `role=anon`) | Terraform output | 01 |
| `VITE_DEV_LOGIN_EMAIL` | client dev-bypass button (localhost only) | unchanged | `.env.local` | n/a |
| `VITE_DEV_LOGIN_PASSWORD` | client dev-bypass button | unchanged | `.env.local` | n/a |
| `VITE_COMMS_LINE_NUMBER` | client, Twilio-ish SMS display | unchanged | `.env` | n/a |
| `VITE_OPENFDA_API_KEY` | client, OpenFDA drug lookup | unchanged | `.env` | n/a |
| `SUPABASE_URL` | `api/_lib/*.js`, server routes | `API_URL` (PostgREST ALB) | Terraform output | 01 |
| `SUPABASE_ANON_KEY` | server | `API_ANON_JWT` | Terraform output | 01 |
| `SUPABASE_SERVICE_ROLE_KEY` | server (admin ops), scripts | `API_SERVICE_JWT` (JWT with `role=service_role`) | Terraform output + Secrets Manager | 01 |
| `SUPABASE_DB_PASSWORD` | migration runners, local scripts | `RDS_DB_PASSWORD` | Secrets Manager | 01 |
| `GOOGLE_AI_API_KEY` | `api/` AI features | unchanged | `.env` or SSM | n/a |
| `GOOGLE_AI_MODEL`, `GOOGLE_AI_FALLBACK_MODELS` | AI model config | unchanged | `.env` | n/a |
| `PEXEL_API_KEY` | image search | unchanged | `.env` | n/a |
| `RESEND_API_KEY` | server, transactional email | TBD: SES or keep Resend; Mailgun also under consideration | Phase 06 decision | 06 |
| `RESEND_FROM` | server, from-address | unchanged | `.env` | 06 |
| `TEXTBEE_API_KEY`, `TEXTBEE_DEVICE_ID` | SMS | unchanged | `.env` | n/a |
| `TZ` | server timezone | unchanged | `.env` | n/a |

## New vars introduced by migration

| Var | Introduced in phase | Source |
|---|---|---|
| `RDS_ENDPOINT` | 01 | Terraform output |
| `RDS_DB_PASSWORD` | 01 | Secrets Manager (reference via ARN in task defs) |
| `POSTGREST_JWT_SECRET` | 01 | Secrets Manager; shared with the JWT issuer (initially Supabase JWT secret) |
| `S3_BUCKET_PDFS` | 02 | Terraform output |
| `S3_BUCKET_IMAGES` | 02 | Terraform output |
| `CLOUDFRONT_DIST_ASSETS` | 02 | Terraform output |
| `COGNITO_USER_POOL_ID` | 04 | Terraform output |
| `COGNITO_APP_CLIENT_ID` | 04 | Terraform output |
| `COGNITO_DOMAIN` | 04 | Terraform output |
| `APPSYNC_API_URL` | 05 | Terraform output |
| `APPSYNC_API_KEY` (dev) / IAM auth (prod) | 05 | Terraform output |

## Dev-login bypass

`VITE_DEV_LOGIN_EMAIL` and `VITE_DEV_LOGIN_PASSWORD` seed a localhost-only auto-sign-in against the demo account. In Phase 04 we need to recreate `demo@fold.health` in Cognito and update the password to match. Noted so we don't lose the dev bypass.

#!/usr/bin/env node
// scripts/migration/export-auth-users.mjs
//
// Phase 00: dump the auth.users roster (ids, emails, metadata, timestamps)
// to ~/foldhealth-migration/auth-users.json. Password hashes are not
// available via this role, so Phase 04 (Cognito) will force a password
// reset per user unless we build a bcrypt-import path at that time.
//
// Uses the Supabase Admin API with the service role key.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const REPO_ROOT = join(dirname(new URL(import.meta.url).pathname), '..', '..');
const OUT_DIR  = join(homedir(), 'foldhealth-migration');
const OUT_FILE = join(OUT_DIR, 'auth-users.json');

const env = Object.fromEntries(
  readFileSync(join(REPO_ROOT, '.env'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split('=')).map(([k, ...v]) => [k, v.join('=')])
);

const url = env.VITE_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

async function fetchPage(page, perPage = 1000) {
  const res = await fetch(
    `${url}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) {
    throw new Error(`admin/users page ${page}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

const all = [];
let page = 1;
while (true) {
  const body = await fetchPage(page);
  const users = body.users ?? [];
  if (users.length === 0) break;
  all.push(...users);
  console.log(`▶ page ${page}: ${users.length} user(s)`);
  if (users.length < 1000) break;
  page += 1;
}

// Normalize: strip transient fields, keep the stable ones Cognito will care
// about during import. Users is tiny today so an in-memory sort is fine.
const normalized = all
  .map((u) => ({
    id: u.id,
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    phone: u.phone,
    phone_confirmed_at: u.phone_confirmed_at,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    user_metadata: u.user_metadata ?? {},
    app_metadata: u.app_metadata ?? {},
    role: u.role, // Supabase auth role (not clinical role)
    aud: u.aud,
    is_sso_user: u.is_sso_user ?? false,
    banned_until: u.banned_until ?? null,
  }))
  .sort((a, b) => (a.email || '').localeCompare(b.email || ''));

writeFileSync(OUT_FILE, JSON.stringify(normalized, null, 2));
console.log(`✓ ${normalized.length} user(s) → ${OUT_FILE}`);

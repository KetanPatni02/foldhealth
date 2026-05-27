#!/usr/bin/env bun
/**
 * Fold Health — Database Seed
 *
 * Creates hedis_members + apcm_patients tables (if they don't exist) and
 * upserts all mock data into Supabase.
 *
 * Usage:    bun run seed
 * Requires: SUPABASE_SERVICE_ROLE_KEY + SUPABASE_DB_PASSWORD in .env
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { HEDIS_MEMBERS } from '../src/features/hedis-worklist/data/mock.js';
import { APCM_PATIENTS } from '../src/features/apcm-billing/data/mock.js';

// ── Config ─────────────────────────────────────────────────────────────────────

const PROJECT_REF      = 'osnihfqqrcchsaqhagcx';
const SUPABASE_URL     = `https://${PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD      = process.env.SUPABASE_DB_PASSWORD;

if (!SERVICE_ROLE_KEY || !DB_PASSWORD) {
  console.error('\n❌  Missing env vars. Ensure .env has:');
  console.error('    SUPABASE_SERVICE_ROLE_KEY');
  console.error('    SUPABASE_DB_PASSWORD\n');
  process.exit(1);
}

// ── Table DDL ──────────────────────────────────────────────────────────────────

const HEDIS_DDL = `
CREATE TABLE IF NOT EXISTS hedis_members (
  id                text PRIMARY KEY,
  initials          text,
  name              text NOT NULL,
  gender            text,
  age               text,
  member_id         text,
  language          text DEFAULT 'en',
  gaps              jsonb DEFAULT '[]',
  assignee          text,
  assignee_initials text,
  start_date        text,
  adv_illness       int  DEFAULT 0,
  frailty           int  DEFAULT 0,
  risk_level        text,
  tasks             int,
  outreach_dots     jsonb DEFAULT '[]',
  outreach_date     text,
  member_status     text DEFAULT 'Active',
  phone             text,
  dob               text,
  ipa               text,
  hp_code           text,
  zip               text,
  city              text,
  state             text,
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE hedis_members DISABLE ROW LEVEL SECURITY;
`;

const APCM_DDL = `
CREATE TABLE IF NOT EXISTS apcm_patients (
  id                          text PRIMARY KEY,
  name                        text NOT NULL,
  member_id                   text,
  language                    text DEFAULT 'en',
  ehr_id                      text,
  billing_month               text,
  date_of_service             text,
  is_qmb                      boolean DEFAULT false,
  chronic_condition_count     int     DEFAULT 0,
  cpt_code                    text,
  icd_codes                   jsonb DEFAULT '[]',
  last_encounter_date         text,
  reasons                     jsonb DEFAULT '[]',
  rendering_provider          text,
  rendering_provider_initials text,
  comment                     text DEFAULT '',
  tab                         text,
  billing_status              text DEFAULT 'pending',
  program_id                  text,
  created_at                  timestamptz DEFAULT now()
);
ALTER TABLE apcm_patients DISABLE ROW LEVEL SECURITY;
`;

// ── Row mappers (JS shape → DB columns) ───────────────────────────────────────

function hedisToRow(m) {
  return {
    id:                m.id,
    initials:          m.in,
    name:              m.name,
    gender:            m.gender,
    age:               m.age,
    member_id:         m.memberId,
    language:          m.language || 'en',
    gaps:              m.gaps ?? [],
    assignee:          m.assignee ?? null,
    assignee_initials: m.assigneeInitials ?? null,
    start_date:        m.startDate ?? null,
    adv_illness:       m.advIllness ?? 0,
    frailty:           m.frailty ?? 0,
    risk_level:        m.riskLevel ?? null,
    tasks:             m.tasks ?? null,
    outreach_dots:     m.outreachDots ?? [],
    outreach_date:     m.outreachDate ?? null,
    member_status:     m.memberStatus || 'Active',
    phone:             m.phone ?? null,
    dob:               m.dob ?? null,
    ipa:               m.ipa ?? null,
    hp_code:           m.hpCode ?? null,
    zip:               m.zip ?? null,
    city:              m.city ?? null,
    state:             m.state ?? null,
  };
}

function apcmToRow(p) {
  return {
    id:                          p.id,
    name:                        p.name,
    member_id:                   p.memberId,
    language:                    p.language || 'en',
    ehr_id:                      p.ehrId,
    billing_month:               p.billingMonth,
    date_of_service:             p.dateOfService,
    is_qmb:                      p.isQmb,
    chronic_condition_count:     p.chronicConditionCount,
    cpt_code:                    p.cptCode,
    icd_codes:                   p.icdCodes ?? [],
    last_encounter_date:         p.lastEncounterDate,
    reasons:                     p.reasons ?? [],
    rendering_provider:          p.renderingProvider,
    rendering_provider_initials: p.renderingProviderInitials,
    comment:                     p.comment || '',
    tab:                         p.tab,
    billing_status:              p.billingStatus || 'pending',
    program_id:                  p.programId,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Fold Health — DB Seed\n');

  // 1. Create tables via direct Postgres connection (best-effort — tables may already exist)
  console.log('Creating tables (if not exist)...');
  try {
    const db = new pg.Client({
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000,
    });
    await db.connect();
    await db.query(HEDIS_DDL);
    console.log('  ✓ hedis_members — created / already exists');
    await db.query(APCM_DDL);
    console.log('  ✓ apcm_patients — created / already exists');
    await db.end();
  } catch (e) {
    console.warn(`  ⚠  Could not connect via pg (${e.message})`);
    console.warn('     Tables must already exist — continuing to upsert data.\n');
  }

  // 2. Upsert data via supabase-js (service role bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('\nSeeding hedis_members...');
  const hedisRows = HEDIS_MEMBERS.map(hedisToRow);
  const { error: he } = await supabase
    .from('hedis_members')
    .upsert(hedisRows, { onConflict: 'id' });
  if (he) { console.error('  ✗', he.message); } else { console.log(`  ✓ ${hedisRows.length} members`); }

  console.log('Seeding apcm_patients...');
  const apcmRows = APCM_PATIENTS.map(apcmToRow);
  const { error: ae } = await supabase
    .from('apcm_patients')
    .upsert(apcmRows, { onConflict: 'id' });
  if (ae) { console.error('  ✗', ae.message); } else { console.log(`  ✓ ${apcmRows.length} patients`); }

  console.log('\n✅  Seed complete. Run `bun run dev` to verify.\n');
}

main().catch(err => {
  console.error('\n❌  Fatal:', err.message);
  process.exit(1);
});

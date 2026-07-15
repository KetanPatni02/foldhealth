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
import { FALLBACK_ICDS } from '../src/lib/icd/catalog.js';
import { POS_CODES } from '../src/features/hcc/data/posCodes.js';
import { ICDS, NOT_LINKED, getIcdsForMember, getNotLinkedForMember } from '../src/features/hcc/data/icds.js';
import { HCC_MEMBER_BY_NAME } from '../src/features/hcc/data/mock.js';

// Patients whose HCC diagnosis gaps have been modernized to V28 + 2025/26
// dates (see docs/features/hcc-coding-workflow.md). Re-seeding rewrites just
// these members' gaps from the mock so the DB matches the source of truth.
const HCC_MODERNIZED = ['Annette Brave', 'William Jammy', 'Grace Hill', 'Kevin Brown', 'Jessica Clark'];

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

const ICD_DDL = `
CREATE TABLE IF NOT EXISTS icd_codes (
  code        text PRIMARY KEY,
  title       text NOT NULL,
  chapter     text,
  hcc         text,
  entity_id   text,
  source      text DEFAULT 'seed',
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_icd_codes_title ON icd_codes USING gin (to_tsvector('english', title));
ALTER TABLE icd_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on icd_codes" ON icd_codes;
DROP POLICY IF EXISTS "Read icd_codes" ON icd_codes;
CREATE POLICY "Read icd_codes" ON icd_codes FOR SELECT USING (true);
`;

const POS_DDL = `
CREATE TABLE IF NOT EXISTS pos_codes (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE pos_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on pos_codes" ON pos_codes;
DROP POLICY IF EXISTS "Read pos_codes" ON pos_codes;
CREATE POLICY "Read pos_codes" ON pos_codes FOR SELECT USING (true);
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

function icdToRow(i) {
  return {
    code:    i.code,
    title:   i.title,
    hcc:     i.hcc || null,
    chapter: i.chapter || null,
    source:  'seed',
  };
}

// Mock ICD → hcc_diagnosis_gaps row. Deterministic id (member::code) makes
// the re-seed idempotent.
function gapToRow(name, i, isLinked) {
  return {
    id:               `${name}::${i.code}`,
    member_name:      name,
    code:             i.code,
    description:      i.desc,
    hcc_category:     i.hcc,
    status:           i.status || 'New',
    type:             i.type ?? null,
    docs_count:       i.docs ?? 0,
    comments_count:   i.cmts ?? 0,
    notes_count:      i.notes ?? 0,
    raf_weight:       i.raf ?? 0,
    last_activity:    i.last ?? null,
    last_activity_by: i.by ?? null,
    dismiss_reason:   i.dismissReason ?? null,
    is_linked:        isLinked,
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
    await db.query(ICD_DDL);
    console.log('  ✓ icd_codes — created / already exists');
    await db.query(POS_DDL);
    console.log('  ✓ pos_codes — created / already exists');
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

  console.log('Seeding icd_codes...');
  const icdRows = FALLBACK_ICDS.map(icdToRow);
  const { error: ie } = await supabase
    .from('icd_codes')
    .upsert(icdRows, { onConflict: 'code' });
  if (ie) { console.error('  ✗', ie.message); } else { console.log(`  ✓ ${icdRows.length} ICD codes`); }

  console.log('Seeding pos_codes...');
  const { error: pe } = await supabase
    .from('pos_codes')
    .upsert(POS_CODES.map(p => ({ code: p.code, name: p.name })), { onConflict: 'code' });
  if (pe) { console.error('  ✗', pe.message); } else { console.log(`  ✓ ${POS_CODES.length} POS codes`); }

  // Re-seed HCC gaps + member DOS dates for the modernized patients. The
  // gaps table has no (member_name, code) unique key, so we delete-then-
  // insert per member (deterministic ids keep it idempotent).
  console.log('Re-seeding HCC diagnosis gaps (V28) for modernized patients...');
  for (const name of HCC_MODERNIZED) {
    const byId = new Map();
    for (const i of (ICDS[name] || [])) byId.set(`${name}::${i.code}`, gapToRow(name, i, true));
    for (const i of (NOT_LINKED[name] || [])) {
      const id = `${name}::${i.code}`;
      if (!byId.has(id)) byId.set(id, gapToRow(name, i, false));
    }
    const rows = [...byId.values()];
    await supabase.from('hcc_diagnosis_gaps').delete().eq('member_name', name);
    const { error: ge } = await supabase.from('hcc_diagnosis_gaps').insert(rows);
    if (ge) { console.error(`  ✗ ${name}:`, ge.message); continue; }
    const mem = HCC_MEMBER_BY_NAME[name];
    if (mem?.dos_list?.length) {
      const { error: me } = await supabase
        .from('hcc_members')
        .update({ dos_list: mem.dos_list })
        .eq('name', name);
      if (me) console.error(`  ✗ ${name} dos_list:`, me.message);
    }
    console.log(`  ✓ ${name} — ${rows.length} gaps`);
  }

  // Ensure EVERY worklist member has diagnosis gaps — curated where available,
  // deterministically generated (getIcdsForMember/getNotLinkedForMember) for the
  // rest — so no patient opens an empty drawer or an empty Open-ICDs popover.
  console.log('\nSeeding diagnosis gaps for all remaining members...');
  const { data: allMembers, error: mErr } = await supabase
    .from('hcc_members')
    .select('id, name, visit_type');
  if (mErr) {
    console.error('  ✗ could not read hcc_members:', mErr.message);
  } else {
    // Give every record a visit type from the canonical set (Figma
    // 4240-110502) so the Visit Type filter surfaces the real vocabulary
    // instead of a single value. Deterministic per record id.
    const VT_CANON = [
      'AWV - Annual Wellness Visit', 'IPPE - Initial Preventive Physical Exam',
      'APE - Annual Physical Exam', 'New Patient Office Visit',
      'Established Patient Office Visit', 'Telehealth Visit', 'Specialist Visit / Consult',
    ];
    const seedHash = (s) => { let h = 2166136261; for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    let vtUpdated = 0;
    for (const m of (allMembers || [])) {
      const vt = VT_CANON[seedHash(m.id) % VT_CANON.length];
      const { error: ve } = await supabase.from('hcc_members').update({ visit_type: vt }).eq('id', m.id);
      if (!ve) vtUpdated++;
    }
    console.log(`  ✓ visit types set for ${vtUpdated} records`);

    const names = [...new Set((allMembers || []).map(m => m.name).filter(Boolean))]
      .filter(n => !HCC_MODERNIZED.includes(n)); // modernized already re-seeded above
    let seeded = 0;
    for (const name of names) {
      const byId = new Map();
      for (const i of getIcdsForMember(name)) byId.set(`${name}::${i.code}`, gapToRow(name, i, true));
      for (const i of getNotLinkedForMember(name)) {
        const id = `${name}::${i.code}`;
        if (!byId.has(id)) byId.set(id, gapToRow(name, i, false));
      }
      const rows = [...byId.values()];
      if (!rows.length) continue;
      await supabase.from('hcc_diagnosis_gaps').delete().eq('member_name', name);
      const { error: ge } = await supabase.from('hcc_diagnosis_gaps').insert(rows);
      if (ge) { console.error(`  ✗ ${name}:`, ge.message); continue; }
      seeded++;
    }
    console.log(`  ✓ seeded gaps for ${seeded} members`);
  }

  console.log('\n✅  Seed complete. Run `bun run dev` to verify.\n');
}

main().catch(err => {
  console.error('\n❌  Fatal:', err.message);
  process.exit(1);
});

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { AWV_MEMBERS } from '../src/features/awv-worklist/data/mock.js';

const PROJECT_REF      = 'osnihfqqrcchsaqhagcx';
const SUPABASE_URL     = `https://${PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD      = process.env.SUPABASE_DB_PASSWORD;

if (!SERVICE_ROLE_KEY || !DB_PASSWORD) {
  console.error('Missing credentials');
  process.exit(1);
}

const AWV_DDL = `
CREATE TABLE IF NOT EXISTS awv_members (
  id text PRIMARY KEY,
  member_id text,
  name text,
  initials text,
  gender text,
  age text,
  outreach int DEFAULT 0,
  tasks int DEFAULT 0,
  dos_list jsonb DEFAULT '[]',
  create_date text,
  due_label text,
  due_color text,
  support_name text,
  support_status text,
  provider text,
  visit_type text DEFAULT 'AWV',
  ipa text,
  place_of_service text,
  primary_care_doctor text,
  decile text,
  cohort text,
  risk_level text,
  advillness int DEFAULT 0,
  frailty int DEFAULT 0,
  language text DEFAULT 'en'
);
ALTER TABLE awv_members DISABLE ROW LEVEL SECURITY;
`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // 1. DDL using Postgres client
  console.log('Creating awv_members table...');
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
  await db.query(AWV_DDL);
  console.log('✓ awv_members table created');
  await db.end();

  // 2. Clean up hcc_members
  console.log('Cleaning up old AWV data from hcc_members...');
  const { error: delErr } = await supabase
    .from('hcc_members')
    .delete()
    .eq('visit_type', 'AWV');
  if (delErr) {
    console.error('✗ Failed to delete from hcc_members:', delErr.message);
  } else {
    console.log('✓ Removed old AWV rows from hcc_members');
  }

  // 3. Seed awv_members
  console.log('Seeding awv_members...');
  const rows = AWV_MEMBERS.map(m => {
    const dosList = m.due ? [{ date: m.due, label: m.dueLabel || '', labelColor: m.dueCol || '' }] : [];
    return {
      id: m.id,
      member_id: m.memberId,
      name: m.name,
      initials: m.in,
      gender: m.g,
      age: m.age,
      outreach: m.outreach || 0,
      tasks: m.task || 0,
      dos_list: dosList,
      create_date: m.due,
      due_label: m.dueLabel || '',
      due_color: m.dueCol || '',
      support_name: m.assignee,
      support_status: m.progSubStatus || 'New',
      provider: 'Unknown Provider',
      visit_type: 'AWV',
      ipa: 'Unknown IPA',
      place_of_service: 'Office',
      primary_care_doctor: 'Unknown Primary Care',
      decile: m.dec,
      cohort: 'AWV',
      risk_level: m.ri,
      advillness: parseInt(m.ad || 0, 10),
      frailty: parseInt(m.fr || 0, 10),
      language: 'en'
    };
  });

  const { error: insErr } = await supabase
    .from('awv_members')
    .upsert(rows, { onConflict: 'id' });

  if (insErr) {
    console.error('✗ Error inserting into awv_members:', insErr.message);
  } else {
    console.log(`✓ Successfully seeded ${rows.length} AWV members into awv_members.`);
  }
}

main();

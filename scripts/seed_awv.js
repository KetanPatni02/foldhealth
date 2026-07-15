import { createClient } from '@supabase/supabase-js';
import { AWV_MEMBERS } from '../src/features/awv-worklist/data/mock.js';

const PROJECT_REF      = 'osnihfqqrcchsaqhagcx';
const SUPABASE_URL     = `https://${PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
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
      cohort: m.progName,
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

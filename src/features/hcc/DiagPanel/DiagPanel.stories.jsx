import { HccCard } from './HccGroupRow';
import { IcdRow } from './IcdRow';
import { RoleDots } from './RoleDots';
import { CountsRow } from './CountsRow';

export default {
  title: 'HCC/DiagPanel Components',
  parameters: {
    docs: {
      description: {
        component:
          'Building blocks of the HCC Diagnosis Gaps panel: `HccCard` (expandable group of ICDs), `IcdRow` (one ICD line), `RoleDots` (per-role review progress), and `CountsRow`. Use the `example` control to flip between component states.',
      },
    },
  },
  argTypes: {
    example: {
      control: { type: 'select' },
      options: [
        'hcc-card-expanded', 'hcc-card-closed', 'icd-row', 'icd-row-dismissed',
        'role-dots-unassigned', 'role-dots-partial', 'role-dots-reviewed', 'counts-row',
      ],
      description: 'Which DiagPanel building block / state to render.',
    },
  },
  args: { example: 'hcc-card-expanded' },
};

const SAMPLE_ICDS = [
  { code: 'E11.22', desc: 'Type 2 diabetes with diabetic chronic kidney disease', hcc: 'HCC 18', status: 'New', type: 'Suspect', docs: 3, cmts: 2, notes: 0, raf: 0.302, last: '06/27/2025', by: 'A. Beauchamp (Support Team)' },
  { code: 'E11.65', desc: 'Type 2 DM with hyperglycemia', hcc: 'HCC 18', status: 'Accepted', type: 'Recapture', docs: 1, cmts: 0, notes: 1, raf: 0.195, last: '06/27/2025', by: 'Deborah Hintz (Coder)' },
  { code: 'E41.0', desc: 'Nutritional marasmus', hcc: 'HCC 18', status: 'Dismissed', type: null, docs: 1, cmts: 3, notes: 1, raf: 0.081, last: '06/27/2025', by: 'Deborah Hintz (Coder)', dismissReason: 'Not clinically supported' },
];

const EXAMPLES = {
  'hcc-card-expanded': () => (
    <div style={{ width: 560 }}>
      <HccCard hccTitle="HCC 18 - Diabetes w/ Complications" icds={SAMPLE_ICDS} rafImpact={0.302} />
    </div>
  ),
  'hcc-card-closed': () => (
    <div style={{ width: 560 }}>
      <HccCard
        hccTitle="HCC 85 - Congestive Heart Failure"
        icds={[{ ...SAMPLE_ICDS[1], status: 'Accepted' }, { ...SAMPLE_ICDS[1], code: 'I50.9', status: 'Accepted' }]}
        rafImpact={0.331}
      />
    </div>
  ),
  'icd-row': () => (
    <div style={{ width: 560, border: '1px solid var(--neutral-150)', borderRadius: 8 }}>
      <IcdRow icd={SAMPLE_ICDS[0]} />
    </div>
  ),
  'icd-row-dismissed': () => (
    <div style={{ width: 560, border: '1px solid var(--neutral-150)', borderRadius: 8 }}>
      <IcdRow icd={SAMPLE_ICDS[2]} />
    </div>
  ),
  'role-dots-unassigned': () => (
    <RoleDots member={{ supS: 'Assign', cdrS: 'Assign', r1s: 'Assign', r2s: 'Assign', r3s: 'Assign' }} />
  ),
  'role-dots-partial': () => (
    <RoleDots member={{
      sup: 'A. Beauchamp', supS: 'Completed',
      cdr: 'Deborah Hintz', cdrS: 'In Progress',
      r1: null, r1s: 'Assign',
      r2: null, r2s: 'Assign',
      r3: null, r3s: 'Assign',
    }} />
  ),
  'role-dots-reviewed': () => (
    <RoleDots member={{
      sup: 'K. Stroman', supS: 'Completed',
      cdr: 'D. Hintz', cdrS: 'Completed',
      r1: 'M. Almeda', r1s: 'Completed',
      r2: 'N. Richards', r2s: 'Completed',
      r3: 'B. Olafson', r3s: 'In Progress',
    }} />
  ),
  'counts-row': () => (
    <div style={{ width: 400 }}>
      <CountsRow icds={SAMPLE_ICDS} />
    </div>
  ),
};

export const Playground = {
  render: ({ example }) => (EXAMPLES[example] || EXAMPLES['hcc-card-expanded'])(),
};

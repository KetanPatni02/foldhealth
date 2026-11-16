// Care Gaps "View By": the same gaps grouped two ways.
//   Action    what closing the gap takes (a vital, a lab, a screening...)
//   Condition the clinical area the measure belongs to
// Groups show in the order listed; a measure not mapped goes under Other.

const ACTION_GROUPS = [
  ['Vitals', ['CBP', 'BPD', 'ABA', 'COB']],
  ['Labs', ['GSD3', 'GSD', 'DM', 'KED', 'CHL', 'LSC']],
  ['Screenings', ['BCS', 'COL', 'CCS', 'DEV']],
  ['Referrals', ['EED']],
  ['Medications', ['SUPD', 'COA-M', 'OMW', 'POLYACH', 'AMR', 'TRCMA', 'MRP']],
  ['Assessments', ['COA-FS', 'DSF-A', 'DSF-B']],
  ['Immunizations', ['CIS-CMB10', 'IMACMB2']],
  ['Visits', ['AWV', 'APE', 'WCV', 'W30A', 'W30B', 'PPC1A', 'PPC2A', 'FUH', 'FMC', 'TRCEA']],
];

const CONDITION_GROUPS = [
  ['Diabetes', ['EED', 'KED', 'GSD3', 'GSD', 'DM', 'SUPD']],
  ['Cardiovascular', ['CBP', 'BPD']],
  ['Cancer Screening', ['BCS', 'COL', 'CCS']],
  ['Older Adults', ['COA-FS', 'COA-M', 'COB', 'POLYACH']],
  ['Bone Health', ['OMW']],
  ['Behavioral Health', ['DSF-A', 'DSF-B', 'FUH', 'FMC']],
  ['Respiratory', ['AMR']],
  ['Pediatrics', ['CIS-CMB10', 'IMACMB2', 'LSC', 'DEV', 'W30A', 'W30B', 'WCV']],
  ['Maternal Health', ['PPC1A', 'PPC2A']],
  ['Transitions of Care', ['TRCEA', 'TRCMA', 'MRP']],
  ['Preventive Care', ['ABA', 'AWV', 'APE', 'CHL']],
];

export const VIEW_BY_OPTIONS = [
  { key: 'action', label: 'Action' },
  { key: 'condition', label: 'Condition' },
];

// A row's measure code: HEDIS rows carry `code`; sample rows lead their
// title with it ("EED - Eye Exam ...").
const codeOf = (item) => item.code || String(item.title || '').split(' - ')[0].trim();

// Rows (each keeping its other instances) regrouped into titled sections.
export function groupGapItems(items, viewBy) {
  const groups = viewBy === 'condition' ? CONDITION_GROUPS : ACTION_GROUPS;
  const groupOf = (code) => groups.find(([, codes]) => codes.includes(code))?.[0] || 'Other';
  const order = [...groups.map(([title]) => title), 'Other'];
  const byGroup = new Map();
  items.forEach((item) => {
    const g = groupOf(codeOf(item));
    byGroup.set(g, [...(byGroup.get(g) || []), item]);
  });
  return order.filter(t => byGroup.has(t)).map(title => ({ title, items: byGroup.get(title) }));
}

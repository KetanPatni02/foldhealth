// Reference catalog of every care-program type a user can enroll a patient
// into. This is the single source of truth for the "New Program" dropdown —
// add new program types here and they show up everywhere automatically.
// `code` is the short badge/abbreviation, `name` is the full display name.
export const CARE_PROGRAM_CATALOG = [
  { code: 'SNP', name: 'SNP Care Program' },
  { code: 'AWV', name: 'Annual Wellness Visit' },
  { code: 'HIU', name: 'High Utilizers' },
  { code: 'TCM', name: 'Transitional Care Management' },
  { code: 'TOC IP', name: 'Transitions of Care – Inpatient' },
  { code: 'TOC ED', name: 'Transitions of Care – Emergency Dept.' },
  { code: 'DM', name: 'Disease Management' },
  { code: 'APCM', name: 'Advanced Primary Care Management' },
  { code: 'HRCM', name: 'High-Risk Care Management' },
];

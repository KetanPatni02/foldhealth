export const thStyle = {
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--neutral-300)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

export function isCannotAttest(p) {
  const ambiguous = p.reasons?.some(r => r.startsWith('Ambiguous ICD-10 from EMR Mapping'));
  const chronic = p.reasons?.some(r => r.startsWith('Chronic Condition Not Selected'));
  if (!(ambiguous && chronic)) return false;
  return (p.icdCodes || []).every(c => c.documentedInLast36Months === false);
}

// Fee schedule rendered inside the column-header (i) popover.
export const CPT_RULES = [
  { label: '<2 chronic (any QMB)',   code: 'G0556', fee: 15  },
  { label: '2+ chronic, non-QMB',    code: 'G0557', fee: 50  },
  { label: '2+ chronic, QMB (dual)', code: 'G0558', fee: 110 },
];

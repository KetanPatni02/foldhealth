// Chart document generator for the ChartPopover.
//
// Builds a synthetic list of chart docs from the member's `docStatus` array
// (each entry is 'passed' | 'pending' | 'failed'). Document name + category
// cycles through CHART_DOC_NAMES so each member's chart list looks plausible.
//
// Ported from /Users/ketanp/Downloads/HCC/hcc_worklist_v2.tsx (CHART_DOC_NAMES
// lines 761–771, getChartDocs lines 772–781).

const CHART_DOC_NAMES = [
  { n: 'Progress Note.pdf',     t: 'Visit Note' },
  { n: 'Laboratory Report.pdf', t: 'Lab Report' },
  { n: 'Radiology Report.pdf',  t: 'Imaging Reports' },
  { n: 'Echocardiogram.pdf',    t: 'Cardiology' },
  { n: 'Discharge Summary.pdf', t: 'Discharge Note' },
  { n: 'Consultation Note.pdf', t: 'Consultation' },
  { n: 'ECG Report.pdf',        t: 'Cardiology' },
  { n: 'Office Visit Note.pdf', t: 'Visit Note' },
  { n: 'Imaging Report.pdf',    t: 'Radiology' },
];

export function getChartDocs(member) {
  const statusList = member?.docStatus || [];
  const dos = member?.dos || member?.dos_list?.[0]?.date || '—';
  return statusList.map((st, i) => {
    const def = CHART_DOC_NAMES[i % CHART_DOC_NAMES.length];
    const label = (st || 'pending').charAt(0).toUpperCase() + (st || 'pending').slice(1);
    return { n: def.n, meta: `${dos} · ${def.t}`, status: label };
  });
}

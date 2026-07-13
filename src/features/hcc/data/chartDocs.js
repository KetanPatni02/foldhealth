// Chart documents for the ChartPopover + ChartDetailDrawer.
//
// Three document types map to real bundled PDFs (served from /public/charts);
// anything the user uploads is appended (persisted in the store) and falls
// back to a generated note in the drawer's PDF viewer.

const KNOWN_DOCS = [
  { n: 'Progress Note.pdf',     t: 'Visit Note',      pdf: '/charts/progress-note.pdf' },
  { n: 'Laboratory Report.pdf', t: 'Lab Report',      pdf: '/charts/laboratory-report.pdf' },
  { n: 'Radiology Report.pdf',  t: 'Imaging Reports', pdf: '/charts/radiology-report.pdf' },
];

// Stable per-member key (members are `hcc-N`; fall back to name+date).
function memberKey(member) {
  return member?.id || `${member?.name || ''}|${member?.date || ''}`;
}

// Small deterministic hash so a member's default doc set is stable across
// renders (never re-randomises on each popover open).
function seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function docDate(member) {
  return member?.dos || member?.dos_list?.[0]?.date || member?.date || '—';
}

/**
 * System (pre-existing) documents for a member. Patients with no chart on file
 * (member.ch == null) stay empty. Everyone else gets a randomised-but-stable
 * count kept UNDER 3 (1 or 2), drawn from the PDF-backed known types so every
 * default doc opens a real PDF. Each doc carries the record we surface on the
 * document card: caption, type, date added and who added it.
 */
export function generateDefaultCharts(member) {
  if (member?.ch == null) return [];
  const count = 1 + (seed(memberKey(member)) % 2); // 1 or 2 → under 3
  const dos = docDate(member);
  const addedBy = `${member?.sup || 'Benjamin Cummings'} (Support Team)`;
  return KNOWN_DOCS.slice(0, count).map((d, i) => {
    const st = member?.docStatus?.[i];
    const status = st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Passed';
    return {
      id: `${memberKey(member)}::sys${i}`,
      n: d.n,
      caption: d.n,
      t: d.t,
      pdf: d.pdf,
      dateAdded: dos,
      addedBy,
      meta: `${dos} · ${d.t}`,
      status,
    };
  });
}

/**
 * Full document list. `added` are the rows persisted in Supabase
 * (hcc_added_charts) once the migration + seed have run: the seeded system
 * defaults use `::sys` ids (mirroring generateDefaultCharts) and user uploads
 * use `::upload` ids. When the seeded defaults are present we use the DB rows
 * as the source of truth (so nothing is doubled); before the seed exists we
 * fall back to generating the defaults on the client.
 */
export function getChartDocs(member, added = [], statusOverrides = {}) {
  const hasSeededDefaults = (added || []).some(d => /::sys\d+$/.test(d.id || ''));
  const base = hasSeededDefaults ? [] : generateDefaultCharts(member);
  const all = [...base, ...(added || [])];
  if (statusOverrides && Object.keys(statusOverrides).length) {
    return all.map(d => (statusOverrides[d.id] ? { ...d, status: statusOverrides[d.id] } : d));
  }
  return all;
}

// Document types offered when uploading a new chart (shared by the upload
// drawer and the inline upload panel in the Document Available drawer).
export const DOC_TYPES = [
  'Visit Note',
  'Lab Report',
  'Radiology Report',
  'Discharge Summary',
  'Referral Letter',
  'Consultation Report',
  'Other',
];

/**
 * Build the doc record for a user-uploaded chart. Shared by both upload entry
 * points so the shape stays identical. `pdf` is an object URL for an instant
 * in-session preview; once persisted, the Supabase Storage URL replaces it.
 */
export function makeUploadedChartDoc(member, { file, caption, docType }) {
  const uploadedOn = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const isPdf = file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
  const cap = (caption || '').trim();
  return {
    id: `${memberKey(member)}::upload${Date.now()}`,
    n: file?.name || cap || 'Document.pdf',
    caption: cap || file?.name || 'Document',
    t: docType,
    pdf: isPdf ? URL.createObjectURL(file) : undefined,
    dateAdded: uploadedOn,
    addedBy: 'You',
    meta: `${uploadedOn} · ${docType}`,
    status: 'Pending',
  };
}

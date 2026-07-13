// HCC worklist filter definitions.
//
// Ported from /Users/ketanp/Downloads/HCC/hcc_worklist_v2.tsx:
//   - FILTER_DEFS         (line 3382)  → which filters have UI, with their type/opts
//   - MORE_FILTER_ITEMS   (line 3680)  → master list (primary chips + extended)
//
// `type` legend (matches Phase 1b/c popover dispatcher in FilterChipBar):
//   - multi      → CheckboxListPopover (built in Phase 1b)
//   - radio      → RadioListPopover    (Phase 1c)
//   - range      → RangeSliderPopover  (Phase 1c — decile slider)
//   - team       → TeamMemberPopover   (Phase 1c)
//   - date       → DateRangePopover    (Phase 3 — deferred; preset chips for now)
//
// Adding a new filter: append it to MORE_FILTER_ITEMS (with `primary: true` to
// show by default), and add a matching FILTER_DEFS entry only if the filter
// needs a non-default popover or filter logic.

import { SYSTEM_USER_NAMES } from './systemUsers';
import { dosSourceLetter, DOS_SOURCE_LABELS, DOS_SOURCE_LABEL_TO_LETTER } from './dosSource';
import { canonicalStatus } from './statusSpec';

export const MORE_FILTER_ITEMS = [
  // Primary — shown in chip row by default. Order matches Paper 21UY.
  { k: 'my',     label: 'Measurement Year',    primary: true },
  { k: 'dos',    label: 'DOS',                 primary: true },
  { k: 'asgn',   label: 'Assignee',            primary: true },
  { k: 'cd',     label: 'Creation Date',       primary: true },
  { k: 'open',   label: 'Open ICDs',           primary: true },
  { k: 'dosSrc', label: 'DOS Source',          primary: true },
  { k: 'chart',  label: 'Documents Available', primary: true },
  { k: 'supS',   label: 'Support Team Status', primary: true },
  { k: 'cdrS',   label: 'Coder Status',        primary: true },
  { k: 'r1s',    label: 'QA Status',           primary: true },
  { k: 'r2s',    label: 'Compliance Status',   primary: true },
  { k: 'rp',     label: 'Rendering Provider',  primary: true },
  { k: 'vt',     label: 'Visit Type',          primary: true },
  { k: 'pos',    label: 'POS Code',            primary: true },
  { k: 'claims', label: 'Claims',              primary: true },
  // Extended — hidden until toggled on via MoreFiltersPopover
  { k: 'rl',     label: 'Risk Level',          primary: false },
  { k: 'coh',    label: 'Cohort',              primary: false },
  { k: 'g',      label: 'Gender',              primary: false },
  { k: 'dec',    label: 'Decile',              primary: false },
  { k: 'dob',    label: 'DOB',                 primary: false },
  { k: 'lang',   label: 'Language',            primary: false },
  { k: 'city',   label: 'City',                primary: false },
  { k: 'state',  label: 'State of Residence',  primary: false },
  { k: 'supAD',  label: 'Support Assigned Date',primary: false },
  { k: 'supCD',  label: 'Support Completion Date', primary: false },
  { k: 'cdrAD',  label: 'Coder Assigned Date', primary: false },
  { k: 'cdrCD',  label: 'Coder Completion Date',primary: false },
  { k: 'r1AD',   label: 'QA Assigned Date',    primary: false },
  { k: 'r1CD',   label: 'QA Completion Date',  primary: false },
  { k: 'r2AD',   label: 'Compliance Assigned Date',  primary: false },
  { k: 'r2CD',   label: 'Compliance Completion Date',primary: false },
  { k: 'hccG',   label: 'HCC Gaps',            primary: false },
  { k: 'lgaD',   label: 'Last Gap Assessment Date', primary: false },
  { k: 'pcp',    label: 'PCP',                 primary: false },
  { k: 'ipa',    label: 'IPA',                 primary: false },
  { k: 'hp',     label: 'HP Code',             primary: false },
  { k: 'raf',    label: 'RAF',                 primary: false },
  { k: 'gaps',   label: 'No. Of Gaps',         primary: false },
  { k: 'tin',    label: 'TIN',                 primary: false },
  { k: 'lvd',    label: 'Last Visit Date',     primary: false },
];

export const PRIMARY_FILTER_KEYS = MORE_FILTER_ITEMS.filter(x => x.primary).map(x => x.k);

export const FILTER_DEFS = [
  // Visit Type — canonical option set used across the worklist. Records get a
  // deterministic visit type from this same list in the store (see
  // normalizeWorklistRow → VT_POOL), so the filter and the data agree.
  { k: 'vt',     label: 'Visit Type',          type: 'multi', dynamic: 'vt', opts: [
    'AWV - Annual Wellness Visit',
    'IPPE - Initial Preventive Physical Exam',
    'Annual Physical Exam',
    'New Patient Office Visit',
    'Established Patient Office Visit',
    'Telehealth Visit',
    'Specialist Visit / Consult',
    'ER Visit',
    'Inpatient Visit / Admission',
    'Observation Visit',
    'Skilled Nursing Facility Visit',
    'Home Visit',
    'Hospice Visit',
    'Lab/Imaging Order',
    'Transitional Care Management (TCM) Visit',
    'Chronic Care Management (CCM)',
  ] },
  // Measurement Year — most recent first (descending).
  { k: 'my',     label: 'Measurement Year',    type: 'multi', opts: ['2026', '2025', '2024', '2023', '2022', '2021'] },
  { k: 'asgn',   label: 'Assignee',            type: 'multi', opts: SYSTEM_USER_NAMES, searchable: true },
  { k: 'dosSrc', label: 'DOS Source',          type: 'multi', opts: DOS_SOURCE_LABELS },
  { k: 'rl',     label: 'Risk Level',          type: 'multi', opts: ['Low', 'Medium', 'High'] },
  { k: 'coh',    label: 'Cohort',              type: 'multi', opts: ['PCP', 'HCC'] },
  { k: 'g',      label: 'Gender',              type: 'multi', opts: ['Male', 'Female'] },
  { k: 'open',   label: 'Open ICDs',           type: 'radio', opts: ['< 5 Gaps', '5 - 10 Gaps', '10 - 15 Gaps', '> 15 Gaps'] },
  { k: 'chart',  label: 'Documents Available', type: 'multi', opts: ['Available', 'Not Available'] },
  // Support / Coder / QA / Compliance statuses — role-specific vocabularies
  // (aligned with ROLE_STATUS_OPTIONS in statusSpec.js). Support has no "New"
  // (work arrives already actionable); Coder has record-request states; QA
  // and Compliance share the reviewer flow.
  { k: 'supS',   label: 'Support Team Status', type: 'multi', opts: ['Action Needed', 'In Progress', 'Insufficient', 'Returned', 'Completed', 'Rejected'] },
  { k: 'cdrS',   label: 'Coder Status',        type: 'multi', opts: ['New', 'In Progress', 'Record Received', 'Record Requested', 'Skipped', 'Completed', 'Rejected'] },
  { k: 'r1s',    label: 'QA Status',           type: 'multi', opts: ['New', 'In Progress', 'Returned', 'Skipped', 'Completed', 'Rejected'] },
  { k: 'r2s',    label: 'Compliance Status',   type: 'multi', opts: ['New', 'In Progress', 'Returned', 'Skipped', 'Completed', 'Rejected'] },
  { k: 'dec',    label: 'Decile',              type: 'range', opts: ['1','2','3','4','5','6','7','8','9','10'] },
  // Phase 3d — date-range filters use the shared DateRangePopover.
  // Values are stored as [startISO, endISO]; the predicate parses them
  // against the row's `date` or other date field.
  { k: 'cd',    label: 'Creation Date',       type: 'date',  field: 'date' },
  { k: 'dos',   label: 'DOS',                 type: 'date',  field: 'dos' },
  { k: 'dob',   label: 'DOB',                 type: 'date',  field: 'age', kind: 'age' },
  { k: 'lvd',   label: 'Last Visit Date',     type: 'date',  field: 'dos' },
];

export const FILTER_DEF_MAP = Object.fromEntries(FILTER_DEFS.map(d => [d.k, d]));

// Support Team Status filter buckets → the underlying member `supS` values they
// cover. The filter uses the canonical Figma vocabulary (Action Needed /
// Rebuttal / Rejected), while the mock + assignment engine still carry
// finer-grained pipeline values — so a bucket maps to one-or-more data values.
const SUPPORT_STATUS_MATCH = {
  'Action Needed': ['Action Needed', 'Assign', 'Awaiting', 'New', 'Record Requested', 'Records Requested'],
  'In Progress':   ['In Progress'],
  'Insufficient':  ['Insufficient'],
  'Rebuttal':      ['Rebuttal', 'Returned'],
  'Completed':     ['Completed', 'Record Received', 'Records Received'],
  'Rejected':      ['Rejected', 'Reject'],
};

// All DOS dates a member's row actually renders (one per dos_list entry), so
// DOS-derived filters (Measurement Year, DOS Source) agree with the per-DOS
// badges instead of only looking at the current-visit `m.dos`.
function memberDosDates(m) {
  if (Array.isArray(m.dos_list) && m.dos_list.length) return m.dos_list.map(e => e.date).filter(Boolean);
  return m.dos ? [m.dos] : [];
}

// ── Predicate helpers — given a member and the active filter state, decide
// whether the member passes. Used by the worklist `filtered` memo.

export function memberMatchesFilters(member, filters) {
  for (const [k, vals] of Object.entries(filters)) {
    if (!vals || !vals.length) continue;
    if (!matchOne(member, k, vals)) return false;
  }
  return true;
}

function matchOne(m, k, vals) {
  switch (k) {
    case 'vt':    return vals.includes(m.visitType) || vals.includes(m.vt);
    case 'rl':    return vals.includes(m.rl);
    case 'coh':   return vals.includes(m.coh);
    case 'g':     {
      const long = m.g === 'M' ? 'Male' : m.g === 'F' ? 'Female' : m.g;
      return vals.includes(m.g) || vals.includes(long);
    }
    case 'open': {
      const cnt = m.open || 0;
      return vals.some(v => {
        if (v === '< 5 Gaps') return cnt < 5;
        if (v === '5 - 10 Gaps') return cnt >= 5 && cnt <= 10;
        if (v === '10 - 15 Gaps') return cnt > 10 && cnt <= 15;
        if (v === '> 15 Gaps') return cnt > 15;
        return false;
      });
    }
    case 'chart':
      if (vals.includes('Available') && !vals.includes('Not Available')) return !!m.ch;
      if (vals.includes('Not Available') && !vals.includes('Available')) return !m.ch;
      return true;
    case 'supS': {
      const set = new Set(vals.flatMap(v => SUPPORT_STATUS_MATCH[v] || [v]));
      return set.has(m.supS);
    }
    case 'asgn': {
      // Match if any selected user is an assignee on the member (any role or
      // the current-stage owner).
      const names = [m.sup, m.cdr, m.r1, m.r2, m.assigneeName].filter(Boolean);
      return vals.some(v => names.includes(v));
    }
    case 'dosSrc': {
      // Match if ANY of the member's DOS entries maps to a selected source,
      // matching the per-DOS badges shown on the row.
      const letters = new Set(memberDosDates(m).map(dosSourceLetter));
      return vals.some(v => letters.has(DOS_SOURCE_LABEL_TO_LETTER[v]));
    }
    case 'my': {
      // Measurement Year = the service year of any of the member's DOS entries.
      const years = new Set(
        memberDosDates(m).map(d => parseMdY(d)).filter(Boolean).map(d => String(d.getFullYear())),
      );
      return vals.some(v => years.has(v));
    }
    // Coder Status — normalize both sides (data carries plural "Records …"
    // forms; the canonical option labels are singular).
    case 'cdrS':  return vals.some(v => canonicalStatus(v) === canonicalStatus(m.cdrS));
    case 'r1s':   return vals.includes(m.r1s);
    case 'r2s':   return vals.includes(m.r2s);
    case 'dec': {
      if (vals.length >= 2) {
        const mn = parseInt(vals[0], 10);
        const mx = parseInt(vals[1], 10);
        const d = parseInt(m.dec, 10) || 0;
        return d >= mn && d <= mx;
      }
      return vals.includes(String(m.dec));
    }
    // Date-range filters (Phase 3d). Values are [startISO, endISO].
    case 'cd':
      return matchDateRange(m.date, vals, 'mdY');
    case 'dos':
      // Match if ANY of the member's DOS entries falls in the range (the row
      // renders every dos_list date, not just the current visit).
      return memberDosDates(m).some(d => matchDateRange(d, vals, 'mdY'));
    case 'lvd':
      return matchDateRange(m.dos, vals, 'mdY');
    case 'dob': {
      // No DOB on the row — fall back to age-bucket containment (rough).
      if (vals.length < 2) return true;
      const ageNum = parseInt(String(m.age || '').match(/(\d+)/)?.[1] || '0', 10);
      const start = new Date(vals[0]);
      const end = new Date(vals[1]);
      const today = new Date();
      const inferred = new Date(today.getFullYear() - ageNum, 0, 1);
      return inferred >= start && inferred <= end;
    }
    // Filters with no current predicate pass-through
    default: return true;
  }
}

// Parse "MM/DD/YYYY" → Date (local midnight). Returns null for empties.
function parseMdY(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
}

// Parse "YYYY-MM-DD" → Date (local midnight). `new Date(iso)` would parse it as
// UTC midnight, which shifts the day in non-UTC timezones and drops rows that
// sit exactly on a range boundary — so parse it in the same frame as parseMdY.
function parseIsoLocal(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function matchDateRange(value, vals /* [startISO, endISO] */, format) {
  if (vals.length < 2) return true;
  const target = format === 'mdY' ? parseMdY(value) : new Date(value);
  if (!target || isNaN(+target)) return false;
  const start = parseIsoLocal(vals[0]);
  const end = parseIsoLocal(vals[1]);
  if (!start || !end) return false;
  end.setHours(23, 59, 59, 999); // inclusive of the end day
  return target >= start && target <= end;
}

export function countActiveFilters(filters) {
  return Object.values(filters || {}).filter(v => Array.isArray(v) && v.length > 0).length;
}

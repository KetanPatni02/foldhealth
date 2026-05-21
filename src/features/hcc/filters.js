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

export const MORE_FILTER_ITEMS = [
  // Primary — shown in chip row by default
  { k: 'my',    label: 'Measurement Year',     primary: true },
  { k: 'rl',    label: 'Risk Level',           primary: true },
  { k: 'coh',   label: 'Cohort',               primary: true },
  { k: 'g',     label: 'Gender',               primary: true },
  { k: 'open',  label: 'Open ICDs',            primary: true },
  { k: 'chart', label: 'Chart Available',      primary: true },
  { k: 'supS',  label: 'Support Status',       primary: true },
  { k: 'cdrS',  label: 'Coder Status',         primary: true },
  { k: 'r1s',   label: 'Reviewer 1 Status',    primary: true },
  { k: 'dec',   label: 'Decile',               primary: true },
  // Extended — hidden until toggled on via MoreFiltersPopover
  { k: 'cd',    label: 'Create Date',          primary: false },
  { k: 'dob',   label: 'DOB',                  primary: false },
  { k: 'lang',  label: 'Language',             primary: false },
  { k: 'city',  label: 'City',                 primary: false },
  { k: 'state', label: 'State of Residence',   primary: false },
  { k: 'supAD', label: 'Support Assigned Date',primary: false },
  { k: 'supCD', label: 'Support Completion Date', primary: false },
  { k: 'cdrAD', label: 'Coder Assigned Date',  primary: false },
  { k: 'cdrCD', label: 'Coder Completion Date',primary: false },
  { k: 'r1AD',  label: 'Rev 1 Assigned Date',  primary: false },
  { k: 'r1CD',  label: 'Rev 1 Completion Date',primary: false },
  { k: 'r2s',   label: 'Reviewer 2 Status',    primary: false },
  { k: 'r2AD',  label: 'Rev 2 Assigned Date',  primary: false },
  { k: 'r2CD',  label: 'Rev 2 Completion Date',primary: false },
  { k: 'hccG',  label: 'HCC Gaps',             primary: false },
  { k: 'lgaD',  label: 'Last Gap Assessment Date', primary: false },
  { k: 'pcp',   label: 'PCP',                  primary: false },
  { k: 'ipa',   label: 'IPA',                  primary: false },
  { k: 'hp',    label: 'HP Code',              primary: false },
  { k: 'raf',   label: 'RAF',                  primary: false },
  { k: 'gaps',  label: 'No. Of Gaps',          primary: false },
  { k: 'tin',   label: 'TIN',                  primary: false },
  { k: 'lvd',   label: 'Last Visit Date',      primary: false },
  { k: 'vt',    label: 'Visit Type',           primary: false },
];

export const PRIMARY_FILTER_KEYS = MORE_FILTER_ITEMS.filter(x => x.primary).map(x => x.k);

export const FILTER_DEFS = [
  { k: 'my',    label: 'Measurement Year',    type: 'multi', opts: ['2021', '2022', '2023', '2024', '2025'] },
  { k: 'rl',    label: 'Risk Level',          type: 'multi', opts: ['Low', 'Medium', 'High'] },
  { k: 'coh',   label: 'Cohort',              type: 'multi', opts: ['PCP', 'HCC'] },
  { k: 'g',     label: 'Gender',              type: 'multi', opts: ['Male', 'Female'] },
  { k: 'open',  label: 'Open ICDs',           type: 'radio', opts: ['< 5 Gaps', '5 - 10 Gaps', '10 - 15 Gaps', '> 15 Gaps'] },
  { k: 'chart', label: 'Chart Available',     type: 'multi', opts: ['Available', 'Not Available'] },
  { k: 'supS',  label: 'Support Status',      type: 'multi', opts: ['Assign', 'In Progress', 'Completed', 'Record Requested', 'Returned'] },
  { k: 'cdrS',  label: 'Coder Status',        type: 'multi', opts: ['Assign', 'In Progress', 'Completed', 'Record Requested', 'Returned'] },
  { k: 'r1s',   label: 'Reviewer 1 Status',   type: 'multi', opts: ['Assign', 'New', 'In Progress', 'Completed'] },
  { k: 'r2s',   label: 'Reviewer 2 Status',   type: 'multi', opts: ['Assign', 'New', 'In Progress', 'Completed'] },
  { k: 'dec',   label: 'Decile',              type: 'range', opts: ['1','2','3','4','5','6','7','8','9','10'] },
  // Phase 3d — date-range filters use the shared DateRangePopover.
  // Values are stored as [startISO, endISO]; the predicate parses them
  // against the row's `date` or other date field.
  { k: 'cd',    label: 'Create Date',         type: 'date',  field: 'date' },
  { k: 'dob',   label: 'DOB',                 type: 'date',  field: 'age', kind: 'age' },
  { k: 'lvd',   label: 'Last Visit Date',     type: 'date',  field: 'dos' },
];

export const FILTER_DEF_MAP = Object.fromEntries(FILTER_DEFS.map(d => [d.k, d]));

// ── Predicate helpers — given a member and the active filter state, decide
// whether the member passes. Used by the worklist `filtered` memo.

const numeric = (x) => parseFloat(x) || 0;

export function memberMatchesFilters(member, filters) {
  for (const [k, vals] of Object.entries(filters)) {
    if (!vals || !vals.length) continue;
    if (!matchOne(member, k, vals)) return false;
  }
  return true;
}

function matchOne(m, k, vals) {
  switch (k) {
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
    case 'supS':  return vals.includes(m.supS);
    case 'cdrS':  return vals.includes(m.cdrS);
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

// Parse "MM/DD/YYYY" → Date. Returns null for empties.
function parseMdY(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
}

function matchDateRange(value, vals /* [startISO, endISO] */, format) {
  if (vals.length < 2) return true;
  const target = format === 'mdY' ? parseMdY(value) : new Date(value);
  if (!target || isNaN(+target)) return false;
  const start = new Date(vals[0]);
  const end = new Date(vals[1]);
  return target >= start && target <= end;
}

export function countActiveFilters(filters) {
  return Object.values(filters || {}).filter(v => Array.isArray(v) && v.length > 0).length;
}

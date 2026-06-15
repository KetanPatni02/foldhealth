// HCC worklist column metadata — single source of truth for header labels,
// sort keys, and the keys exposed in the column-config popover.
//
// `k`  — internal column key (also drives `data-col` attributes on cells)
// `lb` — display label
// `sortable` — true if the column should open a SortPopover on header click
//
// Sticky Member (always-visible identity column) and Actions are intentionally
// excluded — they're rendered separately and can't be hidden.

// `sortField` is the property on the member row that drives the sort comparison.
// If omitted, defaults to `k` (works when the column key matches the data field).
export const HCC_COLUMNS = [
  { k: 'dos',     lb: 'DOS',                 sortable: true,  sortField: 'dos' },
  { k: 'open',    lb: 'Open ICDs',           sortable: true,  sortField: 'open' },
  { k: 'date',    lb: 'Create Date',         sortable: true,  sortField: 'date' },
  { k: 'evidence',lb: 'Document Available',  sortable: true,  sortField: 'ch' },
  // Current assignee — derived from the assignment engine. Shows whoever is
  // actively working the DOS right now (e.g. if the DOS is in R2's bucket,
  // shows the R2 reviewer). Sorted by the assignee's display name.
  { k: 'assignee',lb: 'Assignee',            sortable: true,  sortField: 'assigneeName' },
  { k: 'sup',     lb: 'Support Team',        sortable: true,  sortField: 'supS' },
  { k: 'cdr',     lb: 'Coder',               sortable: true,  sortField: 'cdrS' },
  { k: 'r1',      lb: 'Reviewer 1',          sortable: true,  sortField: 'r1s' },
  { k: 'r2',      lb: 'Reviewer 2',          sortable: true,  sortField: 'r2s' },
  { k: 'r3',      lb: 'Reviewer 3',          sortable: true,  sortField: 'r3s' },
  { k: 'rp',      lb: 'Rendering Provider',  sortable: true,  sortField: 'rp' },
  { k: 'pos',     lb: 'POS Code',            sortable: false },
  { k: 'posDesc', lb: 'POS Description',     sortable: false },
  { k: 'raf',     lb: 'RAF Score',           sortable: true,  sortField: 'raf' },
  { k: 'ri',      lb: 'RAF Impact',          sortable: true,  sortField: 'ri' },
  { k: 'ipa',     lb: 'IPA',                 sortable: false },
  { k: 'hp',      lb: 'HP Code',             sortable: false },
  { k: 'pcp',     lb: 'PCP',                 sortable: true,  sortField: 'pcp' },
  { k: 'dec',     lb: 'Decile',              sortable: true,  sortField: 'dec' },
  { k: 'coh',     lb: 'Cohort',              sortable: false },
  { k: 'rl',      lb: 'Risk Level',          sortable: true,  sortField: 'rl' },
  { k: 'ad',      lb: 'Advillness',          sortable: true,  sortField: 'ad' },
  { k: 'fr',      lb: 'Frailty',             sortable: true,  sortField: 'fr' },
];

export const HCC_COL_MAP = Object.fromEntries(HCC_COLUMNS.map(c => [c.k, c]));

// Apply a user-defined key order to a column descriptor list. Unknown keys in
// `order` are ignored; columns missing from `order` are appended in their
// original position. Returns a new array — never mutates inputs.
export function orderColumns(columns, order) {
  if (!order || !order.length) return columns;
  const byKey = Object.fromEntries(columns.map(c => [c.k, c]));
  const seen = new Set();
  const ordered = [];
  for (const k of order) {
    if (byKey[k] && !seen.has(k)) { ordered.push(byKey[k]); seen.add(k); }
  }
  for (const c of columns) {
    if (!seen.has(c.k)) ordered.push(c);
  }
  return ordered;
}

// Member-column sort axes — drives the MemberSortPopover trigger on the Member header.
export const MEMBER_SORT_ITEMS = [
  { key: 'name_first', label: 'First Name' },
  { key: 'name_last',  label: 'Last Name' },
  { key: 'g',          label: 'Gender' },
  { key: 'dob',        label: 'DOB Year' },
];

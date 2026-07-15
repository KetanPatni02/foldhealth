import { useMemo } from 'react';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import styles from './DiagPanelFilterBar.module.css';

// Fixed vocabulary for status buckets — matches the values `addHccGap` and
// the DOS-action reducer produce. Kept static so an empty ICD list still
// exposes the full option set (Figma 9810:158181).
const ICD_STATUS_OPTIONS = ['New', 'In Progress', 'Accepted', 'Dismissed'];

const parseDate = (mmddyyyy) => {
  if (!mmddyyyy || typeof mmddyyyy !== 'string') return null;
  const [m, d, y] = mmddyyyy.split('/');
  if (!m || !d || !y) return null;
  return { y, m, d, key: `${y}-${m}-${d}` };
};

/**
 * DiagPanelFilterBar — filter row shown under the DiagPanel toolbar when the
 * Filter icon is active (Figma 9810:158181). Six FilterChips + Clear All.
 *
 * The parent owns `filters` state and passes each option list here; this
 * component is a thin presentational wrapper so the same predicate can be
 * used to narrow both the associated-ICD grid and the suspect group below.
 */
export function DiagPanelFilterBar({
  filters,
  icds = [],
  member,
  onChange,
  onClearAll,
}) {
  // Options are derived from the ICDs currently attached to the record so the
  // dropdown only lists values a user can actually match. Kept in useMemo so
  // clicking through chips doesn't recompute on every render.
  const options = useMemo(() => {
    const years   = new Set();
    const hccs    = new Set();
    const byList  = new Set();
    const lastRec = new Set();

    for (const i of icds) {
      const parsed = parseDate(i.last);
      if (parsed) {
        years.add(parsed.y);
        lastRec.add(i.last);
      }
      if (i.hcc) hccs.add((i.hcc || '').split(' - ')[0].trim());
      if (i.by)  byList.add(i.by);
    }
    return {
      years:   [...years].sort().reverse(),
      hcc:     [...hccs].sort(),
      by:      [...byList].sort(),
      lastRec: [...lastRec].sort().reverse(),
      created: member?.date ? [member.date] : [],
    };
  }, [icds, member?.date]);

  const set = (key) => (vals) => onChange({ ...filters, [key]: vals });

  return (
    <div className={styles.bar}>
      <FilterChip
        label="Measurement Year"
        options={options.years}
        selected={filters.year || []}
        onChange={set('year')}
      />
      <FilterChip
        label="HCC Status"
        options={options.hcc}
        selected={filters.hcc || []}
        onChange={set('hcc')}
      />
      <FilterChip
        label="ICD Status"
        options={ICD_STATUS_OPTIONS}
        selected={filters.status || []}
        onChange={set('status')}
      />
      <FilterChip
        label="Recorded By"
        options={options.by}
        selected={filters.by || []}
        onChange={set('by')}
      />
      <FilterChip
        label="Created Date"
        options={options.created}
        selected={filters.created || []}
        onChange={set('created')}
      />
      <FilterChip
        label="Last Recorded Date"
        options={options.lastRec}
        selected={filters.lastRec || []}
        onChange={set('lastRec')}
      />
      <button type="button" className={styles.clearBtn} onClick={onClearAll}>
        <span className={styles.clearIcon} aria-hidden="true">⊗</span>
        Clear All
      </button>
    </div>
  );
}

// Shared predicate — kept exported so the DiagPanel can filter every ICD
// list (associated + suspect + closed + overridden) through the same rules.
export function icdMatchesFilters(icd, filters, memberCreatedDate) {
  const noneActive = !Object.values(filters || {}).some(v => v && v.length);
  if (noneActive) return true;

  const parsed = parseDate(icd.last);
  if (filters.year?.length && !(parsed && filters.year.includes(parsed.y))) return false;
  if (filters.lastRec?.length && !(icd.last && filters.lastRec.includes(icd.last))) return false;

  if (filters.hcc?.length) {
    const hccShort = (icd.hcc || '').split(' - ')[0].trim();
    if (!filters.hcc.includes(hccShort)) return false;
  }

  if (filters.status?.length && !filters.status.includes(icd.status)) return false;
  if (filters.by?.length && !filters.by.includes(icd.by)) return false;

  // Created Date filter applies at the record level; if a record's created
  // date isn't in the selected set, every ICD is hidden. Otherwise (or when
  // no created-date chip is active) the ICD passes.
  if (filters.created?.length && !filters.created.includes(memberCreatedDate)) return false;

  return true;
}

export const activeFilterCount = (filters) =>
  Object.values(filters || {}).filter(v => v && v.length).length;

export const EMPTY_FILTERS = {
  year: [], hcc: [], status: [], by: [], created: [], lastRec: [],
};

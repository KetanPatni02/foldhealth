import { useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { FilterChip } from '../FilterChip/FilterChip';
import { useAppStore } from '../../store/useAppStore';
import { FilterNameDialog } from '../../features/hcc/FilterNameDialog';
import { MoreFiltersPopover } from '../../features/hcc/MoreFiltersPopover';
import styles from './FilterBar.module.css';

// `primary: true` chips render by default; `primary: false` chips are hidden
// until the user opts them in via the More Filters popover. Mirrors HCC's
// PRIMARY_FILTER_KEYS split.
const FILTER_DEFS = [
  { key: 'gender', label: 'Gender', primary: true, options: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' },
  ]},
  { key: 'language', label: 'Language', primary: true, options: [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'zh', label: 'Chinese' },
    { value: 'yue', label: 'Cantonese' },
    { value: 'ko', label: 'Korean' },
    { value: 'vi', label: 'Vietnamese' },
  ]},
  { key: 'lace', label: 'LACE Acuity', primary: true, options: [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ]},
  { key: 'tocStatus', label: 'TOC Status', primary: true, options: [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'attempted', label: 'Attempted' },
    { value: 'new', label: 'New' },
  ]},
  { key: 'status', label: 'Status', primary: true, options: [
    { value: 'completed', label: 'Completed' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'oncall', label: 'On Call' },
    { value: 'queued', label: 'Queued' },
    { value: 'failed', label: 'Failed' },
  ]},
  { key: 'assignee', label: 'Assigned to', primary: true, optionsFromData: true },
  { key: 'outreachType', label: 'Outreach Window', primary: true, options: [
    { value: '48h', label: 'TOC 48h' },
    { value: '7d', label: 'TOC 7d' },
  ]},
  { key: 'tocType', label: 'Trigger Type', primary: false, options: [
    { value: 'IP', label: 'IP (Inpatient)' },
    { value: 'ED', label: 'ED (Emergency)' },
  ]},
  { key: 'readmission', label: 'Readmission', primary: false, options: [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ]},
  { key: 'carePlanStatus', label: 'Care Plan', primary: false, options: [
    { value: 'updated', label: 'Updated' },
    { value: 'pending', label: 'Pending' },
    { value: 'none', label: 'No Care Plan' },
  ]},
  { key: 'priority', label: 'Priority', primary: false, options: [
    { value: '1', label: 'Critical' },
    { value: '2', label: 'High' },
    { value: '3', label: 'Medium' },
    { value: '4', label: 'Low' },
  ]},
  { key: 'outreachCategory', label: 'Outreach Category', primary: false, options: [
    { value: 'post-visit', label: 'Post-Visit' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'refill', label: 'Refill' },
    { value: 'care-gap', label: 'Care Gap' },
    { value: 'waitlist', label: 'Waitlist' },
  ]},
  { key: 'agentAssigned', label: 'Agent', primary: false, optionsFromData: true },
];

// Shape expected by MoreFiltersPopover.
const MORE_FILTER_ITEMS = FILTER_DEFS.map(fd => ({ k: fd.key, label: fd.label, primary: fd.primary }));
const PRIMARY_FILTER_KEYS = FILTER_DEFS.filter(fd => fd.primary).map(fd => fd.key);
const DEF_BY_KEY = Object.fromEntries(FILTER_DEFS.map(fd => [fd.key, fd]));
const KEY_ORDER = Object.fromEntries(FILTER_DEFS.map((fd, i) => [fd.key, i]));

// Resolve a filter def's options — either static, or derived from the live
// patient rows (optionsFromData). Kept here so the shared FilterChip stays
// data-agnostic.
function resolveOptions(filterDef, patients) {
  if (filterDef.optionsFromData) {
    const unique = [...new Set((patients || []).map(p => p[filterDef.key]).filter(Boolean))];
    return unique.sort().map(a => ({ value: a, label: a }));
  }
  return filterDef.options || [];
}

// The shared FilterChip is multi-select and takes plain-string options +
// `selected: string[]` + `onChange(string[])`. Our TOC filters are stored
// as a single value per key (activeFilters[key] = value). This adapter
// bridges the two: it renders labels in the popover, converts the current
// value → single-element `selected`, and on change picks the last value
// to write back to setFilter. Passing `null` clears the filter.
function SingleSelectFilter({ label, def, options, current, onSet, onClear }) {
  const valueByLabel = new Map(options.map(o => [o.label, o.value]));
  const labelByValue = new Map(options.map(o => [o.value, o.label]));
  const stringOptions = options.map(o => o.label);
  const selected = current != null && labelByValue.has(current)
    ? [labelByValue.get(current)]
    : [];
  const handleChange = (nextLabels) => {
    if (!nextLabels || nextLabels.length === 0) {
      onClear();
      return;
    }
    // Single-select semantics — keep only the most-recently added label.
    const pick = nextLabels.find(l => !selected.includes(l)) || nextLabels[nextLabels.length - 1];
    const nextValue = valueByLabel.get(pick);
    if (nextValue == null) return;
    onSet(nextValue);
  };
  return (
    <FilterChip
      label={label}
      options={stringOptions}
      selected={selected}
      onChange={handleChange}
      searchable={!!def.optionsFromData}
    />
  );
}

export function FilterBar() {
  const viewBy = useAppStore(s => s.viewBy);
  const setViewBy = useAppStore(s => s.setViewBy);
  const activeFilters = useAppStore(s => s.activeFilters);
  const setFilter = useAppStore(s => s.setFilter);
  const clearAllFilters = useAppStore(s => s.clearAllFilters);
  const patients = useAppStore(s => s.patients);
  // Saved-filter integration — dispatches to the right per-list bucket
  // (TOC / SNP / AWV / High Utilizers / DM, …) based on the active list.
  const activeSubnavList = useAppStore(s => s.activeSubnavList);
  const saveSavedFilter = useAppStore(s => s.saveSavedFilter);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Which chips the user has explicitly opted into via the More Filters
  // popover. `null` = default (show PRIMARY_FILTER_KEYS). Local to the
  // FilterBar's lifetime; matches HCC's `visibleKeys` UX pattern.
  const [customVisible, setCustomVisible] = useState(null);
  const moreBtnRef = useRef(null);
  const [moreRect, setMoreRect] = useState(null);

  const activeCount = Object.keys(activeFilters).length;
  const hasActive = activeCount > 0;
  // The list label this Save button writes to. Defaults to TOC when no
  // shared list is selected (the FilterBar's natural home).
  const listForSave = activeSubnavList || 'TOC';

  // Any chip that has a value must remain visible even if it's not in the
  // primary set — otherwise applying a saved filter could hide its own chip.
  const activeKeys = useMemo(
    () => Object.keys(activeFilters).filter(k => activeFilters[k] != null),
    [activeFilters],
  );
  const orderKeys = (keys) => [...new Set(keys)].sort(
    (a, b) => (KEY_ORDER[a] ?? 99) - (KEY_ORDER[b] ?? 99),
  );
  const visibleKeys = useMemo(() => {
    const base = customVisible ?? PRIMARY_FILTER_KEYS;
    return orderKeys([...base, ...activeKeys]);
  }, [customVisible, activeKeys]);
  const visibleSet = useMemo(() => new Set(visibleKeys), [visibleKeys]);

  const toggleVisible = (k) => {
    setCustomVisible(prev => {
      const base = prev ?? PRIMARY_FILTER_KEYS;
      const next = new Set(base);
      if (next.has(k)) next.delete(k); else next.add(k);
      return [...next];
    });
  };

  const openMore = () => {
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) setMoreRect(rect);
  };
  const closeMore = () => setMoreRect(null);

  return (
    <div className={styles.filterBar}>
      {/* Row 1: View By toggle + all filter chips + Clear All + Save Filter */}
      <div className={styles.filterRow}>
        <div className={styles.viewByToggle}>
          <button
            className={[styles.viewByBtn, viewBy === 'window' ? styles.active : ''].filter(Boolean).join(' ')}
            onClick={() => setViewBy('window')}
          >
            <Icon name="solar:sort-from-top-to-bottom-bold" size={14} />
            Outreach Window
          </button>
          <button
            className={[styles.viewByBtn, viewBy === 'status' ? styles.active : ''].filter(Boolean).join(' ')}
            onClick={() => setViewBy('status')}
          >
            <Icon name="solar:list-down-bold" size={14} />
            Outreach Status
          </button>
        </div>

        {visibleKeys.map(k => {
          const fd = DEF_BY_KEY[k];
          if (!fd) return null;
          return (
            <SingleSelectFilter
              key={fd.key}
              label={fd.label}
              def={fd}
              options={resolveOptions(fd, patients)}
              current={activeFilters[fd.key] || null}
              onSet={(val) => setFilter(fd.key, val)}
              onClear={() => setFilter(fd.key, null)}
            />
          );
        })}

        {/* Tail cluster — More Filters + Clear All + Save Filter sit together
            immediately after the last chip, matching HCC's FilterChipBar so
            the two worklists behave the same way. */}
        <div className={styles.tail}>
          <button
            ref={moreBtnRef}
            type="button"
            className={[styles.moreBtn, moreRect ? styles.moreBtnActive : ''].join(' ')}
            onClick={moreRect ? closeMore : openMore}
          >
            More Filters
            <Icon
              name="solar:alt-arrow-down-linear"
              size={11}
              color={moreRect ? 'var(--primary-300)' : 'var(--neutral-300)'}
            />
          </button>

          {hasActive && (
            <>
              <span className={styles.vDivider} />
              <button className={styles.clearAll} onClick={clearAllFilters}>
                Clear All
              </button>
              <span className={styles.vDivider} />
              <button
                className={styles.saveFilter}
                onClick={() => setSaveDialogOpen(true)}
              >
                Save Filter
              </button>
            </>
          )}
        </div>
      </div>

      {moreRect && (
        <MoreFiltersPopover
          anchorRect={moreRect}
          visibleKeys={visibleKeys}
          moreFilterItems={MORE_FILTER_ITEMS}
          onToggle={toggleVisible}
          onClear={() => setCustomVisible([])}
          onClose={closeMore}
        />
      )}

      <FilterNameDialog
        open={saveDialogOpen}
        title="Save Filter"
        submitLabel="Save & Apply"
        initialName=""
        onSubmit={(name) => { saveSavedFilter(listForSave, name); setSaveDialogOpen(false); }}
        onCancel={() => setSaveDialogOpen(false)}
      />
    </div>
  );
}

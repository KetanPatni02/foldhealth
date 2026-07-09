import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { FilterChip } from '../FilterChip/FilterChip';
import { useAppStore } from '../../store/useAppStore';
import { FilterNameDialog } from '../../features/hcc/FilterNameDialog';
import styles from './FilterBar.module.css';

const FILTER_DEFS = [
  { key: 'gender', label: 'Gender', options: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' },
  ]},
  { key: 'language', label: 'Language', options: [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'zh', label: 'Chinese' },
    { value: 'yue', label: 'Cantonese' },
    { value: 'ko', label: 'Korean' },
    { value: 'vi', label: 'Vietnamese' },
  ]},
  { key: 'lace', label: 'LACE Acuity', options: [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ]},
  { key: 'tocStatus', label: 'TOC Status', options: [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'attempted', label: 'Attempted' },
    { value: 'new', label: 'New' },
  ]},
  { key: 'status', label: 'Status', options: [
    { value: 'completed', label: 'Completed' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'oncall', label: 'On Call' },
    { value: 'queued', label: 'Queued' },
    { value: 'failed', label: 'Failed' },
  ]},
  { key: 'assignee', label: 'Assigned to', optionsFromData: true },
  { key: 'outreachType', label: 'Outreach Window', options: [
    { value: '48h', label: 'TOC 48h' },
    { value: '7d', label: 'TOC 7d' },
  ]},
  { key: 'tocType', label: 'Trigger Type', options: [
    { value: 'IP', label: 'IP (Inpatient)' },
    { value: 'ED', label: 'ED (Emergency)' },
  ]},
  { key: 'readmission', label: 'Readmission', options: [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ]},
  { key: 'carePlanStatus', label: 'Care Plan', options: [
    { value: 'updated', label: 'Updated' },
    { value: 'pending', label: 'Pending' },
    { value: 'none', label: 'No Care Plan' },
  ]},
  { key: 'priority', label: 'Priority', options: [
    { value: '1', label: 'Critical' },
    { value: '2', label: 'High' },
    { value: '3', label: 'Medium' },
    { value: '4', label: 'Low' },
  ]},
  { key: 'outreachCategory', label: 'Outreach Category', options: [
    { value: 'post-visit', label: 'Post-Visit' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'refill', label: 'Refill' },
    { value: 'care-gap', label: 'Care Gap' },
    { value: 'waitlist', label: 'Waitlist' },
  ]},
  { key: 'agentAssigned', label: 'Agent', optionsFromData: true },
];

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

  const activeCount = Object.keys(activeFilters).length;
  const hasActive = activeCount > 0;
  // The list label this Save button writes to. Defaults to TOC when no
  // shared list is selected (the FilterBar's natural home).
  const listForSave = activeSubnavList || 'TOC';

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

        {FILTER_DEFS.map(fd => (
          <FilterChip
            key={fd.key}
            label={fd.label}
            value={activeFilters[fd.key] || null}
            options={resolveOptions(fd, patients)}
            searchable={!!fd.optionsFromData}
            onSet={(val) => setFilter(fd.key, val)}
            onClear={() => setFilter(fd.key, null)}
          />
        ))}

        {hasActive && (
          <span className={styles.activeCount}>{activeCount} active</span>
        )}
        <button className={styles.clearAll} onClick={clearAllFilters}>Clear All</button>
        {hasActive && (
          <button
            className={styles.saveFilter}
            onClick={() => setSaveDialogOpen(true)}
          >
            Save Filter
          </button>
        )}
      </div>

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

import { useMemo, useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { matchesFoldId } from '../../lib/foldId';
import { WorklistRow } from '../toc-worklist/WorklistRow';
import { BulkBar } from '../../components/BulkBar/BulkBar';
import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';
import { ErrorState } from '../../components/ErrorState/ErrorState';
import { Icon } from '../../components/Icon/Icon';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import filterStyles from '../../components/FilterBar/FilterBar.module.css';
import styles from './SchedulingList.module.css';

const CITIES = [
  ['Queens', 'NY'], ['Brooklyn', 'NY'], ['Manhattan', 'NY'], ['Bronx', 'NY'],
  ['Newark', 'NJ'], ['Jersey City', 'NJ'], ['Stamford', 'CT'], ['Yonkers', 'NY'],
  ['Paterson', 'NJ'], ['Hoboken', 'NJ'], ['White Plains', 'NY'], ['Hempstead', 'NY'],
];
const PCPS = [
  { name: 'Dr. Sarah Chen', init: 'SC' },
  { name: 'Dr. James Park', init: 'JP' },
  { name: 'Dr. Elena Rodriguez', init: 'ER' },
  { name: 'Dr. Michael Lee', init: 'ML' },
  { name: 'Dr. Priya Patel', init: 'PP' },
  { name: 'Dr. David Kim', init: 'DK' },
];

const PROVIDER_OPTIONS = PCPS.map(p => ({ value: p.name, label: p.name }));
const LOCATION_OPTIONS = [
  ...new Set(CITIES.map(([city, state]) => `${city}, ${state}`))
].map(loc => ({ value: loc, label: loc }));

const TH_STYLE = {
  padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)',
  borderBottom: '1px solid var(--neutral-150)', background: 'var(--neutral-0)',
  position: 'sticky', top: 0, zIndex: 2, textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick(arr, seed) { return arr[seed % arr.length]; }

function enrichPatient(p) {
  const seed = hash(p.id || '');
  const [city, state] = pick(CITIES, seed);
  const pcp = pick(PCPS, seed >> 3);
  return {
    ...p,
    location: `${city}, ${state}`,
    provider: pcp.name,
    providerInitials: pcp.init,
  };
}

function FilterChip({ label, options, value, onSet, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedLabel = value ? options.find(o => o.value === value)?.label || value : null;

  return (
    <div className={filterStyles.chipWrap} ref={ref}>
      <button
        className={[filterStyles.chip, value ? filterStyles.active : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen(v => !v)}
      >
        {label}
        {selectedLabel && <>
          <span style={{ color: 'var(--primary-200)' }}>:</span>
          <span className={filterStyles.chipValue}>{selectedLabel}</span>
        </>}
        {value ? (
          <span
            className={filterStyles.chipClear}
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
          >
            ✕
          </span>
        ) : (
          <Icon name="solar:alt-arrow-down-linear" size={14} />
        )}
      </button>
      {open && (
        <div className={filterStyles.dropdown}>
          {options.map(opt => (
            <button
              key={opt.value}
              className={[filterStyles.dropdownItem, value === opt.value ? filterStyles.selected : ''].filter(Boolean).join(' ')}
              onClick={() => {
                if (value === opt.value) onClear();
                else onSet(opt.value);
                setOpen(false);
              }}
            >
              <span className={filterStyles.dropdownCheck}>
                {value === opt.value ? '✓' : ''}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SchedulingListTable() {
  const patients = useAppStore(s => s.patients);
  const patientsLoading = useAppStore(s => s.patientsLoading);
  const patientsError = useAppStore(s => s.patientsError);
  const fetchPatients = useAppStore(s => s.fetchPatients);
  const selectedIds = useAppStore(s => s.selectedIds);
  const selectPatient = useAppStore(s => s.selectPatient);
  const selectAll = useAppStore(s => s.selectAll);
  const clearSelected = useAppStore(s => s.clearSelected);
  const currentPage = useAppStore(s => s.currentPage);
  const perPage = useAppStore(s => s.perPage);
  const showToast = useAppStore(s => s.showToast);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [providerFilter, setProviderFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  const enriched = useMemo(() => patients.map(enrichPatient), [patients]);

  const filtered = useMemo(() => {
    let result = enriched;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.memberId?.toLowerCase().includes(q) ||
        p.initials?.toLowerCase().includes(q) ||
        p.provider?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        matchesFoldId(p.memberId, q)
      );
    }

    if (providerFilter) {
      result = result.filter(p => p.provider === providerFilter);
    }

    if (locationFilter) {
      result = result.filter(p => p.location === locationFilter);
    }

    return result;
  }, [enriched, search, providerFilter, locationFilter]);

  const startIdx = (currentPage - 1) * perPage;
  const paginated = filtered.slice(startIdx, startIdx + perPage);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allIds = paginated.map(p => p.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIdSet.has(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = (checked) => {
    if (checked) selectAll(allIds);
    else clearSelected();
  };

  const activeFilterCount = (providerFilter ? 1 : 0) + (locationFilter ? 1 : 0);

  const handleClearAll = () => {
    setProviderFilter('');
    setLocationFilter('');
  };

  if (patientsLoading) return <TableSkeleton rows={perPage} />;
  if (patientsError) return <ErrorState title="Failed to load patients" message={patientsError} onRetry={fetchPatients} />;

  return (
    <>
      <SectionTitleBar
        variant="titleWithToggle"
        title="Scheduling List"
        toggleItems={[]}
        actions={['search', 'filter', 'history', 'download']}
        searchPlaceholder="Search by name, provider, location…"
        searchValue={search}
        onSearchChange={setSearch}
        filterActive={showFilters}
        onFilter={() => setShowFilters(v => !v)}
        onHistory={() => showToast('History – coming soon')}
        onDownload={() => showToast('Export – coming soon')}
      />

      {showFilters && (
        <div className={filterStyles.filterBar}>
          <div className={filterStyles.filterRow}>
            <FilterChip
              label="Provider"
              options={PROVIDER_OPTIONS}
              value={providerFilter}
              onSet={setProviderFilter}
              onClear={() => setProviderFilter('')}
            />
            <FilterChip
              label="Location"
              options={LOCATION_OPTIONS}
              value={locationFilter}
              onSet={setLocationFilter}
              onClear={() => setLocationFilter('')}
            />

            {activeFilterCount > 0 && (
              <span className={filterStyles.activeCount}>{activeFilterCount} active</span>
            )}
            <button className={filterStyles.clearAll} onClick={handleClearAll}>Clear All</button>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ ...TH_STYLE, width: 36, padding: '8px 10px', position: 'sticky', top: 0, left: 0, zIndex: 4 }}>
                <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={handleSelectAll} />
              </th>
              <th style={{ ...TH_STYLE, padding: '8px 12px', position: 'sticky', top: 0, left: 36, zIndex: 4, borderRight: '1px solid var(--neutral-150)' }}>Members</th>
              <th style={TH_STYLE}>LACE Acuity</th>
              <th style={TH_STYLE}>Outreach Window</th>
              <th style={TH_STYLE}>TOC Status</th>
              <th style={TH_STYLE}>Outreach</th>
              <th style={TH_STYLE}>Next Outreach</th>
              <th style={TH_STYLE}>Start Date</th>
              <th style={TH_STYLE}>Last Admission</th>
              <th style={TH_STYLE}>Assignee</th>
              <th style={TH_STYLE}>Agent Assigned</th>
              <th style={{ ...TH_STYLE, width: 100, position: 'sticky', top: 0, right: 0, zIndex: 3 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(p => (
              <WorklistRow key={p.id} patient={p} isSelected={selectedIdSet.has(p.id)} onSelect={selectPatient} />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className={styles.emptyState}>
            <Icon name="solar:magnifer-linear" size={40} color="var(--neutral-200)" />
            <p className={styles.emptyTitle}>No results found</p>
            <p className={styles.emptyDesc}>
              No patients match your current search or filters. Try adjusting them.
            </p>
          </div>
        )}
        <BulkBar />
      </div>
    </>
  );
}

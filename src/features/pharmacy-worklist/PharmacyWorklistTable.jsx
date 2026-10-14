import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Button } from '../../components/Button/Button';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { SubnavToggle } from '../../components/SubnavToggle/SubnavToggle';
import { FilterBar } from '../../components/FilterBar/FilterBar';
import { Pagination } from '../../components/Pagination/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';
import { HeaderCell } from '../../components/HeaderCell/HeaderCell';
import { useTableSort } from '../../components/HeaderCell/useTableSort';
import { ColumnsHeaderButton } from '../../components/WorklistColumns/ColumnsHeaderButton';
import { useWorklistColumns } from '../../components/WorklistColumns/useWorklistColumns';
import { PharmacyWorklistRow } from './PharmacyWorklistRow';
import { PHARMACY_MIDDLE_COLUMNS, PHARMACY_HIDDEN_BY_DEFAULT } from './pharmacyColumns';
import { enrichPharmacyMember, measureDrugs } from './pharmacyWorklist.utils';
import styles from './PharmacyWorklistTable.module.css';

// Health plan and book of business are filters, not separate spaces.
const FILTER_KEYS = [
  { key: 'priority',       label: 'Priority',         primary: true },
  { key: 'measure',        label: 'Measure',          primary: true },
  { key: 'measureStatus',  label: 'Gap Sub-Status',   primary: true },
  { key: 'status',         label: 'Status',           primary: true },
  { key: 'claimRecon',     label: 'Claim Reconciliation', primary: true },
  { key: 'assignee',       label: 'Assigned to',      primary: true },
  { key: 'healthPlan',     label: 'Health Plan',      primary: true },
  { key: 'bookOfBusiness', label: 'Book of Business', primary: true },
  { key: 'ipa',            label: 'IPA',              primary: false },
  { key: 'barrier',        label: 'Barrier',          primary: false },
  { key: 'language',       label: 'Language',         primary: false },
];

// Multi-valued buckets (a member has several measures) return arrays.
const BUCKET_FN = {
  priority:       (m) => m.priority,
  measure:        (m) => m.measureCodes,
  measureStatus:  (m) => [...new Set(Object.values(m.measureStatuses).map(s => s.label))],
  status:         (m) => m.status || 'Open',
  claimRecon:     (m) => m.reconStatuses,
  assignee:       (m) => m.assigneeName || 'Unassigned',
  healthPlan:     (m) => m.healthPlan || null,
  bookOfBusiness: (m) => m.bookOfBusiness || null,
  ipa:            (m) => m.ipa || null,
  barrier:        (m) => m.barrier || 'None',
  language:       (m) => (m.language || 'en').toUpperCase(),
};
const bucketsOf = (key, m) => [].concat(BUCKET_FN[key](m) ?? []);

const MORE_FILTER_ITEMS = FILTER_KEYS.map(f => ({ k: f.key, label: f.label, primary: f.primary }));
const PRIMARY_FILTER_KEYS = FILTER_KEYS.filter(f => f.primary).map(f => f.key);
const KEY_ORDER = Object.fromEntries(FILTER_KEYS.map((f, i) => [f.key, i]));

// Default order is triage order: priority, then the soonest fail date.
// A header sort overrides it; clearing the sort returns here.
const PRIORITY_RANK = { P1: 0, P2: 1, P3: 2 };
const byTriage = (a, b) =>
  (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
  || (a.failDateSort ?? Infinity) - (b.failDateSort ?? Infinity);

const thStyle = {
  padding: '8px 14px',
  fontSize: 'var(--font-sm)',
  fontWeight: 500,
  color: 'var(--neutral-300)',
  borderBottom: '1px solid var(--neutral-150)',
  background: 'var(--neutral-0)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

export function PharmacyWorklistTable() {
  const members = useAppStore(s => s.pharmacyWorklistMembers);
  const loading = useAppStore(s => s.pharmacyWorklistLoading);
  const loadError = useAppStore(s => s.pharmacyWorklistError);
  const fetchMembers = useAppStore(s => s.fetchPharmacyWorklistMembers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  const showToast = useAppStore(s => s.showToast);
  const filters = useAppStore(s => s.pharmacyFilters);
  const setFilter = useAppStore(s => s.setPharmacyFilter);
  const clearFilters = useAppStore(s => s.clearPharmacyFilters);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [visibleFilterKeys, setVisibleFilterKeys] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { fetchPlatformUsers(); }, [fetchPlatformUsers]);

  const enriched = useMemo(() => members.map(enrichPharmacyMember).toSorted(byTriage), [members]);

  const filterOptions = useMemo(() => {
    const opts = {};
    for (const { key } of FILTER_KEYS) {
      const set = new Set();
      for (const m of enriched) for (const v of bucketsOf(key, m)) set.add(v);
      opts[key] = [...set].toSorted();
    }
    return opts;
  }, [enriched]);

  const filtered = useMemo(() => {
    let rows = enriched;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.memberId || '').toLowerCase().includes(q) ||
        (m.assigneeName || '').toLowerCase().includes(q) ||
        (m.measures || []).some(x => measureDrugs(x).toLowerCase().includes(q)),
      );
    }
    for (const { key } of FILTER_KEYS) {
      const vals = filters[key];
      if (!vals?.length) continue;
      const valSet = new Set(vals);
      rows = rows.filter(m => bucketsOf(key, m).some(v => valSet.has(v)));
    }
    return rows;
  }, [enriched, searchQuery, filters]);

  const { sorted, sortKey, sortDir, setSort, clearSort } = useTableSort(filtered);
  const handleSort = (field) => {
    if (sortKey !== field) setSort(field, 'asc');
    else if (sortDir === 'asc') setSort(field, 'desc');
    else clearSort();
  };

  const visibleKeys = useMemo(() => {
    const active = FILTER_KEYS.filter(f => filters[f.key]?.length).map(f => f.key);
    return [...new Set([...(visibleFilterKeys ?? PRIMARY_FILTER_KEYS), ...active])]
      .toSorted((a, b) => KEY_ORDER[a] - KEY_ORDER[b]);
  }, [visibleFilterKeys, filters]);
  const toggleVisible = (k) => {
    const next = new Set(visibleFilterKeys ?? PRIMARY_FILTER_KEYS);
    if (next.has(k)) next.delete(k); else next.add(k);
    setVisibleFilterKeys([...next]);
  };

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [sorted, page, perPage]);

  const pageIds = paginated.map(r => r.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const someSelected = !allSelected && pageIds.some(id => selectedIds.has(id));
  const toggleSelected = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const handleSelectAll = (checked) => setSelectedIds(prev => {
    const next = new Set(prev);
    for (const id of pageIds) { if (checked) next.add(id); else next.delete(id); }
    return next;
  });

  const columnPrefs = useWorklistColumns('pharmacy', PHARMACY_MIDDLE_COLUMNS, { hiddenByDefault: PHARMACY_HIDDEN_BY_DEFAULT });
  const visibleMiddle = columnPrefs.visibleColumns;
  const colCount = 2 + visibleMiddle.length + 1;

  return (
    <div className={styles.wrap}>
      <SectionTitleBar
        variant="titleWithToggle"
        leadingElement={<SubnavToggle />}
        title="Pharmacy"
        toggleItems={[]}
        actions={['search', 'filter', 'history']}
        searchPlaceholder="Search members, drugs or coordinators"
        searchValue={searchQuery}
        onSearchChange={(v) => { setSearchQuery(v); setPage(1); }}
        filterActive={filterBarOpen}
        onFilter={() => setFilterBarOpen(v => !v)}
        onHistory={() => showToast('History – coming soon')}
      />

      {filterBarOpen && (
        <FilterBar
          filterDefs={FILTER_KEYS}
          filters={filters}
          onFilterChange={(k, vals) => { setFilter(k, vals); setPage(1); }}
          onClearAll={clearFilters}
          getOptions={(def) => filterOptions[def.key] || []}
          multiSelect
          visibleKeys={visibleKeys}
          onToggleVisible={toggleVisible}
          onClearVisible={() => setVisibleFilterKeys(null)}
          moreFilterItems={MORE_FILTER_ITEMS}
          leading={null}
        />
      )}

      <div className={styles.tableScroll}>
        {loading && members.length === 0 ? (
          <TableSkeleton rows={perPage} columns={colCount} />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36, padding: '8px 10px', left: 0, zIndex: 4 }}>
                  <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={handleSelectAll} aria-label="Select all members on this page" />
                </th>
                <HeaderCell
                  label="Members"
                  sortField="name"
                  sortType="alpha"
                  activeKey={sortKey}
                  activeDir={sortDir}
                  onSort={handleSort}
                  style={{ ...thStyle, padding: '8px 12px', left: 36, zIndex: 4, borderRight: '1px solid var(--neutral-150)' }}
                />
                {visibleMiddle.map(col => (
                  col.sortKey
                    ? <HeaderCell
                        key={col.key}
                        label={col.label}
                        sortField={col.sortKey}
                        sortType={col.sortType || 'alpha'}
                        activeKey={sortKey}
                        activeDir={sortDir}
                        onSort={handleSort}
                        style={thStyle}
                      />
                    : <HeaderCell key={col.key} label={col.label} style={thStyle} />
                ))}
                <th style={{ ...thStyle, width: 140, right: 0, zIndex: 3 }}>
                  <ColumnsHeaderButton
                    columns={columnPrefs.orderedColumns}
                    hiddenSet={columnPrefs.hiddenSet}
                    onToggle={columnPrefs.onToggle}
                    onReorder={columnPrefs.onReorder}
                    onReset={columnPrefs.onReset}
                    label="Actions"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(m => (
                <PharmacyWorklistRow
                  key={m.id}
                  member={m}
                  columns={columnPrefs.orderedColumns}
                  hiddenSet={columnPrefs.hiddenSet}
                  isSelected={selectedIds.has(m.id)}
                  onSelect={toggleSelected}
                />
              ))}
            </tbody>
          </table>
        )}
        {!loading && loadError && members.length === 0 && (
          <div className={styles.emptySearch} role="alert">
            <Icon name="solar:danger-circle-linear" size={40} color="var(--neutral-200)" />
            <p className={styles.emptyTitle}>Couldn't load the pharmacy worklist</p>
            <p className={styles.emptyText}>The member list didn't load. Check your connection and try again.</p>
            <Button variant="secondary" size="L" leadingIcon="solar:refresh-linear" onClick={() => fetchMembers()}>Retry</Button>
          </div>
        )}
        {!loading && !loadError && members.length === 0 && (
          <div className={styles.emptySearch}>
            <Icon name="solar:pill-linear" size={40} color="var(--neutral-200)" />
            <p className={styles.emptyTitle}>No members on this worklist yet</p>
            <p className={styles.emptyText}>Members with open MAD, MAH or MAC gaps appear here once the plan file is loaded.</p>
          </div>
        )}
        {!loading && members.length > 0 && filtered.length === 0 && (
          <div className={styles.emptySearch}>
            <Icon name="solar:magnifer-linear" size={40} color="var(--neutral-200)" />
            <p className={styles.emptyTitle}>No results found</p>
            <p className={styles.emptyText}>No pharmacy members match your search or filters.</p>
            <Button variant="secondary" size="L" onClick={() => { clearFilters(); setSearchQuery(''); setPage(1); }}>Clear search and filters</Button>
          </div>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalItems={filtered.length}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(n) => { setPerPage(n); setPage(1); }}
      />
    </div>
  );
}

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
import { PharmacyGapDetailDrawer } from './PharmacyGapDetailDrawer';
import { PHARMACY_MIDDLE_COLUMNS, PHARMACY_HIDDEN_BY_DEFAULT } from './pharmacyColumns';
import { OPEN_GAPS, daysFromToday, daysLeftBucket, enrichPharmacyMember, measureDrugs, normMemberId, otherGapsCountBucket } from './pharmacyWorklist.utils';
import { MEASURE_NAMES as HEDIS_MEASURE_NAMES } from '../hedis-worklist/CareGapDetailDrawer.utils';
import styles from './PharmacyWorklistTable.module.css';

// Health plan and book of business are filters, not separate spaces. Days
// Left and Overdue stay filters though their columns are gone: fewer
// columns, never fewer filters.
const FILTER_KEYS = [
  { key: 'priority',       label: 'Priority',         primary: true },
  { key: 'gap',            label: 'Pharmacy Gap',     primary: true },
  { key: 'gapStatus',      label: 'Gap Status',       primary: true },
  { key: 'progress',       label: 'Progress',         primary: true },
  { key: 'daysLeft',       label: 'Days Left',        primary: true },
  { key: 'overdue',        label: 'Overdue',          primary: true },
  { key: 'claimRecon',     label: 'Claim Reconciliation', primary: true },
  { key: 'assignee',       label: 'Assigned to',      primary: true },
  { key: 'subStatus',      label: 'Gap Sub-Status',   primary: false },
  { key: 'otherGapsCount', label: 'Other Care Gaps (count)', primary: false },
  { key: 'otherGap',       label: 'Other Care Gap',   primary: false },
  { key: 'healthPlan',     label: 'Health Plan',      primary: false },
  { key: 'bookOfBusiness', label: 'Book of Business', primary: false },
  { key: 'ipa',            label: 'IPA',              primary: false },
  { key: 'barrier',        label: 'Barrier',          primary: false },
  { key: 'language',       label: 'Language',         primary: false },
];

const openGaps = (m) => m.gaps.filter(g => OPEN_GAPS.has(g.status.gap));
const isPast = (mdy) => { const d = daysFromToday(mdy); return d != null && d < 0; };
function overdueTags(m) {
  const tags = [];
  if (openGaps(m).some(g => isPast(g.nextFillDue))) tags.push('Refill overdue');
  if (m.gaps.some(g => g.recon?.status === 'Claim overdue')) tags.push('Claim overdue');
  if (isPast(m.followUpDue)) tags.push('Follow-up overdue');
  return tags.length ? tags : ['Not overdue'];
}

// Multi-valued buckets (a member has several gaps) return arrays.
const BUCKET_FN = {
  priority:       (m) => m.priority,
  gap:            (m) => m.measureCodes,
  gapStatus:      (m) => [...new Set(m.gaps.map(g => g.status.gap))],
  subStatus:      (m) => [...new Set(m.gaps.map(g => g.status.label))],
  progress:       (m) => m.progress.label,
  daysLeft:       (m) => [...new Set(openGaps(m).map(g => daysLeftBucket(g.failDate)))],
  overdue:        overdueTags,
  claimRecon:     (m) => m.reconStatuses,
  assignee:       (m) => m.assigneeName || 'Unassigned',
  otherGapsCount: (m) => otherGapsCountBucket(m.otherCareGapsCount),
  otherGap:       (m) => m.otherCareGaps.map(g => g.code),
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
const byTriage = (a, b) =>
  a.priorityRank - b.priorityRank
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
  const ensureClaimFollowUpTasks = useAppStore(s => s.ensureClaimFollowUpTasks);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  const hedisMembers = useAppStore(s => s.hedisMembers);
  const fetchHedisMembers = useAppStore(s => s.fetchHedisMembers);
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
  // Overdue claims get a pharmacy follow-up task automatically.
  useEffect(() => { if (members.length) ensureClaimFollowUpTasks(); }, [members, ensureClaimFollowUpTasks]);
  useEffect(() => { fetchPlatformUsers(); }, [fetchPlatformUsers]);
  // Other Care Gaps come from the member's live HEDIS gaps (one patient, one
  // story); superseded gaps were closed and re-added, so they don't count.
  useEffect(() => { fetchHedisMembers(); }, [fetchHedisMembers]);
  const hedisGapsByMember = useMemo(() => new Map((hedisMembers || []).map(h => [
    normMemberId(h.memberId || h.id),
    (h.gaps || []).filter(g => !g.supersededAt).map(g => ({ code: g.code, name: HEDIS_MEASURE_NAMES[g.code], status: g.status })),
  ])), [hedisMembers]);

  const enriched = useMemo(
    () => members.map(m => enrichPharmacyMember(m, { hedisGapsByMember })).toSorted(byTriage),
    [members, hedisGapsByMember],
  );

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

      <PharmacyGapDetailDrawer />

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

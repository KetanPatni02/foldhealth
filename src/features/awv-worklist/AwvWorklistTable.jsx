import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { WorklistShell } from '../../components/WorklistShell/WorklistShell';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { FilterBar } from '../../components/FilterBar/FilterBar';
import { useTableSort } from '../../components/HeaderCell/useTableSort';
import { AwvWorklistRow } from './AwvWorklistRow';
import { AWV_COLUMNS } from './data/mock';

// Map WorklistShell column key → the field on a member row the sort
// comparator reads. Matches HCC / TOC conventions.
const SORT_KEY_BY_COL = {
  name:          'name',
  progSubStatus: 'progSubStatus',
  progName:      'progName',
  due:           'due',
  outreach:      'outreach',
  assignee:      'assignee',
  np:            'npAppt',
  lastAwv:       'lastAwv',
  ad:            'ad',
  fr:            'fr',
  ri:            'ri',
  dec:           'dec',
  task:          'task',
};

// FilterBar chip definitions — all seven are primary so they show on wide
// viewports; auto-fit trims the tail into More Filters on narrow screens.
const AWV_FILTER_DEFS = [
  { key: 'progSubStatus', label: 'Program Sub Status', primary: true },
  { key: 'progName',      label: 'Program Name',       primary: true },
  { key: 'ri',            label: 'Risk IQ',            primary: true },
  { key: 'dec',           label: 'Decile',             primary: true },
  { key: 'ad',            label: 'AdvIllness',         primary: true },
  { key: 'fr',            label: 'Frailty',            primary: true },
  { key: 'assignee',      label: 'Assignee',           primary: true },
];
const AWV_MORE_FILTER_ITEMS = AWV_FILTER_DEFS.map(fd => ({ k: fd.key, label: fd.label, primary: fd.primary }));
const AWV_PRIMARY_KEYS = AWV_FILTER_DEFS.filter(fd => fd.primary).map(fd => fd.key);

// WorklistShell column defs — sticky checkbox + sticky Members col on the
// left, all AWV data columns in the middle, sticky Actions on the right.
// Same shape TOC uses (once it migrates); keeps the sticky-column scroll
// behaviour consistent with HCC / TOC.
const AWV_SHELL_COLUMNS = [
  { key: 'select', showCheckbox: true, sticky: 'left', left: 0, width: 36 },
  { key: 'name',   label: 'Members', sortKey: 'name', sticky: 'left', left: 36, width: 240 },
  ...AWV_COLUMNS.map(c => ({
    key: c.k,
    label: c.lb,
    sortKey: SORT_KEY_BY_COL[c.k],
    width: c.w,
  })),
  { key: 'actions', label: 'Actions', sticky: 'right', width: 120 },
];

export function AwvWorklistTable() {
  const members = useAppStore(s => s.awvMembers);
  const loading = useAppStore(s => s.awvMembersLoading);
  const fetchMembers = useAppStore(s => s.fetchAwvMembers);
  const filters = useAppStore(s => s.awvFilters);
  const setFilter = useAppStore(s => s.setAwvFilter);
  const clearFilters = useAppStore(s => s.clearAwvFilters);
  const selectedIds = useAppStore(s => s.selectedAwvIds);
  const selectMember = useAppStore(s => s.selectAwvMember);
  const selectAll = useAppStore(s => s.selectAllAwv);
  const clearSelected = useAppStore(s => s.clearAwvSelected);
  const showToast = useAppStore(s => s.showToast);
  const openHistoryDrawer = useAppStore(s => s.openHccHistoryDrawer);
  const saveSavedFilter = useAppStore(s => s.saveSavedFilter);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBarOpen, setFilterBarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  // `null` = uncustomised (FilterBar autoFit picks visible chips from the
  // primary set). Once the user toggles anything from More Filters, the
  // custom set takes over.
  const [visibleKeys, setVisibleKeys] = useState(null);
  const toggleVisible = (k) => setVisibleKeys(prev => {
    const base = prev ?? AWV_PRIMARY_KEYS;
    const next = new Set(base);
    if (next.has(k)) next.delete(k); else next.add(k);
    return [...next];
  });
  const clearVisible = () => setVisibleKeys([]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filterOptions = useMemo(() => ({
    progSubStatus: [...new Set(members.map(m => m.progSubStatus).filter(Boolean))],
    progName:      [...new Set(members.map(m => m.progName).filter(Boolean))],
    ri:            [...new Set(members.map(m => m.ri).filter(Boolean))].sort(),
    dec:           [...new Set(members.map(m => m.dec).filter(Boolean))].sort((a,b) => Number(a) - Number(b)),
    ad:            [...new Set(members.map(m => m.ad).filter(Boolean))].sort(),
    fr:            [...new Set(members.map(m => m.fr).filter(Boolean))].sort(),
    assignee:      [...new Set(members.map(m => m.assignee).filter(Boolean))].sort(),
  }), [members]);

  const filtered = useMemo(() => {
    let rows = members;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.memberId || '').toLowerCase().includes(q),
      );
    }
    Object.entries(filters).forEach(([k, vals]) => {
      if (!vals || vals.length === 0) return;
      rows = rows.filter(m => vals.includes(m[k]));
    });
    return rows;
  }, [members, searchQuery, filters]);

  const { sorted, sortKey, sortDir, requestSort } = useTableSort(filtered, 'due', 'asc');

  const pageRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [sorted, page, perPage]);

  const handleSelectAll = (checked) => {
    if (checked) selectAll([...new Set([...selectedIds, ...pageRows.map(r => r.id)])]);
    else         selectAll(selectedIds.filter(id => !pageRows.find(r => r.id === id)));
  };

  const filterNode = (
    <FilterBar
      autoFit
      multiSelect
      leading={null}
      filterDefs={AWV_FILTER_DEFS}
      filters={filters}
      onFilterChange={(k, vals) => setFilter(k, vals)}
      onClearAll={clearFilters}
      onSaveFilter={(name) => saveSavedFilter('AWV', name)}
      getOptions={(def) => filterOptions[def.key] || []}
      moreFilterItems={AWV_MORE_FILTER_ITEMS}
      {...(visibleKeys !== null ? { visibleKeys } : {})}
      onToggleVisible={toggleVisible}
      onClearVisible={clearVisible}
    />
  );

  const header = (
    <SectionTitleBar
      variant="titleOnly"
      title="Annual Visit"
      showSearch
      searchPlaceholder="Search by name or member ID…"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      showFilter
      filterActive={filterBarOpen}
      onFilter={() => setFilterBarOpen(v => !v)}
      showHistory
      onHistory={openHistoryDrawer}
      showDownload
      onDownload={() => showToast('Export — coming soon')}
    />
  );

  return (
    <WorklistShell
      header={header}
      showFilters={filterBarOpen}
      filters={filterNode}
      columns={AWV_SHELL_COLUMNS}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={requestSort}
      rows={pageRows}
      renderRow={(m) => (
        <AwvWorklistRow
          key={m.id}
          member={m}
          selected={selectedIds.includes(m.id)}
          onToggle={() => selectMember(m.id)}
          onView={() => showToast(`Program details for ${m.name} — coming soon`)}
          onCall={() => showToast(`Calling ${m.name} — coming soon`)}
          showToast={showToast}
        />
      )}
      loading={loading && pageRows.length === 0}
      emptyState="No members match the current filters."
      selectedIds={selectedIds}
      onSelectAll={handleSelectAll}
      onClearSelection={clearSelected}
      page={page}
      perPage={perPage}
      totalItems={filtered.length}
      onPageChange={setPage}
      onPageSizeChange={(p) => { setPerPage(p); setPage(1); }}
      minTableWidth={1900}
    />
  );
}

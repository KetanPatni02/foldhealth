import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { BulkBar } from '../../components/BulkBar/BulkBar';
import { Pagination } from '../../components/Pagination/Pagination';
// Canonical table primitives — same as HCC + TOC. Keeps sortable column
// behavior, sort indicators, and the empty-state semantics identical
// across all three worklists.
import { useTableSort } from '../../components/SortableHeader/useTableSort';
import { SortableHeader } from '../../components/SortableHeader/SortableHeader';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { InlineEditable } from '../../components/InlineEditable/InlineEditable';
import { AwvWorklistRow } from './AwvWorklistRow';
import { AWV_COLUMNS, AWV_STATUS, RISK_COLOR } from './data/mock';
import styles from './AwvWorklistTable.module.css';

// Map our column key → the field on a member row the sort comparator
// should read. Some columns (Outreach Log, Task) read numeric values that
// share their column key; others (Risk Level, Decile) map straight across.
const SORT_KEY_BY_COL = {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [listTitle, setListTitle] = useState('Annual Visit');

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Derive filter chip options from the loaded data so chips only show
  // values that actually exist.
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

  // Sort via the shared hook so behavior matches TOC/HCC (numeric vs
  // string detection, null-handling, asc/desc cycle on click).
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(filtered, 'due', 'asc');

  const pageRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [sorted, page, perPage]);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every(r => selectedIds.includes(r.id));
  const someOnPageSelected = pageRows.some(r => selectedIds.includes(r.id));

  return (
    <div className={styles.wrap}>
      {/* Header (SectionTitleBar · variant 3 · titleWithToggle with empty toggleItems).
          Title is a ReactNode — the rename-in-place InlineEditable stays exactly
          where it was. Search / Filter / History / Export use SectionTitleBar
          built-ins so this worklist reads with the same chrome as HCC / HEDIS. */}
      <SectionTitleBar
        variant="titleWithToggle"
        title={(
          <InlineEditable
            value={listTitle}
            onCommit={setListTitle}
            size="L"
            maxLength={60}
            placeholder="Worklist"
            title="Rename this list"
          />
        )}
        toggleItems={[]}
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

      {/* Filter chip bar */}
      {filterBarOpen && (
        <div className={styles.filterBar}>
          <div className={styles.chips}>
            <FilterChip label="Program Sub Status"
              options={filterOptions.progSubStatus}
              selected={filters.progSubStatus}
              onChange={(v) => setFilter('progSubStatus', v)}
            />
            <FilterChip label="Program Name"
              options={filterOptions.progName}
              selected={filters.progName}
              onChange={(v) => setFilter('progName', v)}
            />
            <FilterChip label="Risk IQ"
              options={filterOptions.ri}
              selected={filters.ri}
              onChange={(v) => setFilter('ri', v)}
            />
            <FilterChip label="Decile"
              options={filterOptions.dec}
              selected={filters.dec}
              onChange={(v) => setFilter('dec', v)}
            />
            <FilterChip label="Advillness"
              options={filterOptions.ad}
              selected={filters.ad}
              onChange={(v) => setFilter('ad', v)}
            />
            <FilterChip label="Frailty"
              options={filterOptions.fr}
              selected={filters.fr}
              onChange={(v) => setFilter('fr', v)}
            />
            <FilterChip label="Assignee"
              options={filterOptions.assignee}
              selected={filters.assignee}
              onChange={(v) => setFilter('assignee', v)}
            />
          </div>
          <div className={styles.filterRight}>
            {Object.keys(filters).length > 0 && (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={clearFilters}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thCheck} style={{ position: 'sticky', top: 0, left: 0, zIndex: 4 }}>
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={(checked) => {
                    if (checked) selectAll([...new Set([...selectedIds, ...pageRows.map(r => r.id)])]);
                    else          selectAll(selectedIds.filter(id => !pageRows.find(r => r.id === id)));
                  }}
                  aria-label="Select all on this page"
                />
              </th>
              <SortableHeader
                label="Members"
                sortKey="name"
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={requestSort}
                className={styles.thMember}
                style={{ position: 'sticky', top: 0, left: 36, zIndex: 4 }}
              />
              {AWV_COLUMNS.map(c => (
                <SortableHeader
                  key={c.k}
                  label={c.lb}
                  sortKey={SORT_KEY_BY_COL[c.k]}
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={requestSort}
                  style={{ minWidth: c.w }}
                />
              ))}
              <th className={styles.thActions} style={{ position: 'sticky', top: 0, right: 0, zIndex: 3 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && pageRows.length === 0 ? (
              <tr><td colSpan={AWV_COLUMNS.length + 3} className={styles.empty}>Loading…</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={AWV_COLUMNS.length + 3} className={styles.empty}>No members match the current filters.</td></tr>
            ) : pageRows.map(m => (
              <AwvWorklistRow
                key={m.id}
                member={m}
                selected={selectedIds.includes(m.id)}
                onToggle={() => selectMember(m.id)}
                onView={() => showToast(`Program details for ${m.name} — coming soon`)}
                onCall={() => showToast(`Calling ${m.name} — coming soon`)}
                showToast={showToast}
              />
            ))}
          </tbody>
        </table>
      </div>

      <BulkBar
        selectedIds={selectedIds}
        onClear={clearSelected}
        onChangeAssignee={() => showToast('Bulk Change Assignee — coming soon')}
      />

      <Pagination
        totalItems={filtered.length}
        currentPage={page}
        perPage={perPage}
        onPageChange={setPage}
        onPerPageChange={(p) => { setPerPage(p); setPage(1); }}
      />
    </div>
  );
}

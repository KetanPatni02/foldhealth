import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Checkbox } from '../../components/ui/checkbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Input } from '../../components/Input/Input';
import { BulkBar } from '../../components/BulkBar/BulkBar';
import { Pagination } from '../../components/Pagination/Pagination';
// Canonical table primitives — same as HCC + TOC. Keeps sortable column
// behavior, sort indicators, and the empty-state semantics identical
// across all three worklists.
import { useTableSort } from '../../components/Table/useTableSort';
import { SortableHeader } from '../../components/Table/SortableHeader';
import { AwvWorklistRow } from './AwvWorklistRow';
import { AWV_COLUMNS, AWV_STATUS, RISK_COLOR } from './data/mock';
import styles from './AwvWorklistTable.module.css';

// Map our column key → the field on a member row the sort comparator
// should read. Some columns (Outreach Log, Task) read numeric values that
// share their column key; others (Risk Level, Decile) map straight across.
const SORT_KEY_BY_COL = {
  status:   'status',
  due:      'due',
  outreach: 'outreach',
  assignee: 'assignee',
  np:       'npAppt',
  lastAwv:  'lastAwv',
  dec:      'dec',
  ad:       'ad',
  fr:       'fr',
  rl:       'rl',
  task:     'task',
};

// Filter chip — multi-select dropdown over a known set of values from
// the data set. Mirrors the chip pattern used by HCC/TOC but kept local
// here to avoid cross-feature coupling.
function FilterChip({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedCount = value?.length || 0;
  const toggleVal = (v) => {
    const cur = new Set(value || []);
    if (cur.has(v)) cur.delete(v); else cur.add(v);
    onChange([...cur]);
  };
  return (
    <div className={styles.filterChipWrap}>
      <button
        type="button"
        className={[styles.filterChip, selectedCount > 0 ? styles.filterChipActive : ''].join(' ')}
        onClick={() => setOpen(o => !o)}
      >
        {label}
        {selectedCount > 0 && <span className={styles.filterChipCount}>{selectedCount}</span>}
        <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
      </button>
      {open && (
        <>
          <div className={styles.filterChipBackdrop} onClick={() => setOpen(false)} />
          <div className={styles.filterChipMenu}>
            {options.map(opt => {
              const active = (value || []).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={[styles.filterChipItem, active ? styles.filterChipItemActive : ''].join(' ')}
                  onClick={() => toggleVal(opt)}
                >
                  <span className={[styles.filterChipBox, active ? styles.filterChipBoxOn : ''].join(' ')}>
                    {active && <Icon name="solar:check-read-linear" size={10} color="var(--neutral-0)" />}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

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

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Derive filter chip options from the loaded data so chips only show
  // values that actually exist.
  const filterOptions = useMemo(() => ({
    status:   [...new Set(members.map(m => m.status).filter(Boolean))],
    rl:       [...new Set(members.map(m => m.rl).filter(Boolean))].sort(),
    dec:      [...new Set(members.map(m => m.dec).filter(Boolean))].sort((a,b) => Number(a) - Number(b)),
    ad:       [...new Set(members.map(m => m.ad).filter(Boolean))].sort(),
    fr:       [...new Set(members.map(m => m.fr).filter(Boolean))].sort(),
    assignee: [...new Set(members.map(m => m.assignee).filter(Boolean))].sort(),
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
      {/* Toolbar — mirrors TOC's TabBar treatment: tab pill on the left,
          action icons + divider on the right, single bottom border. */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.tabPill}>
            AWV Worklist
            <span className={styles.titleCount}>{filtered.length}</span>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          {searchOpen ? (
            <div className={styles.searchInline}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
              <Input
                autoFocus
                value={searchQuery}
                placeholder="Search by name or member ID…"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className={styles.searchClose}
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                aria-label="Close search"
              >
                <Icon name="solar:close-circle-linear" size={14} color="var(--neutral-300)" />
              </button>
            </div>
          ) : (
            <SearchIconButton title="Search" tooltipBelow onClick={() => setSearchOpen(true)} />
          )}
          <span className={styles.iconDivider} />
          <ActionButton
            icon="solar:filter-linear"
            size="L"
            tooltip={filterBarOpen ? 'Hide filters' : 'Show filters'}
            tooltipBelow
            className={filterBarOpen ? styles.iconActive : ''}
            onClick={() => setFilterBarOpen(v => !v)}
          />
          <span className={styles.iconDivider} />
          <ActionButton
            icon="solar:clock-circle-linear"
            size="L"
            tooltip="History"
            tooltipBelow
            onClick={openHistoryDrawer}
          />
          <span className={styles.iconDivider} />
          <ActionButton
            icon="solar:download-square-linear"
            size="L"
            tooltip="Export"
            tooltipBelow
            onClick={() => showToast('Export — coming soon')}
          />
        </div>
      </div>

      {/* Filter chip bar */}
      {filterBarOpen && (
        <div className={styles.filterBar}>
          <FilterChip label="Program Status"
            options={filterOptions.status}
            value={filters.status}
            onChange={(v) => setFilter('status', v)}
          />
          <FilterChip label="Risk Level"
            options={filterOptions.rl}
            value={filters.rl}
            onChange={(v) => setFilter('rl', v)}
          />
          <FilterChip label="Decile"
            options={filterOptions.dec}
            value={filters.dec}
            onChange={(v) => setFilter('dec', v)}
          />
          <FilterChip label="Advillness"
            options={filterOptions.ad}
            value={filters.ad}
            onChange={(v) => setFilter('ad', v)}
          />
          <FilterChip label="Frailty"
            options={filterOptions.fr}
            value={filters.fr}
            onChange={(v) => setFilter('fr', v)}
          />
          <FilterChip label="Assignee"
            options={filterOptions.assignee}
            value={filters.assignee}
            onChange={(v) => setFilter('assignee', v)}
          />
          {Object.keys(filters).length > 0 && (
            <button
              type="button"
              className={styles.clearAll}
              onClick={clearFilters}
            >
              <Icon name="solar:close-circle-linear" size={12} color="var(--primary-300)" />
              Clear All
            </button>
          )}
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

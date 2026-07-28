import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Checkbox } from '../../components/ui/checkbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Input } from '../../components/Input/Input';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { Pagination } from '../../components/Pagination/Pagination';
import { TableSkeleton } from '../../components/Skeleton/TableSkeleton';
import { BulkBar } from '../../components/BulkBar/BulkBar';
import { CcmWorklistRow } from './CcmWorklistRow';
import styles from './CcmWorklistTable.module.css';

const FILTER_KEYS = [
  { key: 'status',    label: 'Status' },
  { key: 'assignee',  label: 'Assignee' },
  { key: 'riskLevel', label: 'Risk Level' },
];

function EmptySearch() {
  return (
    <div className={styles.emptySearch}>
      <Icon name="solar:magnifer-linear" size={40} color="var(--neutral-200)" />
      <p className={styles.emptyTitle}>No results found</p>
      <p className={styles.emptyText}>
        No CCM members match your current filters. Try adjusting them or clearing all filters.
      </p>
    </div>
  );
}

export function CcmWorklistTable() {
  const members = useAppStore(s => s.ccmWorklistMembers);
  const loading = useAppStore(s => s.ccmWorklistLoading);
  const fetchMembers = useAppStore(s => s.fetchCcmWorklistMembers);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ status: [], assignee: [], riskLevel: [] });
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filterOptions = useMemo(() => ({
    status:    [...new Set(members.map(m => m.status).filter(Boolean))],
    assignee:  [...new Set(members.map(m => m.assigneeName).filter(Boolean))].sort(),
    riskLevel: [...new Set(members.map(m => m.riskLevel).filter(Boolean))].sort(),
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
    if (filters.status.length)    rows = rows.filter(m => filters.status.includes(m.status));
    if (filters.assignee.length)  rows = rows.filter(m => filters.assignee.includes(m.assigneeName));
    if (filters.riskLevel.length) rows = rows.filter(m => filters.riskLevel.includes(m.riskLevel));
    return rows;
  }, [members, searchQuery, filters]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const allIds = paginated.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = paginated.some(r => selectedIds.has(r.id)) && !allSelected;

  const handleSelectAll = (checked) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (checked) allIds.forEach(id => next.add(id));
    else allIds.forEach(id => next.delete(id));
    return next;
  });
  const toggleOne = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const setFilter = (key, vals) => setFilters(f => ({ ...f, [key]: vals }));
  const clearFilters = () => setFilters({ status: [], assignee: [], riskLevel: [] });

  // Inline table header style mirrors src/features/toc-worklist/WorklistTable.jsx
  // so the two tables render with identical typography, padding, and sticky
  // behavior.
  const thStyle = {
    padding: '8px 14px',
    fontSize: 12,
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

  const colCount = 14;

  return (
    <div className={styles.wrap}>
      {/* Top strip: title + top actions. Matches the TOC worklist chrome. */}
      <div className={styles.topBar}>
        <span className={styles.title}>CCM</span>
        <div className={styles.topActions}>
          {searchOpen ? (
            <Input
              autoFocus
              size="S"
              placeholder="Search patients or members"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
            />
          ) : (
            <SearchIconButton size="S" onClick={() => setSearchOpen(true)} />
          )}
          <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
          <ActionButton icon="solar:sort-linear" size="S" tooltip="Sort" />
          <ActionButton icon="solar:history-linear" size="S" tooltip="History" />
          <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
        </div>
      </div>

      {/* Filter chip row */}
      <div className={styles.chipRow}>
        {FILTER_KEYS.map(f => (
          <FilterChip
            key={f.key}
            label={f.label}
            options={filterOptions[f.key]}
            selected={filters[f.key]}
            onChange={vals => setFilter(f.key, vals)}
          />
        ))}
        <button className={styles.clearAll} onClick={clearFilters}>
          <Icon name="solar:backspace-linear" size={14} color="var(--primary-300)" />
          Clear All
        </button>
      </div>

      {/* Table body. Uses the same inline th styles + sticky columns as
          src/features/toc-worklist/WorklistTable.jsx. */}
      <div className={styles.tableScroll}>
        {loading && members.length === 0 ? (
          <TableSkeleton rows={perPage} columns={colCount} />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36, padding: '8px 10px', position: 'sticky', top: 0, left: 0, zIndex: 4 }}>
                  <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={handleSelectAll} />
                </th>
                <th style={{ ...thStyle, padding: '8px 12px', position: 'sticky', top: 0, left: 36, zIndex: 4, borderRight: '1px solid var(--neutral-150)' }}>
                  Members
                </th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Next Action Due</th>
                <th style={thStyle}>Outreach</th>
                <th style={thStyle}>Assignee</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>Last Admission</th>
                <th style={thStyle}>Billable Mins</th>
                <th style={thStyle}>Unlogged Mins</th>
                <th style={thStyle}>Risk Level</th>
                <th style={thStyle}>Task</th>
                <th style={thStyle}>Care Plan Status</th>
                <th style={{ ...thStyle, width: 140, position: 'sticky', top: 0, right: 0, zIndex: 3, textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(m => (
                <CcmWorklistRow
                  key={m.id}
                  member={m}
                  isSelected={selectedIds.has(m.id)}
                  onSelect={toggleOne}
                />
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <EmptySearch />}
      </div>

      <Pagination
        currentPage={page}
        totalItems={filtered.length}
        pageSize={perPage}
        onPageChange={setPage}
        onPageSizeChange={(n) => { setPerPage(n); setPage(1); }}
      />

      <BulkBar />
    </div>
  );
}

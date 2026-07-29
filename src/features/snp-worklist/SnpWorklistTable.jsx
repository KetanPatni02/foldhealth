import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Checkbox } from '../../components/ui/checkbox/checkbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Input } from '../../components/Input/Input';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { Pagination } from '../../components/Pagination/Pagination';
import { TableSkeleton } from '../../components/Skeleton/TableSkeleton';
import { SnpWorklistRow } from './SnpWorklistRow';
import styles from './SnpWorklistTable.module.css';

// Filter chips — each is a multi-select of string buckets derived per row.
const FILTER_KEYS = [
  { key: 'programSubStatus', label: 'Program Sub Status' },
  { key: 'carePlanStatus',   label: 'Care Plan Status' },
  { key: 'assignee',         label: 'Assigned to' },
  { key: 'trigger',          label: 'Trigger' },
  { key: 'riskIq',           label: 'Risk IQ' },
  { key: 'outreach',         label: 'Outreach' },
];

const BUCKET_FN = {
  programSubStatus: (m) => m.programSubStatus || 'None',
  carePlanStatus:   (m) => m.carePlanStatus || 'None',
  assignee:         (m) => m.assigneeName || 'Unassigned',
  trigger:          (m) => m.trigger || 'None',
  riskIq:           (m) => m.riskIq || 'Undetermined',
  outreach:         (m) => (m.outreach ? m.outreach.status : 'None'),
};

const EMPTY_FILTERS = Object.fromEntries(FILTER_KEYS.map(f => [f.key, []]));

function EmptySearch() {
  return (
    <div className={styles.emptySearch}>
      <Icon name="solar:magnifer-linear" size={40} color="var(--neutral-200)" />
      <p className={styles.emptyTitle}>No results found</p>
      <p className={styles.emptyText}>
        No SNP members match your current filters. Try adjusting them or clearing all filters.
      </p>
    </div>
  );
}

export function SnpWorklistTable() {
  const members = useAppStore(s => s.snpWorklistMembers);
  const loading = useAppStore(s => s.snpWorklistLoading);
  const fetchMembers = useAppStore(s => s.fetchSnpWorklistMembers);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filterOptions = useMemo(() => {
    const opts = {};
    for (const { key } of FILTER_KEYS) {
      opts[key] = [...new Set(members.map(m => BUCKET_FN[key](m)).filter(Boolean))].sort();
    }
    return opts;
  }, [members]);

  const filtered = useMemo(() => {
    let rows = members;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.memberId || '').toLowerCase().includes(q) ||
        (m.assigneeName || '').toLowerCase().includes(q),
      );
    }
    for (const { key } of FILTER_KEYS) {
      const vals = filters[key];
      if (vals && vals.length) rows = rows.filter(m => vals.includes(BUCKET_FN[key](m)));
    }
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
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // Inline header style mirrors the CCM / TOC worklists for identical chrome.
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
      <div className={styles.topBar}>
        <span className={styles.title}>SNP</span>
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
          <ActionButton icon="solar:import-linear" size="S" tooltip="Import" />
          <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
          <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
        </div>
      </div>

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

      <div className={styles.tableScroll}>
        {loading && members.length === 0 ? (
          <TableSkeleton rows={perPage} columns={colCount} />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 36, padding: '8px 10px', left: 0, zIndex: 4 }}>
                  <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={handleSelectAll} />
                </th>
                <th style={{ ...thStyle, padding: '8px 12px', left: 36, zIndex: 4, borderRight: '1px solid var(--neutral-150)' }}>
                  Members
                </th>
                <th style={thStyle}>Program Sub Status</th>
                <th style={thStyle}>Care Plan Status</th>
                <th style={thStyle}>Next Action Due</th>
                <th style={thStyle}>Outreach</th>
                <th style={thStyle}>Assignee</th>
                <th style={thStyle}>Trigger Date</th>
                <th style={thStyle}>Last Admission</th>
                <th style={thStyle}>Trigger</th>
                <th style={thStyle}>Risk IQ</th>
                <th style={thStyle}>Tags</th>
                <th style={thStyle}>Tasks</th>
                <th style={{ ...thStyle, width: 80, right: 0, zIndex: 3, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(m => (
                <SnpWorklistRow
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
    </div>
  );
}

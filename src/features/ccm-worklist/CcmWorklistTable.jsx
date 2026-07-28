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

// Every filter chip in the row is a multi-select of *string buckets*. For
// raw fields (Status, Gender, IPA, …) the bucket is the value itself; for
// numeric / date fields we derive a bucket label per row via BUCKET_FN
// below. Order here matches the Figma chip row left → right.
const FILTER_KEYS = [
  { key: 'dob',                 label: 'DOB' },
  { key: 'gender',              label: 'Gender' },
  { key: 'language',            label: 'Language' },
  { key: 'utrFlag',             label: 'UTR Flag' },
  { key: 'utrAge',              label: 'UTR Age' },
  { key: 'assignee',            label: 'Assigned to' },
  { key: 'status',              label: 'Status' },
  { key: 'programDueDate',      label: 'Program Due Date' },
  { key: 'lastOutreachDate',    label: 'Last Outreach Date' },
  { key: 'lastOutreachOutcome', label: 'Last Outreach Outcome' },
  { key: 'assignmentDate',      label: 'Assignment Date' },
  { key: 'ipa',                 label: 'IPA' },
  { key: 'hpCode',              label: 'HP Code' },
  { key: 'memberStatus',        label: 'Member Status' },
  { key: 'billableMins',        label: 'Billable Mins' },
  { key: 'unloggedMins',        label: 'Unlogged Mins' },
  { key: 'unloggedUser',        label: 'Unlogged User' },
];

const LANG_LABEL = { en: 'English', ch: 'Chinese', es: 'Spanish', ko: 'Korean', vi: 'Vietnamese' };

// Parse an "MM/DD/YYYY" string; returns null when the input is missing or
// malformed so callers can bucket that as 'None' / 'Never'.
const parseUsDate = (s) => {
  if (!s) return null;
  const [mm, dd, yyyy] = String(s).split('/').map(Number);
  if (!mm || !dd || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
};

// Bucket helpers keep the filter logic declarative. Each returns a string
// so the FilterChip's multi-select value can key off it directly.
const dueBucket = (dateStr) => {
  const d = parseUsDate(dateStr);
  if (!d) return 'None';
  const now = new Date();
  if (d < now) return 'Overdue';
  const daysAway = Math.floor((d - now) / 86400000);
  if (daysAway <= 30) return 'This Month';
  if (daysAway <= 60) return 'Next Month';
  return 'Later';
};
const outreachDateBucket = (mmddyy) => {
  if (!mmddyy) return 'Never';
  const [mm, dd, yy] = String(mmddyy).split('/').map(Number);
  const d = new Date(2000 + (yy || 0), (mm || 1) - 1, dd || 1);
  const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (daysAgo <= 7)  return 'Last 7 days';
  if (daysAgo <= 30) return 'Last 30 days';
  return 'Older';
};
const assignmentBucket = (dateStr) => {
  const d = parseUsDate(dateStr);
  if (!d) return 'None';
  const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (daysAgo <= 30)  return 'Last 30 days';
  if (daysAgo <= 90)  return '1-3 months ago';
  if (daysAgo <= 180) return '3-6 months ago';
  return '6+ months ago';
};
const utrAgeBucket = (days) => {
  if (!days || days <= 0) return 'N/A';
  if (days <= 7)  return '1-7 days';
  if (days <= 30) return '8-30 days';
  return '30+ days';
};
const billableBucket = (seconds) => {
  const mins = (seconds || 0) / 60;
  if (mins < 15) return '< 15 mins';
  if (mins < 25) return '15-25 mins';
  return '25+ mins';
};
const unloggedBucket = (seconds) => {
  const mins = (seconds || 0) / 60;
  if (mins < 0.5) return '< 30s';
  if (mins < 1)   return '30-60s';
  return '1+ min';
};
const dobDecade = (iso) => {
  if (!iso) return 'Unknown';
  return `${iso.slice(0, 3)}0s`;
};

// A single per-row → bucket lookup used both for populating the FilterChip
// option lists AND for evaluating each row against a selected filter — keeps
// the two branches consistent by construction.
const BUCKET_FN = {
  dob:                 (m) => dobDecade(m.dob),
  gender:              (m) => m.gender || 'Unknown',
  language:            (m) => LANG_LABEL[m.language] || 'Other',
  utrFlag:             (m) => m.utrFlag || 'No',
  utrAge:              (m) => utrAgeBucket(m.utrAgeDays),
  assignee:            (m) => m.assigneeName || 'Unassigned',
  status:              (m) => m.status,
  programDueDate:      (m) => dueBucket(m.programDueDate),
  lastOutreachDate:    (m) => outreachDateBucket(m.outreachDate),
  lastOutreachOutcome: (m) => m.lastOutreachOutcome || 'None',
  assignmentDate:      (m) => assignmentBucket(m.assignmentDate),
  ipa:                 (m) => m.ipa || 'Unknown',
  hpCode:              (m) => m.hpCode || 'Unknown',
  memberStatus:        (m) => m.memberStatus || 'Active',
  billableMins:        (m) => billableBucket(m.billableSeconds),
  unloggedMins:        (m) => unloggedBucket(m.unloggedSeconds),
  unloggedUser:        (m) => m.assigneeName || 'Unassigned',
};

const EMPTY_FILTERS = Object.fromEntries(FILTER_KEYS.map(f => [f.key, []]));

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
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Build option lists by walking the members once per filter key, running
  // each row through BUCKET_FN and deduping. Empty buckets (e.g. 'Unknown'
  // when no member has that field) drop out via the Set.
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
        (m.memberId || '').toLowerCase().includes(q),
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

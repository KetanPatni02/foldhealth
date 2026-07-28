import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Checkbox } from '../../components/ui/checkbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { Input } from '../../components/Input/Input';
import { Pagination } from '../../components/Pagination/Pagination';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { TableSkeleton } from '../../components/Skeleton/TableSkeleton';
import { CCM_STATUS_META } from './data/mock';
import styles from './CcmWorklistTable.module.css';

// MM:SS formatter for the Billable / Unlogged Mins columns. Matches the
// Figma format ("18:09 Mins" / "00:06 Mins").
const formatMins = (seconds) => {
  if (!seconds && seconds !== 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} Mins`;
};

// Language-badge two-letter code (En / Ch / Es / …), matches the pattern
// used by the other worklists.
const langLabel = (l) => {
  if (!l) return '';
  return l.slice(0, 1).toUpperCase() + l.slice(1, 2).toLowerCase();
};

function StatusPill({ status }) {
  const meta = CCM_STATUS_META[status] || { color: 'var(--neutral-300)', kind: 'ring' };
  return (
    <span className={styles.statusPill}>
      {meta.kind === 'half' ? (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={styles.statusIcon}>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke={meta.color} strokeWidth="1.5" />
          <path d="M7 1.5A5.5 5.5 0 0 1 7 12.5Z" fill={meta.color} />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={styles.statusIcon}>
          <circle cx="7" cy="7" r="5.5" fill="none" stroke={meta.color} strokeWidth="1.5" />
        </svg>
      )}
      <span className={styles.statusLabel}>{status}</span>
    </span>
  );
}

function AssigneeChip({ initials, name }) {
  if (!name) {
    return (
      <span className={styles.assignPlaceholder}>
        <Icon name="solar:user-plus-linear" size={14} color="var(--neutral-300)" />
        Assign User
      </span>
    );
  }
  return (
    <span className={styles.assigneeChip}>
      <span className={styles.assigneeAvatar}>{initials || name.slice(0, 2).toUpperCase()}</span>
      <span className={styles.assigneeName}>{name}</span>
    </span>
  );
}

function OutreachCell({ status, date }) {
  if (!status) return <span className={styles.mutedDash}>--</span>;
  return (
    <span className={styles.outreachCell}>
      <Icon name="solar:phone-calling-linear" size={14} color="var(--status-success)" />
      <span className={styles.outreachCol}>
        <span className={styles.outreachStatus}>{status}</span>
        <span className={styles.outreachDate}>{date}</span>
      </span>
    </span>
  );
}

const FILTER_KEYS = [
  { key: 'status',    label: 'Status' },
  { key: 'assignee',  label: 'Assignee' },
  { key: 'riskLevel', label: 'Risk Level' },
];

export function CcmWorklistTable() {
  const members = useAppStore(s => s.ccmWorklistMembers);
  const loading = useAppStore(s => s.ccmWorklistLoading);
  const fetchMembers = useAppStore(s => s.fetchCcmWorklistMembers);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);

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

  const pageRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const allSelected = pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.id));
  const someSelected = pageRows.some(r => selectedIds.has(r.id)) && !allSelected;
  const toggleAll = (checked) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (checked) pageRows.forEach(r => next.add(r.id));
    else pageRows.forEach(r => next.delete(r.id));
    return next;
  });
  const toggleOne = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const setFilter = (key, vals) => setFilters(f => ({ ...f, [key]: vals }));
  const clearFilters = () => setFilters({ status: [], assignee: [], riskLevel: [] });

  const openMember = (row) => {
    if (row.patientId) navigateToPatient(row.patientId);
  };

  return (
    <div className={styles.wrap}>
      {/* Top strip: title + filters + action row */}
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

      {loading && members.length === 0 ? (
        <TableSkeleton rows={10} columns={14} />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCell}>
                  <Checkbox
                    checked={someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th>Members</th>
                <th>Status</th>
                <th>Next Action Due</th>
                <th>Outreach</th>
                <th>Assignee</th>
                <th>Start Date</th>
                <th>Last Admission</th>
                <th>Billable Mins</th>
                <th>Unlogged Mins</th>
                <th>Risk Level</th>
                <th>Task</th>
                <th>Care Plan Status</th>
                <th className={styles.actionCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(m => (
                <tr
                  key={m.id}
                  className={styles.row}
                  onClick={() => openMember(m)}
                >
                  <td className={styles.checkCell} onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(m.id)}
                      onCheckedChange={() => toggleOne(m.id)}
                      aria-label={`Select ${m.name}`}
                    />
                  </td>
                  <td>
                    <div className={styles.memberCell}>
                      <span className={styles.avatar}>{m.initials}</span>
                      <div className={styles.memberBody}>
                        <span className={styles.memberName}>
                          {m.name}
                          <span className={styles.memberMeta}>
                            ({m.gender} · {m.age})
                          </span>
                        </span>
                        <span className={styles.memberSub}>
                          {m.memberId} · {langLabel(m.language)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td><StatusPill status={m.status} /></td>
                  <td className={m.nextActionOverdue ? styles.overdue : ''}>
                    {m.nextActionDue || '--'}
                  </td>
                  <td><OutreachCell status={m.outreachStatus} date={m.outreachDate} /></td>
                  <td><AssigneeChip initials={m.assigneeInitials} name={m.assigneeName} /></td>
                  <td className={m.startDateOverdue ? styles.overdue : ''}>{m.startDate || '--'}</td>
                  <td className={styles.mutedText}>{m.lastAdmission || '--'}</td>
                  <td className={styles.billableCell}>{formatMins(m.billableSeconds)}</td>
                  <td className={styles.unloggedCell}>{formatMins(m.unloggedSeconds)}</td>
                  <td>{m.riskLevel || <span className={styles.mutedDash}>-</span>}</td>
                  <td>{m.taskCount ? `${m.taskCount} Task` : <span className={styles.mutedDash}>-</span>}</td>
                  <td className={styles.carePlanCell}>{m.carePlanStatus || '--'}</td>
                  <td className={styles.actionCell} onClick={e => e.stopPropagation()}>
                    <div className={styles.actions}>
                      <ActionButton icon="solar:document-text-linear" size="S" tooltip="View report" />
                      <ActionButton icon="solar:phone-calling-linear" size="S" tooltip="Call" />
                      <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && !loading && (
                <tr>
                  <td colSpan={14} className={styles.emptyState}>
                    No CCM members match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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

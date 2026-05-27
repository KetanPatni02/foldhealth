import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HEDIS_MEMBERS } from './data/mock';
import { HedisWorklistRow } from './HedisWorklistRow';
import { CareGapDetailDrawer } from './CareGapDetailDrawer';
import { TableSkeleton } from '../../components/Skeleton/TableSkeleton';
import { Checkbox } from '../../components/ui/checkbox';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SearchIconButton } from '../../components/SearchIconButton/SearchIconButton';
import { SortableHeader } from '../../components/Table/SortableHeader';
import { useTableSort } from '../../components/Table/useTableSort';
import { Pagination } from '../../components/Pagination/Pagination';
import styles from './HedisWorklistTable.module.css';
import rowStyles from './HedisWorklistRow.module.css';

const YEARS = [2024, 2025, 2026];

const FILTER_CHIPS = [
  { key: 'memberStatus', label: 'Member Status', defaultActive: true, defaultValue: 'Active' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'dob', label: 'DOB' },
  { key: 'gender', label: 'Gender' },
  { key: 'language', label: 'Language' },
  { key: 'gapStatus', label: 'Gap Status' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'lastOutreachDate', label: 'Last Outreach Date' },
  { key: 'lastOutreachOutcome', label: 'Last Outreach Outcome' },
  { key: 'ipa', label: 'IPA' },
  { key: 'hpCode', label: 'HP Codes' },
  { key: 'zip', label: 'Zip Code' },
  { key: 'city', label: 'City' },
  { key: 'preferredCallTime', label: 'Preferred Call Time' },
  { key: 'state', label: 'State of Residence' },
];

export function HedisWorklistTable() {
  const currentPage = useAppStore(s => s.currentPage);
  const perPage = useAppStore(s => s.perPage);
  const setCurrentPage = useAppStore(s => s.setCurrentPage);
  const setPerPage = useAppStore(s => s.setPerPage);
  const showToast = useAppStore(s => s.showToast);
  const hedisMembers = useAppStore(s => s.hedisMembers);

  const [year, setYear] = useState(2026);
  const [yearOpen, setYearOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBarOpen, setFilterBarOpen] = useState(true);
  // activeFilters: object of chip key → value (null means chip is shown but not active)
  const [activeFilters, setActiveFilters] = useState({ memberStatus: 'Active' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerMemberId, setDrawerMemberId] = useState(null);
  const [drawerGapCode, setDrawerGapCode] = useState(null);

  // Read the live member from the store so store mutations re-render the drawer.
  const drawerMember = useMemo(
    () => (drawerMemberId ? hedisMembers.find(m => m.id === drawerMemberId) : null),
    [drawerMemberId, hedisMembers]
  );

  const openGapDrawer = (member, gapCode) => {
    setDrawerMemberId(member.id);
    setDrawerGapCode(gapCode);
  };
  const closeGapDrawer = () => { setDrawerMemberId(null); setDrawerGapCode(null); };

  const yearRef = useRef(null);
  const setHedisMembers = useAppStore(s => s.setHedisMembers);

  // Seed the store's hedisMembers from the local mock the first time this
  // table mounts and the store is still empty. Idempotent — once seeded
  // the conditional guard prevents repeated writes.
  useEffect(() => {
    if (hedisMembers.length === 0) {
      setHedisMembers(HEDIS_MEMBERS);
    }
  }, [hedisMembers.length, setHedisMembers]);

  // Close year dropdown on outside click
  useEffect(() => {
    if (!yearOpen) return;
    const handler = (e) => { if (yearRef.current && !yearRef.current.contains(e.target)) setYearOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [yearOpen]);

  const filtered = useMemo(() => {
    let result = hedisMembers;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.memberId.toLowerCase().includes(q) ||
        m.in.toLowerCase().includes(q)
      );
    }
    if (activeFilters.memberStatus) {
      result = result.filter(m => m.memberStatus === activeFilters.memberStatus);
    }
    if (activeFilters.gender) {
      result = result.filter(m => m.gender === activeFilters.gender);
    }
    if (activeFilters.gapStatus) {
      result = result.filter(m => m.gaps.some(g => g.status === activeFilters.gapStatus));
    }
    return result;
  }, [searchQuery, activeFilters, hedisMembers]);

  const { sorted, sortKey, sortDir, requestSort } = useTableSort(filtered, 'startDate', 'desc');

  // Reset to page 1 whenever the filtered result set changes size.
  useEffect(() => { setCurrentPage(1); }, [filtered.length, setCurrentPage]);

  const startIdx = (currentPage - 1) * perPage;
  const paginated = sorted.slice(startIdx, startIdx + perPage);

  const allIds = paginated.map(m => m.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? allIds : []);
  };

  const removeFilter = (key) => {
    setActiveFilters(prev => { const n = { ...prev }; delete n[key]; return n; });
  };
  const clearAllFilters = () => setActiveFilters({});

  const activeFilterCount = Object.keys(activeFilters).length;

  const thStyle = `${rowStyles.stickyLeft}`;

  return (
    <>
    <div className={styles.wrap}>
      {/* ── Header bar ── */}
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <div ref={yearRef} style={{ position: 'relative' }}>
            <button className={styles.yearBtn} onClick={() => setYearOpen(v => !v)}>
              <span className={styles.yearLabel}>HEDIS {year}</span>
              <Icon name="solar:alt-arrow-down-linear" size={14} />
            </button>
            {yearOpen && (
              <div className={styles.yearDropdown}>
                {YEARS.map(y => (
                  <button
                    key={y}
                    className={[styles.yearOption, y === year ? styles.yearOptionActive : ''].join(' ')}
                    onClick={() => { setYear(y); setYearOpen(false); }}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.headerRight}>
          {searchOpen ? (
            <div className={styles.searchInput}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
              <input
                autoFocus
                type="text"
                placeholder="Search by member name…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button className={styles.searchClose} onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>✕</button>
            </div>
          ) : (
            <SearchIconButton title="Search" onClick={() => setSearchOpen(true)} />
          )}
          <span className={styles.iconDivider} />
          <ActionButton
            icon="solar:upload-minimalistic-linear"
            size="L"
            tooltip="Export"
            onClick={() => showToast('Export — coming soon')}
          />
          <span className={styles.iconDivider} />
          <div className={styles.filterBadge}>
            <ActionButton
              icon="custom:filter"
              size="L"
              tooltip="Filter"
              onClick={() => setFilterBarOpen(v => !v)}
            />
            {activeFilterCount > 0 && (
              <span className={styles.filterCount}>{activeFilterCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      {filterBarOpen && (
        <div className={styles.filterBar}>
          {FILTER_CHIPS.map(chip => {
            const isActive = activeFilters[chip.key] != null;
            const value = activeFilters[chip.key];
            return (
              <div
                key={chip.key}
                className={[styles.filterChip, isActive ? styles.filterChipActive : ''].join(' ')}
                onClick={() => !isActive && showToast(`${chip.label} filter — coming soon`)}
              >
                {chip.label}{isActive ? `: ${value}` : ':'}
                {!isActive && <Icon name="solar:alt-arrow-down-linear" size={11} />}
                {isActive && (
                  <button
                    className={styles.filterChipRemove}
                    onClick={e => { e.stopPropagation(); removeFilter(chip.key); }}
                    title={`Remove ${chip.label} filter`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              className={styles.filterChip}
              onClick={() => showToast('More filters — coming soon')}
            >
              More Filters
              <Icon name="solar:alt-arrow-down-linear" size={11} />
            </div>
            {activeFilterCount > 0 && (
              <button className={styles.filterClearAll} onClick={clearAllFilters}>
                ✕ Clear All
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className={styles.scrollWrap} style={{ flex: 1 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${rowStyles.stickyLeft} ${rowStyles.stickyCheck} ${styles.checkTh}`}>
                <Checkbox
                  checked={someSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th className={`${rowStyles.stickyLeft} ${rowStyles.stickyMember} ${styles.memberTh}`}>
                Member
              </th>
              <th style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                Total Gaps
              </th>
              <th style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                Gap Status
              </th>
              <th style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', textAlign: 'left', whiteSpace: 'nowrap', minWidth: 200 }}>
                Assignee
              </th>
              <th style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                Start Date
              </th>
              <th style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                Outreach
              </th>
              <SortableHeader label="AdvIllness" sortKey="advIllness" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Frailty" sortKey="frailty" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Risk Level" sortKey="riskLevel" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
              <SortableHeader label="Tasks" sortKey="tasks" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
              <th className={rowStyles.stickyRight} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={12}>
                  <div className={styles.empty}>
                    <Icon name="solar:magnifer-linear" size={40} color="var(--neutral-200)" />
                    <p className={styles.emptyTitle}>No members found</p>
                    <p className={styles.emptyMsg}>No HEDIS members match your current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map(m => (
                <HedisWorklistRow
                  key={m.id}
                  member={m}
                  isSelected={selectedIds.includes(m.id)}
                  onSelect={toggleSelect}
                  onOpenGap={openGapDrawer}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination bar ── */}
      <div className={styles.paginationBar}>
        <Pagination
          totalItems={filtered.length}
          currentPage={currentPage}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={setPerPage}
        />
      </div>
    </div>

    {drawerMember && (
      <CareGapDetailDrawer
        member={drawerMember}
        gapCode={drawerGapCode}
        year={year}
        onClose={closeGapDrawer}
      />
    )}
    </>
  );
}

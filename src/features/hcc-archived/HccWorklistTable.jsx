import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HccWorklistRow, resolveCurrentAssignee } from './HccWorklistRow';
import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { useTableSort } from '../../components/HeaderCell/useTableSort';
import { SortPopover } from '../../components/SortPopover/SortPopover';
import { DUE_OPTIONS, getDueCategory } from './DueDateChip';
import { FilterChipBar } from './FilterChipBar';
import { FilterNameDialog } from './FilterNameDialog';
import { ColumnConfigPopover } from './ColumnConfigPopover';
import { HCC_COLUMNS, HCC_COL_MAP, MEMBER_SORT_ITEMS, orderColumns } from './columns';
import { memberMatchesFilters } from './filters';
import { Pagination } from '../../components/Pagination/Pagination';
import { BulkBar } from '../../components/BulkBar/BulkBar';
import { BulkChangeAssigneesDialog } from './BulkChangeAssigneesDialog';
import { HccUploadProgressRibbon } from './upload/HccUploadProgressRibbon';
import { HccHistoryDrawer } from './HccHistoryDrawer';
import { StatusLegend } from './StatusLegend';
import styles from './HccWorklistTable.module.css';
import rowStyles from './HccWorklistRow.module.css';

function EmptyState({ title, message, icon = 'solar:magnifer-linear' }) {
  return (
    <div className={styles.empty}>
      <Icon name={icon} size={40} color="var(--neutral-200)" />
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyMessage}>{message}</p>
    </div>
  );
}

// ── Header cell — opens a SortPopover on click for sortable columns. ──────
function HccHeaderCell({ column, className, sortKey, sortDir, onOpenSort }) {
  const ref = useRef(null);
  const sortField = column.sortField || column.k;
  const isActive = column.sortable && sortField === sortKey;
  const handleClick = () => {
    if (!column.sortable) return;
    const rect = ref.current?.getBoundingClientRect();
    if (rect) onOpenSort(column, rect);
  };
  return (
    <th
      ref={ref}
      className={[
        className || '',
        styles.headerCell,
        column.sortable ? styles.headerCellSortable : '',
        isActive ? styles.headerCellActive : '',
      ].filter(Boolean).join(' ')}
      onClick={handleClick}
      data-col={column.k}
    >
      <span className={styles.headerLabel}>
        {column.lb}
        {column.sortable && (
          <span className={styles.sortIcon}>
            {isActive ? (
              <Icon
                name={sortDir === 'asc' ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
                size={12}
                color="var(--primary-300)"
              />
            ) : (
              <Icon name="solar:sort-vertical-linear" size={12} color="var(--neutral-200)" />
            )}
          </span>
        )}
      </span>
    </th>
  );
}

// ── Class map per column (preserves existing sticky/width treatments) ─────
const COL_CLASS = {
  dos:      rowStyles.colLastVisit,
  open:     rowStyles.colOpen,
  date:     rowStyles.colDate,
  evidence: rowStyles.colEvidence,
  sup:      rowStyles.colRole,
  cdr:      rowStyles.colRole,
  r1:       rowStyles.colRole,
  r2:       rowStyles.colRole,
  r3:       rowStyles.colRole,
  rp:       rowStyles.colProvider,
  pos:      rowStyles.colPos,
  posDesc:  rowStyles.colPosDesc,
  raf:      rowStyles.colRaf,
  ri:       rowStyles.colRi,
  ipa:      rowStyles.colIpa,
  hp:       rowStyles.colHp,
  pcp:      rowStyles.colPcp,
  dec:      rowStyles.colDec,
  coh:      rowStyles.colCoh,
  rl:       rowStyles.colRl,
  ad:       rowStyles.colAd,
  fr:       rowStyles.colFr,
};

export function HccWorklistTable() {
  const hccMembers = useAppStore(s => s.hccMembers);
  const hccMembersLoading = useAppStore(s => s.hccMembersLoading);
  const fetchHccMembers = useAppStore(s => s.fetchHccMembers);
  const fetchHccDocuments = useAppStore(s => s.fetchHccDocuments);
  const openIcdCreation = useAppStore(s => s.openIcdCreation);
  const selectedHccIds = useAppStore(s => s.selectedHccIds);
  const selectAllHcc = useAppStore(s => s.selectAllHcc);
  const clearHccSelected = useAppStore(s => s.clearHccSelected);
  const searchQuery = useAppStore(s => s.searchQuery);
  const setSearchQuery = useAppStore(s => s.setSearchQuery);
  const currentPage = useAppStore(s => s.currentPage);
  const perPage = useAppStore(s => s.perPage);
  const showToast = useAppStore(s => s.showToast);
  const activeSubnavList = useAppStore(s => s.activeSubnavList);
  const hccDueDateFilter = useAppStore(s => s.hccDueDateFilter);
  const setHccDueDateFilter = useAppStore(s => s.setHccDueDateFilter);
  const hccFilters = useAppStore(s => s.hccFilters);
  const saveHccFilter = useAppStore(s => s.saveHccFilter);
  const renameHccSavedFilter = useAppStore(s => s.renameHccSavedFilter);
  const startHccUpload = useAppStore(s => s.startHccUpload);
  const openHccHistoryDrawer = useAppStore(s => s.openHccHistoryDrawer);
  const hccHiddenCols = useAppStore(s => s.hccHiddenCols);
  const toggleHccColumn = useAppStore(s => s.toggleHccColumn);
  const hccColumnOrder = useAppStore(s => s.hccColumnOrder);
  const reorderHccColumns = useAppStore(s => s.reorderHccColumns);
  const setHccDefaultColumnKeys = useAppStore(s => s.setHccDefaultColumnKeys);
  const clearHccColumnOrder = useAppStore(s => s.clearHccColumnOrder);
  const clearHccHiddenCols = useAppStore(s => s.clearHccHiddenCols);

  // Seed the store's default-key snapshot once so reorderHccColumns has
  // something to start from before the user has set any custom order.
  useEffect(() => {
    setHccDefaultColumnKeys(HCC_COLUMNS.map(c => c.k));
  }, [setHccDefaultColumnKeys]);

  const orderedColumns = useMemo(
    () => orderColumns(HCC_COLUMNS, hccColumnOrder),
    [hccColumnOrder],
  );

  const [filterOpen, setFilterOpen] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [sortPop, setSortPop] = useState(null); // { items, rect }
  const [memberSortPop, setMemberSortPop] = useState(null); // rect
  const [colCfgRect, setColCfgRect] = useState(null);
  const [bulkAssigneeOpen, setBulkAssigneeOpen] = useState(false);
  const memberThRef = useRef(null);
  const colCfgBtnRef = useRef(null);

  useEffect(() => { fetchHccMembers(); }, [fetchHccMembers]);
  useEffect(() => { fetchHccDocuments?.(); }, [fetchHccDocuments]);

  // Whenever the active filter/sort/search/due-date changes, jump back to
  // page 1 so the user doesn't end up on an empty page after the result set
  // shrinks. Matches the prototype's behavior (line 4636).
  const setCurrentPage = useAppStore(s => s.setCurrentPage);
  useEffect(() => { setCurrentPage(1); }, [hccDueDateFilter, hccFilters, searchQuery, setCurrentPage]);

  // Decorate members with derived sort fields so the Member-column sort axes
  // (First Name / Last Name / Gender / DOB Year) and a few special table sorts
  // work with the generic useTableSort comparator.
  const hccDosAssignments = useAppStore(s => s.hccDosAssignments);
  const enriched = useMemo(() => hccMembers.map(m => {
    const parts = (m.name || '').trim().split(/\s+/);
    const ageNum = parseInt(String(m.age || '').match(/(\d+)/)?.[1] || '0', 10);
    // assigneeName drives sort on the Assignee column. Reuse the same
    // sequential resolver the cell uses so sort + display agree.
    const key = m.id && m.dos ? `${m.id}::${m.dos}` : null;
    const ds = key ? hccDosAssignments[key] : null;
    const resolved = resolveCurrentAssignee(m, ds);
    const assigneeName =
      resolved?.kind === 'active'     ? (resolved.name || '')        :
      resolved?.kind === 'unassigned' ? `~Awaiting ${resolved.role}` :  // ~ pushes to end of A-Z sort
      resolved?.kind === 'billing'    ? '~Billing Ready'             :
      '';
    return {
      ...m,
      name_first: parts[0] || '',
      name_last: parts[parts.length - 1] || '',
      dob: ageNum, // proxy: older age = earlier DOB; matches prototype sort semantics
      assigneeName,
    };
  }), [hccMembers, hccDosAssignments]);

  const filtered = useMemo(() => {
    let rows = enriched;
    if (hccDueDateFilter) rows = rows.filter(m => getDueCategory(m.due) === hccDueDateFilter);
    if (Object.keys(hccFilters).length) rows = rows.filter(m => memberMatchesFilters(m, hccFilters));
    const q = searchQuery?.trim().toLowerCase();
    if (q) rows = rows.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.in?.toLowerCase().includes(q) ||
      m.id?.toLowerCase().includes(q)
    );
    return rows;
  }, [enriched, searchQuery, hccDueDateFilter, hccFilters]);

  const { sorted, sortKey, sortDir, setSort, clearSort } = useTableSort(filtered, 'date', 'desc');

  const startIdx = (currentPage - 1) * perPage;
  const paginated = sorted.slice(startIdx, startIdx + perPage);

  const visibleIds = paginated.map(m => m.id);
  const selectedSet = useMemo(() => new Set(selectedHccIds), [selectedHccIds]);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedSet.has(id));
  const someSelected = selectedHccIds.length > 0 && !allSelected;

  const handleSelectAll = (checked) => {
    if (checked) selectAllHcc(visibleIds);
    else clearHccSelected();
  };

  const hiddenSet = useMemo(() => new Set(hccHiddenCols), [hccHiddenCols]);

  if (hccMembersLoading) return <TableSkeleton rows={perPage} />;

  return (
    <div className={styles.wrap}>
      <HccUploadProgressRibbon />
      {/* Header (SectionTitleBar · variant 2 · titleWithDropdown). Mirrors
          the main HCC worklist so both HCC surfaces share one chrome. */}
      <SectionTitleBar
        variant="titleWithDropdown"
        title={activeSubnavList}
        dropdownLabel="Due Date"
        dropdownOptions={DUE_OPTIONS}
        dropdownValue={hccDueDateFilter}
        onDropdownChange={setHccDueDateFilter}
        showSearch
        searchPlaceholder="Search by member name…"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showFilter
        filterActive={filterOpen}
        onFilter={() => setFilterOpen(v => !v)}
        showHistory
        onHistory={openHccHistoryDrawer}
        showDownload
        onDownload={() => showToast('Export — coming soon')}
        rightExtras={
          <>
            <ActionButton
              icon="solar:upload-minimalistic-linear"
              size="L"
              tooltip="Upload Document"
              tooltipBelow
              onClick={() => openIcdCreation?.()}
            />
            <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
          </>
        }
      />

      {filterOpen && <FilterChipBar onSaveFilter={() => setSaveDialogOpen(true)} />}
      {/* Saved filters live exclusively in the left SubNav (under HCC).
          Inline chip strip removed per UX; rename/delete handled in-sidebar. */}

      <FilterNameDialog
        open={saveDialogOpen}
        title="Save Filter"
        submitLabel="Save & Apply"
        initialName=""
        onSubmit={(name) => { saveHccFilter(name); setSaveDialogOpen(false); }}
        onCancel={() => setSaveDialogOpen(false)}
      />
      <FilterNameDialog
        open={!!renameTarget}
        title="Rename Filter"
        submitLabel="Save"
        initialName={renameTarget?.name || ''}
        onSubmit={(name) => { renameHccSavedFilter(renameTarget.id, name); setRenameTarget(null); }}
        onCancel={() => setRenameTarget(null)}
      />

      <div className={styles.scrollWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${rowStyles.stickyLeft} ${rowStyles.stickyCheck} ${styles.checkTh}`}>
                <Checkbox
                  checked={someSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all members"
                />
              </th>
              <th
                ref={memberThRef}
                className={`${rowStyles.stickyLeft} ${rowStyles.stickyMember} ${rowStyles.colMember} ${styles.memberTh} ${styles.headerCellSortable}`}
                onClick={() => {
                  const rect = memberThRef.current?.getBoundingClientRect();
                  if (rect) setMemberSortPop(rect);
                }}
              >
                <span className={styles.headerLabel}>
                  Member
                  <span className={styles.sortIcon}>
                    <Icon name="solar:sort-vertical-linear" size={12} color="var(--neutral-200)" />
                  </span>
                </span>
              </th>

              {orderedColumns.map((col) => (
                hiddenSet.has(col.k) ? null : (
                  <HccHeaderCell
                    key={col.k}
                    column={col}
                    className={COL_CLASS[col.k]}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onOpenSort={(c, rect) => setSortPop({
                      items: [{ key: c.sortField || c.k, label: c.lb }],
                      rect,
                    })}
                  />
                )
              ))}

              <th
                ref={colCfgBtnRef}
                className={`${rowStyles.stickyRight} ${rowStyles.colActions} ${styles.actionsTh}`}
              >
                <span className={styles.actionsHeaderLabel}>Actions</span>
                <button
                  type="button"
                  className={[styles.colCfgBtn, colCfgRect ? styles.colCfgBtnActive : ''].join(' ')}
                  title="Show / hide columns"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (colCfgRect) { setColCfgRect(null); return; }
                    setColCfgRect(e.currentTarget.getBoundingClientRect());
                  }}
                >
                  <ColumnsIcon
                    size={16}
                    color={colCfgRect ? 'var(--primary-300)' : 'var(--neutral-300)'}
                  />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(m => <HccWorklistRow key={m.id} member={m} hiddenCols={hiddenSet} columns={orderedColumns} />)}
          </tbody>
        </table>

        {filtered.length === 0 && searchQuery?.trim() && (
          <EmptyState
            title="No results found"
            message={`No members match "${searchQuery.trim()}". Try a different search term.`}
          />
        )}
        {filtered.length === 0 && !searchQuery?.trim() && !hccMembersLoading && (
          <EmptyState
            title="No HCC members yet"
            message="Members will appear here once assigned."
            icon="solar:ghost-smile-linear"
          />
        )}
      </div>

      <StatusLegend />

      <Pagination totalItems={filtered.length} />

      <BulkBar
        selectedIds={selectedHccIds}
        onClear={clearHccSelected}
        onChangeAssignee={() => setBulkAssigneeOpen(true)}
      />
      <BulkChangeAssigneesDialog
        open={bulkAssigneeOpen}
        selectedIds={selectedHccIds}
        onClose={() => setBulkAssigneeOpen(false)}
        onApplied={() => { setBulkAssigneeOpen(false); clearHccSelected(); }}
      />
      <HccHistoryDrawer />

      {sortPop && (
        <SortPopover
          anchorRect={sortPop.rect}
          items={sortPop.items}
          currentKey={sortKey}
          currentDir={sortDir}
          onSort={(k, dir) => setSort(k, dir)}
          onClear={clearSort}
          onClose={() => setSortPop(null)}
        />
      )}
      {memberSortPop && (
        <SortPopover
          anchorRect={memberSortPop}
          items={MEMBER_SORT_ITEMS}
          currentKey={sortKey}
          currentDir={sortDir}
          onSort={(k, dir) => setSort(k, dir)}
          onClear={clearSort}
          onClose={() => setMemberSortPop(null)}
        />
      )}
      {colCfgRect && (
        <ColumnConfigPopover
          anchorRect={colCfgRect}
          columns={orderedColumns}
          hidden={hiddenSet}
          onToggle={toggleHccColumn}
          onReorder={reorderHccColumns}
          onReset={() => { clearHccColumnOrder(); clearHccHiddenCols(); }}
          onClose={() => setColCfgRect(null)}
        />
      )}
    </div>
  );
}

// Custom "columns" glyph — three vertical sections — used by the
// Show/Hide columns header button. No matching Solar icon, so we inline it.
function ColumnsIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 5.37L9.98 4.87L10 5.37ZM10 18.63L9.98 19.13L10 18.63ZM14 5.37L14.03 4.87L14 5.37ZM14 18.63L14.03 19.13L14 18.63ZM5.33 12H4.83C4.83 13.56 4.83 14.78 4.96 15.72C5.09 16.69 5.36 17.45 5.96 18.04L6.31 17.69L6.66 17.337C6.28 16.96 6.07 16.44 5.95 15.59C5.84 14.72 5.83 13.59 5.83 12H5.33ZM18.67 12H18.17C18.17 13.59 18.17 14.72 18.05 15.59C17.94 16.44 17.72 16.96 17.34 17.337L17.691 17.69L18.04 18.04C18.64 17.45 18.91 16.69 19.04 15.72C19.17 14.78 19.17 13.56 19.17 12H18.67ZM18.67 12H19.17C19.17 10.44 19.17 9.22 19.04 8.28C18.91 7.31 18.64 6.55 18.04 5.96L17.691 6.31L17.34 6.66C17.72 7.04 17.94 7.56 18.05 8.41C18.17 9.28 18.17 10.41 18.17 12H18.67ZM5.33 12H5.83C5.83 10.41 5.84 9.28 5.95 8.41C6.07 7.56 6.28 7.04 6.66 6.66L6.31 6.31L5.96 5.96C5.36 6.55 5.09 7.31 4.96 8.28C4.83 9.22 4.83 10.44 4.83 12H5.33ZM12 5.33V4.83C10.95 4.83 10.73 4.83 9.98 4.87L10 5.37L10.03 5.87C10.75 5.83 10.95 5.83 12 5.83V5.33ZM10 5.37L9.98 4.87C9.23 4.91 8.44 4.98 7.74 5.14C7.07 5.28 6.39 5.53 5.96 5.96L6.31 6.31L6.66 6.66C6.88 6.45 7.32 6.25 7.96 6.11C8.58 5.98 9.31 5.91 10.03 5.87L10 5.37ZM12 18.67V18.17C10.95 18.17 10.75 18.17 10.03 18.13L10 18.63L9.98 19.13C10.73 19.17 10.95 19.17 12 19.17V18.67ZM10 18.63L10.03 18.13C9.31 18.09 8.58 18.02 7.96 17.888C7.32 17.75 6.88 17.56 6.66 17.337L6.31 17.69L5.96 18.04C6.39 18.475 7.07 18.716 7.74 18.86C8.44 19.018 9.23 19.09 9.98 19.13L10 18.63ZM10 5.37H9.5V18.63H10H10.5V5.37H10ZM12 5.33V5.83C13.05 5.83 13.25 5.83 13.98 5.87L14 5.37L14.03 4.87C13.28 4.83 13.06 4.83 12 4.83V5.33ZM14 5.37L13.98 5.87C14.7 5.91 15.42 5.98 16.04 6.11C16.68 6.25 17.12 6.45 17.34 6.66L17.691 6.31L18.04 5.96C17.61 5.53 16.94 5.28 16.258 5.14C15.56 4.98 14.77 4.91 14.03 4.87L14 5.37ZM12 18.67V19.17C13.06 19.17 13.28 19.17 14.03 19.13L14 18.63L13.98 18.13C13.25 18.17 13.05 18.17 12 18.17V18.67ZM14 18.63L14.03 19.13C14.77 19.09 15.56 19.018 16.258 18.86C16.94 18.716 17.61 18.475 18.04 18.04L17.691 17.69L17.34 17.337C17.12 17.56 16.68 17.75 16.04 17.888C15.42 18.02 14.7 18.09 13.98 18.13L14 18.63ZM14 5.37L13.5 5.37L13.5 18.63H14H14.5L14.5 5.37L14 5.37Z"
        fill={color}
      />
    </svg>
  );
}

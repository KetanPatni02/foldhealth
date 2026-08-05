import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HccWorklistRow, HccEmptyPatientRow, resolveCurrentAssignee } from './HccWorklistRow';
import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { useTableSort } from '../../components/SortableHeader/useTableSort';
import { SortPopover } from '../../components/SortPopover/SortPopover';
import { DUE_OPTIONS } from './DueDateChip';
import { slaDueCategory } from './sla';
import { SavedFiltersChip } from './SavedFiltersChip';
import { FilterChipBar } from './FilterChipBar';
import { FilterNameDialog } from './FilterNameDialog';
import { ColumnConfigPopover } from './ColumnConfigPopover';
import { HCC_COLUMNS, HCC_COL_MAP, MEMBER_SORT_ITEMS, orderColumns } from './columns';
import { memberMatchesFilters, countActiveFilters } from './filters';
import { Pagination } from '../../components/Pagination/Pagination';
import { BulkBar } from '../../components/BulkBar/BulkBar';
import { BulkChangeAssigneesDialog } from './BulkChangeAssigneesDialog';
import { HccUploadProgressRibbon } from './upload/HccUploadProgressRibbon';
import { HccHistoryDrawer } from './HccHistoryDrawer';
import { StatusLegend } from './StatusLegend';
import { HorizontalScrollbar } from '../../components/HorizontalScrollbar/HorizontalScrollbar';
import styles from './HccWorklistTable.module.css';
import rowStyles from './HccWorklistRow.module.css';

/**
 * Upload toolbar button — clicking it opens a menu with two ways to
 * add a record: upload a PDF (routes through the OCR / Add Records
 * drawer's picker phase) or add manually (opens the same drawer in
 * SinglePhase — patient search + ICDs + DOS/POS/Provider form).
 * Restores the manual-entry entry point that lived on the chooser
 * screen before the upload-icon shortcut skipped past it.
 */
function UploadMenuButton({ onUploadDocument, onAddManually }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <span ref={wrapRef} style={{ display: 'inline-flex', position: 'relative' }}>
      <ActionButton
        icon="custom:upload"
        size="L"
        tooltip="Upload"
        tooltipBelow
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      />
      {open && (
        <MenuPopover
          anchorRef={wrapRef}
          onClose={() => setOpen(false)}
          width={220}
          items={[
            { key: 'upload',   label: 'Upload Document', icon: 'solar:upload-minimalistic-linear' },
            { key: 'manual',   label: 'Add Manually',    icon: 'solar:pen-linear' },
          ]}
          onSelect={(key) => {
            if (key === 'upload') onUploadDocument();
            else if (key === 'manual') onAddManually();
          }}
        />
      )}
    </span>
  );
}

function EmptyState({ title, message, icon = 'solar:magnifer-linear', action = null }) {
  return (
    <div className={styles.empty}>
      <Icon name={icon} size={40} color="var(--neutral-200)" />
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyMessage}>{message}</p>
      {action}
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

// Filters that only make sense against open gaps / DOS. Whenever any of
// these has a value, the "Patients Without Open Gaps" secondary section
// is hidden — those patients can't possibly match a gap-specific filter,
// so surfacing them anyway would be misleading. Keys come from
// `src/features/hcc/filters.js` MORE_FILTER_ITEMS.
const GAP_ONLY_FILTER_KEYS = new Set([
  'asgn',                             // Assignee
  'supS', 'cdrS', 'r1s', 'r2s',       // Role Status (Support / Coder / QA / Compliance)
  'my',                               // Measurement Year
  'dos',                              // DOS
  'dosSrc',                           // DOS Source
  'cd',                               // Created Date
  'vt',                               // Visit Type
  'pos',                              // POS Code
  'claims',                           // Claims
  'rl',                               // Risk Level
  'supAD', 'cdrAD', 'r1AD', 'r2AD',   // Roles Assigned Date
  'supCD', 'cdrCD', 'r1CD', 'r2CD',   // Roles Completion Date
  'supU', 'cdrU', 'r1u', 'r2u',       // Role-wise Assignee
  'lgaD',                             // Last Gap Assessment Date
]);

// ── Class map per column (preserves existing sticky/width treatments) ─────
const COL_CLASS = {
  dos:      rowStyles.colLastVisit,
  open:     rowStyles.colOpen,
  vt:       rowStyles.colVt,
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
  // Patients slice — drives the "Patients Without Open Gaps" secondary section
  // (every patient in the system that isn't already in hccMembers).
  const patients = useAppStore(s => s.patients);
  const fetchPatients = useAppStore(s => s.fetchPatients);
  const fetchHccAddedCharts = useAppStore(s => s.fetchHccAddedCharts);
  const fetchHccChartStatus = useAppStore(s => s.fetchHccChartStatus);
  const fetchHccRemovedCharts = useAppStore(s => s.fetchHccRemovedCharts);
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
  const clearHccFilters = useAppStore(s => s.clearHccFilters);
  const saveHccFilter = useAppStore(s => s.saveHccFilter);
  const renameHccSavedFilter = useAppStore(s => s.renameHccSavedFilter);
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
  const startHccUpload = useAppStore(s => s.startHccUpload);
  const setHccUploadPhase = useAppStore(s => s.setHccUploadPhase);
  const memberThRef = useRef(null);
  const colCfgBtnRef = useRef(null);
  // Ref for the horizontal scroll container so <HorizontalScrollbar />
  // can read scrollLeft / scrollWidth and drive the custom sticky bar.
  const scrollWrapRef = useRef(null);

  useEffect(() => { fetchHccMembers(); }, [fetchHccMembers]);
  useEffect(() => { fetchHccAddedCharts(); }, [fetchHccAddedCharts]);
  useEffect(() => { fetchHccChartStatus(); }, [fetchHccChartStatus]);
  useEffect(() => { fetchHccRemovedCharts(); }, [fetchHccRemovedCharts]);
  // Populate the patients slice on mount if it's still empty — Population
  // may not have landed on any patient-backed view yet in this session.
  // fetchPatients is idempotent enough (a duplicate call just re-fetches);
  // guarding on length avoids the second network round-trip.
  useEffect(() => {
    if (patients.length === 0) fetchPatients();
  }, [patients.length, fetchPatients]);

  // If we landed on the HCC tab via the router (hash sync) rather than
  // through setActiveSubnavList, no default filter was applied. Seed the
  // role-scoped default (assignee = me + status ∈ {New, In Progress}) on
  // mount if the user has no filters/saved-list active yet.
  const applyHccRoleDefaultFilters = useAppStore(s => s.applyHccRoleDefaultFilters);
  useEffect(() => {
    const s = useAppStore.getState();
    const hasNoFilters = !s.hccFilters || Object.keys(s.hccFilters).length === 0;
    const hasNoSaved = !s.activeSavedIdByList?.HCC;
    if (hasNoFilters && hasNoSaved) applyHccRoleDefaultFilters();
  }, [applyHccRoleDefaultFilters]);

  // "Reset to page 1 on filter change" was previously done via a useEffect
  // watching [hccDueDateFilter, hccFilters, searchQuery]. Every harmless
  // hccFilters ref-change (e.g. fetchTaskProfiles backfilling `asgn` after
  // mount) fired it, resetting currentPage to 1 while the user was
  // mid-navigation. When it ran during a Pagination render, React 18
  // logged "Cannot update Pagination while rendering OpenIcdsCell" and,
  // on pages containing spawned rows that re-triggered profile fetches,
  // livelocked the renderer — the pagination click never committed and
  // the app appeared to crash on page 5. The reset is now atomic inside
  // the store setters (setHccFilter / clearHccFilters / setHccDueDateFilter /
  // setSearchQuery), so no effect is needed here.

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
    // SLA-based Due Date filter — matches the computed Created-Date colours.
    if (hccDueDateFilter) rows = rows.filter(m => slaDueCategory(m) === hccDueDateFilter);
    if (Object.keys(hccFilters).length) rows = rows.filter(m => memberMatchesFilters(m, hccFilters));
    const q = searchQuery?.trim().toLowerCase();
    if (q) rows = rows.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.in?.toLowerCase().includes(q) ||
      m.id?.toLowerCase().includes(q)
    );
    return rows;
  }, [enriched, searchQuery, hccDueDateFilter, hccFilters]);

  // Any filter that can scope rows out — chip filters or the Due Date chip.
  // Drives the "change your filters" empty state vs the true-empty one.
  const filtersActive = !!hccDueDateFilter || countActiveFilters(hccFilters) > 0;

  // SLA default (Astrana DOS worklist): Created Date ascending — oldest first,
  // so records closest to breaching the 14-day window surface at the top.
  const { sorted, sortKey, sortDir, setSort, clearSort } = useTableSort(filtered, 'date', 'asc');

  // "Patients Without Open Gaps" — every patient not represented in
  // hccMembers gets a compact row. Linking key: the shared Fold ID that
  // lives on both `patients.memberId` and `hccMembers.memberId` (post-
  // unification, id === memberId on both slices — see
  // supabase/patient_id_unification_migration.sql). Falls back to the
  // row's `id` for any legacy row that hasn't been backfilled yet.
  const normFoldId = (v) => (v == null ? '' : String(v).replace(/^#/, '').trim().toLowerCase());
  const hccMemberIds = useMemo(() => {
    const s = new Set();
    for (const m of hccMembers) {
      const k = normFoldId(m.memberId || m.id);
      if (k) s.add(k);
    }
    return s;
  }, [hccMembers]);

  // Any of these filters is gap-specific — a patient with no open gaps or
  // DOS can't possibly match, so we hide the "Patients Without Open Gaps"
  // section whenever any of them has a value. The primary section's own
  // filter path handles the actual row filtering; this set exists only to
  // decide whether the secondary section is meaningful.
  const gapOnlyFilterActive = useMemo(() => {
    if (hccDueDateFilter) return true;
    for (const k of Object.keys(hccFilters)) {
      if (!GAP_ONLY_FILTER_KEYS.has(k)) continue;
      const v = hccFilters[k];
      if (Array.isArray(v) ? v.length > 0 : v != null) return true;
    }
    return false;
  }, [hccFilters, hccDueDateFilter]);

  const patientsWithoutGaps = useMemo(() => {
    if (gapOnlyFilterActive) return [];
    const q = searchQuery?.trim().toLowerCase() || '';
    const list = patients.filter(p => {
      const k = normFoldId(p.memberId || p.id);
      if (!k || hccMemberIds.has(k)) return false;
      if (!q) return true;
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.memberId || '').toString().toLowerCase().includes(q) ||
        (p.id || '').toString().toLowerCase().includes(q)
      );
    });
    // Sort by patient name ascending — HCC-specific sort keys don't apply here.
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [patients, hccMemberIds, searchQuery, gapOnlyFilterActive]);

  // Flat combined row list: primary records, then a section-header sentinel
  // Empty-patient rows follow the primary rows directly — no section header.
  const combinedRows = useMemo(() => {
    const rows = sorted.map(m => ({ kind: 'primary', key: m.id, member: m }));
    for (const p of patientsWithoutGaps) {
      rows.push({ kind: 'empty', key: `empty-${p.id}`, patient: p });
    }
    return rows;
  }, [sorted, patientsWithoutGaps]);

  // Flat table — one row per record (Figma 4680:138476). A record whose
  // dos_list bundles multiple visits shows a "View More N" expander in
  // its own row (handled inside HccWorklistRow); the table itself just
  // paginates the record list.
  const startIdx = (currentPage - 1) * perPage;
  const paginated = combinedRows.slice(startIdx, startIdx + perPage);

  // Selection lives only on primary rows — empty-patient rows have no
  // bulk actions, so header select-all should ignore them.
  const visibleIds = paginated.filter(r => r.kind === 'primary').map(r => r.member.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedHccIds.includes(id));
  const someSelected = selectedHccIds.length > 0 && !allSelected;

  const handleSelectAll = (checked) => {
    if (checked) selectAllHcc(visibleIds);
    else clearHccSelected();
  };

  const hiddenSet = useMemo(() => new Set(hccHiddenCols), [hccHiddenCols]);
  const activeFilterCount = countActiveFilters(hccFilters);

  if (hccMembersLoading) return <TableSkeleton rows={perPage} />;

  return (
    <div className={styles.wrap}>
      <HccUploadProgressRibbon />
      {/* Header (SectionTitleBar · variant 2 · titleWithDropdown).
          `activeSubnavList` (from SubNav) drives the title so renaming a
          worklist in the SubNav ripples here without a second source of
          truth. Due Date routes through FilterChip singleSelect via the
          shared component; SavedFiltersChip / Export / UploadMenu / History
          keep their HCC-specific popovers via rightExtras. */}
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
        filterBadgeCount={activeFilterCount}
        onFilter={() => setFilterOpen(v => !v)}
        showHistory
        onHistory={openHccHistoryDrawer}
        rightExtras={
          <>
            <SavedFiltersChip />
            <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
            <ActionButton
              icon="custom:export"
              size="L"
              tooltip="Export"
              tooltipBelow
              onClick={() => showToast('Export — coming soon')}
            />
            <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} />
            <UploadMenuButton
              onUploadDocument={() => { startHccUpload(null); setHccUploadPhase('picker'); }}
              onAddManually={() => { startHccUpload(null); setHccUploadPhase('single'); }}
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

      <div className={styles.scrollWrap} ref={scrollWrapRef}>
        {/* Empty states check the COMBINED list — if the secondary section
            still has patients that match the search, don't tell the user
            there are no results. */}
        {combinedRows.length === 0 && searchQuery?.trim() && (
          <EmptyState
            title="No results found"
            message={`No members match "${searchQuery.trim()}". Try a different search term.`}
          />
        )}
        {/* Filters (chips or Due Date) scoped primary rows out — prompt the
            user to adjust them. Only shown when the secondary section is
            also empty, otherwise the table still has meaningful content. */}
        {filtered.length === 0 && patientsWithoutGaps.length === 0 && !searchQuery?.trim() && filtersActive && !hccMembersLoading && (
          <EmptyState
            title="No records match your filters"
            message="Try changing or removing some filters to see more records."
            icon="solar:filter-linear"
            action={
              <Button
                variant="secondary"
                size="S"
                leadingIcon="solar:close-circle-linear"
                onClick={() => { clearHccFilters(); setHccDueDateFilter(null); }}
              >
                Clear All Filters
              </Button>
            }
          />
        )}
        {combinedRows.length === 0 && !searchQuery?.trim() && !filtersActive && !hccMembersLoading && (
          <EmptyState
            title="No HCC members yet"
            message="Members will appear here once assigned."
            icon="solar:ghost-smile-linear"
          />
        )}
        <table className={styles.table} hidden={combinedRows.length === 0 && !hccMembersLoading}>
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
                <div className={styles.actionsHeaderInner}>
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
                </div>
              </th>
            </tr>
          </thead>
          <tbody className={rowStyles.tbody}>
            {paginated.map(row => {
              if (row.kind === 'primary') {
                return (
                  <HccWorklistRow
                    key={row.key}
                    member={row.member}
                    hiddenCols={hiddenSet}
                    columns={orderedColumns}
                  />
                );
              }
              // empty
              return (
                <HccEmptyPatientRow
                  key={row.key}
                  patient={row.patient}
                  hiddenCols={hiddenSet}
                  columns={orderedColumns}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <HorizontalScrollbar targetRef={scrollWrapRef} />

      <StatusLegend />

      <Pagination totalItems={combinedRows.length} />

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
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5.9987 1.37072L5.97381 0.871338L5.9987 1.37072ZM5.9987 14.6306L5.97381 15.13L5.9987 14.6306ZM9.9987 1.37072L10.0236 0.871338L9.9987 1.37072ZM9.9987 14.6306L10.0236 15.13L9.9987 14.6306ZM1.33203 8.00065H0.832031C0.832031 9.55786 0.830969 10.7761 0.958529 11.7248C1.08802 12.688 1.35825 13.448 1.95479 14.0446L2.30834 13.691L2.6619 13.3375C2.28212 12.9577 2.0642 12.4439 1.94961 11.5916C1.83309 10.7249 1.83203 9.58613 1.83203 8.00065H1.33203ZM14.6654 8.00065H14.1654C14.1654 9.58613 14.1643 10.7249 14.0478 11.5916C13.9332 12.4439 13.7153 12.9577 13.3355 13.3375L13.6891 13.691L14.0426 14.0446C14.6391 13.448 14.9094 12.688 15.0389 11.7248C15.1664 10.7761 15.1654 9.55786 15.1654 8.00065H14.6654ZM14.6654 8.00065H15.1654C15.1654 6.44344 15.1664 5.22523 15.0389 4.27645C14.9094 3.3133 14.6391 2.55328 14.0426 1.95674L13.6891 2.3103L13.3355 2.66385C13.7153 3.04362 13.9332 3.55743 14.0478 4.4097C14.1643 5.27635 14.1654 6.41517 14.1654 8.00065H14.6654ZM1.33203 8.00065H1.83203C1.83203 6.41517 1.83309 5.27635 1.94961 4.4097C2.0642 3.55743 2.28212 3.04362 2.6619 2.66385L2.30834 2.3103L1.95479 1.95674C1.35825 2.55328 1.08802 3.3133 0.958529 4.27645C0.830969 5.22523 0.832031 6.44344 0.832031 8.00065H1.33203ZM7.9987 1.33398V0.833984C6.94376 0.833984 6.72364 0.833962 5.97381 0.871338L5.9987 1.37072L6.02359 1.8701C6.74764 1.83401 6.94747 1.83398 7.9987 1.83398V1.33398ZM5.9987 1.37072L5.97381 0.871338C5.23103 0.908363 4.43926 0.982784 3.74135 1.13604C3.06366 1.28486 2.38573 1.5258 1.95479 1.95674L2.30834 2.3103L2.6619 2.66385C2.88012 2.44563 3.31621 2.25323 3.95584 2.11277C4.57524 1.97675 5.30407 1.90596 6.02359 1.8701L5.9987 1.37072ZM7.9987 14.6673V14.1673C6.94748 14.1673 6.74764 14.1673 6.02359 14.1312L5.9987 14.6306L5.97381 15.13C6.72364 15.1673 6.94376 15.1673 7.9987 15.1673V14.6673ZM5.9987 14.6306L6.02359 14.1312C5.30407 14.0953 4.57524 14.0245 3.95584 13.8885C3.31621 13.7481 2.88012 13.5557 2.6619 13.3375L2.30834 13.691L1.95479 14.0446C2.38573 14.4755 3.06366 14.7164 3.74135 14.8653C4.43926 15.0185 5.23103 15.0929 5.97381 15.13L5.9987 14.6306ZM5.9987 1.37072H5.4987V14.6306H5.9987H6.4987V1.37072H5.9987ZM7.9987 1.33398V1.83398C9.04992 1.83398 9.24975 1.83401 9.97381 1.8701L9.9987 1.37072L10.0236 0.871338C9.27376 0.833962 9.05364 0.833984 7.9987 0.833984V1.33398ZM9.9987 1.37072L9.97381 1.8701C10.6933 1.90596 11.4222 1.97675 12.0416 2.11277C12.6812 2.25323 13.1173 2.44563 13.3355 2.66385L13.6891 2.3103L14.0426 1.95674C13.6117 1.5258 12.9337 1.28486 12.256 1.13604C11.5581 0.982784 10.7664 0.908363 10.0236 0.871338L9.9987 1.37072ZM7.9987 14.6673V15.1673C9.05364 15.1673 9.27376 15.1673 10.0236 15.13L9.9987 14.6306L9.97381 14.1312C9.24976 14.1673 9.04992 14.1673 7.9987 14.1673V14.6673ZM9.9987 14.6306L10.0236 15.13C10.7664 15.0929 11.5581 15.0185 12.256 14.8653C12.9337 14.7164 13.6117 14.4755 14.0426 14.0446L13.6891 13.691L13.3355 13.3375C13.1173 13.5557 12.6812 13.7481 12.0416 13.8885C11.4222 14.0245 10.6933 14.0953 9.97381 14.1312L9.9987 14.6306ZM9.9987 1.37072L9.4987 1.37072L9.4987 14.6306H9.9987H10.4987L10.4987 1.37072L9.9987 1.37072Z"
        fill={color}
      />
    </svg>
  );
}

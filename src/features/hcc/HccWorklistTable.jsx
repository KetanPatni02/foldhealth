import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HccWorklistRow, HccEmptyPatientRow, resolveCurrentAssignee } from './HccWorklistRow';
import { HeaderCell } from '../../components/HeaderCell/HeaderCell';
import { TableSkeleton } from '../../components/TableSkeleton/TableSkeleton';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Icon } from '../../components/Icon/Icon';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { useTableSort } from '../../components/HeaderCell/useTableSort';
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

const normFoldId = (v) => (v == null ? '' : String(v).replace(/^#/, '').trim().toLowerCase());

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
  const visibleIds = useMemo(() => {
    const ids = [];
    for (const r of paginated) {
      if (r.kind === 'primary') ids.push(r.member.id);
    }
    return ids;
  }, [paginated]);
  const selectedIdSet = useMemo(() => new Set(selectedHccIds), [selectedHccIds]);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIdSet.has(id));
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
                  <HeaderCell
                    key={col.k}
                    label={col.lb}
                    sortField={col.sortable ? (col.sortField || col.k) : undefined}
                    sortType={col.sortType}
                    activeKey={sortKey}
                    activeDir={sortDir}
                    onSort={col.sortable ? ((field, rect) => setSortPop({
                      items: [{ key: field, label: col.lb }],
                      rect,
                    })) : undefined}
                    className={COL_CLASS[col.k]}
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
        d="M6 1.37L5.97 0.87L6 1.37ZM6 14.63L5.97 15.13L6 14.63ZM10 1.37L10.02 0.87L10 1.37ZM10 14.63L10.02 15.13L10 14.63ZM1.33 8H0.83C0.83 9.56 0.83 10.78 0.96 11.72C1.09 12.688 1.36 13.448 1.95 14.04L2.31 13.691L2.66 13.34C2.28 12.96 2.06 12.44 1.95 11.59C1.83 10.72 1.83 9.59 1.83 8H1.33ZM14.67 8H14.17C14.17 9.59 14.16 10.72 14.05 11.59C13.93 12.44 13.72 12.96 13.34 13.34L13.69 13.691L14.04 14.04C14.64 13.448 14.91 12.688 15.04 11.72C15.17 10.78 15.17 9.56 15.17 8H14.67ZM14.67 8H15.17C15.17 6.44 15.17 5.23 15.04 4.28C14.91 3.31 14.64 2.55 14.04 1.96L13.69 2.31L13.34 2.66C13.72 3.04 13.93 3.56 14.05 4.41C14.16 5.28 14.17 6.42 14.17 8H14.67ZM1.33 8H1.83C1.83 6.42 1.83 5.28 1.95 4.41C2.06 3.56 2.28 3.04 2.66 2.66L2.31 2.31L1.95 1.96C1.36 2.55 1.09 3.31 0.96 4.28C0.83 5.23 0.83 6.44 0.83 8H1.33ZM8 1.33V0.83C6.94 0.83 6.72 0.83 5.97 0.87L6 1.37L6.02 1.87C6.75 1.83 6.95 1.83 8 1.83V1.33ZM6 1.37L5.97 0.87C5.23 0.91 4.44 0.98 3.74 1.14C3.06 1.28 2.39 1.53 1.95 1.96L2.31 2.31L2.66 2.66C2.88 2.45 3.32 2.25 3.96 2.11C4.58 1.98 5.3 1.91 6.02 1.87L6 1.37ZM8 14.67V14.17C6.95 14.17 6.75 14.17 6.02 14.13L6 14.63L5.97 15.13C6.72 15.17 6.94 15.17 8 15.17V14.67ZM6 14.63L6.02 14.13C5.3 14.1 4.58 14.02 3.96 13.89C3.32 13.75 2.88 13.56 2.66 13.34L2.31 13.691L1.95 14.04C2.39 14.48 3.06 14.72 3.74 14.87C4.44 15.02 5.23 15.09 5.97 15.13L6 14.63ZM6 1.37H5.5V14.63H6H6.5V1.37H6ZM8 1.33V1.83C9.05 1.83 9.25 1.83 9.97 1.87L10 1.37L10.02 0.87C9.27 0.83 9.05 0.83 8 0.83V1.33ZM10 1.37L9.97 1.87C10.69 1.91 11.42 1.98 12.04 2.11C12.68 2.25 13.12 2.45 13.34 2.66L13.69 2.31L14.04 1.96C13.61 1.53 12.93 1.28 12.256 1.14C11.56 0.98 10.77 0.91 10.02 0.87L10 1.37ZM8 14.67V15.17C9.05 15.17 9.27 15.17 10.02 15.13L10 14.63L9.97 14.13C9.25 14.17 9.05 14.17 8 14.17V14.67ZM10 14.63L10.02 15.13C10.77 15.09 11.56 15.02 12.256 14.87C12.93 14.72 13.61 14.48 14.04 14.04L13.69 13.691L13.34 13.34C13.12 13.56 12.68 13.75 12.04 13.89C11.42 14.02 10.69 14.1 9.97 14.13L10 14.63ZM10 1.37L9.5 1.37L9.5 14.63H10H10.5L10.5 1.37L10 1.37Z"
        fill={color}
      />
    </svg>
  );
}

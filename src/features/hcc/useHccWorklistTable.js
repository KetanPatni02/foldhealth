import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { resolveCurrentAssignee } from './HccWorklistRow.utils';
import { useTableSort } from '../../components/HeaderCell/useTableSort';
import { HCC_COLUMNS, orderColumns } from './columns';
import { memberMatchesFilters, countActiveFilters } from './filters';
import { slaDueCategory } from './sla';
import { GAP_ONLY_FILTER_KEYS } from './HccWorklistTableParts.constants';

const normFoldId = (v) => (v == null ? '' : String(v).replace(/^#/, '').trim().toLowerCase());

export function useHccWorklistTable() {
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

  return {
    hccMembersLoading,
    perPage,
    activeSubnavList,
    hccDueDateFilter,
    setHccDueDateFilter,
    searchQuery,
    setSearchQuery,
    filterOpen,
    setFilterOpen,
    activeFilterCount,
    openHccHistoryDrawer,
    showToast,
    startHccUpload,
    setHccUploadPhase,
    saveDialogOpen,
    setSaveDialogOpen,
    renameTarget,
    setRenameTarget,
    saveHccFilter,
    renameHccSavedFilter,
    combinedRows,
    filtered,
    patientsWithoutGaps,
    filtersActive,
    clearHccFilters,
    scrollWrapRef,
    someSelected,
    allSelected,
    handleSelectAll,
    memberThRef,
    setMemberSortPop,
    orderedColumns,
    hiddenSet,
    sortKey,
    sortDir,
    setSortPop,
    colCfgBtnRef,
    colCfgRect,
    setColCfgRect,
    paginated,
    selectedHccIds,
    clearHccSelected,
    bulkAssigneeOpen,
    setBulkAssigneeOpen,
    sortPop,
    setSort,
    clearSort,
    memberSortPop,
    toggleHccColumn,
    reorderHccColumns,
    clearHccColumnOrder,
    clearHccHiddenCols,
  };
}

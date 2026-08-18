import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { resolveCurrentAssignee } from './HccWorklistRow.utils';
import { useTableSort } from '../../components/HeaderCell/useTableSort';
import { useWorklistColumns } from '../../components/WorklistColumns/useWorklistColumns';
import { HCC_COLUMNS } from './columns';
import { memberMatchesFilters } from './filters';
import { getDueCategory } from './DueDateChip.utils';

export function useHccWorklistTable() {
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
  // Archived HCC uses its own worklist_key so its column prefs don't
  // collide with the live HCC worklist. Everything else flows through the
  // shared worklistColumnPrefs slice.
  const columnPrefs = useWorklistColumns('hcc-archived', HCC_COLUMNS);
  const orderedColumns = columnPrefs.orderedColumns;
  const toggleHccColumn = columnPrefs.onToggle;
  const reorderHccColumns = columnPrefs.onReorder;
  const clearHccColumnOrder = columnPrefs.onReset;
  const clearHccHiddenCols = () => {};

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

  const hiddenSet = columnPrefs.hiddenSet;

  return {
    hccMembersLoading, perPage, activeSubnavList, hccDueDateFilter, setHccDueDateFilter,
    searchQuery, setSearchQuery, filterOpen, setFilterOpen, openHccHistoryDrawer, showToast,
    openIcdCreation, saveDialogOpen, setSaveDialogOpen, renameTarget, setRenameTarget,
    saveHccFilter, renameHccSavedFilter, filtered, memberThRef, setMemberSortPop,
    orderedColumns, hiddenSet, sortKey, sortDir, setSortPop, colCfgBtnRef, colCfgRect,
    setColCfgRect, paginated, someSelected, allSelected, handleSelectAll, selectedHccIds,
    clearHccSelected, bulkAssigneeOpen, setBulkAssigneeOpen, sortPop, setSort, clearSort,
    memberSortPop, toggleHccColumn, reorderHccColumns, clearHccColumnOrder, clearHccHiddenCols,
  };
}

import { useAppStore } from '../../store/useAppStore';
import { sameFilters } from '../../store/lib/worklistListFilters';

const EMPTY = [];

/**
 * Filter-bar actions while a saved filter is selected on a worklist (HCC,
 * HEDIS, SNP, AWV, JSA, CCM and the shared TCM / TOC lists). Editing the filters keeps the saved filter selected, so the
 * bar offers:
 *   - "Copy Filter" (save it under a new name) until it's edited
 *   - once edited: "Go Back to Filter" in place of Clear All, and
 *     Save Filter ⌄ → Save Changes (to it) | Save a New Filter
 * With no saved filter selected, nothing changes: Clear All and a plain
 * Save Filter.
 *
 * @param {string}   list      – The worklist ('HCC', 'HEDIS', 'SNP', 'AWV', 'JSA', 'CCM', 'TCM', …)
 * @param {object}   filters   – The list's current filters
 * @param {function} clearAll  – The list's Clear All
 * @param {function} onSaveNew – Opens the "name this filter" dialog
 * @returns {{ edited: boolean, clearAllLabel?: string, onClearAll: function,
 *   saveLabel?: string, saveMenuItems?: Array, onSaveMenuSelect?: function }}
 */
export function useSavedFilterActions(list, filters, clearAll, onSaveNew) {
  const saved = useAppStore(s => s.savedFiltersByList[list] ?? EMPTY);
  const activeId = useAppStore(s => s.activeSavedIdByList[list] ?? null);
  const applySavedFilter = useAppStore(s => s.applySavedFilter);
  const updateSavedFilter = useAppStore(s => s.updateSavedFilter);
  const resetSavedFilter = useAppStore(s => s.resetSavedFilter);
  const showToast = useAppStore(s => s.showToast);

  const active = saved.find(f => f.id === activeId) || null;
  if (!active) return { edited: false, onClearAll: clearAll };

  const edited = !sameFilters(filters, active.filters);
  // Clear All also deselects the saved filter, on every list.
  if (!edited) return { edited, onClearAll: () => resetSavedFilter(list), saveLabel: 'Copy Filter' };
  return {
    edited,
    clearAllLabel: 'Go Back to Filter',
    onClearAll: () => applySavedFilter(list, active.id),
    saveMenuItems: [
      { key: 'update', icon: 'solar:refresh-linear', label: 'Save Changes' },
      { key: 'new', icon: 'solar:add-circle-linear', label: 'Save a New Filter' },
    ],
    onSaveMenuSelect: (key) => {
      if (key === 'new') onSaveNew?.();
      else if (key === 'update') {
        updateSavedFilter(list, active.id);
        showToast?.(`Updated "${active.name}"`);
      }
    },
  };
}

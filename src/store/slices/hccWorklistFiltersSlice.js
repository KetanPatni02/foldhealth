import { track } from '../../lib/tracking';
import { detachSaved, hydrateListFilters } from '../lib/worklistListFilters';
import { readSessionJson } from '../lib/sessionJson';

/** HCC worklist list chrome: due-date chip, FilterChip filters, column hide/order. Fetch stays in useAppStore. */
export function createHccWorklistFiltersSlice(set, get) {
  return {
    hccDueDateFilter: null,
    setHccDueDateFilter: (cat) => set({ hccDueDateFilter: cat, currentPage: 1 }),

    hccFilters: hydrateListFilters('HCC'),
    setHccFilter: (k, vals) => {
      track('hcc.filter_applied', { filterKey: k, filterValue: Array.isArray(vals) ? vals.join(',') : vals });
      set(s => {
        const next = { ...s.hccFilters };
        if (!vals || !vals.length) delete next[k];
        else next[k] = vals;
        return {
          hccFilters: next,
          hccActiveSavedId: null,
          activeSavedIdByList: detachSaved(s.activeSavedIdByList, 'HCC'),
          currentPage: 1,
        };
      });
    },
    clearHccFilters: () => {
      track('hcc.filters_cleared_all');
      set(s => ({
        hccFilters: {},
        hccActiveSavedId: null,
        activeSavedIdByList: detachSaved(s.activeSavedIdByList, 'HCC'),
        currentPage: 1,
      }));
    },

    hccVisibleFilterKeys: null,
    toggleHccVisibleFilter: (k) => set(s => {
      const current = s.hccVisibleFilterKeys
        ? new Set(s.hccVisibleFilterKeys)
        : new Set(['my', 'rl', 'coh', 'g', 'open', 'chart', 'supS', 'cdrS', 'r1s', 'dec']);
      if (current.has(k)) current.delete(k);
      else current.add(k);
      return { hccVisibleFilterKeys: [...current] };
    }),
    setHccVisibleFilterKeys: (list) => set({ hccVisibleFilterKeys: [...list] }),
    clearHccVisibleFilters: () => set({ hccVisibleFilterKeys: [] }),

    saveHccFilter: (name) => get().saveSavedFilter('HCC', name),
    renameHccSavedFilter: (id, name) => get().renameSavedFilter('HCC', id, name),
    deleteHccSavedFilter: (id) => get().deleteSavedFilter('HCC', id),
    applyHccSavedFilter: (id) => get().applySavedFilter('HCC', id),

    hccHiddenCols: readSessionJson('hccHiddenCols', []),
    toggleHccColumn: (k) => {
      track('hcc.column_toggled', { column: k });
      set(s => {
        const next = new Set(s.hccHiddenCols);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        const arr = [...next];
        try { localStorage.setItem('hccHiddenCols', JSON.stringify(arr)); } catch {/* */}
        return { hccHiddenCols: arr };
      });
    },
    clearHccHiddenCols: () => {
      try { localStorage.setItem('hccHiddenCols', JSON.stringify([])); } catch {/* */}
      set({ hccHiddenCols: [] });
    },

    hccColumnOrder: readSessionJson('hccColumnOrder', []),
    reorderHccColumns: (fromKey, toKey) => set(s => {
      if (!fromKey || !toKey || fromKey === toKey) return {};
      track('hcc.columns_reordered', { from: fromKey, to: toKey });
      const base = s.hccColumnOrder.length
        ? [...s.hccColumnOrder]
        : (s._hccDefaultColumnKeys || []);
      if (!base.length) return {};
      const from = base.indexOf(fromKey);
      const to = base.indexOf(toKey);
      if (from < 0 || to < 0) return {};
      base.splice(to, 0, base.splice(from, 1)[0]);
      try { localStorage.setItem('hccColumnOrder', JSON.stringify(base)); } catch {/* */}
      return { hccColumnOrder: base };
    }),
    _hccDefaultColumnKeys: [],
    setHccDefaultColumnKeys: (keys) => set(s => (
      s._hccDefaultColumnKeys.length ? {} : { _hccDefaultColumnKeys: keys }
    )),
    clearHccColumnOrder: () => {
      try { localStorage.setItem('hccColumnOrder', JSON.stringify([])); } catch {/* */}
      set({ hccColumnOrder: [] });
    },
  };
}

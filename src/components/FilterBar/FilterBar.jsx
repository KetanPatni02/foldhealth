import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { FilterChip } from '../FilterChip/FilterChip';
import { useAppStore } from '../../store/useAppStore';
import { FilterNameDialog } from '../../features/hcc/FilterNameDialog';
import { MoreFiltersPopover } from '../../features/hcc/MoreFiltersPopover';
import { FILTER_DEFS, resolveOptions, mergeRefs } from './filterBarUtils';
import { SingleSelectFilter } from './SingleSelectFilter';
import { DefaultViewByToggle } from './DefaultViewByToggle';
import { FilterBarTail } from './FilterBarTail';
import styles from './FilterBar.module.css';

export function FilterBar({
  filterDefs,
  filters,
  onFilterChange,
  onClearAll,
  onSaveFilter,
  getOptions,
  multiSelect = false,
  visibleKeys: visibleKeysProp,
  onToggleVisible,
  onClearVisible,
  moreFilterItems,
  leading,
  saveDialogTitle = 'Save Filter',
  renderChip,
  chipsRef,
  tailRef,
  mirrorContent,
  hasActive: hasActiveProp,
  showInternalSaveDialog = true,
  showMoreFilters = true,
  showSaveFilter = true,
  autoFit = false,
  primaryKeys: primaryKeysProp,
} = {}) {
  const storeActiveFilters = useAppStore(s => s.activeFilters);
  const storeSetFilter = useAppStore(s => s.setFilter);
  const storeClearAllFilters = useAppStore(s => s.clearAllFilters);
  const storePatients = useAppStore(s => s.patients);
  const storeActiveSubnavList = useAppStore(s => s.activeSubnavList);
  const storeSaveSavedFilter = useAppStore(s => s.saveSavedFilter);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [customVisible, setCustomVisible] = useState(null);
  const moreBtnRef = useRef(null);
  const [moreRect, setMoreRect] = useState(null);
  const internalChipsRef = useRef(null);
  const internalTailRef = useRef(null);
  const measureRef = useRef(null);
  const setChipsRef = mergeRefs(internalChipsRef, chipsRef);
  const setTailRef = mergeRefs(internalTailRef, tailRef);

  const effectiveDefs = filterDefs ?? FILTER_DEFS;
  const effectiveFilters = filters ?? storeActiveFilters;
  const effectiveGetOptions = getOptions ?? ((def) => resolveOptions(def, storePatients));
  const listForSave = storeActiveSubnavList || 'TOC';
  const effectiveOnFilterChange = onFilterChange ?? ((key, next) => storeSetFilter(key, next));
  const effectiveOnClearAll = onClearAll ?? storeClearAllFilters;
  const effectiveOnSaveFilter = onSaveFilter ?? ((name) => storeSaveSavedFilter(listForSave, name));
  const effectiveMoreItems = moreFilterItems ?? effectiveDefs.map(fd => ({ k: fd.key, label: fd.label, primary: fd.primary }));

  const keyOrder = useMemo(
    () => Object.fromEntries(effectiveDefs.map((fd, i) => [fd.key, i])),
    [effectiveDefs],
  );
  const defByKey = useMemo(
    () => Object.fromEntries(effectiveDefs.map(fd => [fd.key, fd])),
    [effectiveDefs],
  );
  const primaryKeys = useMemo(() => {
    if (primaryKeysProp) return primaryKeysProp;
    const keys = [];
    for (const fd of effectiveDefs) {
      if (fd.primary) keys.push(fd.key);
    }
    return keys;
  }, [effectiveDefs, primaryKeysProp]);

  const activeKeys = useMemo(() => {
    if (multiSelect) {
      return Object.keys(effectiveFilters).filter(k => (effectiveFilters[k] || []).length > 0);
    }
    return Object.keys(effectiveFilters).filter(k => effectiveFilters[k] != null);
  }, [effectiveFilters, multiSelect]);

  const orderKeys = (keys) => [...new Set(keys)].sort(
    (a, b) => (keyOrder[a] ?? 99) - (keyOrder[b] ?? 99),
  );

  const [autoInactive, setAutoInactive] = useState(null);
  const customized = customVisible !== null;
  const activeKeySet = useMemo(() => new Set(activeKeys), [activeKeys]);
  const inactivePrimary = useMemo(
    () => primaryKeys.filter(k => !activeKeySet.has(k)),
    [primaryKeys, activeKeySet],
  );

  useLayoutEffect(() => {
    if (!autoFit) { setAutoInactive(null); return undefined; }
    if (visibleKeysProp !== undefined || customized) {
      setAutoInactive(null);
      return undefined;
    }
    const container = internalChipsRef.current;
    const mirror = measureRef.current;
    if (!container || !mirror) return undefined;
    const GAP = 6;
    const widthOf = (k) => mirror.querySelector(`[data-mk="${k}"]`)?.offsetWidth ?? 0;
    const compute = () => {
      const avail = container.clientWidth;
      let budget = avail;
      const tailW = internalTailRef.current?.offsetWidth ?? 0;
      if (tailW) budget -= tailW + GAP;
      activeKeys.forEach(k => { budget -= widthOf(k) + GAP; });
      const fit = new Set();
      for (const k of inactivePrimary) {
        const w = widthOf(k) + GAP;
        if (budget - w >= 0) { budget -= w; fit.add(k); } else break;
      }
      setAutoInactive(fit);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [autoFit, visibleKeysProp, customized, activeKeys, inactivePrimary]);

  const visibleKeys = useMemo(() => {
    if (visibleKeysProp !== undefined) {
      return orderKeys([...visibleKeysProp, ...activeKeys]);
    }
    if (autoFit) {
      if (customized) return orderKeys([...customVisible, ...activeKeys]);
      const shownInactive = autoInactive
        ? inactivePrimary.filter(k => autoInactive.has(k))
        : inactivePrimary;
      return orderKeys([...activeKeys, ...shownInactive]);
    }
    const base = customVisible ?? primaryKeys;
    return orderKeys([...base, ...activeKeys]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKeysProp, customVisible, activeKeys, primaryKeys, autoFit, autoInactive, inactivePrimary]);

  const toggleVisible = (k) => {
    if (onToggleVisible) {
      onToggleVisible(k);
      return;
    }
    setCustomVisible(prev => {
      const base = prev
        ?? (autoFit
              ? [...activeKeys, ...(autoInactive
                    ? inactivePrimary.filter(x => autoInactive.has(x))
                    : inactivePrimary)]
              : primaryKeys);
      const next = new Set(base);
      if (next.has(k)) next.delete(k); else next.add(k);
      return [...next];
    });
  };

  const clearVisible = () => {
    if (onClearVisible) {
      onClearVisible();
      return;
    }
    setCustomVisible([]);
  };

  const openMore = () => {
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) setMoreRect(rect);
  };

  const computedHasActive = multiSelect
    ? Object.values(effectiveFilters).some(v => Array.isArray(v) && v.length > 0)
    : Object.keys(effectiveFilters).length > 0;
  const hasActive = hasActiveProp !== undefined ? hasActiveProp : computedHasActive;
  const tailActions = useMemo(() => {
    const next = [];
    if (showMoreFilters) next.push('moreFilters');
    if (showSaveFilter) next.push(showInternalSaveDialog ? 'saveFilterDialog' : 'saveFilter');
    return next;
  }, [showMoreFilters, showSaveFilter, showInternalSaveDialog]);
  const leadingNode = leading === undefined ? <DefaultViewByToggle /> : leading;

  const renderOne = (k, mirror = false) => {
    if (renderChip) return renderChip(k, mirror);
    const fd = defByKey[k];
    if (!fd) return null;
    const opts = effectiveGetOptions(fd) || [];
    if (multiSelect) {
      return (
        <FilterChip
          label={fd.label}
          options={opts}
          selected={effectiveFilters[fd.key] || []}
          onChange={(vals) => effectiveOnFilterChange(fd.key, vals)}
        />
      );
    }
    return (
      <SingleSelectFilter
        label={fd.label}
        def={fd}
        options={opts}
        current={effectiveFilters[fd.key] || null}
        onSet={(val) => effectiveOnFilterChange(fd.key, val)}
        onClear={() => effectiveOnFilterChange(fd.key, null)}
      />
    );
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterRow} ref={setChipsRef}>
        {leadingNode}
        {visibleKeys.map(k => (
          <span key={k}>{renderOne(k, false)}</span>
        ))}
        <FilterBarTail
          tailRef={setTailRef}
          actions={tailActions}
          moreRect={moreRect}
          onOpenMore={openMore}
          onCloseMore={() => setMoreRect(null)}
          hasActive={hasActive}
          onClearAll={() => effectiveOnClearAll()}
          onSaveFilter={() => effectiveOnSaveFilter()}
          onOpenSaveDialog={() => setSaveDialogOpen(true)}
        />
      </div>

      {autoFit && (
        <div className={styles.measure} ref={measureRef} aria-hidden="true">
          {primaryKeys.map((k) => (
            <span key={k} data-mk={k} aria-hidden="true" style={{ display: 'inline-flex' }}>
              {renderOne(k, true)}
            </span>
          ))}
        </div>
      )}

      {mirrorContent}

      {moreRect && (
        <MoreFiltersPopover
          anchorRect={moreRect}
          visibleKeys={visibleKeys}
          moreFilterItems={effectiveMoreItems}
          onToggle={toggleVisible}
          onClear={clearVisible}
          onClose={() => setMoreRect(null)}
        />
      )}

      {showInternalSaveDialog && (
        <FilterNameDialog
          open={saveDialogOpen}
          title={saveDialogTitle}
          submitLabel="Save & Apply"
          initialName=""
          onSubmit={(name) => { effectiveOnSaveFilter(name); setSaveDialogOpen(false); }}
          onCancel={() => setSaveDialogOpen(false)}
        />
      )}
    </div>
  );
}

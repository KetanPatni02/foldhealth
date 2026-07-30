import { useRef, useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { CheckboxListPopover } from '../../components/Popover/CheckboxListPopover';
import { RadioListPopover } from '../../components/Popover/RadioListPopover';
import { RangeSliderPopover } from '../../components/Popover/RangeSliderPopover';
import { DateRangePopover } from '../../components/Popover/DateRangePopover';
import { useAppStore } from '../../store/useAppStore';
import {
  FILTER_DEF_MAP as HCC_FILTER_DEF_MAP,
  MORE_FILTER_ITEMS as HCC_MORE_FILTER_ITEMS,
  PRIMARY_FILTER_KEYS as HCC_PRIMARY_FILTER_KEYS,
} from './filters';
import { MoreFiltersPopover } from './MoreFiltersPopover';
import styles from './FilterChipBar.module.css';

/**
 * The horizontal chip row sitting above the worklist table. Renders one chip
 * per filter in the list's visible-filter set, plus a "More Filters" trigger
 * and the "Clear All" / "Save Filter" right-aligned controls.
 *
 * Chip click → opens the popover for that filter's `type`.
 *
 * Props:
 *  - list (string)                Which worklist's store slice this bar drives
 *                                 ('HCC' | 'HEDIS'). Selects the filters
 *                                 slice, visible-keys slice, and clear/set
 *                                 actions. Defaults to 'HCC' so pre-existing
 *                                 callers don't have to change.
 *  - filterDefMap (object)        Map from filter key → def object (defines
 *                                 `type`, `opts`, `dynamic`, `searchable`,
 *                                 …). Defaults to HCC's FILTER_DEF_MAP.
 *  - moreFilterItems (array)      Full roster of filters (order, labels,
 *                                 primary/extended). Defaults to HCC's.
 *  - primaryFilterKeys (string[]) Keys that appear in the chip row by default
 *                                 (in auto-fit mode). Defaults to HCC's.
 *  - dynamicOpts (object)         `{ [poolKey]: string[] }` — data-derived
 *                                 option pools that a def's `dynamic` field
 *                                 points at (e.g. distinct cities on the
 *                                 loaded rows). Defaults to `{}`.
 *  - onSaveFilter (fn)            Open the parent's SaveFilterDialog.
 */
const STORE_SELECTORS_BY_LIST = {
  HCC: {
    filters:       'hccFilters',
    setFilter:     'setHccFilter',
    clearFilters:  'clearHccFilters',
    visibleKeys:   'hccVisibleFilterKeys',
    setVisible:    'setHccVisibleFilterKeys',
    clearVisible:  'clearHccVisibleFilters',
  },
  HEDIS: {
    filters:       'hedisFilters',
    setFilter:     'setHedisFilter',
    clearFilters:  'clearHedisFilters',
    visibleKeys:   'hedisVisibleFilterKeys',
    setVisible:    'setHedisVisibleFilterKeys',
    clearVisible:  'clearHedisVisibleFilters',
  },
};

export function FilterChipBar({
  list = 'HCC',
  filterDefMap = HCC_FILTER_DEF_MAP,
  moreFilterItems = HCC_MORE_FILTER_ITEMS,
  primaryFilterKeys = HCC_PRIMARY_FILTER_KEYS,
  dynamicOpts: dynamicOptsProp,
  onSaveFilter,
}) {
  const sel = STORE_SELECTORS_BY_LIST[list] || STORE_SELECTORS_BY_LIST.HCC;

  const filters             = useAppStore(s => s[sel.filters]);
  const setFilter           = useAppStore(s => s[sel.setFilter]);
  const clearFilters        = useAppStore(s => s[sel.clearFilters]);
  const storedVisible       = useAppStore(s => s[sel.visibleKeys]);
  const setVisibleFilterKeys= useAppStore(s => s[sel.setVisible]);
  const clearVisibleFilters = useAppStore(s => s[sel.clearVisible]);

  const showToast = useAppStore(s => s.showToast);
  const hccMembers = useAppStore(s => s.hccMembers);
  // Platform users drive the Assignee filter's options (Settings → Users).
  // One-shot fetch guarded in the store so multiple mounts don't re-round-trip.
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  useEffect(() => { fetchPlatformUsers(); }, [fetchPlatformUsers]);

  // Options for `dynamic` filters are computed from the loaded records rather
  // than a static list. HCC keeps its historical logic below; other worklists
  // pass a precomputed `dynamicOpts` object via the prop.
  const byRole = (role) => platformUsers
    .filter(u => u.clinicalRoles?.includes(role))
    .map(u => u.name);
  const distinct = (key) => [...new Set(hccMembers.map(m => m[key]).filter(Boolean))].sort();
  const hccDynamicOpts = useMemo(() => ({
    vt:   [...new Set(hccMembers.map(m => m.visitType || m.vt).filter(Boolean))].sort(),
    asgn: platformUsers.map(u => u.name),
    supU: byRole('Support'),
    cdrU: byRole('Coder'),
    r1u:  byRole('QA'),
    r2u:  byRole('Compliance'),
    rp:    distinct('rp'),
    pcp:   distinct('pcp'),
    ipa:   distinct('ipa'),
    hp:    distinct('hp'),
    city:  distinct('city'),
    state: distinct('state'),
    tin:   distinct('tin'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [hccMembers, platformUsers]);
  const dynamicOpts = dynamicOptsProp || (list === 'HCC' ? hccDynamicOpts : {});
  const optsFor = (def) => {
    const dynKey = def?.dynamic;
    if (dynKey && dynamicOpts[dynKey]?.length) return dynamicOpts[dynKey];
    return def?.opts || [];
  };

  const chipsRef = useRef(null);
  const measureRef = useRef(null);
  const tailRef = useRef(null);
  // Auto-fit: which inactive PRIMARY chips fit one row (null until measured).
  const [autoInactive, setAutoInactive] = useState(null);

  const KEY_ORDER = useMemo(
    () => Object.fromEntries(moreFilterItems.map((x, i) => [x.k, i])),
    [moreFilterItems],
  );
  const orderKeys = (keys) => [...new Set(keys)]
    .sort((a, b) => (KEY_ORDER[a] ?? 99) - (KEY_ORDER[b] ?? 99));

  const activeKeys = useMemo(
    () => moreFilterItems.map(x => x.k).filter(k => (filters[k] || []).length > 0),
    [filters, moreFilterItems],
  );
  const customized = storedVisible != null;

  const inactivePrimary = useMemo(
    () => primaryFilterKeys.filter(k => !(filters[k] || []).length),
    [filters, primaryFilterKeys],
  );
  const visibleKeys = useMemo(() => {
    if (customized) return orderKeys([...storedVisible, ...activeKeys]);
    const shownInactive = autoInactive ? inactivePrimary.filter(k => autoInactive.has(k)) : inactivePrimary;
    return orderKeys([...activeKeys, ...shownInactive]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customized, storedVisible, activeKeys, inactivePrimary, autoInactive]);

  // Measure (default mode only): fit inactive PRIMARY chips into one row after
  // the always-shown active chips. Uses a hidden mirror so widths are stable
  // regardless of what's currently trimmed. Re-runs on width change.
  useLayoutEffect(() => {
    if (customized) { setAutoInactive(null); return undefined; }
    const container = chipsRef.current;
    const mirror = measureRef.current;
    if (!container || !mirror) return undefined;
    const GAP = 6;
    const widthOf = (k) => mirror.querySelector(`[data-mk="${k}"]`)?.offsetWidth ?? 0;
    const compute = () => {
      const avail = container.clientWidth;
      let budget = avail;
      const tailW = tailRef.current?.offsetWidth ?? 0;
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
  }, [customized, activeKeys, inactivePrimary]);

  // Which chip popover is open: { key, rect } | null
  const [chipPop, setChipPop] = useState(null);
  const moreBtnRef = useRef(null);
  const [moreRect, setMoreRect] = useState(null);

  const openChip = (k, anchor) => setChipPop({ key: k, rect: anchor.getBoundingClientRect() });
  const closeChip = () => setChipPop(null);

  const openMore = () => {
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) setMoreRect(rect);
  };
  const closeMore = () => setMoreRect(null);

  const toggleVisible = (k) => {
    const next = new Set(visibleKeys);
    if (next.has(k)) next.delete(k); else next.add(k);
    setVisibleFilterKeys([...next]);
  };

  const openChipFor = (k, currentTarget) => {
    const item = moreFilterItems.find(x => x.k === k);
    const def = filterDefMap[k];
    if (!def) { showToast(`Filter "${item?.label}" — coming soon`); return; }
    if (['multi', 'radio', 'range', 'date'].includes(def.type)) openChip(k, currentTarget);
    else showToast(`Filter "${item?.label}" popover — not yet wired`);
  };

  const renderChip = (k, mirror) => {
    const item = moreFilterItems.find(x => x.k === k);
    if (!item) return null;
    const vals = filters[k] || [];
    const active = vals.length > 0;
    return (
      <button
        key={k}
        {...(mirror ? { 'data-mk': k, tabIndex: -1, 'aria-hidden': true } : {})}
        type="button"
        className={[styles.chip, active ? styles.chipActive : ''].join(' ')}
        onClick={mirror ? undefined : (e) => openChipFor(k, e.currentTarget)}
      >
        <span className={styles.chipLabel}>{item.label}</span>
        {active ? (
          <>
            <span className={styles.divider} aria-hidden="true">|</span>
            <span className={styles.chipValue}>{summarize(k, vals)}</span>
            <span
              className={styles.clearIcon}
              role="button"
              aria-label={`Clear ${item.label} filter`}
              onClick={mirror ? undefined : (e) => { e.stopPropagation(); setFilter(k, []); }}
            >
              <Icon name="solar:close-circle-linear" size={12} color="var(--primary-300)" />
            </span>
          </>
        ) : (
          <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
        )}
      </button>
    );
  };

  const hasActiveFilters = activeKeys.length > 0;

  return (
    <div className={styles.bar}>
      <div className={styles.chips} ref={chipsRef}>
        {visibleKeys.map((k) => renderChip(k, false))}
        <div className={styles.tail} ref={tailRef}>
          <button
            ref={moreBtnRef}
            type="button"
            className={[styles.moreBtn, moreRect ? styles.moreBtnActive : ''].join(' ')}
            onClick={moreRect ? closeMore : openMore}
          >
            More Filters
            <Icon
              name="solar:alt-arrow-down-linear"
              size={11}
              color={moreRect ? 'var(--primary-300)' : 'var(--neutral-300)'}
            />
          </button>

          {hasActiveFilters && (
            <>
              <span className={styles.vDivider} />
              <button
                type="button"
                className={styles.linkBtn}
                onClick={clearFilters}
              >
                Clear All
              </button>
              <span className={styles.vDivider} />
              <button
                type="button"
                className={[styles.linkBtn, styles.linkBtnPrimary].join(' ')}
                onClick={onSaveFilter}
              >
                Save Filter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden mirror — all PRIMARY chips, for stable width measurement. */}
      <div className={styles.measure} ref={measureRef} aria-hidden="true">
        {primaryFilterKeys.map((k) => renderChip(k, true))}
      </div>

      {chipPop && (() => {
        const def = filterDefMap[chipPop.key];
        if (!def) return null;
        const current = filters[chipPop.key] || [];
        const setVals = (next) => setFilter(chipPop.key, next);

        if (def.type === 'multi') {
          return (
            <CheckboxListPopover
              anchorRect={chipPop.rect}
              label={def.popoverLabel || def.label}
              options={optsFor(def)}
              selected={current}
              onChange={setVals}
              onClose={closeChip}
              searchable={def.searchable}
            />
          );
        }
        if (def.type === 'radio') {
          return (
            <RadioListPopover
              anchorRect={chipPop.rect}
              label={def.label}
              options={def.opts}
              selected={current}
              onChange={(next) => { setVals(next); closeChip(); }}
              onClose={closeChip}
            />
          );
        }
        if (def.type === 'date') {
          return (
            <DateRangePopover
              anchorRect={chipPop.rect}
              label={def.label}
              selected={current}
              onChange={setVals}
              onClose={closeChip}
            />
          );
        }
        if (def.type === 'range') {
          const lo = def.opts[0];
          const hi = def.opts[def.opts.length - 1];
          const initMin = current.length >= 2 ? parseInt(current[0], 10) : parseInt(lo, 10);
          const initMax = current.length >= 2 ? parseInt(current[1], 10) : parseInt(hi, 10);
          return (
            <RangeSliderPopover
              anchorRect={chipPop.rect}
              label={def.label}
              min={parseInt(lo, 10)}
              max={parseInt(hi, 10)}
              step={1}
              initialMin={initMin}
              initialMax={initMax}
              onApply={(mn, mx) => {
                setVals([String(mn), String(mx)]);
                closeChip();
              }}
              onClose={closeChip}
            />
          );
        }
        return null;
      })()}

      {moreRect && (
        <MoreFiltersPopover
          anchorRect={moreRect}
          visibleKeys={visibleKeys}
          moreFilterItems={moreFilterItems}
          onToggle={toggleVisible}
          onClear={clearVisibleFilters}
          onClose={closeMore}
        />
      )}
    </div>
  );
}

// Format the active value list for the chip's right-hand label.
function summarize(k, vals) {
  if (k === 'dec' && vals.length >= 2) return `${vals[0]}–${vals[1]}`;
  if (['cd', 'dos', 'dob', 'lvd', 'lastOutreachDate'].includes(k) && vals.length >= 2) {
    return `${formatShortDate(vals[0])} – ${formatShortDate(vals[1])}`;
  }
  if (vals.length > 2) return `${vals[0]} +${vals.length - 1}`;
  return vals.join(', ');
}

function formatShortDate(iso) {
  const [y, m, d] = (iso || '').split('-');
  return m && d ? `${m}/${d}` : iso;
}

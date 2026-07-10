import { useRef, useState, useMemo, useLayoutEffect } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { CheckboxListPopover } from '../../components/Popover/CheckboxListPopover';
import { RadioListPopover } from '../../components/Popover/RadioListPopover';
import { RangeSliderPopover } from '../../components/Popover/RangeSliderPopover';
import { DateRangePopover } from '../../components/Popover/DateRangePopover';
import { useAppStore } from '../../store/useAppStore';
import { FILTER_DEF_MAP, MORE_FILTER_ITEMS, PRIMARY_FILTER_KEYS } from './filters';
import { MoreFiltersPopover } from './MoreFiltersPopover';
import styles from './FilterChipBar.module.css';

/**
 * The horizontal chip row sitting above the worklist table. Renders one chip
 * per filter in `hccVisibleFilterKeys`, plus a "More Filters" trigger and the
 * "Clear All" / "Save Filter" right-aligned controls.
 *
 * Chip click → opens the popover for that filter's `type`. For Phase 1b only
 * `multi` filters wire to a real popover (CheckboxListPopover); the other
 * types are stubbed and Phase 1c will fill them in.
 *
 * Props:
 *  - onSaveFilter (fn)  Open the parent's SaveFilterDialog.
 */
const KEY_ORDER = Object.fromEntries(MORE_FILTER_ITEMS.map((x, i) => [x.k, i]));
const orderKeys = (keys) => [...new Set(keys)].sort((a, b) => (KEY_ORDER[a] ?? 99) - (KEY_ORDER[b] ?? 99));

export function FilterChipBar({ onSaveFilter }) {
  const hccFilters = useAppStore(s => s.hccFilters);
  const setHccFilter = useAppStore(s => s.setHccFilter);
  const clearHccFilters = useAppStore(s => s.clearHccFilters);
  const storedVisible = useAppStore(s => s.hccVisibleFilterKeys);
  const setHccVisibleFilterKeys = useAppStore(s => s.setHccVisibleFilterKeys);
  const clearHccVisibleFilters = useAppStore(s => s.clearHccVisibleFilters);
  const showToast = useAppStore(s => s.showToast);

  const chipsRef = useRef(null);
  const measureRef = useRef(null);
  // Auto-fit: which inactive PRIMARY chips fit one row (null until measured).
  const [autoInactive, setAutoInactive] = useState(null);

  const activeKeys = useMemo(
    () => MORE_FILTER_ITEMS.map(x => x.k).filter(k => (hccFilters[k] || []).length > 0),
    [hccFilters],
  );
  const customized = storedVisible != null;

  // The chips actually shown in the bar. Customized → the user's set (+ any
  // active filter). Default → active filters + the inactive PRIMARY chips
  // that fit one row (measured); before measuring, show all (trimmed in the
  // layout effect before paint, so no flash).
  const inactivePrimary = useMemo(
    () => PRIMARY_FILTER_KEYS.filter(k => !(hccFilters[k] || []).length),
    [hccFilters],
  );
  const visibleKeys = useMemo(() => {
    if (customized) return orderKeys([...storedVisible, ...activeKeys]);
    const shownInactive = autoInactive ? inactivePrimary.filter(k => autoInactive.has(k)) : inactivePrimary;
    return orderKeys([...activeKeys, ...shownInactive]);
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
      activeKeys.forEach(k => { budget -= widthOf(k) + GAP; }); // active always shown
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
  // More-filters popover state
  const moreBtnRef = useRef(null);
  const [moreRect, setMoreRect] = useState(null);

  const openChip = (k, anchor) => setChipPop({ key: k, rect: anchor.getBoundingClientRect() });
  const closeChip = () => setChipPop(null);

  const openMore = () => {
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) setMoreRect(rect);
  };
  const closeMore = () => setMoreRect(null);

  // Toggle a filter's presence in the bar from More Filters. Operates on the
  // current *effective* visible set so it's consistent in auto-fit mode too.
  const toggleVisible = (k) => {
    const next = new Set(visibleKeys);
    if (next.has(k)) next.delete(k); else next.add(k);
    setHccVisibleFilterKeys([...next]);
  };

  const openChipFor = (k, currentTarget) => {
    const item = MORE_FILTER_ITEMS.find(x => x.k === k);
    const def = FILTER_DEF_MAP[k];
    if (!def) { showToast(`Filter "${item?.label}" — coming soon`); return; }
    if (['multi', 'radio', 'range', 'date'].includes(def.type)) openChip(k, currentTarget);
    else showToast(`Filter "${item?.label}" popover — not yet wired`);
  };

  const renderChip = (k, mirror) => {
    const item = MORE_FILTER_ITEMS.find(x => x.k === k);
    if (!item) return null;
    const vals = hccFilters[k] || [];
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
              onClick={mirror ? undefined : (e) => { e.stopPropagation(); setHccFilter(k, []); }}
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
      </div>

      {/* Hidden mirror — all PRIMARY chips, for stable width measurement. */}
      <div className={styles.measure} ref={measureRef} aria-hidden="true">
        {PRIMARY_FILTER_KEYS.map((k) => renderChip(k, true))}
      </div>

      <div className={styles.right}>
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
              onClick={clearHccFilters}
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

      {/* Chip popovers — Phase 1b/c dispatch by FILTER_DEFS type */}
      {chipPop && (() => {
        const def = FILTER_DEF_MAP[chipPop.key];
        if (!def) return null;
        const current = hccFilters[chipPop.key] || [];
        const setVals = (next) => setHccFilter(chipPop.key, next);

        if (def.type === 'multi') {
          return (
            <CheckboxListPopover
              anchorRect={chipPop.rect}
              label={def.label}
              options={def.opts}
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

      {/* More-filters popover */}
      {moreRect && (
        <MoreFiltersPopover
          anchorRect={moreRect}
          visibleKeys={visibleKeys}
          onToggle={toggleVisible}
          onClear={clearHccVisibleFilters}
          onClose={closeMore}
        />
      )}
    </div>
  );
}

// Format the active value list for the chip's right-hand label.
function summarize(k, vals) {
  if (k === 'dec' && vals.length >= 2) return `${vals[0]}–${vals[1]}`;
  // Date-range filters store ISO strings — show MM/DD format on the chip.
  if (['cd', 'dos', 'dob', 'lvd'].includes(k) && vals.length >= 2) {
    return `${formatShortDate(vals[0])} – ${formatShortDate(vals[1])}`;
  }
  if (vals.length > 2) return `${vals[0]} +${vals.length - 1}`;
  return vals.join(', ');
}

function formatShortDate(iso) {
  const [y, m, d] = (iso || '').split('-');
  return m && d ? `${m}/${d}` : iso;
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import styles from './DueDateChip.module.css';

/**
 * Top-bar "Saved Filters" dropdown (Paper 21UY). Lists the HCC saved views,
 * applies one on click, and shows the active view's name on the chip. Reuses
 * the DueDateChip styles so it sits identically next to the other top-bar
 * chips.
 */
export function SavedFiltersChip() {
  const savedFilters = useAppStore(s => s.savedFiltersByList.HCC || []);
  const activeId = useAppStore(s => s.activeSavedIdByList.HCC || null);
  const applyHccSavedFilter = useAppStore(s => s.applyHccSavedFilter);
  const clearHccFilters = useAppStore(s => s.clearHccFilters);

  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const active = savedFilters.find(f => f.id === activeId) || null;

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left });
  };
  const close = () => setPos(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[styles.chip, active ? styles.chipActive : ''].join(' ')}
        onClick={pos ? close : open}
      >
        <span>{active ? active.name : 'Saved Filters'}</span>
        <Icon
          name="solar:alt-arrow-down-linear"
          size={12}
          color={active ? 'var(--primary-300)' : 'var(--neutral-300)'}
        />
      </button>
      {pos && (
        <SavedFiltersPopover
          pos={pos}
          savedFilters={savedFilters}
          activeId={activeId}
          onSelect={(id) => { applyHccSavedFilter(id); close(); }}
          onClear={() => { clearHccFilters(); close(); }}
          onClose={close}
        />
      )}
    </>
  );
}

function SavedFiltersPopover({ pos, savedFilters, activeId, onSelect, onClear, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.popover} style={{ top: pos.top, left: pos.left }}>
        <div className={styles.popHeader}>Saved Filters</div>
        <div className={styles.optionList}>
          {savedFilters.length === 0 && (
            <span className={styles.optionLabel}>No saved filters yet</span>
          )}
          {savedFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={styles.option}
              onClick={() => onSelect(f.id)}
            >
              <span
                className={[styles.radio, activeId === f.id ? styles.radioActive : ''].join(' ')}
              >
                {activeId === f.id && <span className={styles.radioDot} />}
              </span>
              <span className={styles.optionLabel}>{f.name}</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.reset} onClick={onClear}>
          Clear Selection
        </button>
      </div>
    </>,
    document.body,
  );
}

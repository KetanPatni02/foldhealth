import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import styles from './CheckboxListPopover.module.css';

/**
 * Fold Health CheckboxListPopover — anchored, portaled multi-select.
 *
 * Use as the popover behind a filter chip: pass an array of options, the
 * currently selected values, and an onChange to receive the new array.
 *
 * Props:
 *  - anchorRect (DOMRect-like)   Anchor's bounding rect (caller's responsibility
 *                                 to compute via `e.currentTarget.getBoundingClientRect()`).
 *  - label      (string)         Header label shown at the top of the popover.
 *  - options    (string[])       Available choices.
 *  - selected   (string[])       Currently selected values.
 *  - onChange   (fn(string[]))   New value array (already in option order).
 *  - onClose    (fn)             Called on overlay click or Escape.
 *  - width      (number)         Defaults to 240px.
 *  - showClear  (boolean)        Show a "Clear Selection" footer (default true).
 */
export function CheckboxListPopover({
  anchorRect,
  label,
  options,
  selected = [],
  onChange,
  onClose,
  width = 240,
  showClear = true,
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pos = useMemo(() => positionPopover(anchorRect, width), [anchorRect, width]);
  const sel = useMemo(() => new Set(selected), [selected]);

  const toggle = (v) => {
    const next = sel.has(v) ? selected.filter(x => x !== v) : [...selected, v];
    // Keep the option-order stable
    onChange?.(options.filter(o => next.includes(o)));
  };

  if (!anchorRect) return null;

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={styles.popover}
        style={{ top: pos.top, left: pos.left, width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={label}
      >
        {label && <div className={styles.header}>{label}</div>}
        <div className={styles.list}>
          {options.map((opt) => {
            const checked = sel.has(opt);
            return (
              <button
                key={opt}
                type="button"
                className={styles.row}
                onClick={() => toggle(opt)}
              >
                <span className={[styles.box, checked ? styles.boxChecked : ''].join(' ')}>
                  {checked && <Icon name="solar:check-read-linear" size={10} color="var(--neutral-0)" />}
                </span>
                <span className={styles.label}>{opt}</span>
              </button>
            );
          })}
        </div>
        {showClear && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => onChange?.([])}
          >
            Clear Selection
          </button>
        )}
      </div>
    </>,
    document.body,
  );
}

// Compute a fixed-position location below the anchor, clamped to the viewport.
function positionPopover(rect, width) {
  if (!rect) return { top: 0, left: 0 };
  const margin = 8;
  const top = Math.min(rect.bottom + 6, window.innerHeight - 320);
  const left = Math.min(rect.left, window.innerWidth - width - margin);
  return { top, left: Math.max(margin, left) };
}

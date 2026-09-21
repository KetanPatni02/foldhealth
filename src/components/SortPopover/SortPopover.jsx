import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from './SortPopover.module.css';

/**
 * Fold Health SortPopover — explicit ascending/descending sort picker.
 *
 * Two layouts depending on `items`:
 *  - 1 item → simple per-column sort (mirrors prototype's SortPopup).
 *  - 2+ items → "Sort by [Field]" multi-row variant (prototype's MemberSortPopup).
 *
 * The popover is anchored to a trigger rect, renders into the body via portal,
 * and closes on overlay click / Escape. Sort selections close automatically;
 * the "Clear Sort" footer appears only when one of the items is the current
 * active sort.
 *
 * Props:
 *  - anchorRect (DOMRect)              Trigger's bounding rect.
 *  - items      ({key,label}[])        One or more sortable axes for the column.
 *  - currentKey (string|null)          Currently active sort key (across the table).
 *  - currentDir ('asc'|'desc')         Currently active sort direction.
 *  - onSort     (fn(key, dir))         Apply this sort selection.
 *  - onClear    (fn)                   Clear sort.
 *  - onClose    (fn)                   Dismiss popover.
 *  - width      (number)               Default 208.
 */
export function SortPopover({
  anchorRect,
  items,
  currentKey,
  currentDir,
  onSort,
  onClear,
  onClose,
  width = 208,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pos = useMemo(() => positionPopover(anchorRect, width), [anchorRect, width]);
  const keys = useMemo(() => new Set(items.map(i => i.key)), [items]);
  const showClear = keys.has(currentKey);

  if (!anchorRect) return null;

  // Apply the sort but keep the popover open so the reviewer can see
  // the picked direction highlighted in primary before they dismiss.
  const select = (key, dir) => {
    onSort?.(key, dir);
  };

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      <div
        className={styles.popover}
        style={{ top: pos.top, left: pos.left, width }}
        onClick={(e) => e.stopPropagation()}
        role="group"
        aria-label="Sort by"
      >
        <div className={styles.heading}>Sort by</div>
        {items.map((item) => {
          const isActive = currentKey === item.key;
          return (
            <div
              key={item.key}
              className={[styles.row, isActive ? styles.rowActive : ''].join(' ')}
            >
              <span className={[styles.label, isActive ? styles.labelActive : ''].join(' ')}>
                {item.label}
              </span>
              <div className={styles.dirGroup}>
                <DirButton dir="asc"  active={isActive && currentDir === 'asc'}  onClick={() => select(item.key, 'asc')}  />
                <DirButton dir="desc" active={isActive && currentDir === 'desc'} onClick={() => select(item.key, 'desc')} />
              </div>
            </div>
          );
        })}
        {showClear && (
          <>
            <div className={styles.divider} />
            <button
              type="button"
              className={styles.clear}
              onClick={() => { onClear?.(); onClose?.(); }}
            >
              Clear Sort
            </button>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}

function DirButton({ dir, active, onClick }) {
  const stroke = active ? 'var(--neutral-0)' : 'var(--neutral-300)';
  return (
    <button
      type="button"
      className={[styles.dirBtn, active ? styles.dirBtnActive : ''].join(' ')}
      onClick={onClick}
      aria-label={dir === 'asc' ? 'Sort ascending' : 'Sort descending'}
    >
      {/* Real arrow (shaft + head) — the shared Icon layer maps
          `solar:arrow-*` names to a plain chevron, which reads as a
          disclosure indicator instead of a direction cue, so this
          component ships its own inline SVG. */}
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {dir === 'asc' ? (
          <>
            <path d="M8 13V3" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 7L8 3L12 7" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M8 3V13" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M4 9L8 13L12 9" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </button>
  );
}

// Anchor the popover to the RIGHT edge of the trigger so it lines up
// under the sort icon inside a HeaderCell (the label sits on the left
// and the chevron on the right). Falls back to left-alignment if the
// popover would spill past the viewport on the right.
function positionPopover(rect, width) {
  if (!rect) return { top: 0, left: 0 };
  const margin = 8;
  const top = Math.min(rect.bottom + 4, window.innerHeight - 220);
  const preferred = rect.right - width;
  const clamped = Math.min(Math.max(margin, preferred), window.innerWidth - width - margin);
  return { top, left: clamped };
}

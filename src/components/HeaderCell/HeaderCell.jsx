import { useRef } from 'react';
import styles from './HeaderCell.module.css';

// Per-column-type sort language (Notion convention). `sortType` picks the
// direction phrase used in the hover tooltip; defaults to `alpha`.
const SORT_LABELS = {
  alpha:    { asc: 'A to Z',             desc: 'Z to A' },
  date:     { asc: 'oldest to newest',   desc: 'newest to oldest' },
  number:   { asc: 'lowest to highest',  desc: 'highest to lowest' },
  priority: { asc: 'lowest to highest',  desc: 'highest to lowest' },
  generic:  { asc: 'in ascending order', desc: 'in descending order' },
};

/**
 * HeaderCell — the design system's column header cell for every worklist
 * / data-table in the app. Replaces the older `SortableHeader` primitive.
 *
 * Behaviour:
 *  - Idle sortable columns show a double-chevron affordance.
 *  - The column that owns the current sort morphs one chevron into a
 *    full arrow via a single SVG with three fade-in/out parts.
 *  - Hovering the icon paints a grey-50 chip and reveals a dark tooltip
 *    whose copy is column-type-aware:
 *        alpha → "Sort A to Z" / "Sorted Z to A"
 *        date → "Sort oldest to newest" / "Sorted newest to oldest"
 *        number|priority → "Sort lowest to highest" / "Sorted highest to lowest"
 *        generic → "Sort in ascending order" / "Sorted in descending order"
 *  - Passing an `align` prop switches text alignment (left / right / center).
 *
 * @param {object}   props
 * @param {string}   props.label       Column display name.
 * @param {string}   [props.sortField] Field this column sorts by. Omit
 *                                     for a non-sortable header.
 * @param {'alpha'|'date'|'number'|'priority'|'generic'} [props.sortType='alpha']
 * @param {string}   [props.activeKey] Currently-active sort field.
 * @param {'asc'|'desc'|null} [props.activeDir] Currently-active sort direction.
 * @param {(field:string, rect:DOMRect) => void} [props.onSort]
 *                   Called when a sortable header is clicked. Receives the
 *                   sort field and the trigger `<th>`'s bounding rect so
 *                   callers can either toggle direction or anchor a popover.
 * @param {'left'|'right'|'center'} [props.align='left']
 * @param {string}   [props.className]
 * @param {object}   [props.style]
 */
export function HeaderCell({
  label,
  sortField,
  sortType = 'alpha',
  activeKey,
  activeDir,
  onSort,
  align = 'left',
  className,
  style,
}) {
  const ref = useRef(null);
  const isSortable = !!sortField && !!onSort;
  const isActive = isSortable && activeKey === sortField;

  const handleClick = () => {
    if (!isSortable) return;
    onSort(sortField, ref.current?.getBoundingClientRect());
  };

  const cls = [
    styles.headerCell,
    isSortable ? styles.headerCellSortable : '',
    isActive ? styles.headerCellActive : '',
    className || '',
  ].filter(Boolean).join(' ');

  const labels = SORT_LABELS[sortType] || SORT_LABELS.alpha;
  const tooltip = isActive
    ? `${label} • Sorted ${activeDir === 'desc' ? labels.desc : labels.asc}`
    : `${label} • Sort ${labels.asc}`;

  // Three-part morphing icon — top chevron, bottom chevron, tail — each
  // fades independently so idle ↔ asc ↔ desc reads as one motion.
  const hideTop    = isActive && activeDir === 'desc';
  const hideBottom = isActive && activeDir === 'asc';
  const showTail   = isActive;

  return (
    <th
      ref={ref}
      className={cls}
      style={{ textAlign: align, ...style }}
      onClick={isSortable ? handleClick : undefined}
      data-sort-field={sortField}
    >
      <span className={styles.headerLabel}>
        <span>{label}</span>
        {isSortable && (
          <span className={[styles.sortIcon, isActive ? styles.sortIconActive : ''].filter(Boolean).join(' ')}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className={styles.sortIconSvg}
            >
              <path
                d="M12.6673 6.66675L8.00065 2.66675L3.33398 6.66675"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[styles.sortIconPart, hideTop ? styles.sortIconPartHidden : ''].filter(Boolean).join(' ')}
              />
              <path
                d="M12.6673 9.33325L8.00065 13.3333L3.33398 9.33325"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[styles.sortIconPart, hideBottom ? styles.sortIconPartHidden : ''].filter(Boolean).join(' ')}
              />
              <path
                d="M8 2.66675L8 13.3333"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[styles.sortIconPart, showTail ? '' : styles.sortIconPartHidden].filter(Boolean).join(' ')}
              />
            </svg>
            <span className={styles.sortTooltip}>{tooltip}</span>
          </span>
        )}
      </span>
    </th>
  );
}

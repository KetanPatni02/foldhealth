import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Select.module.css';

/**
 * Fold Health Select — controlled single-select dropdown that matches
 * <Input>'s design tokens (height 32, border, radius, focus ring). Used in
 * builders that need a styled dropdown without pulling in shadcn/radix.
 *
 * Props:
 *  - options    [{ value: string, label: string, disabled?: boolean }]
 *  - value      (string)
 *  - onChange   (value) => void
 *  - placeholder (string)
 *  - disabled   (boolean)
 *  - variant    'default' | 'error'
 *  - className  (string)
 *  - id         (string)        — passes through to the trigger button
 *  - menuAlign  'left' | 'right' — popover horizontal anchor (defaults left)
 *  - leadingIcon (string)       — optional Solar icon shown before the label
 */
export function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  variant = 'default',
  className,
  id,
  menuAlign = 'left',
  searchable = false,
  searchPlaceholder = 'Search…',
  leadingIcon,
  // Multi-select mode. When true, `value` is an array of strings and
  // clicking an option toggles it in place — the menu stays open. The
  // trigger label collapses to a count summary once more than one item
  // is picked. Header items (type: 'header') stay non-interactive; an
  // option with `singleAction: true` (e.g. "+ Custom Date") still fires
  // onChange with its own value and closes the menu (used to break out
  // of multi-select into a one-off action).
  multiple = false,
}) {
  const valueArray = multiple ? (Array.isArray(value) ? value : []) : null;
  const isSelected = (v) => multiple ? valueArray.includes(v) : v === value;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  // Reset the query each time the menu closes; focus the search on open.
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
    if (!open) setQuery('');
  }, [open, searchable]);

  const selected = multiple ? null : options.find(o => o.value === value);
  const selectedMulti = multiple
    ? options.filter(o => o.type !== 'header' && valueArray.includes(o.value))
    : [];
  // Trigger label for multi mode — first pick's label + "+N" summary.
  const multiSummary = () => {
    if (selectedMulti.length === 0) return null;
    const first = selectedMulti[0];
    const firstLabel = first.triggerLabel ?? first.label;
    if (selectedMulti.length === 1) return firstLabel;
    return <><span>{firstLabel}</span> <span style={{ color: 'var(--neutral-300)' }}>+{selectedMulti.length - 1}</span></>;
  };
  const q = query.trim().toLowerCase();
  // Options may carry a `searchText` (plain string) so `label` can be a
  // rich node (e.g. two-line code + description) while search still matches
  // both. Falls back to the label when it's a string.
  const shownOptions = searchable && q
    ? options.filter(o => (o.searchText != null ? o.searchText : String(o.label)).toLowerCase().includes(q))
    : options;

  return (
    <div ref={wrapRef} className={[styles.wrap, className || ''].filter(Boolean).join(' ')}>
      <button
        id={id}
        type="button"
        className={[
          styles.trigger,
          variant === 'error' ? styles.triggerError : '',
          (multiple ? selectedMulti.length === 0 : !selected) ? styles.triggerPlaceholder : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        {leadingIcon && (
          <Icon name={leadingIcon} size={16} color="currentColor" />
        )}
        <span className={styles.triggerLabel} style={selected?.style}>
          {multiple
            ? (selectedMulti.length > 0 ? multiSummary() : placeholder)
            : (selected ? (selected.triggerLabel ?? selected.label) : placeholder)}
        </span>
        <Icon
          name="solar:alt-arrow-down-linear"
          size={12}
          color="var(--neutral-300)"
          className={open ? styles.chevronOpen : styles.chevron}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className={[styles.menu, menuAlign === 'right' ? styles.menuRight : ''].filter(Boolean).join(' ')}
        >
          {searchable && (
            <li className={styles.searchRow}>
              <Icon name="solar:magnifer-linear" size={13} color="var(--neutral-300)" />
              <input
                ref={searchRef}
                type="text"
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
              />
            </li>
          )}
          {shownOptions.length === 0 && (
            <li className={styles.emptyOption} aria-disabled>No matches</li>
          )}
          {shownOptions.map((opt, i) => {
            // Non-interactive section header — used by callers that want to
            // group options under a label (e.g. cross-row DOSs by Created
            // date). Pass `{ type: 'header', label, value }` and any value
            // works so long as it's unique among options.
            if (opt.type === 'header') {
              return (
                <li
                  key={`h-${i}-${opt.value}`}
                  role="presentation"
                  className={styles.groupHeader}
                >
                  {opt.label}
                </li>
              );
            }
            const isActive = isSelected(opt.value);
            const isSingleAction = !!opt.singleAction;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isActive}
                aria-disabled={opt.disabled || undefined}
                tabIndex={opt.disabled ? -1 : 0}
                className={[
                  styles.item,
                  isActive ? styles.itemActive : '',
                  opt.disabled ? styles.itemDisabled : '',
                ].filter(Boolean).join(' ')}
                style={opt.style}
                onClick={() => {
                  if (opt.disabled) return;
                  if (multiple && !isSingleAction) {
                    // Toggle this option in the value array; keep menu open.
                    const next = valueArray.includes(opt.value)
                      ? valueArray.filter(v => v !== opt.value)
                      : [...valueArray, opt.value];
                    onChange(next);
                    return;
                  }
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
                {isActive && (
                  <Icon name="solar:check-read-linear" size={14} color="var(--primary-300)" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

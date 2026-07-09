import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { Avatar } from '../Avatar/Avatar';
import styles from './FilterChip.module.css';

/**
 * FilterChip — the canonical filter "badge" used across the whole app.
 *
 *   Inactive:  [ Label ⌄ ]
 *   Active:     [ Label : Value ✕ ]     (purple; ✕ clears)
 *
 * Clicking opens a popover of options; picking one sets the value, picking the
 * already-selected one (or the ✕) clears it. EVERY filter surface in the app
 * must use this component so filter badges look and behave identically —
 * do not re-implement a filter chip. See CONTRIBUTING.md → Filter badges.
 *
 * Props:
 *  - label             (string)  chip label, e.g. "ICD Code"
 *  - value             (string)  selected option value ('' / null = inactive)
 *  - options           [{ value, label, chipLabel?, searchText? }]
 *      label      — node or string rendered in the dropdown row
 *      chipLabel  — string shown in the ACTIVE chip (falls back to a string
 *                   label, else the value) — use when `label` is a rich node
 *      searchText — plain string matched when searchable (falls back to label)
 *  - onSet             (value) => void
 *  - onClear           () => void
 *  - searchable        (bool)    show a search input atop the dropdown
 *  - searchPlaceholder (string)
 *  - iconKind          'assignee' | 'patient'  render avatars (people filter,
 *                       implies searchable)
 *  - menuAlign         'left' | 'right'
 */
export function FilterChip({
  label,
  value,
  options = [],
  onSet,
  onClear,
  searchable = false,
  searchPlaceholder,
  iconKind,
  menuAlign = 'left',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const keyHandler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setSearch('');
    else if (searchable || iconKind) searchRef.current?.focus();
  }, [open, searchable, iconKind]);

  const people = iconKind === 'assignee' || iconKind === 'patient';
  const showSearch = searchable || people;

  const selected = options.find(o => o.value === value) || null;
  const chipValueText = selected
    ? (selected.chipLabel ?? (typeof selected.label === 'string' ? selected.label : value))
    : null;

  const q = search.trim().toLowerCase();
  const filtered = showSearch && q
    ? options.filter(o => {
        const hay = o.searchText != null
          ? o.searchText
          : (typeof o.label === 'string' ? o.label : o.value || '');
        return hay.toLowerCase().includes(q);
      })
    : options;

  const handlePick = (optValue) => {
    if (value === optValue) onClear();
    else onSet(optValue);
    setOpen(false);
  };

  return (
    <div className={styles.chipWrap} ref={ref}>
      <button
        type="button"
        className={[styles.chip, value ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
        {chipValueText && (
          <>
            <span className={styles.chipColon}>:</span>
            <span className={styles.chipValue}>{chipValueText}</span>
          </>
        )}
        {value ? (
          <span
            className={styles.chipClear}
            role="button"
            aria-label={`Clear ${label} filter`}
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
          >
            ✕
          </span>
        ) : (
          <Icon name="solar:alt-arrow-down-linear" size={14} />
        )}
      </button>
      {open && (
        <div
          role="listbox"
          className={[styles.dropdown, menuAlign === 'right' ? styles.dropdownRight : ''].filter(Boolean).join(' ')}
        >
          {showSearch && (
            <div className={styles.dropdownSearch}>
              <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
              <input
                ref={searchRef}
                className={styles.dropdownSearchInput}
                placeholder={searchPlaceholder || `Search ${label.toLowerCase()}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
              />
            </div>
          )}
          {filtered.map(opt => {
            const isSel = value === opt.value;
            const initials = people
              ? (opt.label || '').toString().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              : '';
            return (
              <button
                type="button"
                key={opt.value}
                role="option"
                aria-selected={isSel}
                className={[styles.dropdownItem, isSel ? styles.selected : ''].filter(Boolean).join(' ')}
                onClick={() => handlePick(opt.value)}
              >
                {people ? (
                  <Avatar variant={iconKind} initials={initials} className={styles.avatarXs} />
                ) : (
                  <span className={styles.dropdownCheck}>{isSel ? '✓' : ''}</span>
                )}
                {opt.label}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className={styles.dropdownEmpty}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

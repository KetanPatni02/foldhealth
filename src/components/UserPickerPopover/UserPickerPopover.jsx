import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '../Avatar/Avatar';
import { Icon } from '../Icon/Icon';
import styles from './UserPickerPopover.module.css';

const initialsOf = (name) => String(name || '?').trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();

/**
 * "Select User" popover (Figma Eventus 16978:128278): a title, a search
 * box, an optional "Unassign" row, then people with avatar, name and role.
 * Anchored to a trigger's rect and portalled, so callers keep their own
 * trigger (an AssigneeChange pill, a bulk-bar button, …).
 *
 * @param {object}   props
 * @param {DOMRect}  props.anchorRect
 * @param {{ id?, name, role?, initials? }[]} props.users
 * @param {string}   [props.selected]     – Name currently picked (ticked)
 * @param {function} props.onSelect       – (user) => void
 * @param {function} [props.onUnassign]   – Shows an "Unassign" row when given
 * @param {function} props.onClose
 * @param {string}   [props.title='Select User']
 * @param {string}   [props.emptyText='No users available.']
 * @param {'left'|'right'} [props.align='left'] – Line up with the trigger's left edge, or its right edge
 *   (opening leftward, for triggers at the right of a panel)
 */
export function UserPickerPopover({ anchorRect, users = [], selected, onSelect, onUnassign, onClose, title = 'Select User', emptyText = 'No users available.', align = 'left' }) {
  const ref = useRef(null);
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => users.filter(u => !q || `${u.name} ${u.role || ''}`.toLowerCase().includes(q)), [users, q]);
  if (!anchorRect) return null;
  // Opens below the trigger, or above it near the bottom of the window.
  const width = 280;
  const want = align === 'right' ? anchorRect.right - width : anchorRect.left;
  const left = Math.max(8, Math.min(want, window.innerWidth - width - 8));
  const below = anchorRect.bottom + 320 < window.innerHeight;
  const style = below ? { top: anchorRect.bottom + 4, left } : { bottom: window.innerHeight - anchorRect.top + 4, left };

  return createPortal(
    <div ref={ref} className={styles.menu} style={style} role="menu" onClick={(e) => e.stopPropagation()}>
      <span className={styles.title}>{title}</span>
      <label className={styles.search}>
        <Icon name="solar:magnifer-linear" size={16} color="var(--neutral-300)" />
        <input
          ref={searchRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search"
          aria-label="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className={styles.list}>
        {onUnassign && !q && (
          <button type="button" role="menuitem" className={styles.row} onClick={() => { onUnassign(); onClose(); }}>
            <Avatar type="icon" variant="others" iconName="solar:user-linear" size="M" />
            <span className={styles.name}>Unassign</span>
          </button>
        )}
        {shown.length === 0 ? (
          <span className={styles.empty}>{q ? 'No users match your search.' : emptyText}</span>
        ) : shown.map(u => (
          <button
            key={u.id || u.name}
            type="button"
            role="menuitem"
            className={u.name === selected ? `${styles.row} ${styles.rowActive}` : styles.row}
            onClick={() => { onSelect(u); onClose(); }}
          >
            <Avatar variant="staff" initials={u.initials || initialsOf(u.name)} size="M" />
            <span className={styles.text}>
              <span className={styles.name}>{u.name}</span>
              {u.role && <span className={styles.role}>{u.role}</span>}
            </span>
            {u.name === selected && <Icon name="solar:check-circle-linear" size={16} color="var(--primary-300)" />}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}

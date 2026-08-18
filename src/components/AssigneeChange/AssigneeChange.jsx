import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '../Avatar/Avatar';
import { Icon } from '../Icon/Icon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import styles from './AssigneeChange.module.css';

/**
 * AssigneeChange — worklist row cell for assigning / re-assigning a user.
 *
 * States (per Figma Fold-Pixel-1.0 node 8629:178):
 *   • Assigned  → provider avatar + name (+ optional role). Fixed pill
 *                 width; long names truncate with ellipsis.
 *   • Unassigned → outlined person slot + "Assign User". Width hugs the
 *                  label so short strings don't leave an oversized dead-zone.
 *   • avatarOnly → avatar + chevron, no text (compact cell mode).
 *   • disabled   → greyed, non-interactive.
 *
 * Sizes:
 *   • 'M' (default) — 24px avatar, 14px name, 12px role.
 *   • 'S'           — 20px (Avatar size XS) + 12px name for tighter rows.
 *
 * When `users` is supplied, the button owns its own portaled searchable
 * picker: click opens a list of `{id, name, initials, role?}` rows, and
 * picking one fires `onSelect(user)`. Without `users`, the button just
 * fires `onClick` for callers that want to open their own picker.
 *
 * Hover / keyboard focus fills the pill with a subtle neutral-50
 * background and reveals a chevron (disabled states skip the reveal).
 */
export const AssigneeChange = forwardRef(function AssigneeChange({
  name,
  initials,
  role,
  showRole = true,          // toggle the role sub-line on/off independently of the value
  unassigned = false,
  size = 'M',              // 'M' | 'S'
  avatarOnly = false,
  disabled = false,
  users,
  onSelect,
  pickerTitle,
  onClick,
  className,
  ariaLabel,
}, ref) {
  const btnRef = useRef(null);
  const searchRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState('');
  const hasPicker = Array.isArray(users);

  const setRefs = useCallback((el) => {
    btnRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [ref]);

  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setQuery('');
    // Nudge right-aligned popovers back into the viewport if the pill sits
    // close to the right edge (SNP's Assignee column is well inboard so
    // left alignment is almost always fine).
    const left = Math.min(r.left, window.innerWidth - 300);
    setPos({ top: r.bottom + 4, left });
  };
  const close = () => setPos(null);

  // Close on outside click / Escape; focus the search input on open.
  useEffect(() => {
    if (!pos) return undefined;
    searchRef.current?.focus();
    const onDoc = (e) => {
      if (!btnRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.menu}`)) close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    if (hasPicker) { pos ? close() : open(); return; }
    onClick?.(e);
  };

  // Use Avatar's design-token scale so we inherit the shared radius / font
  // scale instead of hand-picking pixels: 'S' → 24px, 'XS' → 20px.
  // Figma node 8629:178 spec.
  const avatarSize = size === 'S' ? 'XS' : 'S';

  // Chevron picks up the pill's tone in avatar-only mode: orange when a
  // staff avatar is shown (matches the DH tile), grey otherwise. Everywhere
  // else it stays grey until hover reveals it. Figma node 8629:178.
  const chevronColor = (avatarOnly && !unassigned)
    ? 'var(--secondary-300)'
    : 'var(--neutral-300)';

  const q = query.trim().toLowerCase();
  const filtered = hasPicker && q
    ? users.filter(u =>
        u.name.toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q))
    : (users || []);

  const label = ariaLabel || (unassigned
    ? 'Assign user'
    : `Change assignee${name ? ` (currently ${name})` : ''}`);

  const rootClass = [
    styles.root,
    unassigned ? styles.unassigned : styles.assigned,
    size === 'S' ? styles.sizeS : styles.sizeM,
    avatarOnly ? styles.avatarOnly : '',
    disabled ? styles.disabled : '',
    className || '',
  ].filter(Boolean).join(' ');

  const trigger = unassigned ? (
    <button
      ref={setRefs}
      type="button"
      className={rootClass}
      onClick={handleClick}
      aria-label={label}
      aria-disabled={disabled || undefined}
      aria-haspopup={hasPicker ? 'menu' : undefined}
      aria-expanded={hasPicker ? !!pos : undefined}
    >
      <Avatar
        type="icon"
        variant="others"
        size={size === 'S' ? 'XS' : 'S'}
        iconName="solar:user-rounded-linear"
        className={avatarOnly ? styles.avatarInner : undefined}
      />
      {!avatarOnly && <span className={styles.textLabel}>Assign User</span>}
      <DownChevronIcon size={14} color={chevronColor} className={styles.chevron} />
    </button>
  ) : (
    <button
      ref={setRefs}
      type="button"
      className={rootClass}
      onClick={handleClick}
      aria-label={label}
      aria-disabled={disabled || undefined}
      aria-haspopup={hasPicker ? 'menu' : undefined}
      aria-expanded={hasPicker ? !!pos : undefined}
    >
      <Avatar
        variant="staff"
        initials={initials}
        size={avatarSize}
        className={avatarOnly ? styles.avatarInner : undefined}
      />
      {!avatarOnly && (
        <span className={styles.textBody}>
          <span className={styles.name} title={name}>{name}</span>
          {showRole && role && <span className={styles.role}>{role}</span>}
        </span>
      )}
      <DownChevronIcon size={14} color={chevronColor} className={styles.chevron} />
    </button>
  );

  return (
    <>
      {trigger}
      {hasPicker && pos && createPortal(
        <div
          className={styles.menu}
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <div className={styles.menuTitle}>
            {pickerTitle || (unassigned ? 'Assign user' : 'Change assignee')}
          </div>
          <div className={styles.search}>
            <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search users…"
              aria-label="Search users"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.list}>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                {q ? 'No users match your search.' : 'No users available.'}
              </div>
            ) : filtered.map(u => (
              <button
                key={u.id}
                type="button"
                role="menuitem"
                className={[styles.userRow, u.name === name ? styles.userRowActive : ''].filter(Boolean).join(' ')}
                onClick={() => { onSelect?.(u); close(); }}
              >
                <Avatar variant="staff" initials={u.initials} size={24} />
                <span className={styles.userText}>
                  <span className={styles.userName}>{u.name}</span>
                  {u.role && <span className={styles.userRole}>{u.role}</span>}
                </span>
                {u.name === name && (
                  <Icon name="solar:check-circle-bold" size={14} color="var(--primary-300)" />
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
});

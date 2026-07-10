import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../../components/Avatar/Avatar';
import { Icon } from '../../components/Icon/Icon';
import { ROLE_LABEL } from './assignment/astranaStaff';
import { SYSTEM_USERS } from './systemUsers';
import styles from './RoleAssigneePicker.module.css';

/**
 * Shared searchable role-assignee picker — used by both the HCC worklist role
 * cells and the DiagPanel assignee chip so the two surfaces behave identically.
 * Lists every platform user (SYSTEM_USERS — Astrana staff + Account users),
 * filtered by a search box; picking one dispatches hccReassignRole.
 *
 * The caller renders its own trigger via the `trigger` render-prop, so each
 * surface keeps its native look (name cell / "Assign" pill / dashed avatar).
 *
 * @param {object} p
 * @param {string} p.role                 engine role key (support|coder|reviewer|reviewer2)
 * @param {string} p.memberId
 * @param {string} p.dosDate
 * @param {string} [p.currentName]        highlight the current assignee (reassign mode)
 * @param {'left'|'right'} [p.align]      popover edge to anchor to the trigger
 * @param {string} [p.reason]             audit reason recorded on (re)assign
 * @param {(args:{ref,isOpen:boolean,onClick:Function})=>React.ReactNode} p.trigger
 */
export function RoleAssigneePicker({
  role, memberId, dosDate, currentName = null, trigger,
  align = 'left', reason = 'Assigned via worklist',
}) {
  const btnRef = useRef(null);
  const searchRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState('');
  const reassign = useAppStore(s => s.hccReassignRole);
  const showToast = useAppStore(s => s.showToast);

  const q = query.trim().toLowerCase();
  const users = q
    ? SYSTEM_USERS.filter(u =>
        u.name.toLowerCase().includes(q) || (u.rolesLabel || '').toLowerCase().includes(q))
    : SYSTEM_USERS;

  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setQuery('');
    const left = align === 'right'
      ? Math.max(8, r.right - 280)
      : Math.min(r.left, window.innerWidth - 300);
    setPos({ top: r.bottom + 4, left });
  };
  const close = () => setPos(null);

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

  const onPick = (u) => {
    if (!memberId || !dosDate) {
      showToast?.('Cannot assign — missing patient or DOS context.');
      close();
      return;
    }
    reassign(memberId, dosDate, role, u.id, 'current-user', reason, u.name);
    showToast?.(`${u.name} assigned as ${ROLE_LABEL[role] || role}.`);
    close();
  };

  return (
    <>
      {trigger({ ref: btnRef, isOpen: !!pos, onClick: (e) => { e.stopPropagation(); pos ? close() : open(); } })}
      {pos && createPortal(
        <div className={styles.menu} style={{ top: pos.top, left: pos.left }} onClick={(e) => e.stopPropagation()}>
          <div className={styles.title}>{currentName ? 'Change' : 'Assign'} {ROLE_LABEL[role] || role}</div>
          <div className={styles.search}>
            <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
            <input
              ref={searchRef}
              type="text"
              className={styles.input}
              placeholder="Search users…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.list}>
            {users.length === 0 ? (
              <div className={styles.empty}>No users found.</div>
            ) : users.map(u => (
              <button
                key={u.id}
                type="button"
                className={[styles.item, currentName === u.name ? styles.itemActive : ''].filter(Boolean).join(' ')}
                onClick={() => onPick(u)}
              >
                <Avatar variant="assignee" initials={u.initials} />
                <span className={styles.name}>{u.name}</span>
                <span className={styles.role}>{u.rolesLabel}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../../components/Icon/Icon';
import { ActionButton } from '../../../../components/ActionButton/ActionButton';
import styles from '../AccountPanel.module.css';

/**
 * Row-level actions for the Users table: Reset Password, Disable/Enable,
 * More menu (Edit / Delete). Non-admins see a plain "—" — every action
 * on this component is admin-only.
 */
export function UserActions({ user, isAdmin, onResetPassword, onToggleStatus, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  if (!isAdmin) {
    return <span style={{ color: 'var(--neutral-200)', fontSize: 13 }}>—</span>;
  }

  return (
    <div className={styles.actions}>
      <ActionButton icon="solar:password-linear" size="L" tooltip="Reset Password" onClick={onResetPassword} />
      <span className={styles.actionDivider} />
      <ActionButton
        icon={user.status === 'Active' ? 'solar:user-cross-linear' : 'solar:user-check-linear'}
        size="L"
        tooltip={user.status === 'Active' ? 'Disable User' : 'Enable User'}
        onClick={onToggleStatus}
      />
      <span className={styles.actionDivider} />
      <div style={{ position: 'relative' }} ref={menuRef}>
        <ActionButton icon="solar:menu-dots-linear" size="L" tooltip="More Options" onClick={() => setMenuOpen(v => !v)} />
        {menuOpen && createPortal(
          <div className={styles.moreDropdown} style={{
            position: 'fixed',
            top: menuRef.current.getBoundingClientRect().bottom + 4,
            right: window.innerWidth - menuRef.current.getBoundingClientRect().right,
            zIndex: 9999,
          }}>
            <button className={styles.moreItem} onClick={() => { onEdit(); setMenuOpen(false); }}>
              <Icon name="solar:pen-linear" size={16} color="var(--neutral-300)" /> Edit User
            </button>
            <div className={styles.moreDivider} />
            <button className={`${styles.moreItem} ${styles.moreItemDanger}`} onClick={() => { onDelete(); setMenuOpen(false); }}>
              <Icon name="solar:trash-bin-minimalistic-linear" size={16} color="var(--status-error)" /> Delete User
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

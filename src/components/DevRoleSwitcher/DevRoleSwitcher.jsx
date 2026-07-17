import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../Icon/Icon';
import styles from './DevRoleSwitcher.module.css';

const ROLES = ['Support', 'Coder', 'QA', 'Compliance'];

/**
 * DevRoleSwitcher — floating pill in the bottom-left corner that lets you
 * toggle the current HCC role without visiting the profile menu. Only
 * renders on `import.meta.env.DEV` so it never ships to prod. Collapses
 * to a compact `Role: X` chip; clicking it opens a small popover with the
 * four HCC roles.
 */
export function DevRoleSwitcher() {
  if (!import.meta.env.DEV) return null;
  return <DevRoleSwitcherInner />;
}

function DevRoleSwitcherInner() {
  const role = useAppStore(s => s.hccUserRole) || 'Coder';
  const setRole = useAppStore(s => s.setHccUserRole);
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      {open && (
        <div className={styles.menu}>
          <div className={styles.menuTitle}>Switch HCC role (dev)</div>
          {ROLES.map((r) => {
            const active = r === role;
            return (
              <button
                key={r}
                type="button"
                className={[styles.menuItem, active ? styles.menuItemActive : ''].join(' ')}
                onClick={() => { setRole(r); setOpen(false); }}
              >
                <span className={[styles.dot, active ? styles.dotActive : ''].join(' ')} />
                {r}
              </button>
            );
          })}
        </div>
      )}
      <button type="button" className={styles.chip} onClick={() => setOpen(o => !o)} title="Dev: switch HCC role">
        <Icon name="solar:users-group-rounded-linear" size={13} color="var(--primary-300)" />
        <span className={styles.chipLabel}>Role:</span>
        <span className={styles.chipValue}>{role}</span>
        <Icon name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'} size={12} color="var(--neutral-300)" />
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../components/Icon/Icon';
import { getStatusSpec } from '../statusSpec';
import styles from './DosStatusMenu.module.css';

// Items shown in the change-status menu. `value` is the canonical status
// label that's stored on the row; `label` may differ for UX ("Reject" vs
// stored "Rejected", "Returned To" vs "Returned").
const STATUS_ITEMS = [
  { label: 'New',              value: 'New',              chevron: false, danger: false },
  { label: 'Awaiting',         value: 'Awaiting',         chevron: false, danger: false },
  { label: 'In Progress',      value: 'In Progress',      chevron: false, danger: false },
  { label: 'Record Received',  value: 'Record Received',  chevron: false, danger: false },
  { label: 'Insufficient',     value: 'Insufficient',     chevron: false, danger: false },
  { label: 'Returned To',      value: 'Returned',         chevron: true,  danger: false },
  { label: 'Record Requested', value: 'Record Requested', chevron: false, danger: false },
  { label: 'Completed',        value: 'Completed',        chevron: false, danger: false },
  { label: 'Reject',           value: 'Reject',           chevron: false, danger: true  },
];

/**
 * Pill that shows the current DOS's status with a small dropdown to change it.
 * Used by the DiagPanel header next to the assignee avatar.
 *
 * Props:
 *  - value     (string)        Current status label.
 *  - onChange  (fn(string))    Called with the new status.
 *  - disabled  (boolean)       If true, the pill becomes a non-interactive label
 *                              (e.g. while in sweep mode).
 */
export function DosStatusMenu({ value, onChange, disabled = false }) {
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const spec = getStatusSpec(value);

  const open = () => {
    if (disabled) return;
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };
  const close = () => setPos(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[styles.pill, disabled ? styles.pillDisabled : ''].join(' ')}
        style={{ color: spec.color, background: spec.bg, borderColor: spec.border }}
        onClick={pos ? close : open}
      >
        <span className={styles.iconLeading}>
          <Icon name={spec.icon} size={11} color={spec.color} />
        </span>
        <span className={styles.label}>{value}</span>
        {!disabled && (
          <>
            <span className={styles.divider} style={{ background: `${spec.color}60` }} />
            <Icon name="solar:alt-arrow-down-linear" size={12} color={spec.color} />
          </>
        )}
      </button>
      {pos && (
        <Menu
          pos={pos}
          value={value}
          onSelect={(v) => { onChange?.(v); close(); }}
          onClose={close}
        />
      )}
    </>
  );
}

function Menu({ pos, value, onSelect, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={styles.menu}
        style={{ top: pos.top, right: pos.right }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        <div className={styles.menuHeader}>Change Status</div>
        <div className={styles.menuItems}>
          {STATUS_ITEMS.map((item) => {
            const isSel = value === item.value;
            return (
              <button
                key={item.value}
                type="button"
                className={[
                  styles.menuItem,
                  isSel ? styles.menuItemActive : '',
                  item.danger ? styles.menuItemDanger : '',
                ].join(' ')}
                onClick={() => onSelect(item.value)}
              >
                <span className={styles.menuItemLabel}>{item.label}</span>
                {item.chevron && (
                  <Icon name="solar:alt-arrow-right-linear" size={14} color="var(--neutral-300)" />
                )}
                {isSel && !item.chevron && (
                  <Icon name="solar:check-read-linear" size={12} color="var(--primary-300)" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}

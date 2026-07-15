import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../components/Icon/Icon';
import { getStatusSpec, statusDisplayLabel, ROLE_STATUS_OPTIONS, ALL_STATUS_OPTIONS } from '../statusSpec';
import { StatusIcon } from '../StatusIcon';
import styles from './DosStatusMenu.module.css';

// Build the change-status menu items for whichever role currently owns the
// DOS. `value` is the canonical status stored on the row (what the engine
// keys on); `label` is the coder-facing display name. Record Requested /
// Record Received only appear for the Coder; Support gets Action Needed /
// Insufficient; QA + Compliance get Returned but not the record-request
// statuses — per the HCC role/status spec.
function itemsForRole(role) {
  const values = ROLE_STATUS_OPTIONS[role] || ALL_STATUS_OPTIONS;
  return values.map((value) => ({
    value,
    label: statusDisplayLabel(value),
    danger: value === 'Reject',
  }));
}

/**
 * Pill that shows the current DOS's status with a small dropdown to change it.
 * Used by the DiagPanel header next to the assignee avatar.
 *
 * Props:
 *  - value     (string)        Current status label.
 *  - onChange  (fn(string))    Called with the new status.
 *  - disabled  (boolean)       If true, the pill becomes a non-interactive label
 *                              (e.g. while in sweep mode).
 *  - gates     ({ [status]: { enabled, reason } })
 *                              Per-status guards. Disabling 'Completed' with
 *                              a reason is how the compliance gate surfaces
 *                              (UI shows a tooltip explaining what's blocking).
 */
export function DosStatusMenu({ value, onChange, disabled = false, disabledReason, gates, role = null }) {
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const spec = getStatusSpec(value);
  const items = itemsForRole(role);

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
        title={disabled ? disabledReason : undefined}
      >
        <span className={styles.iconLeading}>
          <StatusIcon status={value} size={11} color={spec.color} />
        </span>
        <span className={styles.label}>{statusDisplayLabel(value)}</span>
        {disabled ? (
          <Icon name="solar:lock-keyhole-minimalistic-linear" size={12} color={spec.color} />
        ) : (
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
          items={items}
          gates={gates}
          onSelect={(v) => { onChange?.(v); close(); }}
          onClose={close}
        />
      )}
    </>
  );
}

function Menu({ pos, value, items, gates, onSelect, onClose }) {
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
          {items.map((item) => {
            const isSel = value === item.value;
            const gate = gates?.[item.value];
            const blocked = gate && gate.enabled === false;
            return (
              <button
                key={item.value}
                type="button"
                disabled={blocked}
                title={blocked ? gate.reason : undefined}
                className={[
                  styles.menuItem,
                  isSel ? styles.menuItemActive : '',
                  item.danger ? styles.menuItemDanger : '',
                  blocked ? styles.menuItemBlocked : '',
                ].join(' ')}
                onClick={() => { if (!blocked) onSelect(item.value); }}
              >
                <span className={styles.menuItemLabel}>{item.label}</span>
                {item.chevron && (
                  <Icon name="solar:alt-arrow-right-linear" size={14} color="var(--neutral-300)" />
                )}
                {isSel && !item.chevron && !blocked && (
                  <Icon name="solar:check-read-linear" size={12} color="var(--primary-300)" />
                )}
                {blocked && (
                  <Icon name="solar:lock-keyhole-minimalistic-linear" size={12} color="var(--neutral-300)" />
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

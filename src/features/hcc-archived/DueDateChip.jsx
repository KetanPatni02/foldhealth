import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import styles from './DueDateChip.module.css';

export const DUE_OPTIONS = [
  'Overdue',
  'Due Today',
  'Due This Week',
  'Due Next Week',
  'Due More Than 2 Weeks',
];

/**
 * Convert a member's `due` string ("Overdue: 1w", "Due Today", "Due in 5D")
 * to a Due Date category that matches the DueDateChip dropdown options.
 *
 * Ported from /Users/ketanp/Downloads/HCC/hcc_worklist_v2.tsx :: getDueCat
 */
export function getDueCategory(due) {
  if (!due) return null;
  if (/^overdue/i.test(due)) return 'Overdue';
  if (due === 'Due Today') return 'Due Today';
  const m = due.match(/due in (\d+)\s*d/i) || due.match(/due in (\d+)\s*days?/i);
  if (m) {
    const days = parseInt(m[1], 10);
    if (days <= 7) return 'Due This Week';
    if (days <= 14) return 'Due Next Week';
    return 'Due More Than 2 Weeks';
  }
  return null;
}

// ── The trigger chip + portaled popover ──────────────────────────────────
export function DueDateChip({ value, onChange }) {
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null);

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left });
  };
  const close = () => setPos(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={[styles.chip, value ? styles.chipActive : ''].join(' ')}
        onClick={pos ? close : open}
      >
        <span>{value || 'Due Date'}</span>
        <Icon
          name="solar:alt-arrow-down-linear"
          size={12}
          color={value ? 'var(--primary-300)' : 'var(--neutral-300)'}
        />
      </button>
      {pos && (
        <DueDatePopover
          pos={pos}
          value={value}
          onSelect={(v) => { onChange(v); close(); }}
          onClose={close}
        />
      )}
    </>
  );
}

function DueDatePopover({ pos, value, onSelect, onClose }) {
  // Close on outside-click / Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.popover} style={{ top: pos.top, left: pos.left }}>
        <div className={styles.popHeader}>Due Date</div>
        <div className={styles.optionList}>
          {DUE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={styles.option}
              onClick={() => onSelect(opt)}
            >
              <span
                className={[styles.radio, value === opt ? styles.radioActive : ''].join(' ')}
              >
                {value === opt && <span className={styles.radioDot} />}
              </span>
              <span className={styles.optionLabel}>{opt}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.reset}
          onClick={() => onSelect(null)}
        >
          Reset Selection
        </button>
      </div>
    </>,
    document.body,
  );
}

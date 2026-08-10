import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { Select } from '../../components/Select/Select';
import styles from './TimeFilterChip.module.css';

// Filter model for the CCM worklist's Billable Mins / Unlogged Mins chips
// (Figma 537:24930 / 537:24976). Kept in this file — the popover body
// composes a user dropdown with a single-select threshold radio, which
// the shared FilterChip's default list popovers can't express. The chip
// itself is still the shared FilterChip, wired via its renderPopover slot.

export const ALL_USERS = 'All Users';

// Deterministic radio order matches Figma.
export const THRESHOLD_MINUTES = {
  'No Time': -1,     // sentinel — matches "row has 0 seconds"
  '> 5 mins': 5,
  '>10 mins': 10,
  '>15 mins': 15,
  '>20 mins': 20,
  '>90 mins': 90,
};

// Row predicate — returns true when the row falls inside the filter. Used
// by the worklist to fold the (user, threshold) tuple into filtered().
export function matchTimeFilter(rowSeconds, rowUser, filter) {
  if (!filter) return true;
  const { user, threshold } = filter;
  if (user && user !== ALL_USERS && rowUser !== user) return false;
  if (!threshold) return true;
  const mins = (rowSeconds || 0) / 60;
  if (threshold === 'No Time') return (rowSeconds || 0) === 0;
  const min = THRESHOLD_MINUTES[threshold];
  return typeof min === 'number' ? mins > min : true;
}

// Human-friendly summary shown on the FilterChip pill once active.
export const summarizeTimeFilter = ({ user, threshold }) => {
  const parts = [];
  if (user && user !== ALL_USERS) parts.push(user);
  if (threshold) parts.push(threshold);
  return parts.join(' · ') || 'All';
};

export const isTimeFilterActive = (f) =>
  !!f && ((f.user && f.user !== ALL_USERS) || !!f.threshold);

// Popover body rendered inside the shared FilterChip. Handles positioning
// (portal + fixed positioning under the anchor rect) + outside-click
// dismiss.
export function TimeFilterPopover({
  anchorRect,
  onClose,
  label,
  thresholds,
  userOptions,
  value,
  onChange,
}) {
  const popRef = useRef(null);
  const filter = value || { user: ALL_USERS, threshold: null };

  useEffect(() => {
    const onClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onClick); };
  }, [onClose]);

  const setUser = (user) => onChange({ ...filter, user });
  const setThreshold = (threshold) =>
    onChange({ ...filter, threshold: filter.threshold === threshold ? null : threshold });

  const style = {
    top: anchorRect.bottom + 4,
    left: anchorRect.left,
    minWidth: 220,
  };

  return createPortal(
    <div className={styles.overlay}>
      <div ref={popRef} className={styles.popover} style={style} role="dialog" aria-label={label}>
        <div className={styles.header}>{label}</div>
        <div className={styles.userRow}>
          <Icon name="solar:users-group-two-rounded-linear" size={16} color="var(--neutral-300)" />
          <Select
            options={[{ value: ALL_USERS, label: ALL_USERS }, ...userOptions.map(u => ({ value: u, label: u }))]}
            value={filter.user || ALL_USERS}
            onChange={setUser}
          />
        </div>
        <div className={styles.list}>
          {thresholds.map(t => {
            const active = filter.threshold === t;
            return (
              <button
                key={t}
                type="button"
                className={styles.row}
                onClick={() => setThreshold(t)}
                aria-pressed={active}
              >
                <span className={`${styles.radio} ${active ? styles.radioActive : ''}`}>
                  {active && <span className={styles.radioDot} />}
                </span>
                <span className={styles.rowLabel}>{t}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

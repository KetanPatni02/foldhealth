import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ProgramStatusRing } from '../ProgramStatusRing/ProgramStatusRing.jsx';
import { statusColorFor } from '../../../../../data/programStatus';
import styles from './ProgramBadges.module.css';

// How many program badges show before the rest collapse into a "+N" chip.
const MAX_VISIBLE = 2;

// Hover-card body for one program: ring + code + status, then start/owner.
// Figma 1837-16264.
function ProgramDetail({ program, progressFor }) {
  const unassigned = !program.assignee || program.assignee === 'Unassigned';
  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <ProgramStatusRing progress={progressFor(program.code)} size={16} />
        <span className={styles.detailCode}>{program.code}</span>
        <span className={styles.detailStatus} style={{ color: statusColorFor(program.status) }}>
          {program.status}
        </span>
      </div>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Start Date:</span> {program.startDate || '—'}
      </div>
      <div className={styles.detailRow}>
        <span className={styles.detailLabel}>Assigned to:</span> {unassigned ? 'Unassigned' : program.assignee}
      </div>
    </div>
  );
}

/**
 * Row of the patient's other active-program badges (Figma 1837-16118), shown in
 * the program-detail header in place of the old prev/next arrows. Hovering a
 * badge reveals that program's details; hovering the "+N" chip lists the
 * remaining programs' details.
 */
export function ProgramBadges({ programs, progressFor }) {
  const [hover, setHover] = useState(null); // { rect, items } | null
  const timer = useRef(null);

  if (!programs.length) return null;
  const visible = programs.slice(0, MAX_VISIBLE);
  const overflow = programs.slice(MAX_VISIBLE);

  const open = (e, items) => {
    clearTimeout(timer.current);
    setHover({ rect: e.currentTarget.getBoundingClientRect(), items });
  };
  const scheduleClose = () => { timer.current = setTimeout(() => setHover(null), 120); };
  const cancelClose = () => clearTimeout(timer.current);

  return (
    <div className={styles.strip}>
      {visible.map(p => (
        <button
          key={p.id}
          type="button"
          className={styles.badge}
          onMouseEnter={e => open(e, [p])}
          onMouseLeave={scheduleClose}
        >
          <ProgramStatusRing progress={progressFor(p.code)} size={14} />
          <span className={styles.badgeCode}>{p.code}</span>
        </button>
      ))}
      {overflow.length > 0 && (
        <button
          type="button"
          className={styles.badgeMore}
          onMouseEnter={e => open(e, overflow)}
          onMouseLeave={scheduleClose}
        >
          +{overflow.length}
        </button>
      )}
      {hover && createPortal(
        <div
          className={styles.popover}
          style={{ top: hover.rect.bottom + 6, left: Math.min(hover.rect.left, window.innerWidth - 260) }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {hover.items.map(p => <ProgramDetail key={p.id} program={p} progressFor={progressFor} />)}
        </div>,
        document.body,
      )}
    </div>
  );
}

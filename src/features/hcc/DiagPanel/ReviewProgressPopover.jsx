import { createPortal } from 'react-dom';
import { Icon } from '../../../components/Icon/Icon';
import { getStatusSpec } from '../statusSpec';
import { ROLES, ROLE_LABEL, staffById } from '../assignment/astranaStaff';
import styles from './ReviewProgressPopover.module.css';

/**
 * Hover popover anchored to the DOS row's "With Coder" pill. Mirrors the
 * Figma node 1:67779 — a vertical timeline showing the four review stages
 * (Support → Coder → R1 → R2) with each stage's current status, assignee,
 * and date. A connector line between stages turns green for completed
 * segments.
 *
 * Stages are derived from the engine's per-DOS state in
 * `hccDosAssignments`. When the engine hasn't been seeded yet, the legacy
 * `member.sup/cdr/r1/r2` fields are used as a fallback so the popover
 * still renders something useful.
 */
const TERMINAL_STATUSES = new Set(['Completed', 'Billing Ready', 'Reject', 'Rejected']);

/**
 * Build the stage list shown in the popover (and used by the progress ring).
 * Returns one object per role:
 *   { role, label, name, status, date, state: 'done' | 'active' | 'pending' }
 *
 * `dosState` may be undefined — in that case we fall back to the legacy
 * member fields. Either way we always produce four rows so the timeline
 * visually stays consistent.
 */
export function buildReviewStages(member, dosState) {
  const visibleRoles = ['support', 'coder', 'r1', 'r2'];
  return visibleRoles.map((role) => {
    const rs = dosState?.[role];
    const legacyMap = {
      support: { name: member?.sup, status: member?.supS },
      coder:   { name: member?.cdr, status: member?.cdrS },
      r1:      { name: member?.r1,  status: member?.r1s },
      r2:      { name: member?.r2,  status: member?.r2s },
    };
    const assigneeId = rs?.assignee || null;
    const staff = assigneeId ? staffById(assigneeId) : null;
    const name = staff?.name || legacyMap[role].name || null;
    const status = rs?.status || legacyMap[role].status || null;

    let state = 'pending';
    if (status && TERMINAL_STATUSES.has(status)) state = 'done';
    else if (status && status !== 'Assign') state = 'active';

    // Pick a date for the subtitle — first history entry's timestamp if we
    // have one, else the DOS date as a stand-in for the prototype.
    const at = rs?.history?.[rs.history.length - 1]?.at;
    const date = at ? new Date(at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null;

    return { role, label: ROLE_LABEL[role], name, status, date, state };
  });
}

// Fraction (0..1) of the workflow that's complete. Each done stage = 1/N,
// the current active stage counts as half (so a DOS sitting in "In Progress"
// with the Coder shows partial credit).
export function computeReviewProgress(stages) {
  if (!stages?.length) return 0;
  const N = stages.length;
  const done = stages.filter(s => s.state === 'done').length;
  const active = stages.filter(s => s.state === 'active').length;
  return Math.min(1, (done + active * 0.5) / N);
}

// ── Component ─────────────────────────────────────────────────────────

export function ReviewProgressPopover({
  anchorRect,
  stages,
  onEnter,
  onLeave,
  onClose,
}) {
  if (!anchorRect) return null;

  const W = 280;
  // Sit just below the pill, aligned to its left edge (clamped to viewport).
  const top = anchorRect.bottom + 8;
  const left = Math.min(anchorRect.left, window.innerWidth - W - 8);

  return createPortal(
    <>
      {/* Invisible bridge so the cursor can travel from pill → popover
          without triggering the close timer in between. */}
      <div
        className={styles.bridge}
        style={{ top: anchorRect.bottom, left: anchorRect.left, width: anchorRect.width, height: 8 }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      />
      <div
        className={styles.popover}
        style={{ top, left, width: W }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        role="tooltip"
        aria-label="Review progress"
      >
        <div className={styles.title}>Review Progress</div>
        <ol className={styles.timeline}>
          {stages.map((stage, i) => (
            <StageRow
              key={stage.role}
              stage={stage}
              isLast={i === stages.length - 1}
              nextDone={stages[i + 1]?.state === 'done'}
            />
          ))}
        </ol>
        <button
          type="button"
          className={styles.sendToBill}
          disabled={!stages.every(s => s.state === 'done')}
          onClick={onClose}
        >
          <Icon name="solar:play-linear" size={14} color="currentColor" />
          <span>Send to Bill</span>
        </button>
      </div>
    </>,
    document.body,
  );
}

function StageRow({ stage, isLast, nextDone }) {
  const { state, label, name, status, date } = stage;

  // Icon + colour per stage state. `done` uses the success spec, `active`
  // uses warning amber (matches statusSpec.js's "In Progress" tone), and
  // `pending` is a hollow neutral circle.
  const visual = state === 'done'
    ? { icon: 'solar:check-circle-bold', color: 'var(--status-success)' }
    : state === 'active'
      ? { icon: 'solar:half-circle-bold', color: 'var(--status-warning)' }
      : { icon: null, color: 'var(--neutral-200)' };

  // Subtitle colour mirrors the icon colour for completed/active stages.
  const subtitleColor = state === 'done'
    ? 'var(--status-success)'
    : state === 'active'
      ? 'var(--status-warning)'
      : 'var(--neutral-300)';

  // Connector tint — green when this stage is done AND the next stage has
  // been started (or done), so the green only spans completed segments.
  const connectorColor = (state === 'done' && (nextDone || stage.state === 'done'))
    ? 'var(--status-success)'
    : 'var(--neutral-150)';

  return (
    <li className={styles.stage}>
      <div className={styles.markerColumn}>
        {visual.icon ? (
          <Icon name={visual.icon} size={16} color={visual.color} />
        ) : (
          <span className={styles.pendingDot} />
        )}
        {!isLast && (
          <span
            className={styles.connector}
            style={{ background: connectorColor }}
          />
        )}
      </div>
      <div className={styles.stageBody}>
        <div className={styles.stageTitle}>
          {name
            ? <>{name} <span className={styles.stageRole}>({label})</span></>
            : label}
        </div>
        <div className={styles.stageSubtitle} style={{ color: subtitleColor }}>
          {state === 'pending'
            ? 'Not Assigned'
            : <>{status}{date ? ` (${date})` : ''}</>}
        </div>
      </div>
    </li>
  );
}

// ── Progress ring — used by the trigger pill ─────────────────────────

/**
 * Tiny circular progress ring. `progress` is 0..1. Renders a track + an
 * arc; the arc length is `progress * circumference`. Rotated -90° so 0%
 * starts at the top, growing clockwise.
 */
export function ProgressRing({ progress = 0, size = 16, stroke = 2 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className={styles.ring}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--neutral-150)"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--status-success)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.25s ease' }}
      />
    </svg>
  );
}

// Re-export ROLES so DiagPanel can compute its own progress without
// re-importing from the engine.
export { ROLES };

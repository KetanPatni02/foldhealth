import { createPortal } from 'react-dom';
import { Icon } from '../../../components/Icon/Icon';
import { ROLES, ROLE_LABEL, staffById } from '../assignment/astranaStaff';
import styles from './ReviewProgressPopover.module.css';

/**
 * Hover popover anchored to the DOS row's "With <Stage>" pill. Mirrors the
 * Figma node 1:67779 — a vertical timeline showing the four review stages
 * (Support → Coder → Reviewer → Reviewer 2). Each stage renders as:
 *
 *   ┊
 *   ○   Name (Role)
 *   ┊   Status (date)
 *   ┊
 *
 * with a uniform Neutral 150 connector line running top-to-bottom behind
 * the status circles. The "Send to Bill" footer hangs off the same line.
 *
 * Stages come from the engine's per-DOS state in `hccDosAssignments`. If
 * the engine hasn't been seeded yet we fall back to the legacy
 * `member.sup/cdr/r1/r2` fields so the popover still renders.
 */
const TERMINAL_STATUSES = new Set(['Completed', 'Billing Ready', 'Reject', 'Rejected']);

export function buildReviewStages(member, dosState) {
  // Four sequential stages per the HCC workflow:
  //   Support → Coder → Reviewer → Reviewer 2 → Billing
  // Each must complete before the next is reached. "Reviewer 3" does not
  // exist — Reviewer 2 is always the terminal review stage.
  const visibleRoles = ['support', 'coder', 'reviewer', 'reviewer2'];
  return visibleRoles.map((role) => {
    const rs = dosState?.[role];
    const legacyMap = {
      support:   { name: member?.sup, status: member?.supS },
      coder:     { name: member?.cdr, status: member?.cdrS },
      reviewer:  { name: member?.r1,  status: member?.r1s },
      reviewer2: { name: member?.r2,  status: member?.r2s },
    };
    const assigneeId = rs?.assignee || null;
    const staff = assigneeId ? staffById(assigneeId) : null;
    const name = staff?.name || legacyMap[role].name || null;
    const status = rs?.status || legacyMap[role].status || null;

    let state = 'pending';
    if (status === 'Skipped') state = 'skipped';
    else if (status && TERMINAL_STATUSES.has(status)) state = 'done';
    else if (status && status !== 'Assign') state = 'active';

    const at = rs?.history?.[rs.history.length - 1]?.at;
    const date = at ? new Date(at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null;

    return { role, label: ROLE_LABEL[role], name, status, date, state };
  });
}

// 0..1 fraction of the workflow that's complete.
export function computeReviewProgress(stages) {
  if (!stages?.length) return 0;
  const N = stages.length;
  // Skipped stages are resolved (bypassed) — count them like done.
  const done = stages.filter(s => s.state === 'done' || s.state === 'skipped').length;
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

  const W = 275;
  const top = anchorRect.bottom + 8;
  const left = Math.min(anchorRect.left, window.innerWidth - W - 8);

  const allDone = stages.every(s => s.state === 'done');

  return createPortal(
    <>
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
        <div className={styles.titleRow}>
          <span className={styles.title}>Review Progress</span>
        </div>

        <ol className={styles.timeline}>
          {stages.map((stage, i) => (
            <StageRow
              key={stage.role}
              stage={stage}
              isFirst={i === 0}
              isLast={i === stages.length - 1}
            />
          ))}
        </ol>

        <div className={styles.footer}>
          <span className={styles.footerConnector} aria-hidden="true" />
          <button
            type="button"
            className={styles.sendToBill}
            disabled={!allDone}
            onClick={onClose}
          >
            <Icon name="solar:plain-2-linear" size={12} color="currentColor" />
            {/* Product term per the RA coder workflow plan (was "Send to Bill"). */}
            <span>Ready for ASM generation</span>
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function StageRow({ stage, isFirst, isLast }) {
  const { state, label, name, status, date } = stage;

  // Subtitle colour follows the status: green / amber / grey.
  const subtitleClass = state === 'done'
    ? styles.subtitleDone
    : state === 'active'
      ? styles.subtitleActive
      : styles.subtitlePending;  // pending + skipped both read grey

  return (
    <li className={styles.stage}>
      <div className={styles.markerCol}>
        <span
          className={[styles.connector, isFirst ? styles.connectorHidden : ''].join(' ')}
          aria-hidden="true"
        />
        <StatusBadge state={state} />
        <span
          className={[styles.connector, isLast ? styles.connectorHidden : ''].join(' ')}
          aria-hidden="true"
        />
      </div>
      <div className={styles.stageBody}>
        <div className={styles.stageTitle}>
          {name
            ? <>{name} <span className={styles.stageRole}>({label})</span></>
            : label}
        </div>
        <div className={[styles.stageSubtitle, subtitleClass].join(' ')}>
          {state === 'pending'
            ? 'Not Assigned'
            : <>{status}{date ? ` (${date})` : ''}</>}
        </div>
      </div>
    </li>
  );
}

/**
 * 16×16 round status badge per Figma. Three variants:
 *   - done:    success-light bg, success border, white check icon inside
 *   - active:  warning-light bg, warning border, sun/pending icon inside
 *   - pending: white bg, neutral-200 border, empty (no inner icon)
 */
function StatusBadge({ state }) {
  if (state === 'done') {
    return (
      <span className={[styles.badge, styles.badgeDone].join(' ')}>
        <Icon name="solar:check-read-linear" size={10} color="var(--status-success)" />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className={[styles.badge, styles.badgeActive].join(' ')}>
        <Icon name="solar:sun-bold" size={11} color="var(--status-warning)" />
      </span>
    );
  }
  if (state === 'skipped') {
    return (
      <span className={[styles.badge, styles.badgePending].join(' ')}>
        <Icon name="solar:minus-circle-linear" size={10} color="var(--neutral-300)" />
      </span>
    );
  }
  return <span className={[styles.badge, styles.badgePending].join(' ')} />;
}

// ── Progress ring — used by the trigger pill ─────────────────────────

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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--neutral-150)" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--status-success)" strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.25s ease' }}
      />
    </svg>
  );
}

export { ROLES };

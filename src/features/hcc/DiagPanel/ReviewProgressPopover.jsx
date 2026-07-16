import { createPortal } from 'react-dom';
import { Icon } from '../../../components/Icon/Icon';
import { ROLES, ROLE_LABEL, staffById } from '../assignment/astranaStaff';
import { getStatusSpec, statusDisplayLabel } from '../statusSpec';
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
// "Done" here means the stage's work is finished successfully and progression
// continues downstream. Reject / Rejected / Insufficient are terminal for the
// stage but they stop the pipeline — they get a distinct 'rejected' state so
// the popover shows them in red instead of green (and the pillLabel logic
// stops advancing past them).
const TERMINAL_STATUSES = new Set(['Completed', 'Billing Ready']);
const REJECTED_STATUSES = new Set(['Reject', 'Rejected', 'Insufficient']);

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
    else if (status && REJECTED_STATUSES.has(status)) state = 'rejected';
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
  // Badge + subtitle color come from the shared HCC statusSpec so this
  // popover matches the StatusLegend / RoleStatusCell / DosStatusMenu
  // treatment (New → purple sparkle, Insufficient → orange danger, etc.).
  const spec = status && state !== 'pending' && state !== 'skipped'
    ? getStatusSpec(status)
    : null;
  const displayStatus = status ? statusDisplayLabel(status) : null;

  return (
    <li className={styles.stage}>
      <div className={styles.markerCol}>
        <span
          className={[styles.connector, isFirst ? styles.connectorHidden : ''].join(' ')}
          aria-hidden="true"
        />
        <StatusBadge state={state} spec={spec} />
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
        <div
          className={styles.stageSubtitle}
          style={spec ? { color: spec.color } : { color: 'var(--neutral-200)' }}
        >
          {state === 'pending'
            ? 'Not Assigned'
            : <>{displayStatus}{date ? ` (${date})` : ''}</>}
        </div>
      </div>
    </li>
  );
}

/**
 * 16×16 round status badge. When a statusSpec is available it drives the
 * icon and colors (matches the app-wide legend); pending + skipped fall back
 * to the neutral empty / minus-circle treatment.
 */
function StatusBadge({ state, spec }) {
  if (state === 'skipped') {
    return (
      <span className={[styles.badge, styles.badgePending].join(' ')}>
        <Icon name="solar:minus-circle-linear" size={10} color="var(--neutral-300)" />
      </span>
    );
  }
  if (state === 'pending' || !spec) {
    return <span className={[styles.badge, styles.badgePending].join(' ')} />;
  }
  return (
    <span
      className={styles.badge}
      style={{ background: spec.bg, borderColor: spec.color }}
    >
      <Icon name={spec.icon} size={11} color={spec.color} />
    </span>
  );
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

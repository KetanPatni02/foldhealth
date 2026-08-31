import styles from './CarePlanProgressRing.module.css';

/** Paper ProgressRing (Fold Design System → Care Plan → 2X-0), 46×46. */
const TRACK_SIZE = 37.41;
const TRACK_PATH =
  'M18.707 0C29.038 0 37.413 8.375 37.413 18.707C37.413 29.038 29.038 37.413 18.707 37.413C8.375 37.413 0 29.038 0 18.707C0 8.375 8.375 0 18.707 0ZM18.707 4.159C10.672 4.159 4.159 10.672 4.159 18.707C4.159 26.741 10.672 33.254 18.707 33.254C26.741 33.254 33.254 26.741 33.254 18.707C33.254 10.672 26.741 4.159 18.707 4.159Z';

const PROGRESS_SIZE = 36.19;
const CX = PROGRESS_SIZE / 2;
const R_OUTER = CX;
const R_INNER = CX - 2.894;
const STROKE = R_OUTER - R_INNER;
const R_MID = (R_OUTER + R_INNER) / 2;
const CIRC = 2 * Math.PI * R_MID;

export function CarePlanProgressRing({ progress = 0, className, title }) {
  const pct = Math.round(Math.max(0, Math.min(100, Number(progress) || 0)));
  const label = title ?? `${pct}% progress`;
  const offset = CIRC * (1 - pct / 100);

  return (
    <div
      className={[styles.shell, className].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
    >
      <svg
        className={styles.track}
        viewBox={`0 0 ${TRACK_SIZE} ${TRACK_SIZE}`}
        width={TRACK_SIZE}
        height={TRACK_SIZE}
        aria-hidden="true"
      >
        <path d={TRACK_PATH} fill="var(--neutral-75)" fillRule="nonzero" />
      </svg>
      {pct > 0 && (
        <svg
          className={styles.progress}
          viewBox={`0 0 ${PROGRESS_SIZE} ${PROGRESS_SIZE}`}
          width={PROGRESS_SIZE}
          height={PROGRESS_SIZE}
          aria-hidden="true"
        >
          <circle
            cx={CX}
            cy={CX}
            r={R_MID}
            fill="none"
            stroke="var(--status-warning-dark)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${CX} ${CX})`}
          />
        </svg>
      )}
      <span className={styles.label}>{pct}%</span>
    </div>
  );
}

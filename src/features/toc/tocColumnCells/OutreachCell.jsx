import { Icon } from '../../../components/Icon/Icon';
import styles from '../tocColumns.module.css';
import { hasTocOutreachActivity } from '../tocOutcome';

const DOT_COLOR = { red: 'var(--status-error)', blue: 'var(--status-info)', grey: 'var(--neutral-200)' };

function mapOutreachDots(raw) {
  return (raw?.length ? raw : ['pending', 'pending', 'pending']).map((d) => (
    d === 'failed' || d === 'red' ? 'red' : d === 'success' || d === 'blue' ? 'blue' : 'grey'
  ));
}

function mapTocOutreach(p) {
  if (!hasTocOutreachActivity(p)) return null;
  const raw = Array.isArray(p.outreachDots) ? p.outreachDots : [];
  const hasSuccess = raw.includes('success') || raw.includes('blue') || p.outreachAttended;
  const hasFailed = raw.includes('failed') || raw.includes('red');
  const date = p.outreachDate || p.callDate;
  return {
    failed: hasFailed && !hasSuccess,
    status: hasSuccess ? 'Attended' : 'Failed',
    date,
    dots: mapOutreachDots(raw),
  };
}

export function OutreachCell({ patient, onOpen }) {
  const outreach = mapTocOutreach(patient);
  const content = !outreach ? (
    <span className={styles.outreachNone}>
      <Icon name="solar:phone-calling-linear" size={16} color="var(--neutral-200)" />
      <span className={styles.dash}>—</span>
    </span>
  ) : (
    <span className={styles.outreachCell}>
      <Icon
        name="solar:phone-calling-linear"
        size={16}
        color={outreach.failed ? 'var(--status-error)' : 'var(--status-success)'}
      />
      <span className={styles.outreachBody}>
        <span className={outreach.failed ? styles.outreachStatus : styles.outreachStatusOk}>{outreach.status}</span>
        {outreach.date && (
          <span className={outreach.failed ? styles.outreachDate : styles.outreachDateOk}>{outreach.date}</span>
        )}
        <span className={styles.dots}>
          {outreach.dots.map((c, i) => (
            <span key={i} className={styles.dot} style={{ background: DOT_COLOR[c] || DOT_COLOR.grey }} />
          ))}
        </span>
      </span>
    </span>
  );

  if (!onOpen) return content;

  return (
    <button
      type="button"
      className={styles.outreachBtn}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      aria-label={`Open patient outreach for ${patient.name}`}
    >
      {content}
    </button>
  );
}

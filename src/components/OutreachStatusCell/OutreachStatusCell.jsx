import { Icon } from '../Icon/Icon';
import styles from './OutreachStatusCell.module.css';

const DOT_CLASS = { red: styles.dotFailed, blue: styles.dotSuccess, grey: styles.dotPending };

/**
 * OutreachStatusCell — the worklist "Outreach" cell (TOC / SNP / AWV look):
 * phone icon, last attempt's result + date, and one dot per attempt.
 *
 * outreach: null renders the muted "—" cell. Otherwise
 *   { status: 'Attended' | 'Failed' | …, failed: boolean, date,
 *     dots: Array<'red' | 'blue' | 'grey'>, kind?: 'call' | 'letter' }
 * `title` sets a hover tooltip (e.g. who was contacted and the outcome).
 */
export function OutreachStatusCell({ outreach, title }) {
  if (!outreach) {
    return (
      <span className={styles.none}>
        <Icon name="solar:phone-calling-linear" size={16} color="var(--neutral-200)" />
        <span className={styles.dash}>—</span>
      </span>
    );
  }
  const tone = outreach.failed ? 'var(--status-error)' : 'var(--status-success)';
  const icon = outreach.kind === 'letter' ? 'solar:document-text-linear' : 'solar:phone-calling-linear';
  return (
    <span className={styles.cell} title={title}>
      <Icon name={icon} size={16} color={tone} />
      <span className={styles.body}>
        <span className={outreach.failed ? styles.statusFailed : styles.statusOk}>{outreach.status}</span>
        {outreach.date && <span className={styles.date}>{outreach.date}</span>}
        {outreach.dots?.length ? (
          <span className={styles.dots}>
            {outreach.dots.map((c, i) => <span key={i} className={`${styles.dot} ${DOT_CLASS[c] || styles.dotPending}`} />)}
          </span>
        ) : null}
      </span>
    </span>
  );
}

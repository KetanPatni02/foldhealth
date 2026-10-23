import { Icon } from '../../components/Icon/Icon';
import styles from './CmpWorklistRow.module.css';

// Three outreach dots: green once engaged, red per failed attempt, grey pending.
export function CmpOutreachCell({ member }) {
  const n = member.outreach || 0;
  const engaged = member.progSubStatus === 'Engaged' || member.progSubStatus === 'Engaged - Requires Follow Up';
  const dots = [1, 2, 3].map(i => {
    if (n < i) return 'pending';
    return engaged ? 'success' : 'failed';
  });
  return (
    <div className={styles.outreachWl}>
      <div className={styles.outreachWlMain}>
        {n === 0 ? (
          <>
            <Icon name="solar:phone-linear" size={15} color="var(--neutral-200)" />
            <div className={styles.outreachWlNone}>—</div>
          </>
        ) : (
          <>
            <Icon name="solar:phone-linear" size={15} color={engaged ? 'var(--status-success)' : 'var(--status-error)'} />
            <div>
              <div className={engaged ? styles.outreachWlText : styles.outreachWlFailed}>{engaged ? 'Attended' : 'Failed'}</div>
              {member.lastOutreach && <div className={styles.outreachWlDate}>{member.lastOutreach}</div>}
            </div>
          </>
        )}
      </div>
      <div className={styles.dotsRow}>
        {dots.map((d, i) => <span key={i} className={`${styles.dot} ${styles[d]}`} />)}
      </div>
    </div>
  );
}

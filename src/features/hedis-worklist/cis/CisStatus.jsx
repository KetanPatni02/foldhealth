import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { CIS_DOSE_STATUS } from './cisRules';
import { DOSE_BADGE, fmtDate } from './cisStatusConfig';
import styles from './CisStatus.module.css';

// `hideIcon` drops the leading status icon (colour + label still carry it).
export function CisStatusBadge({ map, status, size = 'S', label, hideIcon = false }) {
  const cfg = map[status] || { tone: 'grey', icon: 'solar:info-circle-linear' };
  return <Badge tone={cfg.tone} size={size} icon={hideIcon ? undefined : cfg.icon} label={label ?? status} />;
}


/**
 * Doses-complete progress, the open status counts, and the 2nd-birthday
 * deadline. Shared by the Immunizations tab and the Vaccine Calendar.
 */
export function CisSummaryStrip({ result }) {
  const d = result.doses;
  if (!d) return null;
  const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0;
  const chips = [
    { n: d.dueNow, status: CIS_DOSE_STATUS.dueNow, label: 'Due Now' },
    { n: d.overdue, status: CIS_DOSE_STATUS.overdue, label: 'Overdue' },
    { n: d.upcoming, status: CIS_DOSE_STATUS.upcoming, label: 'Upcoming' },
    { n: d.cannotMeet, status: CIS_DOSE_STATUS.cannotMeet, label: "Can't Be Met" },
  ].filter(c => c.n > 0);
  return (
    <div className={styles.strip}>
      <div className={styles.progress}>
        <span className={styles.progressLabel}>Doses complete</span>
        <span className={styles.progressValue}>{d.completed}</span>
        <span className={styles.progressOf}>of {d.total}</span>
        <span className={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Doses complete">
          <span className={styles.fill} style={{ width: `${pct}%` }} />
        </span>
      </div>
      {chips.length > 0 && <span className={styles.divider} aria-hidden="true" />}
      <div className={styles.chips}>
        {chips.map(c => <CisStatusBadge key={c.label} map={DOSE_BADGE} status={c.status} size="M" label={`${c.n} ${c.label}`} />)}
      </div>
      <div className={styles.deadline}>
        <span className={styles.deadlineLabel}>2nd birthday deadline</span>
        <span className={styles.deadlineValue}>{fmtDate(result.secondBirthday)}</span>
        <span className={styles.deadlineLeft}>
          <Icon name="solar:hourglass-linear" size={14} color="currentColor" />
          {result.daysLeft >= 0 ? `${result.daysLeft} days left` : 'Passed'}
        </span>
      </div>
    </div>
  );
}

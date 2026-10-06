import { useMemo } from 'react';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { CardSkeleton } from '../../../components/CardSkeleton/CardSkeleton';
import { CIS_ANTIGEN_STATUS, CIS_EVALUATION, evaluateCis } from './cisRules';
import styles from './CisImmunizationsTab.module.css';

// Icon + label + colour per status, so status never relies on colour alone.
const EVALUATION_BADGE = {
  [CIS_EVALUATION.compliant]: { tone: 'success', icon: 'solar:check-circle-linear' },
  [CIS_EVALUATION.onTrack]: { tone: 'primary', icon: 'solar:clock-circle-linear' },
  [CIS_EVALUATION.atRisk]: { tone: 'warning', icon: 'solar:danger-triangle-linear' },
  [CIS_EVALUATION.cannotMeet]: { tone: 'error', icon: 'solar:close-circle-linear' },
  [CIS_EVALUATION.notEligible]: { tone: 'grey', icon: 'solar:info-circle-linear' },
};
const ANTIGEN_BADGE = {
  [CIS_ANTIGEN_STATUS.met]: { tone: 'success', icon: 'solar:check-circle-linear' },
  [CIS_ANTIGEN_STATUS.dueNow]: { tone: 'primary', icon: 'solar:syringe-linear' },
  [CIS_ANTIGEN_STATUS.overdue]: { tone: 'warning', icon: 'solar:danger-triangle-linear' },
  [CIS_ANTIGEN_STATUS.onTrack]: { tone: 'grey', icon: 'solar:clock-circle-linear' },
  [CIS_ANTIGEN_STATUS.cannotMeet]: { tone: 'error', icon: 'solar:close-circle-linear' },
};

function StatusBadge({ map, status, size = 'S' }) {
  const cfg = map[status] || { tone: 'grey', icon: 'solar:info-circle-linear' };
  return <Badge tone={cfg.tone} size={size} icon={cfg.icon} label={status} />;
}

const fmt = (d) => (d ? d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '-');
const ageLabel = (months) => (months < 24 ? `${months} mo` : `${Math.floor(months / 12)}y ${months % 12}m`);

function nextDueText(a) {
  if (a.status === CIS_ANTIGEN_STATUS.met) return 'Complete';
  if (a.status === CIS_ANTIGEN_STATUS.cannotMeet) return a.blocker || 'Not enough time left';
  if (a.status === CIS_ANTIGEN_STATUS.dueNow || a.status === CIS_ANTIGEN_STATUS.overdue) return 'Now';
  return fmt(a.nextDueDate);
}

/**
 * Care Gap drawer: Immunizations tab for CIS-CMB10. Read-only tracker of
 * the ten Combination 10 vaccines, evaluated from the member's
 * patient_immunizations rows by cisRules.
 *
 * @param {object}  props
 * @param {object}  props.member          – hedis member (dob)
 * @param {Array}   props.immunizations   – patient_immunizations rows
 * @param {boolean} props.loading
 * @param {number}  props.measurementYear
 * @param {string}  props.measureName
 */
export function CisImmunizationsTab({ member, immunizations, loading, measurementYear, measureName }) {
  const result = useMemo(
    () => evaluateCis({ dob: member?.dob, immunizations: immunizations || [], measurementYear }),
    [member?.dob, immunizations, measurementYear],
  );
  if (loading) return <CardSkeleton />;

  const hasDob = !!result.dob;
  // A child outside the measure (aged out, or no DOB) has nothing to track.
  const showTracker = hasDob && result.evaluation !== CIS_EVALUATION.notEligible;
  return (
    <div className={styles.tab}>
      <section className={styles.summary} aria-label="Care Gap summary">
        <div className={styles.summaryHead}>
          <div className={styles.summaryTitleCol}>
            <span className={styles.eyebrow}>Care Gap evaluation</span>
            <span className={styles.summaryTitle}>{measureName}</span>
          </div>
          <StatusBadge map={EVALUATION_BADGE} status={result.evaluation} size="M" />
        </div>
        <p className={styles.reason}>{result.reason}</p>
        {hasDob && (
          <dl className={styles.facts}>
            <div>
              <dt>Date of Birth</dt>
              <dd>{fmt(result.dob)} ({ageLabel(result.ageMonths)})</dd>
            </div>
            <div>
              <dt>
                2nd Birthday
                <Tooltip label="Doses must be given on or before this date to count for the measure.">
                  <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-300)" />
                </Tooltip>
              </dt>
              <dd>
                {fmt(result.secondBirthday)}
                {result.daysLeft >= 0 ? ` • ${result.daysLeft} days left` : ' • passed'}
              </dd>
            </div>
            <div>
              <dt>Vaccines Complete</dt>
              <dd>{result.metCount} of {result.total}</dd>
            </div>
          </dl>
        )}
        {hasDob && result.reportingYear > measurementYear && (
          <p className={styles.note}>
            <Icon name="solar:calendar-minimalistic-linear" size={14} color="currentColor" />
            Counts toward measurement year {result.reportingYear}, the year this child turns 2.
          </p>
        )}
      </section>

      {showTracker && (
        <section className={styles.tracker} aria-label="Combination 10 vaccines">
          <div className={`${styles.row} ${styles.headRow}`} role="row">
            <span role="columnheader">Vaccine</span>
            <span role="columnheader">Doses</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Next Due</span>
          </div>
          {result.antigens.map(a => (
            <div key={a.key} className={styles.row} role="row">
              <div className={styles.vaccineCol}>
                <span className={styles.vaccineLabel}>{a.label}</span>
                <span className={styles.vaccineName}>{a.name}</span>
                {(a.valid.length > 0 || a.invalid.length > 0) && (
                  <span className={styles.doseDates}>
                    {a.valid.map(d => <span key={`v-${d.id}-${d.date}`}>{fmt(d.date)}</span>)}
                    {a.invalid.map(d => (
                      <Tooltip key={`i-${d.id}-${d.date}`} label={`Does not count: ${d.reason}`}>
                        <span className={styles.invalidDose}>{fmt(d.date)}</span>
                      </Tooltip>
                    ))}
                  </span>
                )}
              </div>
              <span className={styles.doses}>
                {Math.min(a.valid.length, a.required)} / {a.requiredLabel}
              </span>
              <span><StatusBadge map={ANTIGEN_BADGE} status={a.status} /></span>
              <span className={styles.nextDue}>{nextDueText(a)}</span>
            </div>
          ))}
        </section>
      )}

      {showTracker && (immunizations || []).length === 0 && (
        <p className={styles.note}>
          <Icon name="solar:info-circle-linear" size={14} color="currentColor" />
          No immunizations are on file for this member yet.
        </p>
      )}
    </div>
  );
}

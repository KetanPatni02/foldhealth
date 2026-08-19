import { Icon } from '../../../components/Icon/Icon';
import styles from '../tocColumns.module.css';
import {
  assessmentLabel,
  resolveAssessmentStatus,
  sampleAssessmentCompletedDate,
} from '../tocAssessment';
import {
  AssessmentCompletedIcon,
  AssessmentNotStartedIcon,
  AssessmentPartialIcon,
} from './AssessmentStatusIcons';

const ASSESSMENT_STATUS = {
  notStarted: {
    meta: 'Not Started',
    dotClass: styles.statusDotNotStarted,
    Icon: AssessmentNotStartedIcon,
  },
  partial: {
    meta: 'Partial',
    dotClass: styles.statusDotPartial,
    Icon: AssessmentPartialIcon,
  },
  completed: {
    meta: null,
    dotClass: styles.statusDotCompleted,
    Icon: AssessmentCompletedIcon,
  },
};

function resolveAssessmentDisplay(p) {
  const label = assessmentLabel();
  const status = resolveAssessmentStatus(p);
  if (status === 'completed') {
    const date = p.startDate || p.dischargeDate || sampleAssessmentCompletedDate(p);
    return { label, status, metaStatus: 'Completed', metaDate: date };
  }
  return { label, status, metaStatus: ASSESSMENT_STATUS[status].meta };
}

export function AssessmentCell({ patient, onOpen }) {
  const { label, status, metaStatus, metaDate } = resolveAssessmentDisplay(patient);
  const cfg = ASSESSMENT_STATUS[status];
  const StatusIcon = cfg.Icon;
  return (
    <button
      type="button"
      className={styles.assessmentBtn}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      aria-label={`Open assessment for ${patient.name}`}
    >
      <span className={styles.assessmentLink}>
        <span>{label}</span>
        <Icon name="solar:alt-arrow-right-linear" size={14} color="var(--neutral-400)" />
      </span>
      <span className={styles.assessmentMeta}>
        <span className={`${styles.statusDot} ${cfg.dotClass}`} aria-hidden="true">
          <StatusIcon />
        </span>
        <span className={styles.assessmentMetaStatus}>{metaStatus}</span>
        {metaDate && (
          <span className={styles.assessmentMetaDetail}>{` • ${metaDate}`}</span>
        )}
      </span>
    </button>
  );
}

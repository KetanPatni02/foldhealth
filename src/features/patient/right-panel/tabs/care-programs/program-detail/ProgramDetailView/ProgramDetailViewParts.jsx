import { Icon } from '../../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../../components/Icon/DownChevronIcon';
import styles from './ProgramDetailView.module.css';

export function StepPlaceholder({ name }) {
  return (
    <div className={styles.stepPlaceholder}>
      <Icon name="solar:documents-linear" size={36} color="var(--neutral-150)" />
      <p className={styles.stepPlaceholderTitle}>{name}</p>
      <p className={styles.stepPlaceholderText}>This step is coming soon.</p>
    </div>
  );
}

export function DetailRow({ icon, label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabelGroup}>
        <Icon name={icon} size={16} color="var(--neutral-400)" />
        <span className={styles.detailLabel}>{label}</span>
      </span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

function CheckMark() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 5L4.5 7L7.5 3" stroke="var(--status-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepStatusIcon({ status }) {
  if (status === 'completed') {
    return (
      <span className={styles.statusCompleted}>
        <CheckMark />
      </span>
    );
  }
  return <span className={styles.statusPending} />;
}

export function StepItem({ step, isActive, onClick, isChild }) {
  return (
    <button
      className={`${styles.stepItem} ${isActive ? styles.stepItemActive : ''} ${isChild ? styles.stepChild : ''}`}
      onClick={onClick}
    >
      <StepStatusIcon status={step.status} />
      <span className={isActive ? styles.stepNameActive : styles.stepName}>{step.name}</span>
      {(step.mandatory || step.hasAlert) && <span className={styles.mandatoryDot} />}
    </button>
  );
}

export function SectionHeader({ name, expanded, onToggle }) {
  return (
    <button className={styles.sectionHeader} onClick={onToggle}>
      <DownChevronIcon
        size={16}
        color="var(--neutral-300)"
        style={expanded ? undefined : { transform: 'rotate(-90deg)' }}
      />
      <span className={styles.sectionName}>{name}</span>
    </button>
  );
}

export function ProgramDetailExpandPanel({ program }) {
  return (
    <div className={styles.expandPanel}>
      <div className={styles.expandCol}>
        <div className={styles.expandColTitle}>Assessment &amp; Documentation</div>
        <div className={styles.expandRows}>
          <DetailRow icon="solar:document-add-linear" label="Assessment Done:" value="06/19/2025" />
          <DetailRow icon="solar:document-add-linear" label="Last HRA:" value="09/11/2024" />
          <DetailRow icon="solar:hand-heart-linear" label="Care Plan Due:" value="06/19/2025" />
          <DetailRow icon="solar:clock-circle-linear" label="Last Updated:" value="09/11/2024" />
        </div>
      </div>
      <div className={styles.expandCol}>
        <div className={styles.expandColTitle}>Care Coordination</div>
        <div className={styles.expandRows}>
          <DetailRow icon="solar:calendar-minimalistic-linear" label="ICT meeting:" value="06/19/2025" />
          <DetailRow icon="solar:double-alt-arrow-right-linear" label="Next Cadence:" value="09/11/2024" />
        </div>
      </div>
      <div className={styles.expandCol}>
        <div className={styles.expandColTitle}>Compliance &amp; Consent</div>
        <div className={styles.expandRows}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabelGroup}>
              <Icon name="solar:like-linear" size={16} color="var(--neutral-400)" />
              <span className={styles.detailLabel}>{program.code} Consent:</span>
            </span>
            <Icon name="solar:check-circle-linear" size={16} color="var(--status-success)" />
          </div>
        </div>
      </div>
      <div className={styles.expandCol}>
        <div className={styles.expandColTitle}>Plan &amp; Conditions</div>
        <div className={styles.expandRows}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Health Plan:</span>
            <Icon name="solar:check-circle-linear" size={16} color="var(--status-success)" />
          </div>
          <div className={styles.condRow}>
            <span className={styles.detailLabel}>Diabetes Mellitus (DM)</span>
            <span className={styles.condBadge}>14 M</span>
          </div>
          <div className={styles.condRow}>
            <span className={styles.detailLabel}>Hypertension (HTN)</span>
            <span className={styles.condBadge}>13 M</span>
          </div>
          <div className={styles.condRow}>
            <span className={styles.detailLabel}>Cystic Fibrosis (CF)</span>
            <span className={styles.condBadge}>4 M</span>
          </div>
        </div>
      </div>
    </div>
  );
}

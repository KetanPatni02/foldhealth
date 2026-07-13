import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { BannerExpandIcon } from '../../../components/Icon/BannerExpandIcon';
import { ProgressRing } from '../../hcc/DiagPanel/ReviewProgressPopover';
import { PROGRAM_STEPS_MOCK, PROGRAM_LETTERS_MOCK } from '../data/programActivityMock';
import styles from './ProgramDetailView.module.css';

function DetailRow({ icon, label, value }) {
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

function StepItem({ step, isActive, onClick, isChild }) {
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

function SectionHeader({ name, expanded, onToggle }) {
  return (
    <button className={styles.sectionHeader} onClick={onToggle}>
      <Icon
        name={expanded ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
        size={16}
        color="var(--neutral-300)"
      />
      <span className={styles.sectionName}>{name}</span>
    </button>
  );
}

const LETTER_SUB_TABS = ['All', 'Sent', 'Not Sent'];

export function ProgramDetailView({ program, onClose, startAtFirstStep = false }) {
  const [activeStep, setActiveStep] = useState(startAtFirstStep ? PROGRAM_STEPS_MOCK[0]?.id : 'step-2');
  const [expandedSections, setExpandedSections] = useState({ 'step-3': true, 'step-4': false });
  const [activeLetterTab, setActiveLetterTab] = useState('All');

  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const isUnassigned = !program.assignee || program.assignee === 'Unassigned';

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ProgressRing progress={program.progress} size={16} stroke={2} />
          <span className={styles.programTitle}>{program.name}</span>
          <div className={styles.statusBadge}>
            <span className={styles.statusIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="#D9A50B" fill="#FFFCF5" />
                <circle cx="8" cy="5" r="1" fill="#D9A50B" />
                <rect x="7.25" y="7" width="1.5" height="4" rx="0.75" fill="#D9A50B" />
              </svg>
            </span>
            <span className={styles.badgeDivider} />
            <span className={styles.statusBadgeText}>Assigned to Nurse</span>
            <Icon name="solar:alt-arrow-down-linear" size={16} color="var(--neutral-300)" />
          </div>
          <div className={styles.assigneeLink}>
            <Icon
              name={isUnassigned ? 'solar:user-rounded-linear' : 'solar:user-check-rounded-linear'}
              size={16}
              color={isUnassigned ? 'var(--neutral-300)' : 'var(--status-success)'}
            />
            <span className={`${styles.assigneeName} ${isUnassigned ? styles.assigneeUnassigned : ''}`}>
              {program.assignee || 'Unassigned'}
            </span>
          </div>
          <span className={styles.headerDivider} />
          <div className={styles.breadcrumb}>
            <button type="button" className={styles.breadcrumbArrow} aria-label="Previous trigger">
              <Icon name="solar:alt-arrow-left-linear" size={16} color="var(--neutral-300)" />
            </button>
            <span className={styles.breadcrumbLabel}>Trigger 2</span>
            <button type="button" className={styles.breadcrumbArrow} aria-label="Next trigger">
              <Icon name="solar:alt-arrow-right-linear" size={16} color="var(--neutral-300)" />
            </button>
          </div>
          <button
            type="button"
            className={styles.expandBtn}
            aria-label={detailsExpanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={detailsExpanded}
            onClick={() => setDetailsExpanded(e => !e)}
          >
            <BannerExpandIcon size={16} className={detailsExpanded ? styles.expandIconRotated : ''} />
          </button>
        </div>
        <div className={styles.headerRight}>
          <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous" />
          <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next" />
          <span className={styles.headerDivider} />
          <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
          <span className={styles.headerDivider} />
          <ActionButton icon="solar:close-square-linear" size="S" tooltip="Close" onClick={onClose} />
        </div>
      </div>

      {/* Expanded program details */}
      {detailsExpanded && (
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
      )}

      {/* Body */}
      <div className={styles.body}>
        {/* Step list sidebar */}
        <div className={styles.stepList}>
          {PROGRAM_STEPS_MOCK.map(step => {
            if (step.type === 'section') {
              const expanded = expandedSections[step.id] ?? step.expanded;
              return (
                <div key={step.id}>
                  <SectionHeader name={step.name} expanded={expanded} onToggle={() => toggleSection(step.id)} />
                  {expanded && step.children.map(child => (
                    <StepItem
                      key={child.id}
                      step={child}
                      isActive={activeStep === child.id}
                      onClick={() => setActiveStep(child.id)}
                      isChild
                    />
                  ))}
                </div>
              );
            }
            return (
              <StepItem
                key={step.id}
                step={step}
                isActive={activeStep === step.id}
                onClick={() => setActiveStep(step.id)}
              />
            );
          })}
        </div>

        {/* Right content */}
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <span className={styles.contentTitle}>Program Related Letters</span>
            <div className={styles.contentActions}>
              <button className={styles.actionBtn}>
                Assign
                <Icon name="solar:alt-arrow-down-linear" size={16} color="var(--neutral-300)" />
              </button>
              <button className={styles.actionBtn}>Skip</button>
              <button className={styles.reviewedBtn}>
                <Icon name="solar:check-circle-linear" size={16} color="var(--status-success)" />
                Reviewed
              </button>
              <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
            </div>
          </div>

          <div className={styles.contentInner}>
            <div className={styles.contentSubTabs}>
              <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
              <span className={styles.tabDivider} />
              {LETTER_SUB_TABS.map(tab => (
                <button
                  key={tab}
                  className={`${styles.contentTab} ${activeLetterTab === tab ? styles.contentTabActive : ''}`}
                  onClick={() => setActiveLetterTab(tab)}
                >
                  {tab}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add" />
              <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
              <ActionButton icon="solar:history-linear" size="S" tooltip="History" />
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>File Type</th>
                    <th>Sent Via</th>
                    <th>Last Sent</th>
                    <th>Sent By</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAM_LETTERS_MOCK.map(letter => (
                    <tr key={letter.id}>
                      <td>
                        <span className={styles.fileNameCell}>
                          <Icon name="solar:document-linear" size={16} color="var(--neutral-300)" />
                          {letter.fileName}
                        </span>
                      </td>
                      <td>{letter.fileType}</td>
                      <td>{letter.sentVia}</td>
                      <td>{letter.lastSent}</td>
                      <td>{letter.sentBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

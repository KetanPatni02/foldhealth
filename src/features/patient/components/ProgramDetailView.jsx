import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { BannerExpandIcon } from '../../../components/Icon/BannerExpandIcon';
import { ProgressRing } from '../../hcc/DiagPanel/ReviewProgressPopover';
import { Checkbox } from '../../../components/ui/checkbox';
import { toast } from '../../../components/Toast/Toast';
import { PROGRAM_STEPS_MOCK, PROGRAM_LETTERS_MOCK, CCM_PROGRAM_STEPS } from '../data/programActivityMock';
import { OutreachTab } from './OutreachTab';
import { CcmBillingReview } from './CcmBillingReview';
import { CcmTimerWidget } from './CcmTimerWidget';
import { SendLetterDrawer } from './SendLetterDrawer';
import { PreVisitStep } from './PreVisitStep';
import styles from './ProgramDetailView.module.css';

// Programs with a custom step list — CCM's workflow is billing-centric, not
// outreach + assessment like the default. Every other code falls back to
// PROGRAM_STEPS_MOCK.
const STEPS_BY_PROGRAM = {
  CCM: CCM_PROGRAM_STEPS,
};

const stepsFor = (code) => STEPS_BY_PROGRAM[code] || PROGRAM_STEPS_MOCK;
const flatSteps = (list) => list.flatMap(s => (s.type === 'section' ? s.children : [s]));

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
  const isCcm = program.code === 'CCM';
  const stepList = stepsFor(program.code);
  const ALL_STEPS = flatSteps(stepList);
  const firstStep = stepList[0];
  const firstStepIsOutreach = firstStep?.name === 'Outreach';
  // When the first step is Outreach, land on it so the Log New Outreach
  // component is the default view; otherwise keep the prior default.
  const [activeStep, setActiveStep] = useState(
    startAtFirstStep || firstStepIsOutreach
      ? firstStep?.id
      : (isCcm ? 'ccm-billing' : 'step-2'),
  );
  const [expandedSections, setExpandedSections] = useState(
    isCcm
      ? { 'ccm-assess': true }
      : { 'step-3': true, 'step-4': false },
  );
  const [activeLetterTab, setActiveLetterTab] = useState('All');
  const [selectedLetters, setSelectedLetters] = useState(() => new Set());
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false);

  const allLettersSelected = selectedLetters.size === PROGRAM_LETTERS_MOCK.length && PROGRAM_LETTERS_MOCK.length > 0;
  const someLettersSelected = selectedLetters.size > 0 && !allLettersSelected;
  const toggleAllLetters = () =>
    setSelectedLetters(prev => (prev.size === PROGRAM_LETTERS_MOCK.length ? new Set() : new Set(PROGRAM_LETTERS_MOCK.map(l => l.id))));
  const toggleLetter = (id) =>
    setSelectedLetters(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Download every selected letter as a file, then confirm with a success toast.
  const downloadSelectedLetters = () => {
    const chosen = PROGRAM_LETTERS_MOCK.filter(l => selectedLetters.has(l.id));
    if (chosen.length === 0) return;
    chosen.forEach(letter => {
      const body =
        `${letter.fileName}\n\n` +
        `File Type: ${letter.fileType}\n` +
        `Sent Via: ${letter.sentVia.join(', ')}\n` +
        `Last Sent: ${letter.lastSent}\n` +
        `Sent By: ${letter.sentBy}\n`;
      const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${letter.fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
    toast.success(
      chosen.length === 1 ? 'File downloaded successfully' : `${chosen.length} files downloaded successfully`,
    );
  };

  const activeStepObj = ALL_STEPS.find(s => s.id === activeStep);
  const isOutreachStep = activeStepObj?.name === 'Outreach';
  const isBillingStep = activeStepObj?.kind === 'billing';
  const isPreVisitStep = activeStepObj?.name === 'Pre-visit';
  const isLettersPane = !isBillingStep && !isOutreachStep && !isPreVisitStep;

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
          {isCcm && (
            <>
              <span className={styles.secondaryBadge}>
                <ProgressRing progress={0.5} size={14} stroke={2} />
                BHI
              </span>
              <span className={styles.secondaryBadge}>
                <ProgressRing progress={0.75} size={14} stroke={2} />
                APCM
              </span>
              <span className={styles.headerDivider} />
            </>
          )}
          <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous" />
          <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next" />
          <span className={styles.headerDivider} />
          <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
          <span className={styles.headerDivider} />
          <ActionButton icon="solar:close-square-linear" size="S" tooltip="Close" onClick={onClose} />
        </div>
      </div>

      {/* CCM-only info bar — the horizontal read-only strip under the header
          in the Figma. Uses the same DetailRow styling as the expand panel so
          typography stays consistent. */}
      {isCcm && (
        <div className={styles.ccmInfoBar}>
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>Last Updated:</span> 09/11/2024
          </span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>DM Type:</span> CKD
          </span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>1st Outreach Due on:</span> 08/22/2024
            <Icon name="solar:check-circle-linear" size={14} color="var(--status-success)" />
          </span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>Chronic Condition:</span> 3 Active
            <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
          </span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>Program Due on:</span> 08/22/2024
          </span>
          <span className={styles.ccmInfoDivider} />
          <span className={styles.ccmInfoItem}>
            <span className={styles.ccmInfoLabel}>Next Cadence:</span> 09/13/2024
            <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
          </span>
        </div>
      )}

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
          {stepList.map(step => {
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
            <span className={styles.contentTitle}>
              {isBillingStep ? 'Billing Review'
                : isOutreachStep ? 'Outreach'
                : isPreVisitStep ? 'Pre-visit'
                : 'Program Related Letters'}
            </span>
            <div className={styles.contentActions}>
              {/* variant=ghost gives Button its bare shell (cursor, focus, structure)
                  so the caller's .actionBtn / .reviewedBtn class fully defines the
                  color state (neutral border for Assign/Skip, green border for
                  Reviewed) without Button's variant tokens overriding. */}
              <Button variant="ghost" size="S" trailingIcon="solar:alt-arrow-down-linear" className={styles.actionBtn}>
                Assign
              </Button>
              <Button variant="ghost" size="S" className={styles.actionBtn}>Skip</Button>
              <Button
                variant="ghost"
                size="S"
                leadingIconElement={<Icon name="solar:check-circle-linear" size={14} color="var(--primary-300)" />}
                className={styles.reviewedBtn}
              >
                Reviewed
              </Button>
              <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
            </div>
          </div>

          {isBillingStep ? (
            <CcmBillingReview program={program} />
          ) : isOutreachStep ? (
            <div className={styles.outreachWrap}>
              <OutreachTab
                defaultPrograms={[program.code].filter(Boolean)}
                scopedProgram={program.code}
                defaultLogFor="care-program"
                defaultFormOpen
              />
            </div>
          ) : isPreVisitStep ? (
            <PreVisitStep programCode={program.code} />
          ) : (
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
                    <th className={styles.checkCell}>
                      <Checkbox
                        checked={someLettersSelected ? 'indeterminate' : allLettersSelected}
                        onCheckedChange={toggleAllLetters}
                        aria-label="Select all letters"
                      />
                    </th>
                    <th>File Name</th>
                    <th>File Type</th>
                    <th>Sent Via</th>
                    <th>Last Sent</th>
                    <th>Sent By</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAM_LETTERS_MOCK.map(letter => (
                    <tr
                      key={letter.id}
                      className={selectedLetters.has(letter.id) ? styles.rowSelected : undefined}
                    >
                      <td className={styles.checkCell}>
                        <Checkbox
                          checked={selectedLetters.has(letter.id)}
                          onCheckedChange={() => toggleLetter(letter.id)}
                          aria-label={`Select ${letter.fileName}`}
                        />
                      </td>
                      <td className={styles.fileNameCell}>{letter.fileName}</td>
                      <td className={styles.colMuted}>{letter.fileType}</td>
                      <td>
                        <span className={styles.viaChips}>
                          {letter.sentVia.map(v => (
                            <span key={v} className={styles.viaChip}>{v}</span>
                          ))}
                        </span>
                      </td>
                      <td>{letter.lastSent}</td>
                      <td>{letter.sentBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Floating bulk-action bar — appears when letters are selected. Figma 439:614595.
              Lives inside the content column so it centers on the letters pane
              rather than the whole window, and is gated on that pane being the
              visible one so a selection can't float it over Billing Review /
              Outreach / Pre-visit. */}
          {isLettersPane && selectedLetters.size > 0 && (
            <div className={styles.bulkBar} role="toolbar" aria-label="Letter bulk actions">
              <div className={styles.bulkSelect}>
                <Checkbox
                  checked={someLettersSelected ? 'indeterminate' : allLettersSelected}
                  onCheckedChange={toggleAllLetters}
                  aria-label="Select all letters"
                />
                <span className={styles.bulkCount}>{selectedLetters.size} Selected</span>
              </div>
              <span className={styles.bulkDivider} />
              <Button variant="secondary" size="L" leadingIcon="solar:download-minimalistic-linear" onClick={downloadSelectedLetters}>
                Download Files
              </Button>
              <Button variant="primary" size="L" leadingIcon="solar:plain-linear" onClick={() => setSendDrawerOpen(true)}>
                Send Files
              </Button>
              <span className={styles.bulkDivider} />
              <ActionButton
                icon="solar:close-square-linear"
                size="S"
                tooltip="Clear selection"
                onClick={() => setSelectedLetters(new Set())}
              />
            </div>
          )}
        </div>
      </div>

      {/* CCM-only persistent time tracker — floats bottom-right; a Stop
          from any step logs the elapsed time as a billable activity. */}
      {isCcm && <CcmTimerWidget program={program} />}

      {sendDrawerOpen && (
        <SendLetterDrawer
          letterName={
            selectedLetters.size === 1
              ? PROGRAM_LETTERS_MOCK.find(l => selectedLetters.has(l.id))?.fileName || 'Letter'
              : 'Letters'
          }
          onClose={() => setSendDrawerOpen(false)}
          onSent={() => setSelectedLetters(new Set())}
        />
      )}
    </div>
  );
}

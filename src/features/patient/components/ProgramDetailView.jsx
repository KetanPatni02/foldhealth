import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { Button } from '../../../components/Button/Button';
import { BannerExpandIcon } from '../../../components/Icon/BannerExpandIcon';
import { ProgressRing } from '../../hcc/DiagPanel/ReviewProgressPopover';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { ProgramStatusRing } from './ProgramStatusRing';
import { toast } from '../../../components/Toast/Toast';
import { PROGRAM_STEPS, PROGRAM_LETTERS_MOCK } from '../data/programActivityMock';
import { PROGRAM_STATUS_OPTIONS, statusColorFor } from '../data/programStatus';
import { RoleAssigneePicker } from '../../hcc/RoleAssigneePicker';
import { ProgramBadges } from './ProgramBadges';
import { OutreachTab } from './OutreachTab';
import { CcmBillingReview } from './CcmBillingReview';
import { CcmTimerWidget } from './CcmTimerWidget';
import { SendLetterDrawer } from './SendLetterDrawer';
import { PreVisitStep } from './PreVisitStep';
import { AssessmentFormView } from './AssessmentFormView';
import { CarePlanView } from './CarePlanView';
import { AppointmentStep } from './AppointmentStep';
import { PostVisitChecklist } from './PostVisitChecklist';
import { OpenCareGaps } from './OpenCareGaps';
import { MedicationReconciliation } from './MedicationReconciliation';
import { ProgramRelatedTasks } from './ProgramRelatedTasks';
import { ProgramRelatedFiles } from './ProgramRelatedFiles';
import { ReferralReview } from './ReferralReview';
import styles from './ProgramDetailView.module.css';

// Per-program step lists live in PROGRAM_STEPS (keyed by code). Unknown codes
// fall back to the SNP list.
const initialsOf = (name = '') =>
  name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

const stepsFor = (code) => PROGRAM_STEPS[code] || PROGRAM_STEPS.SNP;
const flatSteps = (list) => list.flatMap(s => (s.type === 'section' ? s.children : [s]));

// Neutral fallback for steps whose content view hasn't been built yet.
function StepPlaceholder({ name }) {
  return (
    <div className={styles.stepPlaceholder}>
      <Icon name="solar:documents-linear" size={36} color="var(--neutral-150)" />
      <p className={styles.stepPlaceholderTitle}>{name}</p>
      <p className={styles.stepPlaceholderText}>This step is coming soon.</p>
    </div>
  );
}

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

// Steps that render a saved form (from Settings → Content → Forms) in the
// Review layout. Keyed by step name → the form to load + review-header meta.
const ASSESSMENT_STEPS = {
  HRA: { formName: 'HRA Assessment form', title: 'Health Risk Assessment', filledBy: 'Annette Brave', filledDate: '10/11/24', reviewedBy: 'Robert Fox', reviewedDate: '10/11/24' },
  'BRCSI Assessment': { formName: 'BRCSI Assessment form', title: 'BRCSI Assessment', filledBy: 'Annette Brave', filledDate: '10/11/24', reviewedBy: 'Robert Fox', reviewedDate: '10/11/24' },
  'SNP Assessment': { formName: 'SNP Assessment form', title: 'SNP Assessment', filledBy: 'Annette Brave', filledDate: '10/11/24', reviewedBy: 'Robert Fox', reviewedDate: '10/11/24' },
  // Post Visit Checklist is a fixed checklist (not a saved form), so it shares
  // the review header but renders the PostVisitChecklist body.
  'Post Visit Checklist': { checklist: true, title: 'Post Visit Check List', filledBy: 'Robert Fox', filledDate: '10/11/24', reviewedBy: 'Robert Fox', reviewedDate: '10/11/24' },
  // Programs other than SNP name this step "Post-Visit" — same checklist body.
  'Post-Visit': { checklist: true, title: 'Post Visit Check List', filledBy: 'Robert Fox', filledDate: '10/11/24', reviewedBy: 'Robert Fox', reviewedDate: '10/11/24' },
};

export function ProgramDetailView({ program, onClose, startAtFirstStep = false, onSwitchProgram }) {
  const isCcm = program.code === 'CCM';
  const isSnp = program.code === 'SNP';
  const stepList = stepsFor(program.code);
  const ALL_STEPS = flatSteps(stepList);
  const firstStep = stepList[0];
  // Completion % for the header status ring — completed steps ÷ total steps.
  const programProgress = ALL_STEPS.length
    ? Math.round((ALL_STEPS.filter(s => s.status === 'completed').length / ALL_STEPS.length) * 100)
    : 0;
  // Land on the first step by default (CCM keeps its billing step); step ids
  // differ per program so we can't hardcode one.
  const [activeStep, setActiveStep] = useState(isCcm ? 'ccm-billing' : firstStep?.id);
  // Section open/closed is seeded from each section's own `expanded` flag
  // (SectionHeader falls back to it), so an empty map works for every program.
  const [expandedSections, setExpandedSections] = useState({});
  const [activeLetterTab, setActiveLetterTab] = useState('All');
  const [selectedLetters, setSelectedLetters] = useState(() => new Set());
  // Send-letter drawer target: null | { letterName, clearOnSent }. Opened from
  // the bulk bar (all/selected) or a single row's send icon.
  const [sendTarget, setSendTarget] = useState(null);
  // Per-row "more" menu (Preview / Download): { id, rect } | null.
  const [rowMenu, setRowMenu] = useState(null);

  // The member whose care program we're in — drives the send-letter prefill.
  const currentPatient = useAppStore(s => s.patients.find(p => p.id === s.selectedPatientId));

  // Live program row from the store so the header status dropdown reflects
  // (and persists) changes without relying on the stale `program` prop.
  const patientId = useAppStore(s => s.selectedPatientId);
  const updateCareProgram = useAppStore(s => s.updateCareProgram);
  // Select the stable array reference only; derive everything else locally so
  // no selector returns a fresh array/object (that trips useSyncExternalStore's
  // "getSnapshot should be cached" guard).
  const patientPrograms = useAppStore(s => s.careProgramsByPatient[s.selectedPatientId]);
  const liveProgram = patientPrograms?.find(p => p.id === program.id);
  const status = liveProgram?.status || program.status || 'New';
  const assignee = liveProgram?.assignee || program.assignee;

  // SNP trigger navigation — the patient's SNP enrollments, ordered by trigger.
  // Prev/Next render the neighbouring trigger in this same detail window.
  const orderedTriggers = useMemo(
    () => (patientPrograms || []).filter(p => p.code === 'SNP').sort((a, b) => (a.trigger || 0) - (b.trigger || 0)),
    [patientPrograms],
  );
  // Other active programs for this patient — shown as header badges. Excludes
  // the program currently open and any that are Closed.
  const otherPrograms = useMemo(
    () => (patientPrograms || []).filter(p => p.id !== program.id && p.status !== 'Closed'),
    [patientPrograms, program.id],
  );
  // Completion % for any program code (used by the badges' rings).
  const progressForCode = (code) => {
    const flat = flatSteps(PROGRAM_STEPS[code] || []);
    return flat.length ? Math.round((flat.filter(s => s.status === 'completed').length / flat.length) * 100) : 0;
  };

  const triggerIdx = orderedTriggers.findIndex(p => p.id === program.id);
  const prevTrigger = triggerIdx > 0 ? orderedTriggers[triggerIdx - 1] : null;
  const nextTrigger = triggerIdx >= 0 && triggerIdx < orderedTriggers.length - 1 ? orderedTriggers[triggerIdx + 1] : null;
  const triggerNum = (triggerIdx >= 0 ? orderedTriggers[triggerIdx].trigger : program.trigger) || 1;
  const [statusMenu, setStatusMenu] = useState(null); // { rect } | null
  const changeStatus = (newStatus) => {
    const patch = { status: newStatus, statusColor: statusColorFor(newStatus) };
    const cur = liveProgram || program;
    if (newStatus === 'Enrolled' && (!cur.startDate || cur.startDate === '—')) {
      const d = new Date();
      patch.startDate = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    }
    updateCareProgram(patientId, program.id, patch);
  };

  const allLettersSelected = selectedLetters.size === PROGRAM_LETTERS_MOCK.length && PROGRAM_LETTERS_MOCK.length > 0;
  const someLettersSelected = selectedLetters.size > 0 && !allLettersSelected;
  const toggleAllLetters = () =>
    setSelectedLetters(prev => (prev.size === PROGRAM_LETTERS_MOCK.length ? new Set() : new Set(PROGRAM_LETTERS_MOCK.map(l => l.id))));
  const toggleLetter = (id) =>
    setSelectedLetters(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Download the given letters as files, then confirm with a success toast.
  // Defaults to the current bulk selection.
  const downloadLetters = (chosen) => {
    if (!chosen || chosen.length === 0) return;
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
  const downloadSelectedLetters = () => downloadLetters(PROGRAM_LETTERS_MOCK.filter(l => selectedLetters.has(l.id)));

  const activeStepObj = ALL_STEPS.find(s => s.id === activeStep);
  const stepName = activeStepObj?.name || '';
  const isOutreachStep = stepName === 'Outreach';
  const isBillingStep = activeStepObj?.kind === 'billing';
  const isPreVisitStep = /^pre-?visit$/i.test(stepName);           // "Pre-visit" / "Pre-Visit"
  const isCarePlanStep = stepName === 'Care Plan';
  const isAppointmentStep = /appointment/i.test(stepName);          // "Appointment" / "ICT Appointment"
  const isOpenCareGapsStep = stepName === 'Open Care Gaps' || stepName === 'Care Gaps';
  const isMedReconStep = stepName === 'Medication Reconciliation' || stepName === 'Medication Review';
  const isProgramTasksStep = stepName === 'Program Related Task';
  const isProgramFilesStep = stepName === 'Program Related Files' || stepName === 'Program Documents' || stepName === 'Documents';
  const isReferralStep = stepName === 'Referral Review';
  const assessmentCfg = ASSESSMENT_STEPS[stepName];
  const isLettersStep = stepName === 'Letters';
  const isLettersPane = isLettersStep;
  // Step names without a dedicated view yet (Snapshot, Diagnosis Gaps, PHQ-9,
  // the various assessments/checklists, …) render a neutral placeholder.

  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const isUnassigned = !assignee || assignee === 'Unassigned';

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ProgramStatusRing progress={programProgress} size={16} />
          <span className={styles.programTitle}>{program.name}</span>
          <button
            type="button"
            className={styles.statusBadge}
            onClick={e => setStatusMenu({ rect: e.currentTarget.getBoundingClientRect() })}
          >
            <span className={styles.statusBadgeText} style={{ color: statusColorFor(status) }}>{status}</span>
            <Icon name="solar:alt-arrow-down-linear" size={16} color={statusColorFor(status)} />
          </button>
          <RoleAssigneePicker
            role="care_program"
            memberId={program.id}
            dosDate="care-program"
            titleLabel=""
            currentName={isUnassigned ? null : assignee}
            onAssign={user => updateCareProgram(patientId, program.id, { assignee: user.name })}
            trigger={({ ref, onClick }) => (
              isUnassigned ? (
                <button ref={ref} type="button" className={styles.assigneeChipEmpty} onClick={onClick} title="Assign" aria-label="Assign">
                  <Icon name="solar:user-plus-linear" size={14} color="var(--neutral-300)" />
                  <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
                </button>
              ) : (
                <button ref={ref} type="button" className={styles.assigneeChip} onClick={onClick} title={`Assigned to ${assignee}`} aria-label={assignee}>
                  <span className={styles.assigneeAvatar}>{initialsOf(assignee)}</span>
                  <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--secondary-300)" />
                </button>
              )
            )}
          />
          {/* Trigger navigation is SNP-only — other programs have a single track. */}
          {isSnp && (
            <>
              <span className={styles.headerDivider} />
              <div className={styles.breadcrumb}>
                <button
                  type="button"
                  className={styles.breadcrumbArrow}
                  aria-label="Previous trigger"
                  disabled={!prevTrigger}
                  onClick={() => prevTrigger && onSwitchProgram?.(prevTrigger)}
                >
                  <Icon name="solar:alt-arrow-left-linear" size={16} color={prevTrigger ? 'var(--neutral-300)' : 'var(--neutral-150)'} />
                </button>
                <span className={styles.breadcrumbLabel}>Trigger {triggerNum}</span>
                <button
                  type="button"
                  className={styles.breadcrumbArrow}
                  aria-label="Next trigger"
                  disabled={!nextTrigger}
                  onClick={() => nextTrigger && onSwitchProgram?.(nextTrigger)}
                >
                  <Icon name="solar:alt-arrow-right-linear" size={16} color={nextTrigger ? 'var(--neutral-300)' : 'var(--neutral-150)'} />
                </button>
              </div>
            </>
          )}
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
          {otherPrograms.length > 0 && (
            <>
              <ProgramBadges programs={otherPrograms} progressFor={progressForCode} />
              <span className={styles.headerDivider} />
            </>
          )}
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
            {assessmentCfg ? (
              <div className={styles.assessmentHeader}>
                <Icon name="solar:clipboard-text-linear" size={18} color="var(--primary-300)" />
                <div className={styles.assessmentHeaderText}>
                  <span className={styles.assessmentTitle}>{assessmentCfg.title}</span>
                  <span className={styles.assessmentMeta}>
                    Filled by {assessmentCfg.filledBy} on {assessmentCfg.filledDate} • Reviewed by {assessmentCfg.reviewedBy} on {assessmentCfg.reviewedDate}
                  </span>
                </div>
              </div>
            ) : isMedReconStep ? (
              <div className={styles.assessmentHeader}>
                <Icon name="solar:clipboard-text-linear" size={18} color="var(--primary-300)" />
                <div className={styles.assessmentHeaderText}>
                  <span className={styles.assessmentTitle}>Medication Reconciliation</span>
                  <span className={styles.assessmentMeta}>Last Reviewed by Robert Fox on 11/10/24</span>
                </div>
              </div>
            ) : isReferralStep ? (
              <div className={styles.assessmentHeader}>
                <Icon name="solar:clipboard-text-linear" size={18} color="var(--primary-300)" />
                <div className={styles.assessmentHeaderText}>
                  <span className={styles.assessmentTitle}>Referral Review</span>
                  <span className={styles.assessmentMeta}>Reviewed by Jonathan Bush (NP) on 05/01/25</span>
                </div>
              </div>
            ) : isCarePlanStep ? (
              <div className={styles.assessmentHeader}>
                <Icon name="solar:clipboard-text-linear" size={18} color="var(--primary-300)" />
                <div className={styles.assessmentHeaderText}>
                  <span className={styles.assessmentTitle}>Care Plan</span>
                  <span className={styles.assessmentMeta}>Created by Ivy Ralph on 09/11/24</span>
                </div>
              </div>
            ) : (
              <span className={styles.contentTitle}>
                {isBillingStep ? 'Billing Review'
                  : isOutreachStep ? 'Outreach'
                  : isPreVisitStep ? 'Pre-visit'
                  : isAppointmentStep ? 'Follow Up Appointments'
                  : isOpenCareGapsStep ? 'Open Care Gaps'
                  : isProgramTasksStep ? 'Program Related Tasks'
                  : isProgramFilesStep ? 'Document Library'
                  : isLettersStep ? 'Program Related Letters'
                  : stepName}
              </span>
            )}
            <div className={styles.contentActions}>
              {isCarePlanStep ? (
                <>
                  <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
                  <ActionButton icon="solar:download-minimalistic-linear" size="S" tooltip="Download" />
                  <Button variant="ghost" size="S" leadingIcon="solar:add-circle-linear" className={styles.actionBtn}>
                    Add Care Plan
                  </Button>
                  <Button
                    variant="ghost"
                    size="S"
                    leadingIconElement={<Icon name="solar:pen-2-linear" size={14} color="var(--primary-300)" />}
                    className={styles.reviewedBtn}
                  >
                    Sign &amp; Share
                  </Button>
                  <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
                </>
              ) : isMedReconStep ? (
                <>
                  <Button variant="ghost" size="S" trailingIcon="solar:alt-arrow-down-linear" className={styles.actionBtn}>
                    Assign
                  </Button>
                  <Button variant="ghost" size="S" className={styles.actionBtn}>Skip</Button>
                  <Button variant="ghost" size="S" trailingIcon="solar:alt-arrow-down-linear" className={styles.reviewedBtn}>
                    Sign
                  </Button>
                  <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
                </>
              ) : isProgramTasksStep ? (
                <>
                  <ActionButton icon="solar:magnifer-linear" size="S" tooltip="Search" />
                  <span className={styles.headerDivider} />
                  <Button variant="ghost" size="S" leadingIcon="solar:add-circle-linear" className={styles.reviewedBtn}>
                    Add Task
                  </Button>
                  <span className={styles.headerDivider} />
                  <ActionButton icon="solar:filter-linear" size="S" tooltip="Filter" />
                </>
              ) : (
                <>
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
                </>
              )}
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
          ) : isCarePlanStep ? (
            <CarePlanView />
          ) : isAppointmentStep ? (
            <AppointmentStep patientId={currentPatient?.id} programCode={program.code} />
          ) : isOpenCareGapsStep ? (
            <OpenCareGaps />
          ) : isMedReconStep ? (
            <MedicationReconciliation />
          ) : isProgramTasksStep ? (
            <ProgramRelatedTasks programCode={program.code} />
          ) : isProgramFilesStep ? (
            <ProgramRelatedFiles />
          ) : isReferralStep ? (
            <ReferralReview />
          ) : assessmentCfg ? (
            assessmentCfg.checklist
              ? <PostVisitChecklist />
              : <AssessmentFormView formName={assessmentCfg.formName} />
          ) : isLettersStep ? (
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
                    <th aria-label="Actions" />
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
                      <td className={styles.rowActionsCell}>
                        {selectedLetters.size === 0 && (
                          <div className={styles.rowActions}>
                            <ActionButton
                              icon="solar:plain-linear"
                              size="S"
                              tooltip="Send letter"
                              onClick={() => setSendTarget({ letterName: letter.fileName, clearOnSent: false })}
                            />
                            <ActionButton
                              icon="solar:menu-dots-linear"
                              size="S"
                              tooltip="More actions"
                              onClick={(e) => setRowMenu({ id: letter.id, rect: e.currentTarget.getBoundingClientRect() })}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <StepPlaceholder name={stepName} />
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
              <Button
                variant="primary"
                size="L"
                leadingIcon="solar:plain-linear"
                onClick={() => setSendTarget({
                  letterName: selectedLetters.size === 1
                    ? PROGRAM_LETTERS_MOCK.find(l => selectedLetters.has(l.id))?.fileName || 'Letter'
                    : 'Letters',
                  clearOnSent: true,
                })}
              >
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

      {sendTarget && (
        <SendLetterDrawer
          letterName={sendTarget.letterName}
          memberName={currentPatient?.name}
          memberId={currentPatient?.memberId}
          onClose={() => setSendTarget(null)}
          onSent={() => { if (sendTarget.clearOnSent) setSelectedLetters(new Set()); }}
        />
      )}

      {rowMenu && (
        <MenuPopover
          anchorRect={rowMenu.rect}
          ariaLabel="Letter actions"
          width={168}
          items={[
            { key: 'preview', icon: 'solar:eye-linear', label: 'Preview' },
            { key: 'download', icon: 'solar:download-minimalistic-linear', label: 'Download' },
          ]}
          onSelect={(key) => {
            const letter = PROGRAM_LETTERS_MOCK.find(l => l.id === rowMenu.id);
            if (!letter) return;
            if (key === 'download') downloadLetters([letter]);
            else if (key === 'preview') toast.success(`Previewing ${letter.fileName}`);
          }}
          onClose={() => setRowMenu(null)}
        />
      )}

      {statusMenu && (
        <MenuPopover
          anchorRect={statusMenu.rect}
          align="left"
          width={180}
          ariaLabel="Change status"
          items={PROGRAM_STATUS_OPTIONS.map(s => ({
            key: s,
            label: <span style={{ color: 'var(--neutral-400)' }}>{s}</span>,
          }))}
          onSelect={(newStatus) => changeStatus(newStatus)}
          onClose={() => setStatusMenu(null)}
        />
      )}
    </div>
  );
}

import { Icon } from '../../components/Icon/Icon';
import { BotIcon } from '../../components/Icon/BotIcon';
import { Badge } from '../../components/Badge/Badge';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import rowStyles from '../toc-worklist/WorklistRow.module.css';
import styles from './tocColumns.module.css';
import { formatAiOutcomeInvokedAt, hasAgentConnected, outreachStatusLabel, resolveAiTaskCount } from './tocOutcome';

const PROGRAM_SUB_STATUS = {
  enrolled: { variant: 'toc-enrolled', label: 'Enrolled', icon: 'solar:check-circle-bold' },
  engaged: { variant: 'toc-engaged', label: 'Engaged', icon: 'solar:link-round-bold' },
  attempted: { variant: 'toc-attempted', label: 'Attempted', icon: 'solar:history-bold' },
  new: { variant: 'toc-new', label: 'New', icon: 'solar:star-bold' },
  oncall: { variant: 'toc-oncall', label: 'On Call', icon: 'solar:phone-calling-bold' },
};

const OUTREACH_STATUS = {
  Completed: { tone: 'success', icon: 'solar:check-circle-linear' },
  'Needs Review': { tone: 'error', icon: 'solar:danger-triangle-linear' },
  Queued: { tone: 'warning', icon: 'solar:clock-circle-linear' },
  Aborted: { tone: 'grey', icon: 'solar:close-circle-linear' },
};

const ADMIT_CLASS = { IP: 'Inpatient', ED: 'Emergency' };

const TAG_VARIANT_BY_TONE = {
  grey:  'ai-neutral',
  blue:  'outreach-appointment',
  green: 'ai-med',
  amber: 'outreach-care-gap',
  red:   'ai-risk',
};

const SAMPLE_TAGS = [
  { label: 'Diabetes', tone: 'blue' },
  { label: 'Hypertension', tone: 'amber' },
  { label: 'High Risk', tone: 'red' },
  { label: 'CHF', tone: 'red' },
  { label: 'COPD', tone: 'amber' },
  { label: 'Needs Transportation', tone: 'grey' },
  { label: 'Fall Risk', tone: 'amber' },
  { label: 'Polypharmacy', tone: 'blue' },
];

const CARE_TEAM = {
  nurse: ['PoojaNurse CFC Hills', 'Michelle Ling', 'Robin Berg'],
  coordinator: ['Chemy Maa', 'Delores Conn', 'Daniel Arsulo'],
  socialWorker: ['Robin Berg', 'Ignacio Beer', 'Daniel Arsulo'],
  chw: ['Ignacio Beer', 'shravank 7hills', 'Chemy Maa'],
};

const HUMAN_OUTREACH = ['Michelle Ling', 'Robin Berg', 'Chemy Maa', 'Delores Conn'];

const BAND = { background: 'var(--primary-50)' };
const BAND_LEFT = { ...BAND, borderLeft: '0.5px solid var(--primary-200)' };
const BAND_RIGHT = { ...BAND, borderRight: '0.5px solid var(--primary-200)' };
const BAND_TH = { background: 'var(--primary-50)' };
const BAND_TH_LEFT = { ...BAND_TH, borderLeft: '0.5px solid var(--primary-200)' };
const BAND_TH_RIGHT = { ...BAND_TH, borderRight: '0.5px solid var(--primary-200)' };

function hashPick(id, list) {
  const n = String(id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return list[n % list.length];
}

function initialsFrom(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '—';
}

function programSubStatus(p) {
  return PROGRAM_SUB_STATUS[p.tocStatus] || PROGRAM_SUB_STATUS.new;
}

function riskIq(p) {
  if (p.riskIq) return p.riskIq;
  if (p.lace === 'High') return 'High';
  if (p.lace === 'Medium') return 'Moderate';
  if (p.lace === 'Low') return 'Low';
  return 'Undetermined';
}

const LACE_RANK = { High: 0, Medium: 1, Low: 2 };
const RISK_RANK = { High: 0, Moderate: 1, Low: 2, Undetermined: 3 };

function parseMdy(s) {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (!m) return null;
  return Date.UTC(+m[3], +m[1] - 1, +m[2]);
}

export function resolveLastOutreachBy(p) {
  if (!hasAgentConnected(p)) return { name: null, isAgent: false };
  if (p.lastOutreachBy) {
    return { name: p.lastOutreachBy, isAgent: p.lastOutreachBy === 'TOC Agent' };
  }
  const n = String(p.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  if (n % 3 !== 0) return { name: 'TOC Agent', isAgent: true };
  return { name: HUMAN_OUTREACH[n % HUMAN_OUTREACH.length], isAgent: false };
}

export function resolveCareTeamName(p, field, salt = '') {
  if (p[field]) return p[field];
  const pool = field === 'nurseCoach' ? CARE_TEAM.nurse
    : field === 'coordinator' ? CARE_TEAM.coordinator
      : field === 'socialWorker' ? CARE_TEAM.socialWorker
        : CARE_TEAM.chw;
  return hashPick(`${p.id}${salt}`, pool);
}

/** Sort fields for useTableSort — dates as UTC timestamps, acuity as rank. */
export function enrichTocRow(p) {
  return {
    ...p,
    programSubStatusSort: programSubStatus(p).label,
    admitClassSort: ADMIT_CLASS[p.tocType] || 'Inpatient',
    laceSort: LACE_RANK[p.lace] ?? 3,
    aiOutcomeSort: outreachStatusLabel(p) || '',
    assessmentSort: assessmentLabel(p),
    aiTasksSort: resolveAiTaskCount(p),
    nextActionDueSort: parseMdy(p.dueOn || p.nextOutreach),
    outreachSort: parseMdy(p.outreachDate || p.callDate),
    lastOutreachBySort: resolveLastOutreachBy(p).name || '',
    nurseCoachSort: resolveCareTeamName(p, 'nurseCoach'),
    coordinatorSort: resolveCareTeamName(p, 'coordinator', '-c'),
    socialWorkerSort: resolveCareTeamName(p, 'socialWorker', '-s'),
    chwSort: resolveCareTeamName(p, 'communityHealthWorker', '-h'),
    startDateSort: parseMdy(p.startDate),
    lastAdmissionSort: parseMdy(p.lastAdmission),
    radarSort: p.radar || 'Undetermined',
    riskIqSort: RISK_RANK[riskIq(p)] ?? 3,
    carePlanStatusSort: p.carePlanStatus || 'none',
  };
}

function RoleAssignee({ name, initials, field, patient, ctx, pickerTitle }) {
  const users = (ctx.platformUsers || []).map(u => ({
    id: u.id,
    name: u.name,
    initials: u.initials,
    role: u.clinicalRoles?.[0] || '',
  }));
  const onSelect = (u) => ctx.updatePatient?.(patient.id, {
    [field]: u.name,
    [`${field}Initials`]: u.initials,
  });
  if (!name) {
    return <AssigneeChange unassigned users={users} onSelect={onSelect} pickerTitle={pickerTitle} />;
  }
  return (
    <AssigneeChange
      name={name}
      initials={initials}
      showRole={false}
      users={users}
      onSelect={onSelect}
      pickerTitle={pickerTitle}
    />
  );
}

function AiOutcomeCell({ patient, onOpen }) {
  const label = outreachStatusLabel(patient);
  if (!label) return <span className={styles.dash}>—</span>;
  const cfg = OUTREACH_STATUS[label];
  const invokedAt = formatAiOutcomeInvokedAt(patient.aiOutcomeInvokedAt);
  return (
    <button
      type="button"
      className={styles.assessmentBtn}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      aria-label={`Open outreach status for ${patient.name}`}
    >
      <Badge size="M" tone={cfg.tone} label={label} icon={cfg.icon} />
      {invokedAt && <span className={styles.aiOutcomeInvokedAt}>{invokedAt}</span>}
    </button>
  );
}

function AssessmentCompletedIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path
        d="M2.22266 5.37385L3.71623 7.03337C3.97174 7.31727 4.41308 7.32888 4.68316 7.0588L8.18629 3.55566"
        stroke="var(--status-success)"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AssessmentNotStartedIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path
        d="M5.33301 1.3335V2.66683M9.33301 5.3335H7.99967M5.33301 9.3335V8.00016M1.33301 5.3335H2.66634M2.50452 2.50507L3.44733 3.44787M8.16138 2.50507L7.21857 3.44788M8.1615 8.16191L7.21869 7.2191M2.50464 8.16191L3.44745 7.2191"
        stroke="var(--neutral-300)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssessmentPartialIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4.5" fill="var(--neutral-0)" stroke="var(--status-success)" />
      <path
        d="M5.5 1A4.5 4.5 0 0 1 10 5.5A4.5 4.5 0 0 1 5.5 10V1Z"
        fill="var(--status-success)"
      />
    </svg>
  );
}

function assessmentLabel() {
  return 'TOC IP Assessment';
}

function sampleAssessmentCompletedDate(p) {
  const n = String(p.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const month = 1 + (n % 12);
  const day = 1 + (n % 28);
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/2025`;
}

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

function resolveAssessmentStatus(p) {
  if (!hasAgentConnected(p)) return 'notStarted';
  const status = p.assessmentStatus;
  if (status === 'Completed') return 'completed';
  if (status === 'In Progress' || status === 'Overdue') return 'partial';
  if (status === 'Not Started') return 'notStarted';
  // Demo mix for connected rows without an explicit status.
  const n = String(p.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  if (n % 4 === 1) return 'partial';
  return 'completed';
}

/** Not Started / Partial / Completed — Figma 3048:85368 / 3048:85387 / 1468:158068. */
function resolveAssessmentDisplay(p) {
  const label = assessmentLabel(p);
  const status = resolveAssessmentStatus(p);
  if (status === 'completed') {
    const date = p.startDate || p.dischargeDate || sampleAssessmentCompletedDate(p);
    return { label, status, meta: `Completed • ${date}` };
  }
  return { label, status, meta: ASSESSMENT_STATUS[status].meta };
}

function AssessmentCell({ patient, onOpen }) {
  const { label, status, meta } = resolveAssessmentDisplay(patient);
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
        <span>{meta}</span>
      </span>
    </button>
  );
}

function OutreachByCell({ patient }) {
  const { name, isAgent } = resolveLastOutreachBy(patient);
  if (!name) return <span className={styles.dash}>—</span>;
  return (
    <span className={styles.person}>
      {isAgent ? (
        <BotIcon size={16} color="var(--neutral-400)" />
      ) : (
        <Icon name="solar:user-rounded-linear" size={16} color="var(--neutral-400)" />
      )}
      <span className={styles.outreachByName}>{name}</span>
    </span>
  );
}

function DateCell({ value }) {
  return <span className={value ? styles.date : styles.dash}>{value || '—'}</span>;
}

function sampleTags(p) {
  if (p.tags?.length) return { tags: p.tags, tagsMore: p.tagsMore || 0 };
  const start = String(p.id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % SAMPLE_TAGS.length;
  const count = 1 + (start % 2);
  const tags = Array.from({ length: count }, (_, i) => SAMPLE_TAGS[(start + i) % SAMPLE_TAGS.length]);
  const tagsMore = start % 3 === 0 ? 2 : 0;
  return { tags, tagsMore };
}

function TagCell({ patient }) {
  const { tags, tagsMore } = sampleTags(patient);
  if (!tags.length) return <span className={styles.dash}>—</span>;
  return (
    <span className={styles.tagCell}>
      {tags.map(t => (
        <Badge
          key={t.label}
          size="M"
          variant={TAG_VARIANT_BY_TONE[t.tone] || 'ai-neutral'}
          label={t.label}
        />
      ))}
      {tagsMore > 0 ? <span className={styles.tagMore}>+{tagsMore} More</span> : null}
    </span>
  );
}

const DOT_COLOR = { red: 'var(--status-error)', blue: 'var(--status-info)', grey: 'var(--neutral-200)' };

function mapOutreachDots(raw) {
  return (raw?.length ? raw : ['pending', 'pending', 'pending']).map((d) => (
    d === 'failed' || d === 'red' ? 'red' : d === 'success' || d === 'blue' ? 'blue' : 'grey'
  ));
}

function mapTocOutreach(p) {
  if (!hasAgentConnected(p)) return null;
  const raw = Array.isArray(p.outreachDots) ? p.outreachDots : [];
  const hasSuccess = raw.includes('success') || raw.includes('blue') || p.outreachAttended;
  const hasFailed = raw.includes('failed') || raw.includes('red');
  const date = p.outreachDate || p.callDate;
  if (!hasSuccess && !hasFailed && !date) return null;
  return {
    failed: hasFailed && !hasSuccess,
    status: hasSuccess ? 'Attended' : 'Failed',
    date,
    dots: mapOutreachDots(raw),
  };
}

function OutreachCell({ patient, onOpen }) {
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

/**
 * TOC worklist middle columns — matches Agent Worklist Figma 3044:70430.
 * Sticky Members / Actions stay in QueueRow.
 */
export const TOC_MIDDLE_COLUMNS = [
  {
    key: 'programSubStatus',
    label: 'Program Sub Status',
    sortKey: 'programSubStatusSort',
    sortType: 'generic',
    tdClassName: rowStyles.td,
    renderCell: (p) => {
      const cfg = programSubStatus(p);
      return <Badge size="M" variant={cfg.variant} label={cfg.label} icon={cfg.icon} />;
    },
  },
  {
    key: 'admitClass',
    label: 'Admit Class',
    sortKey: 'admitClassSort',
    sortType: 'generic',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={ADMIT_CLASS[p.tocType] || 'Inpatient'} />,
  },
  {
    key: 'tocAcuity',
    label: 'TOC Acuity',
    sortKey: 'laceSort',
    sortType: 'priority',
    tdClassName: rowStyles.td,
    renderCell: (p) => (
      <Badge size="M" variant={`lace-${(p.lace || 'low').toLowerCase()}`} label={p.lace || 'Low'} />
    ),
  },
  {
    key: 'outreachStatus',
    label: 'AI Outcome',
    sortKey: 'aiOutcomeSort',
    sortType: 'generic',
    tdClassName: `${rowStyles.td} ${styles.agentBandTd}`,
    tdStyle: BAND_LEFT,
    thStyle: BAND_TH_LEFT,
    renderCell: (p, ctx) => (
      <AiOutcomeCell
        patient={p}
        onOpen={() => ctx.openOutreachStatusDrawer(p.id)}
      />
    ),
  },
  {
    key: 'assessment',
    label: 'AI Assessment',
    sortKey: 'assessmentSort',
    sortType: 'alpha',
    width: 200,
    tdClassName: `${rowStyles.td} ${styles.assessmentTd}`,
    tdStyle: BAND,
    thStyle: { ...BAND_TH, minWidth: 200 },
    renderCell: (p, ctx) => (
      <AssessmentCell
        patient={p}
        onOpen={() => ctx.openAssessmentDrawer(p.id, {
          prefilled: resolveAssessmentStatus(p) === 'completed',
        })}
      />
    ),
  },
  {
    key: 'aiTasks',
    label: 'AI Tasks',
    sortKey: 'aiTasksSort',
    sortType: 'number',
    tdClassName: `${rowStyles.td} ${styles.agentBandTd}`,
    tdStyle: BAND_RIGHT,
    thStyle: BAND_TH_RIGHT,
    renderCell: (p, ctx) => {
      const taskCount = resolveAiTaskCount(p);
      return taskCount > 0
        ? (
          <button
            type="button"
            className={styles.assessmentBtn}
            onClick={(e) => { e.stopPropagation(); ctx.openAiTasksDrawer(p.id); }}
            aria-label={`Open AI tasks for ${p.name}`}
          >
            <Badge size="M" tone="primary" label={String(taskCount)} />
          </button>
        )
        : <span className={styles.dash}>—</span>;
    },
  },
  {
    key: 'outreach',
    label: 'Outreach',
    sortKey: 'outreachSort',
    sortType: 'date',
    tdClassName: rowStyles.td,
    renderCell: (p, ctx) => (
      <OutreachCell
        patient={p}
        onOpen={() => ctx.openOutreachStatusDrawer(p.id)}
      />
    ),
  },
  {
    key: 'lastOutreachBy',
    label: 'Last Outreach By',
    sortKey: 'lastOutreachBySort',
    sortType: 'alpha',
    tdClassName: rowStyles.td,
    renderCell: (p) => <OutreachByCell patient={p} />,
  },
  {
    key: 'nextActionDue',
    label: 'Next Action Due',
    sortKey: 'nextActionDueSort',
    sortType: 'date',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={p.dueOn || p.nextOutreach} />,
  },
  {
    key: 'assignee',
    label: 'Assignee',
    sortKey: 'assignee',
    sortType: 'alpha',
    tdClassName: rowStyles.td,
    renderCell: (p, ctx) => (
      <RoleAssignee
        name={p.assignee}
        initials={p.assigneeInitials}
        field="assignee"
        patient={p}
        ctx={ctx}
        pickerTitle="Change assignee"
      />
    ),
  },
  {
    key: 'nurseCoach',
    label: 'Nurse/Health Coach',
    sortKey: 'nurseCoachSort',
    sortType: 'alpha',
    tdClassName: rowStyles.td,
    renderCell: (p, ctx) => {
      const name = resolveCareTeamName(p, 'nurseCoach');
      return (
        <RoleAssignee
          name={name}
          initials={p.nurseCoachInitials || initialsFrom(name)}
          field="nurseCoach"
          patient={p}
          ctx={ctx}
          pickerTitle="Change nurse / health coach"
        />
      );
    },
  },
  {
    key: 'coordinator',
    label: 'Coordinator',
    sortKey: 'coordinatorSort',
    sortType: 'alpha',
    tdClassName: rowStyles.td,
    renderCell: (p, ctx) => {
      const name = resolveCareTeamName(p, 'coordinator', '-c');
      return (
        <RoleAssignee
          name={name}
          initials={p.coordinatorInitials || initialsFrom(name)}
          field="coordinator"
          patient={p}
          ctx={ctx}
          pickerTitle="Change coordinator"
        />
      );
    },
  },
  {
    key: 'socialWorker',
    label: 'Social Worker',
    sortKey: 'socialWorkerSort',
    sortType: 'alpha',
    tdClassName: rowStyles.td,
    renderCell: (p, ctx) => {
      const name = resolveCareTeamName(p, 'socialWorker', '-s');
      return (
        <RoleAssignee
          name={name}
          initials={p.socialWorkerInitials || initialsFrom(name)}
          field="socialWorker"
          patient={p}
          ctx={ctx}
          pickerTitle="Change social worker"
        />
      );
    },
  },
  {
    key: 'communityHealthWorker',
    label: 'Com. Health Worker',
    sortKey: 'chwSort',
    sortType: 'alpha',
    tdClassName: rowStyles.td,
    renderCell: (p, ctx) => {
      const name = resolveCareTeamName(p, 'communityHealthWorker', '-h');
      return (
        <RoleAssignee
          name={name}
          initials={p.communityHealthWorkerInitials || initialsFrom(name)}
          field="communityHealthWorker"
          patient={p}
          ctx={ctx}
          pickerTitle="Change community health worker"
        />
      );
    },
  },
  {
    key: 'startDate',
    label: 'Start Date',
    sortKey: 'startDateSort',
    sortType: 'date',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={p.startDate} />,
  },
  {
    key: 'lastAdmission',
    label: 'Last Admission',
    sortKey: 'lastAdmissionSort',
    sortType: 'date',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={p.lastAdmission} />,
  },
  {
    key: 'radar',
    label: 'Radar',
    sortKey: 'radarSort',
    sortType: 'generic',
    tdClassName: rowStyles.td,
    renderCell: (p) => <span className={styles.radar}>{p.radar || 'Undetermined'}</span>,
  },
  {
    key: 'riskIq',
    label: 'Risk IQ',
    sortKey: 'riskIqSort',
    sortType: 'priority',
    tdClassName: rowStyles.td,
    renderCell: (p) => {
      const value = riskIq(p);
      const tone = value === 'High' ? styles.riskHigh
        : value === 'Moderate' ? styles.riskModerate
          : value === 'Low' ? styles.riskLow
            : '';
      return <span className={`${styles.risk} ${tone}`}>{value}</span>;
    },
  },
  {
    key: 'readmission',
    label: 'Readmission',
    sortKey: 'readmission',
    sortType: 'generic',
    tdClassName: rowStyles.td,
    renderCell: (p) => (
      p.readmission === 'Yes'
        ? <Badge size="M" variant="yes" label="Yes" />
        : <Badge size="M" variant="no" label="No" />
    ),
  },
  {
    key: 'carePlanStatus',
    label: 'Care Plan Status',
    sortKey: 'carePlanStatusSort',
    sortType: 'generic',
    tdClassName: rowStyles.td,
    renderCell: (p) => (
      p.carePlanStatus === 'updated'
        ? <Badge size="M" variant="care-plan-updated" label="Updated" icon="solar:check-circle-linear" />
        : p.carePlanStatus === 'pending'
          ? <Badge size="M" variant="care-plan-pending" label="Pending" icon="solar:clock-circle-linear" />
          : <Badge size="M" variant="care-plan-none" label="No Care Plan" />
    ),
  },
  {
    key: 'tags',
    label: 'Tags',
    width: 320,
    tdClassName: rowStyles.td,
    tdStyle: { minWidth: 320 },
    thStyle: { minWidth: 320 },
    renderCell: (p) => <TagCell patient={p} />,
  },
];

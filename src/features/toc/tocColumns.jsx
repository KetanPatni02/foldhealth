import { Icon } from '../../components/Icon/Icon';
import { Badge } from '../../components/Badge/Badge';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { Link } from '../../components/Link/Link';
import rowStyles from '../toc-worklist/WorklistRow.module.css';
import styles from './tocColumns.module.css';

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
  Scheduled: { tone: 'info', icon: 'solar:clock-circle-linear' },
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

function outreachStatusLabel(p) {
  if (p.status === 'completed' || p.outreachStatus === 'Completed') return 'Completed';
  if (p.status === 'failed' || p.status === 'review' || p.outreachStatus === 'Overdue') return 'Needs Review';
  if (p.outreachStatus === 'Attempted') return 'Needs Review';
  return 'Scheduled';
}

function riskIq(p) {
  if (p.lace === 'High') return 'High';
  if (p.lace === 'Medium') return 'Moderate';
  if (p.lace === 'Low') return 'Low';
  return 'Undetermined';
}

function PersonCell({ name }) {
  if (!name) return <span className={styles.dash}>—</span>;
  return (
    <span className={styles.person}>
      <Icon name="solar:user-rounded-linear" size={16} color="var(--primary-300)" />
      <span className={styles.personName}>{name}</span>
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

function OutreachCell({ patient }) {
  const outreach = mapTocOutreach(patient);
  if (!outreach) {
    return (
      <span className={styles.outreachNone}>
        <Icon name="solar:phone-calling-linear" size={16} color="var(--neutral-200)" />
        <span className={styles.dash}>—</span>
      </span>
    );
  }
  const failed = outreach.failed;
  return (
    <span className={styles.outreachCell}>
      <Icon
        name="solar:phone-calling-linear"
        size={16}
        color={failed ? 'var(--status-error)' : 'var(--status-success)'}
      />
      <span className={styles.outreachBody}>
        <span className={failed ? styles.outreachStatus : styles.outreachStatusOk}>{outreach.status}</span>
        {outreach.date && (
          <span className={failed ? styles.outreachDate : styles.outreachDateOk}>{outreach.date}</span>
        )}
        <span className={styles.dots}>
          {outreach.dots.map((c, i) => (
            <span key={i} className={styles.dot} style={{ background: DOT_COLOR[c] || DOT_COLOR.grey }} />
          ))}
        </span>
      </span>
    </span>
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
    tdClassName: rowStyles.td,
    renderCell: (p) => {
      const cfg = programSubStatus(p);
      return <Badge size="M" variant={cfg.variant} label={cfg.label} icon={cfg.icon} />;
    },
  },
  {
    key: 'admitClass',
    label: 'Admit Class',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={ADMIT_CLASS[p.tocType] || 'Inpatient'} />,
  },
  {
    key: 'tocAcuity',
    label: 'TOC Acuity',
    tdClassName: rowStyles.td,
    tdStyle: BAND_LEFT,
    thStyle: BAND_TH_LEFT,
    renderCell: (p) => (
      <Badge size="M" variant={`lace-${(p.lace || 'low').toLowerCase()}`} label={p.lace || 'Low'} />
    ),
  },
  {
    key: 'outreachStatus',
    label: 'Outreach Status',
    tdClassName: rowStyles.td,
    tdStyle: BAND,
    thStyle: BAND_TH,
    renderCell: (p, ctx) => {
      const label = outreachStatusLabel(p);
      const cfg = OUTREACH_STATUS[label];
      return (
        <button
          type="button"
          className={styles.assessmentBtn}
          onClick={(e) => { e.stopPropagation(); ctx.openOutreachStatusDrawer(p.id); }}
          aria-label={`Open outreach status for ${p.name}`}
        >
          <Badge size="M" tone={cfg.tone} label={label} icon={cfg.icon} />
        </button>
      );
    },
  },
  {
    key: 'assessment',
    label: 'AI Assessment',
    tdClassName: rowStyles.td,
    tdStyle: BAND,
    thStyle: BAND_TH,
    renderCell: (p, ctx) => (
      <button
        type="button"
        className={styles.assessmentBtn}
        onClick={(e) => { e.stopPropagation(); ctx.openAssessmentDrawer(p.id); }}
        aria-label={`Open assessment for ${p.name}`}
      >
        <Link>TOC {p.tocType === 'ED' ? 'ED' : 'IP'} Assessment</Link>
        <Icon name="solar:alt-arrow-right-linear" size={14} color="var(--primary-300)" />
      </button>
    ),
  },
  {
    key: 'aiTasks',
    label: 'AI Tasks',
    tdClassName: rowStyles.td,
    tdStyle: BAND_RIGHT,
    thStyle: BAND_TH_RIGHT,
    renderCell: (p) => (
      p.tasks > 0
        ? <span className={styles.taskBadge}>{p.tasks}</span>
        : <span className={styles.dash}>—</span>
    ),
  },
  {
    key: 'nextActionDue',
    label: 'Next Action Due',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={p.dueOn || p.nextOutreach} />,
  },
  {
    key: 'outreach',
    label: 'Outreach',
    tdClassName: rowStyles.td,
    renderCell: (p) => <OutreachCell patient={p} />,
  },
  {
    key: 'lastOutreachBy',
    label: 'Last Outreach By',
    tdClassName: rowStyles.td,
    renderCell: (p) => <PersonCell name={p.agentAssigned || 'TOC Agent'} />,
  },
  {
    key: 'assignee',
    label: 'Assignee',
    tdClassName: rowStyles.td,
    renderCell: (p) => (
      p.assignee
        ? <AssigneeChange name={p.assignee} initials={p.assigneeInitials} showRole={false} disabled />
        : <AssigneeChange unassigned disabled />
    ),
  },
  {
    key: 'nurseCoach',
    label: 'Nurse/Health Coach',
    tdClassName: rowStyles.td,
    renderCell: (p) => {
      const name = hashPick(p.id, CARE_TEAM.nurse);
      return <AssigneeChange name={name} initials={initialsFrom(name)} showRole={false} disabled />;
    },
  },
  {
    key: 'coordinator',
    label: 'Coordinator',
    tdClassName: rowStyles.td,
    renderCell: (p) => {
      const name = hashPick(`${p.id}-c`, CARE_TEAM.coordinator);
      return <AssigneeChange name={name} initials={initialsFrom(name)} showRole={false} disabled />;
    },
  },
  {
    key: 'socialWorker',
    label: 'Social Worker',
    tdClassName: rowStyles.td,
    renderCell: (p) => {
      const name = hashPick(`${p.id}-s`, CARE_TEAM.socialWorker);
      return <AssigneeChange name={name} initials={initialsFrom(name)} showRole={false} disabled />;
    },
  },
  {
    key: 'communityHealthWorker',
    label: 'Com. Health Worker',
    tdClassName: rowStyles.td,
    renderCell: (p) => {
      const name = hashPick(`${p.id}-h`, CARE_TEAM.chw);
      return <AssigneeChange name={name} initials={initialsFrom(name)} showRole={false} disabled />;
    },
  },
  {
    key: 'startDate',
    label: 'Start Date',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={p.startDate} />,
  },
  {
    key: 'lastAdmission',
    label: 'Last Admission',
    tdClassName: rowStyles.td,
    renderCell: (p) => <DateCell value={p.lastAdmission} />,
  },
  {
    key: 'radar',
    label: 'Radar',
    tdClassName: rowStyles.td,
    renderCell: () => <span className={styles.radar}>Undetermined</span>,
  },
  {
    key: 'riskIq',
    label: 'Risk IQ',
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
    tdClassName: rowStyles.td,
    renderCell: (p) => <TagCell patient={p} />,
  },
];

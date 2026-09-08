import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../../../../store/useAppStore';
import { Avatar } from '../../../../../components/Avatar/Avatar';
import { Badge } from '../../../../../components/Badge/Badge';
import { Button } from '../../../../../components/Button/Button';
import { Icon } from '../../../../../components/Icon/Icon';
import { Link } from '../../../../../components/Link/Link';
import { Toggle } from '../../../../../components/Toggle/Toggle';
import { Alert } from '../../../../../components/Alert/Alert';
import { toast } from '../../../../../components/Toast/sonnerToast';
import styles from './MonitoringTab.module.css';

const RISK_TONE = { High: 'error', Rising: 'warning', Moderate: 'info' };
const CHIP_TONE = { success: 'success', warning: 'warning', error: 'error' };

const STORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'clinical', label: 'Clinical' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'agent', label: 'Agent' },
  { key: 'plan', label: 'Plan changes' },
  { key: 'billing', label: 'Billing' },
];

const STORY_CATEGORY = {
  clinical: { label: 'Clinical', tone: 'info', icon: 'solar:heart-pulse-linear', iconTone: 'info' },
  outreach: { label: 'Outreach', tone: 'secondary', icon: 'solar:letter-linear', iconTone: 'secondary' },
  agent: { label: 'Agent', tone: 'primary', icon: 'solar:phone-calling-linear', iconTone: 'primary' },
  plan: { label: 'Plan', tone: 'warning', icon: 'solar:clipboard-list-linear', iconTone: 'warning' },
  billing: { label: 'Billing', tone: 'grey', icon: 'solar:dollar-minimalistic-linear', iconTone: 'grey' },
};

const STORY_ICON_TONE = {
  primary: { bg: 'var(--primary-50)', border: 'color-mix(in srgb, var(--primary-300) 20%, transparent)', color: 'var(--primary-300)' },
  info: { bg: 'var(--status-info-light)', border: 'color-mix(in srgb, var(--status-info) 20%, transparent)', color: 'var(--status-info)' },
  secondary: { bg: 'var(--secondary-50)', border: 'color-mix(in srgb, var(--secondary-300) 20%, transparent)', color: 'var(--secondary-300)' },
  warning: { bg: 'var(--status-warning-light)', border: 'color-mix(in srgb, var(--status-warning) 20%, transparent)', color: 'var(--status-warning)' },
  error: { bg: 'var(--status-error-light)', border: 'color-mix(in srgb, var(--status-error) 20%, transparent)', color: 'var(--status-error)' },
  grey: { bg: 'var(--neutral-50)', border: 'var(--neutral-150)', color: 'var(--neutral-300)' },
};

function initials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function adherenceBand(score) {
  if (score == null) return 'unknown';
  if (score >= 80) return 'good';
  if (score >= 60) return 'watch';
  return 'risk';
}

function StepDot({ status }) {
  if (status === 'done') return <Icon name="solar:check-circle-linear" size={18} className={styles.dotDone} />;
  return <span className={[styles.dot, status === 'current' ? styles.dotCurrent : styles.dotUpcoming].join(' ')} />;
}

function ProgramCard({ program, onAction }) {
  return (
    <div className={styles.program}>
      <div className={styles.programHead}>
        <Badge tone="info" size="S" label={program.code} />
        <span className={styles.programName}>{program.name}</span>
        <span className={styles.programProgress}>{program.progress}</span>
        <span className={styles.programNext}>
          <Icon name="solar:calendar-linear" size={13} />
          {program.next}
        </span>
      </div>
      {program.steps?.length > 0 && (
        <div className={styles.steps}>
          {program.steps.map((s, i) => (
            <div key={i} className={[styles.step, styles[`step_${s.status}`]].filter(Boolean).join(' ')}>
              <StepDot status={s.status} />
              <div className={styles.stepBody}>
                <span className={styles.stepLabel}>{s.label}</span>
                {s.sub && <span className={styles.stepSub}>{s.sub}</span>}
              </div>
              {s.meta && <span className={styles.stepMeta}>{s.meta}</span>}
              {s.action && (
                <Button variant="secondary" size="S" onClick={() => onAction(s.action)}>
                  <Icon name={s.action === 'Schedule' ? 'solar:calendar-linear' : 'solar:pen-2-linear'} size={13} />
                  {s.action}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MonitoringTab({ patient }) {
  const memberId = patient?.memberId ? String(patient.memberId) : null;
  const data = useAppStore((s) => (memberId ? s.patientMonitoring[memberId] : undefined));
  const loading = useAppStore((s) => (memberId ? s.patientMonitoringLoading[memberId] : false));
  const fetchPatientMonitoring = useAppStore((s) => s.fetchPatientMonitoring);

  useEffect(() => { if (memberId) fetchPatientMonitoring(memberId); }, [memberId, fetchPatientMonitoring]);

  const soon = (what) => toast(`${what} opens in Touch Mode. Coming soon.`);

  if (data === undefined && loading) {
    return <div className={styles.state}>Loading monitoring…</div>;
  }
  if (!data) {
    return (
      <div className={styles.state}>
        <Icon name="solar:pulse-linear" size={32} color="var(--neutral-200)" />
        <p className={styles.stateTitle}>No active monitoring episode</p>
        <p className={styles.stateBody}>This patient has no open transition, escalation, or threshold-risk right now.</p>
      </div>
    );
  }

  const band = adherenceBand(data.adherence);

  return (
    <div className={styles.scroll}>
      {data.bannerText && (
        <Alert tone="error" message={data.bannerText} meta={data.bannerDue} />
      )}

      {/* Identity band */}
      <div className={styles.idBand}>
        <div className={styles.idMain}>
          <Avatar type="initial" variant="patient" size="M" initials={initials(patient?.name)} />
          <div className={styles.idText}>
            <div className={styles.idNameRow}>
              <span className={styles.idName}>{patient?.name}</span>
              <span className={styles.idMeta}>{patient?.age}{patient?.gender ? ` · ${patient.gender}` : ''}</span>
            </div>
            <span className={styles.idSub}>{[patient?.language === 'en' ? 'English' : patient?.language, data.phoneFlags].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
        <IdCol label="Payer · PCP" lines={[patient?.payer || patient?.coverageType, patient?.pcp]} />
        <IdCol label="Risk">
          <span className={styles.riskVal}>{data.riskRaf}</span>
          {data.riskTrend && <span className={styles.riskTrend}>{data.riskTrend}</span>}
          <Badge tone={RISK_TONE[data.riskTier] || 'grey'} size="S" dot label={data.riskTier} />
        </IdCol>
        <IdCol label="Utilization · 90d" lines={[`${data.utilEd90d ?? 0} ED · ${data.utilIp90d ?? 0} IP`, data.utilNote]} flagged={data.utilIp90d > 0} />
        <IdCol label="Continuity" align="right" lines={[data.continuityLast && `Last: ${data.continuityLast}`, data.continuityNext && `Next: ${data.continuityNext}`]} />
      </div>

      {/* Header chips */}
      {data.headerChips.length > 0 && (
        <div className={styles.chips}>
          {data.headerChips.map((c, i) => (
            <Badge key={i} tone={CHIP_TONE[c.tone] || 'grey'} size="M" label={c.label} />
          ))}
        </div>
      )}

      <div className={styles.columns}>
        <div className={styles.mainCol}>
          <div className={styles.section}>
            <SectionLabel>Snapshot</SectionLabel>
            <div className={styles.tiles}>
              <Tile label="Days since discharge" value={data.daysSinceDischarge} sub={data.dischargeLabel} />
              <Tile label="Risk" value={data.riskTier} valueTone="error" sub={`RAF ${data.riskRaf}`} />
              <Tile label="Program minutes" value={`${data.programMinutes} / ${data.programMinutesThreshold}`} sub={data.thresholdLabel} />
              <Tile label="Open tasks" value={data.openTasks} sub="Overdue risk · 4h left" subTone="error" />
            </div>
            {data.adherence != null && (
              <div className={styles.adherenceCard}>
                <span className={styles.tileLabel}>Adherence</span>
                <div className={styles.adherenceValueRow}>
                  <span className={[styles.adhDot, styles[`adh_${band}`]].join(' ')} />
                  <span className={styles.adherenceValue}>{data.adherence}</span>
                </div>
                <span className={[styles.tileSub, band === 'risk' ? styles.tileSubBad : ''].filter(Boolean).join(' ')}>
                  {band === 'good' ? 'On track' : band === 'watch' ? 'Slipping' : 'Off plan'}
                </span>
              </div>
            )}
          </div>

          <div className={styles.section}>
            <SectionLabel>Programs</SectionLabel>
            <div className={styles.programs}>
              {data.programs.map((p) => <ProgramCard key={p.code} program={p} onAction={soon} />)}
            </div>
          </div>

          {data.timeline.length > 0 && (
            <div className={styles.section}>
              <div className={styles.timeline}>
                <div className={styles.timelineHead}>
                  <Icon name="solar:magic-stick-3-linear" size={13} />
                  Since you last spoke · last touch 12 days ago
                </div>
                {data.timeline.map((t, i) => (
                  <div key={i} className={styles.timelineItem}>
                    <span className={styles.timelineText}>{t.text}</span>
                    {t.source && <Badge tone="ghost" size="S" label={t.source} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.story?.length > 0 && <StorySection events={data.story} />}
        </div>

        {/* Right rail */}
        <div className={styles.rail}>
          <Button variant="primary" onClick={() => soon('Start touch')}>
            <Icon name="solar:phone-calling-linear" size={14} />
            Start touch
          </Button>
          <Button variant="secondary" onClick={() => soon('Care plan')}>
            <Icon name="solar:clipboard-list-linear" size={14} />
            Open care plan
          </Button>
          <Link className={styles.railLink} onClick={() => soon('EHR summary')}>
            <Icon name="solar:document-add-linear" size={14} />
            Build EHR summary
          </Link>

          <RailGroup label="Open tasks">
            {data.tasks.map((t, i) => (
              <RailCard key={i} accent={t.tone}>
                <span className={styles.railCardTitle}>{t.title}</span>
                {t.sub && <span className={styles.railCardSub}>{t.sub}</span>}
              </RailCard>
            ))}
          </RailGroup>

          <RailGroup label="Active goals">
            {data.goals.map((g, i) => (
              <RailCard key={i}>
                <span className={styles.railCardBody}>“{g.text}”</span>
                {g.conf && <span className={styles.railCardMeta}>conf {g.conf}</span>}
              </RailCard>
            ))}
          </RailGroup>

          <RailGroup label="Care gaps">
            {data.gaps.map((g, i) => (
              <div key={i} className={styles.railGapRow}>
                <Icon name="solar:checklist-minimalistic-linear" size={14} />
                <span className={styles.railCardTitle}>{g.label}</span>
                <span className={styles.railGapMeta}>{g.meta}</span>
              </div>
            ))}
          </RailGroup>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className={styles.sectionLabel}>{children}</div>;
}

function IdCol({ label, lines, children, align, flagged }) {
  return (
    <div className={[styles.idCol, align === 'right' ? styles.idColRight : ''].filter(Boolean).join(' ')}>
      <span className={styles.idColLabel}>{label}</span>
      {children ? (
        <span className={styles.idColValue}>{children}</span>
      ) : (
        (lines || []).filter(Boolean).map((l, i) => (
          <span key={i} className={i === 0 ? styles.idColValue : styles.idColSub}>
            {flagged && i === 0 && <Icon name="solar:flag-linear" size={12} className={styles.flag} />}
            {l}
          </span>
        ))
      )}
    </div>
  );
}

function Tile({ label, value, sub, valueTone, subTone }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={[styles.tileValue, valueTone === 'error' ? styles.tileValueBad : ''].filter(Boolean).join(' ')}>{value}</span>
      {sub && <span className={[styles.tileSub, subTone === 'error' ? styles.tileSubBad : ''].filter(Boolean).join(' ')}>{sub}</span>}
    </div>
  );
}

function RailGroup({ label, children }) {
  return (
    <div className={styles.railGroup}>
      <div className={styles.railGroupLabel}>{label}</div>
      {children}
    </div>
  );
}

function RailCard({ children, accent }) {
  return (
    <div className={[styles.railCard, styles.railCardStack, accent ? styles[`rt_${accent}`] : ''].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

function storyIconStyle(event) {
  const toneKey = event.iconTone || STORY_CATEGORY[event.category]?.iconTone || 'grey';
  return STORY_ICON_TONE[toneKey] || STORY_ICON_TONE.grey;
}

function StorySection({ events }) {
  const [filter, setFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({});

  const visible = useMemo(
    () => (filter === 'all' ? events : events.filter((e) => e.category === filter)),
    [events, filter],
  );

  return (
    <div className={styles.story}>
      <div className={styles.storyHead}>
        <SectionLabel>Story</SectionLabel>
        <Toggle
          className={styles.storyFilters}
          size="S"
          items={STORY_FILTERS}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {visible.length === 0 ? (
        <p className={styles.storyEmpty}>No story events in this category.</p>
      ) : (
        <div className={styles.storyList}>
          {visible.map((event, rowIndex) => {
            const cat = STORY_CATEGORY[event.category] || STORY_CATEGORY.clinical;
            const iconCfg = storyIconStyle(event);
            const iconName = event.icon || cat.icon;
            const rowKey = `${event.at}-${event.title}`;
            const isCollapsed = collapsed[rowKey] === true;

            return (
              <div key={rowKey} className={styles.storyRow}>
                <time className={styles.storyTime}>{event.at}</time>
                <div className={styles.storySpineCol}>
                  <span className={rowIndex === 0 ? styles.storySpineStart : styles.storySpineLine} />
                  <span
                    className={styles.storyIcon}
                    style={{ background: iconCfg.bg, borderColor: iconCfg.border, color: iconCfg.color }}
                  >
                    <Icon name={iconName} size={14} />
                  </span>
                  <span className={rowIndex === visible.length - 1 ? styles.storySpineEnd : styles.storySpineLineGrow} />
                </div>
                <div className={styles.storyCard}>
                  <div className={styles.storyCardHead}>
                    <span className={styles.storyCardTitle}>{event.title}</span>
                    <Badge tone={cat.tone} size="S" label={cat.label} />
                    <button
                      type="button"
                      className={styles.storyToggle}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? 'Expand story event' : 'Collapse story event'}
                      onClick={() => setCollapsed((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                    >
                      <Icon
                        name="solar:alt-arrow-down-linear"
                        size={14}
                        className={isCollapsed ? styles.storyChevronCollapsed : styles.storyChevron}
                      />
                    </button>
                  </div>
                  {!isCollapsed && event.body && (
                    <p className={styles.storyCardBody}>{event.body}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/Button/Button';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { Avatar } from '../../../components/Avatar/Avatar';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { TabStrip } from '../../../components/TabStrip/TabStrip';
import { Link } from '../../../components/Link/Link';
import { CardSkeleton } from '../../../components/CardSkeleton/CardSkeleton';
import { toast } from '../../../components/Toast/sonnerToast';
import { NBA_ITEMS, PANEL_TODAY } from './nbaData';
import styles from './TodayView.module.css';

// The four Panel Pulse buckets, in display order. `match` maps a card to the
// feed rows it filters to; `accent` picks the number + border color token.
const PULSE = [
  { key: 'overdue',   title: 'Overdue',               accent: 'overdue',   match: (it) => it.urgency === 'overdue' },
  { key: 'due-today', title: 'Due Today',             accent: 'dueToday',  match: (it) => it.urgency === 'due-today' },
  { key: 'escalated', title: 'Agent-Escalated to Me', accent: 'escalated', match: (it) => it.isAgent },
  { key: 'threshold', title: 'Threshold-Risk',        accent: 'threshold', match: (it) => it.urgency === 'threshold' },
];

const LENS = ['All', 'CCM', 'TCM', 'BHI', 'AWV', 'DM'];
const LENS_TABS = LENS.map((p) => ({ key: p, label: p }));

const RISK_TONE = { High: 'error', Rising: 'warning', Moderate: 'info' };

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function firstName(name) {
  return name.split(' ').filter(Boolean)[0] || name;
}

// "James Whitfield" → "James W." for the Start next button.
function shortName(name) {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// Bind each clinical scenario to a real patient from all_patients (adults, for
// a plausible care-management panel). Falls back to the scenario's own identity
// only until the patient database loads. `patientId` is the real profile id.
function bindScenarios(scenarios, patients) {
  const pool = (patients || [])
    .filter((p) => (p.age ?? 0) >= 40 && p.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return scenarios.map((sc, i) => {
    const p = pool[i];
    const name = p?.name || sc.fallbackName;
    return {
      ...sc,
      patientId: p?.id || null,
      patientName: name,
      age: p?.age ?? sc.fallbackAge,
      payer: p?.coverageType || sc.fallbackPayer,
      provider: p?.pcp || sc.fallbackProvider,
      reason: sc.reason.replace('{first}', firstName(name)),
    };
  });
}

// Left-accent: overdue rows read red, High/Rising rows amber, the rest flat.
function accentClass(item) {
  if (item.urgency === 'overdue') return styles.accOverdue;
  if (item.riskTier === 'High' || item.riskTier === 'Rising') return styles.accWatch;
  return '';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function PulseCard({ card, count, active, onClick }) {
  return (
    <button
      type="button"
      className={[styles.pulseCard, active ? styles.pulseActive : ''].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={[styles.pulseNum, styles[`num_${card.accent}`]].join(' ')}>{count}</span>
      <span className={styles.pulseTitleRow}>
        {card.key === 'escalated' && <Icon name="solar:magic-stick-3-linear" size={13} />}
        <span className={styles.pulseTitle}>{card.title}</span>
      </span>
      <span className={styles.pulseCaption}>{PANEL_TODAY.pulse[card.key].caption}</span>
    </button>
  );
}

function AdherenceCard({ onOpen }) {
  const { total, onTrack, slipping, offPlan } = PANEL_TODAY.adherence;
  const pct = (n) => `${(n / total) * 100}%`;
  return (
    <div className={styles.adherence}>
      <div className={styles.adherenceHead}>
        <span className={styles.adherenceTitle}>Panel Adherence</span>
        <span className={styles.adherenceTotal}>{total} patients</span>
      </div>
      <div className={styles.stack} role="img" aria-label={`${onTrack} on track, ${slipping} slipping, ${offPlan} off plan`}>
        <span className={styles.segOnTrack} style={{ width: pct(onTrack) }} />
        <span className={styles.segSlipping} style={{ width: pct(slipping) }} />
        <span className={styles.segOffPlan} style={{ width: pct(offPlan) }} />
      </div>
      <div className={styles.adherenceLegend}>
        <span className={styles.legendItem}><span className={[styles.legendDot, styles.dotOnTrack].join(' ')} />{onTrack} on track</span>
        <span className={styles.legendItem}><span className={[styles.legendDot, styles.dotSlipping].join(' ')} />{slipping} slipping</span>
        <span className={styles.legendItem}><span className={[styles.legendDot, styles.dotOffPlan].join(' ')} />{offPlan} off plan</span>
        <Link className={styles.panelHealthLink} onClick={onOpen}>
          Panel Health <Icon name="solar:arrow-right-linear" size={13} />
        </Link>
      </div>
    </div>
  );
}

function NbaRow({ item, onSnooze, onSoon, onOpen }) {
  const open = () => onOpen(item);
  return (
    <div className={[styles.row, accentClass(item)].filter(Boolean).join(' ')}>
      <div className={styles.identity}>
        <Avatar type="initial" variant="patient" size="M" initials={initials(item.patientName)} />
        <div className={styles.idText}>
          <div className={styles.nameRow}>
            <button type="button" className={styles.name} onClick={open}>{item.patientName}</button>
            <span className={styles.age}>{item.age}</span>
          </div>
          <div className={styles.subline}>{item.payer} · {item.provider}</div>
          <div className={styles.programs}>
            {item.programs.map((p) => <Badge key={p} tone="grey" size="S" label={p} />)}
          </div>
        </div>
      </div>

      <div className={styles.center}>
        {item.isAgent && (
          <div className={styles.agentChip}>
            <Icon name="solar:magic-stick-3-linear" size={12} />
            <span className={styles.agentName}>{item.agentName} · Unity agent</span>
            {item.agentStatus && <span className={styles.agentStatus}>· {item.agentStatus}</span>}
          </div>
        )}
        <div className={styles.reasonLine}>
          <Icon name={item.reasonIcon || 'solar:info-circle-linear'} size={15} className={styles.reasonIcon} />
          <span className={styles.reason}>{item.reason}</span>
        </div>
        <Link className={styles.suggestedLink} onClick={open}>
          <Icon name="solar:arrow-right-linear" size={13} />
          {item.suggestedAction}
        </Link>
      </div>

      <div className={styles.right}>
        <Badge tone={RISK_TONE[item.riskTier] || 'grey'} size="M" label={item.riskTier} />
        <div className={styles.actionBtns}>
          <ActionButton size="S" icon="solar:phone-calling-linear" tooltip="Call" onClick={() => onSoon('Call')} />
          <ActionButton size="S" icon="solar:chat-round-linear" tooltip="Text" onClick={() => onSoon('Text')} />
          <ActionButton size="S" icon="solar:alarm-linear" tooltip="Snooze" onClick={() => onSnooze(item)} />
          <ActionButton size="S" icon="solar:users-group-rounded-linear" tooltip="Reassign" onClick={() => onSoon('Reassign')} />
        </div>
      </div>
    </div>
  );
}

export function TodayView() {
  const allPatients = useAppStore((s) => s.allPatients);
  const patientsLoading = useAppStore((s) => s.allPatientsLoading);
  const fetchAllPatients = useAppStore((s) => s.fetchAllPatients);
  const navigateToPatient = useAppStore((s) => s.navigateToPatient);
  const userName = useAppStore((s) => s.currentUserProfile?.name);

  const [pulse, setPulse] = useState(null);   // active Panel Pulse bucket
  const [lens, setLens] = useState('All');     // program lens
  const [dismissed, setDismissed] = useState(() => new Set()); // snoozed row ids

  useEffect(() => { fetchAllPatients(); }, [fetchAllPatients]);

  const greetName = (userName || '').trim().split(/\s+/)[0] || 'there';
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    [],
  );

  // Bind the clinical scenarios to real patients, then apply the snooze set.
  const rows = useMemo(
    () => bindScenarios(NBA_ITEMS, allPatients).filter((r) => !dismissed.has(r.id)),
    [allPatients, dismissed],
  );

  const filtered = useMemo(() => rows.filter((it) => {
    if (lens !== 'All' && !it.programs.includes(lens)) return false;
    if (pulse) {
      const card = PULSE.find((p) => p.key === pulse);
      if (card && !card.match(it)) return false;
    }
    return true;
  }), [rows, pulse, lens]);

  const openPatient = (item) => {
    if (item.patientId) navigateToPatient(item.patientId, { profileTab: 'Monitoring' });
    else toast('Patient profile is still loading.');
  };
  const onSoon = (what) => toast(`${what} opens in Touch Mode. Coming soon.`);
  const onSnooze = (item) => setDismissed((prev) => new Set(prev).add(item.id));
  const startRow = rows[0];
  const startName = startRow ? shortName(startRow.patientName) : null;
  // Show skeletons only on the very first load, before the patient list arrives.
  const showSkeleton = patientsLoading && allPatients.length === 0;

  return (
    <div className={styles.today}>
      {/* Header strip */}
      <div className={styles.header}>
        <div className={styles.greetBlock}>
          <span className={styles.date}>{dateLabel}</span>
          <h1 className={styles.greet}>{greeting()}, {greetName}</h1>
        </div>
        <div className={styles.headStats}>
          <div className={styles.hStat}>
            <span className={styles.hLabel}>Touches</span>
            <span className={styles.hValue}><b>{PANEL_TODAY.touchesDone}</b> of {PANEL_TODAY.touchesPlanned} planned</span>
          </div>
          <div className={styles.hStat}>
            <span className={styles.hLabel}>Minutes today</span>
            <span className={styles.hValue}>
              <b>{PANEL_TODAY.minutesTotal}</b> {PANEL_TODAY.minutesByProgram.map(([p, m], i) => (
                <span key={p}>{i > 0 ? ' · ' : ''}{p} {m}</span>
              ))}
            </span>
          </div>
          <div className={styles.hStat}>
            <span className={styles.hLabel}>At threshold</span>
            <span className={styles.hValue}><b className={styles.good}>{PANEL_TODAY.atThreshold}</b> patients this month</span>
          </div>
          <div className={styles.hStat}>
            <span className={styles.hLabel}>Overdue</span>
            <span className={styles.hValue}><b className={styles.bad}>{PANEL_TODAY.overdue}</b> TCM contact</span>
          </div>
        </div>
        {startName && (
          <Button variant="primary" onClick={() => openPatient(startRow)}>
            Start next: {startName}
            <Icon name="solar:arrow-right-linear" size={14} />
          </Button>
        )}
      </div>

      {/* Panel Pulse + adherence */}
      <div className={styles.pulse}>
        {PULSE.map((card) => (
          <PulseCard
            key={card.key}
            card={card}
            count={PANEL_TODAY.pulse[card.key].count}
            active={pulse === card.key}
            onClick={() => setPulse((cur) => (cur === card.key ? null : card.key))}
          />
        ))}
        <AdherenceCard onOpen={() => onSoon('Panel Health')} />
      </div>

      {/* Program lens — standard app tab bar */}
      <TabStrip items={LENS_TABS} activeKey={lens} onChange={setLens} fullWidth={false} />

      {/* Feed */}
      {showSkeleton ? (
        <div className={styles.feed}><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="solar:check-circle-linear" size={28} />
          <p className={styles.emptyTitle}>Queue clear.</p>
          <p className={styles.emptyBody}>No actions match this filter right now. Nice work.</p>
        </div>
      ) : (
        <div className={styles.feed}>
          {filtered.map((it) => (
            <NbaRow key={it.id} item={it} onSnooze={onSnooze} onSoon={onSoon} onOpen={openPatient} />
          ))}
        </div>
      )}
    </div>
  );
}

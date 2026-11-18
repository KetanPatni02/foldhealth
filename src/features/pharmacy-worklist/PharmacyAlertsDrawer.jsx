import { useMemo, useState } from 'react';
import { Button } from '../../components/Button/Button';
import { Drawer } from '../../components/Drawer/Drawer';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { Input } from '../../components/Input/Input';
import { Link } from '../../components/Link/Link';
import { Select } from '../../components/Select/Select';
import { Switch } from '../../components/Switch/Switch';
import { Tabs } from '../../components/Tabs/Tabs';
import { toast } from '../../components/Toast/sonnerToast';
import { useAppStore } from '../../store/useAppStore';
import { ALERT_OUTCOMES, daysLeftText, programConfig } from './programAutomation';
import styles from './PharmacyAlertsDrawer.module.css';

const OUTCOME_OPTIONS = ALERT_OUTCOMES.map(o => ({ value: o, label: o }));

// The manager's view of deadline alerts (Ajay): every alert the worklist
// raised, who it went to, and what came of it (Accepted, Approved,
// Disapproved, Ignored). `alerts`: deadlineAlerts(...). `onOpenMember(id)`.
function AlertsTable({ alerts, onOpenMember }) {
  const setOutcome = useAppStore(s => s.setPharmacyAlertOutcome);
  const [outcomes, setOutcomes] = useState([]);
  const [sentTo, setSentTo] = useState([]);
  const people = useMemo(() => [...new Set(alerts.map(a => a.to).filter(Boolean))].sort(), [alerts]);
  const kept = alerts.filter(a => (!outcomes.length || outcomes.includes(a.outcome)) && (!sentTo.length || sentTo.includes(a.to)));
  const filtered = outcomes.length > 0 || sentTo.length > 0;
  if (!alerts.length) {
    return <EmptyState icon="solar:bell-linear" title="No deadline alerts" description="A savable gap close to failing raises an alert to whoever last worked it." />;
  }
  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        <FilterChip label="Outcome" options={ALERT_OUTCOMES} selected={outcomes} onChange={setOutcomes} />
        <FilterChip label="Sent To" searchable options={people} selected={sentTo} onChange={setSentTo} />
        {filtered && <Link variant="secondary" onClick={() => { setOutcomes([]); setSentTo([]); }}>Clear All</Link>}
      </div>
      <div className={styles.table} role="table" aria-label="Deadline alerts">
        <div className={`${styles.row} ${styles.head}`} role="row">
          <span role="columnheader">Member</span>
          <span role="columnheader">Alert</span>
          <span role="columnheader">Sent To</span>
          <span role="columnheader">Outcome</span>
        </div>
        {kept.map(a => (
          <div key={`${a.memberId}|${a.key}`} className={styles.row} role="row">
            <span className={styles.cell} role="cell">
              <Link onClick={() => onOpenMember(a.memberId, a.code)}>{a.member}</Link>
              <span className={styles.sub}>{a.code}</span>
            </span>
            <span className={styles.cell} role="cell">
              <span>{a.kind === 'escalation' ? 'Escalated' : 'Deadline'}</span>
              <span className={a.daysLeft <= 5 ? styles.subAlert : styles.sub}>{`${daysLeftText(a.daysLeft)}${a.failDate ? ` · fails ${a.failDate}` : ''}`}</span>
            </span>
            <span className={styles.cell} role="cell">
              <span>{a.to || 'Unassigned'}</span>
              <span className={styles.sub}>{a.role}</span>
            </span>
            <span className={styles.cell} role="cell">
              <Select size="sm" portal options={OUTCOME_OPTIONS} value={a.outcome} onValueChange={v => setOutcome(a.memberId, a.key, v)} aria-label={`Outcome for ${a.member} ${a.code}`} />
              {a.outcomeBy && <span className={styles.sub}>{a.outcomeBy}</span>}
            </span>
          </div>
        ))}
        {!kept.length && <span className={styles.none}>No alerts match these filters.</span>}
      </div>
    </div>
  );
}

// Program settings (Ajay): when reminders go out, when alerts fire, and the
// holiday and flu season windows. Saved for the organization.
function SettingsForm({ draft, setDraft }) {
  const num = (key, label) => (
    <Input
      type="number"
      label={label}
      trailingText="days"
      trailingTextSegment
      min={1}
      value={String(draft[key])}
      onChange={e => setDraft(d => ({ ...d, [key]: Math.max(1, Number(e.target.value) || 1) }))}
    />
  );
  return (
    <div className={styles.form}>
      <section className={styles.section}>
        <span className={styles.sectionTitle}>Refill reminder</span>
        {num('reminderDays', 'Days before the next fill is due')}
      </section>
      <section className={styles.section}>
        <span className={styles.sectionTitle}>Deadline alerts</span>
        <div className={styles.pair}>
          {num('alertDays', 'Alert the last worker at')}
          {num('escalateDays', 'Escalate to the manager at')}
        </div>
        <Input label="Manager" placeholder="Manager" value={draft.managerName || ''} onChange={e => setDraft(d => ({ ...d, managerName: e.target.value || null }))} />
        <Switch checked={draft.highPriorityOnly} onChange={on => setDraft(d => ({ ...d, highPriorityOnly: on }))} label="High priority (P1) members only" />
      </section>
      <section className={styles.section}>
        <span className={styles.sectionTitle}>Early refill</span>
        {num('holidayWindowDays', 'Days before an organization holiday')}
        <Switch checked={draft.fluSeasonOn} onChange={on => setDraft(d => ({ ...d, fluSeasonOn: on }))} label="Flu season" />
        {draft.fluSeasonOn && (
          <div className={styles.pair}>
            <Input label="Starts (MM/DD)" value={draft.fluSeason.start} onChange={e => setDraft(d => ({ ...d, fluSeason: { ...d.fluSeason, start: e.target.value } }))} />
            <Input label="Ends (MM/DD)" value={draft.fluSeason.end} onChange={e => setDraft(d => ({ ...d, fluSeason: { ...d.fluSeason, end: e.target.value } }))} />
          </div>
        )}
      </section>
    </div>
  );
}

export function PharmacyAlertsDrawer({ alerts, onOpenMember, onClose }) {
  const saved = useAppStore(s => s.pharmacyProgramConfig);
  const save = useAppStore(s => s.savePharmacyProgramConfig);
  const [tab, setTab] = useState('alerts');
  const [draft, setDraft] = useState(() => programConfig(saved));
  const dirty = JSON.stringify(draft) !== JSON.stringify(programConfig(saved));
  const onSave = async () => {
    const res = await save(draft);
    if (res.ok) toast.success('Program settings saved');
    else toast.error(`Could not save: ${res.error}`);
  };
  return (
    <Drawer
      title="Deadline Alerts"
      onClose={onClose}
      width={700}
      primaryAction={tab === 'settings' ? <Button disabled={!dirty} onClick={onSave}>Save</Button> : null}
    >
      <Tabs
        items={[{ key: 'alerts', label: `Alerts (${alerts.length})` }, { key: 'settings', label: 'Settings' }]}
        value={tab}
        onValueChange={setTab}
        fullWidth={false}
        size="sm"
      />
      <div className={styles.body}>
        {tab === 'alerts' ? <AlertsTable alerts={alerts} onOpenMember={onOpenMember} /> : <SettingsForm draft={draft} setDraft={setDraft} />}
      </div>
    </Drawer>
  );
}

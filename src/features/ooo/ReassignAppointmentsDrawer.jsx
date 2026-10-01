import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Select } from '../../components/Select/Select';
import { TabStrip } from '../../components/TabStrip/TabStrip';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { Link } from '../../components/Link/Link';
import { AddIconMinimalist } from '../../components/Icon/AddIconMinimalist';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { useAppStore } from '../../store/useAppStore';
import { OooReassignFooter, ReassignmentType, ReassignProviders } from './OooReassignStep';
import { ReassignPlanner } from './ReassignPlanner';
import { ReassignHistory } from './ReassignHistory';
import { reassignWindow, scopeAppointments, tallyPlan } from './reassignUtils';
import { toast } from '../../components/Toast/sonnerToast';
import { canEdit, describeRange, OOO_ICON, oooStatus, recordsFor, sortRecords, STATUS_TONE } from './oooUtils';
import styles from './ooo.module.css';

const TABS = [
  { key: 'reassign', label: 'Reassign Appointments' },
  { key: 'history', label: 'History' },
];

/**
 * Reassign Appointments (Figma Eventus 17574:114531): pick whose
 * appointments, why (out of office, permanent, or a one-time start and
 * end), then plan which ones move to which covering provider and which are
 * cancelled. Nothing changes until Confirm, which runs the plan as a
 * reassignment job; its summary arrives as a notification. History lists
 * past jobs.
 *
 * @param {object}   props
 * @param {{ name: string }[]} props.users
 * @param {string}   [props.initialUser]   – Preselected "Reassign From"
 * @param {string}   [props.initialRecordId] – Preselected period (else the provider's latest)
 * @param {function} props.onNewOoo        – (userName) => void, "+ New Out of Office"
 * @param {function} props.onClose
 */
export function ReassignAppointmentsDrawer({ users, initialUser, initialRecordId, onNewOoo, onClose }) {
  const oooRecords = useAppStore(s => s.oooRecords);
  const [tab, setTab] = useState('reassign');
  // The preselected provider is always in the list, even before everyone
  // has loaded, so Reassign From never shows blank.
  const fromOptions = useMemo(() => {
    const names = (users || []).map(u => u.name);
    if (initialUser && !names.includes(initialUser)) names.unshift(initialUser);
    return names.map(n => ({ value: n, label: n }));
  }, [users, initialUser]);
  const [from, setFrom] = useState(initialUser || '');
  const [type, setType] = useState('ooo');
  // Picked by default: the provider's latest period, i.e. the ongoing one,
  // else the next upcoming (the list's own order). Still changeable.
  const latestFor = (name) => (name ? sortRecords(recordsFor(oooRecords, name).filter(r => canEdit(r)))[0]?.id || '' : '');
  const [recordId, setRecordId] = useState(() => initialRecordId || latestFor(initialUser));
  const [range, setRange] = useState({ startAt: null, endAt: null }); // One-time
  const [plan, setPlan] = useState({});
  const [running, setRunning] = useState(false);

  const appointments = useAppStore(s => s.appointments);
  const fetchAppointments = useAppStore(s => s.fetchAppointments);
  const fetchPracticeLocations = useAppStore(s => s.fetchPracticeLocations);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  const platformUsers = useAppStore(s => s.platformUsers);
  const runJob = useAppStore(s => s.runReassignmentJob);
  useEffect(() => {
    fetchAppointments?.();
    fetchPracticeLocations?.();
    fetchPlatformUsers?.();
  }, [fetchAppointments, fetchPracticeLocations, fetchPlatformUsers]);

  // What the plan covers: the provider's upcoming appointments in the window.
  const record = oooRecords.find(r => r.id === recordId);
  const timeWindow = useMemo(
    () => (from ? reassignWindow({ type, record, startAt: range.startAt, endAt: range.endAt }) : null),
    [from, type, record, range.startAt, range.endAt],
  );
  const scope = useMemo(() => scopeAppointments(appointments, from, timeWindow), [appointments, from, timeWindow]);
  // A different provider, type or window is a different plan.
  const scopeKey = `${from}|${type}|${timeWindow?.from}|${timeWindow?.to}`;
  const [planKey, setPlanKey] = useState(scopeKey);
  if (planKey !== scopeKey) { setPlanKey(scopeKey); setPlan({}); }
  const tally = tallyPlan(plan, scope);
  const planned = tally.reassigning + tally.cancelling;

  const confirm = async () => {
    if (!planned || running) return;
    setRunning(true);
    const fromRole = (platformUsers || []).find(u => u.name === from)?.clinicalRoles?.[0] || null;
    // The job runs in the background; its summary comes as a notification.
    toast.success('Reassignment started. You\'ll get a notification with the summary.');
    onClose();
    await runJob({ fromUser: from, fromUserRole: fromRole, type, window: timeWindow, oooRecordId: type === 'ooo' ? recordId : null, plan, appointments: scope });
  };

  // The provider's current and upcoming records; past ones have nothing
  // left to reassign.
  const recordOptions = useMemo(() => sortRecords(recordsFor(oooRecords, from).filter(r => canEdit(r)))
    .map((r) => {
      const status = oooStatus(r);
      const { span, length } = describeRange(r.startAt, r.endAt);
      return {
        value: r.id,
        // Like the user pickers: a grey OOO tile, the dates over how long,
        // and the status on the right.
        label: (
          <span className={styles.recordOption}>
            <Avatar type="icon" variant="others" iconName={OOO_ICON} size="M" className={styles.recordAvatar} />
            <span className={styles.recordOptionText}>
              <span className={styles.recordOptionHead}>{span}</span>
              <span className={styles.recordOptionSub}>{length}</span>
            </span>
            <Badge tone={STATUS_TONE[status]} size="S" label={status} />
          </span>
        ),
        triggerLabel: `${span} • ${length}`,
        searchText: span,
      };
    }),
  [oooRecords, from]);

  const headerRight = (
    <>
      <Button variant="primary" size="L" disabled={!planned || running} onClick={confirm}>Confirm</Button>
      <span className={styles.headerDivider} aria-hidden="true" />
    </>
  );

  return (
    <Drawer
      title="Reassign Appointments"
      width={640}
      onClose={onClose}
      headerRight={headerRight}
      noCloseDivider
      // The banner slot is already full-bleed, so the strip mustn't bleed again.
      banner={<TabStrip items={TABS} activeKey={tab} onChange={setTab} fullWidth={false} />}
      footer={tab === 'reassign' ? <OooReassignFooter {...tally} /> : undefined}
    >
      {tab === 'history' ? (
        <ReassignHistory />
      ) : (
        <div className={`${styles.form} ${styles.reassignForm}`}>
          <Select
            label="Reassign From"
            required
            portal
            searchable
            placeholder="Select a provider"
            options={fromOptions}
            value={from || undefined}
            onChange={(name) => { setFrom(name); setRecordId(latestFor(name)); }}
          />

          <ReassignmentType
            type={type}
            onTypeChange={setType}
            range={range}
            onRangeChange={setRange}
            oooField={(
              <>
                {/* Disabled until there's a provider; the tooltip says why. */}
                <Tooltip label={from ? '' : 'Please select a provider to select an Out of Office Period'} className={styles.recordPickerTip} followCursor maxWidth={240}>
                  <Select
                    label="Out of Office Period"
                    portal
                    placeholder="Select Out of Office Period"
                    options={recordOptions}
                    value={recordId || undefined}
                    onChange={setRecordId}
                    disabled={!from}
                    // A provider with nothing to pick opens to this
                    // (Figma Mar-Present 3961:41376), which adds one.
                    emptyText={(
                      <span className={styles.recordEmpty}>
                        <RingEmptyState size="S" icon={OOO_ICON} label="No out of office records present for this user">
                          <Link
                            className={styles.newRecordLink}
                            role="button"
                            tabIndex={0}
                            onClick={() => onNewOoo(from)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNewOoo(from); } }}
                          >
                            <AddIconMinimalist size={12} color="currentColor" />
                            Add New
                          </Link>
                        </RingEmptyState>
                      </span>
                    )}
                  />
                </Tooltip>
                <span>
                  <Link
                    className={styles.newRecordLink}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNewOoo(from)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNewOoo(from); } }}
                  >
                    <AddIconMinimalist size={12} color="currentColor" />
                    New Out of Office
                  </Link>
                </span>
              </>
            )}
          />

          {/* Nothing to list until we know whose appointments, and for
              out of office, which record's dates; for one-time, which dates. */}
          {from && timeWindow
            ? <ReassignPlanner key={scopeKey} appointments={scope} awayUser={from} timeWindow={timeWindow} plan={plan} onPlan={setPlan} />
            : <ReassignProviders hasProvider={!!from} />}
        </div>
      )}
    </Drawer>
  );
}

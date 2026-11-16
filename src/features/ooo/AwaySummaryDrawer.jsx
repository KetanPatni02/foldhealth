import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Avatar } from '../../components/Avatar/Avatar';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Badge } from '../../components/Badge/Badge';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import { Tabs } from '../../components/Tabs/Tabs';
import { CollapseAllIcon } from '../../components/Icon/CollapseAllIcon';
import { ExpandAllIcon } from '../../components/Icon/ExpandAllIcon';
import { useAppStore } from '../../store/useAppStore';
import { formatDate, initialsOf } from './oooUtils';
import { PROGRAM_SHAPE, TASK_SHAPE } from './openWorkRows';
import { ApptRow, DeptGroup } from './ReassignParts';
import { awayItems, loadAwayMessages, loadProgramsNow } from './awaySummary';
import styles from './reassign.module.css';
import ooo from './ooo.module.css';

const KINDS = [
  { key: 'appointment', label: 'Appointments', noun: 'Appointment' },
  { key: 'task', label: 'Tasks', noun: 'Task' },
  { key: 'program', label: 'Care Programs', noun: 'Program' },
];
const CHANNEL_LABELS = { sms: 'SMS', chat: 'Chat', email: 'Email', call: 'Call' };
const STATES = [
  { key: 'completed', label: 'Completed' },
  { key: 'open', label: 'Still Open' },
  { key: 'cancelled', label: 'Cancelled' },
];

/**
 * While You Were Away: what the covering providers did with the user's work
 * during their Out of Office (opens from "Welcome back"). The reassigned
 * appointments, tasks and care programs as they stand now, completed or
 * still open, grouped by the covering provider who has them; and the
 * patients who wrote, with who on the care team replied.
 *
 * @param {object}   props
 * @param {string}   props.jobId     – the Out of Office reassignment from this user
 * @param {string}   [props.recordId] – their Out of Office record (dates, cover)
 * @param {function} props.onClose
 */
export function AwaySummaryDrawer({ jobId, recordId, onClose }) {
  const jobs = useAppStore(s => s.reassignmentJobs);
  const records = useAppStore(s => s.oooRecords);
  const tasks = useAppStore(s => s.tasks);
  const appointments = useAppStore(s => s.appointments);
  const me = useAppStore(s => s.currentUserProfile);
  const goToComms = useAppStore(s => s.goToComms);
  const job = jobs.find(j => j.id === jobId);
  const record = records.find(r => r.id === (recordId || job?.oooRecordId));
  const from = record?.startAt || job?.windowStart;
  const to = record?.endAt || job?.windowEnd;

  useEffect(() => {
    const st = useAppStore.getState();
    st.fetchReassignmentJobs?.();
    st.fetchOooRecords?.();
    st.fetchTasks?.();
    st.fetchAppointments?.();
  }, []);

  const programIds = useMemo(() => (job?.results || []).filter(r => r.programId).map(r => r.programId), [job]);
  const [programsById, setProgramsById] = useState(null);
  const [messages, setMessages] = useState(null);
  useEffect(() => {
    let live = true;
    loadProgramsNow(programIds).then(m => live && setProgramsById(m), () => live && setProgramsById(new Map()));
    return () => { live = false; };
  }, [programIds]);
  useEffect(() => {
    let live = true;
    loadAwayMessages({ me, from, to }).then(m => live && setMessages(m), () => live && setMessages({ autoReplies: 0, threads: [] }));
    return () => { live = false; };
  }, [me, from, to]);

  const { items, counts } = useMemo(() => awayItems(job, {
    tasksById: new Map((tasks || []).map(t => [String(t.id), t])),
    apptsById: new Map((appointments || []).map(a => [String(a.id), a])),
    programsById: programsById || new Map(),
  }), [job, tasks, appointments, programsById]);

  const threads = messages?.threads || [];
  const tabs = [
    ...KINDS.filter(k => items.some(i => i.kind === k.key)).map(k => ({ ...k, count: items.filter(i => i.kind === k.key).length })),
    ...(threads.length ? [{ key: 'messages', label: 'Messages', count: threads.length }] : []),
  ];
  const [tabKey, setTabKey] = useState(null);
  const tab = tabs.find(t => t.key === tabKey) || tabs[0];
  const ofKind = tab && tab.key !== 'messages' ? items.filter(i => i.kind === tab.key) : [];
  const states = STATES.filter(s => s.key !== 'cancelled' || ofKind.some(i => i.now === 'cancelled'));
  // Opens on the first state that has something (Completed, else Still Open).
  const [stateKey, setStateKey] = useState(null);
  const state = states.find(s => s.key === stateKey)
    || states.find(s => ofKind.some(i => i.now === s.key)) || states[0];
  const [view, setView] = useState(null);
  // By the covering provider who has them.
  const byCover = new Map();
  ofKind.filter(i => i.now === state.key).forEach((i) => {
    const k = i.to || 'Unassigned';
    if (!byCover.has(k)) byCover.set(k, []);
    byCover.get(k).push(i);
  });
  const groups = [...byCover.entries()].sort(([a], [b]) => a.localeCompare(b));
  const coverNames = [...new Set(items.map(i => i.to).filter(Boolean))];
  const replied = threads.filter(t => t.replies > 0).length;
  const range = from ? `${formatDate(from)} → ${to ? formatDate(to) : ''}` : '';

  const stats = [
    { label: 'Reassigned', value: counts.reassigned },
    { label: 'Completed', value: counts.completed },
    { label: 'Still Open', value: counts.open },
    { label: 'Patients Replied To', value: messages ? `${replied} of ${threads.length}` : '…' },
  ];

  return (
    <Drawer title="While You Were Away" width={640} onClose={onClose}>
      {!job ? (
        <EmptyState icon="solar:history-linear" title="This summary isn't available" />
      ) : (
        <div className={styles.summary}>
          <div className={styles.summaryField}>
            <span className={styles.summaryLabel}>Out of Office</span>
            <div className={styles.summaryCard}>
              <Avatar type="icon" variant="others" iconName="solar:calendar-linear" size="M" />
              <span className={styles.summaryCardText}>
                <span className={styles.summaryCardMain}>{range}</span>
                {coverNames.length > 0 && <span className={styles.summaryCardSub}>Covered by {coverNames.join(', ')}</span>}
              </span>
            </div>
          </div>
          <div className={styles.summaryField}>
            <span className={styles.summaryLabel}>Summary</span>
            <div className={styles.awayStats}>
              {stats.map(s => (
                <div key={s.label} className={styles.awayStat}>
                  <span className={styles.awayStatValue}>{s.value}</span>
                  <span className={styles.awayStatLabel}>{s.label}</span>
                </div>
              ))}
            </div>
            {messages && <span className={styles.summaryNote}>{messages.autoReplies} auto-{messages.autoReplies === 1 ? 'reply' : 'replies'} sent for you.</span>}
          </div>
          {tab && (
            <div className={styles.summaryField}>
              <Tabs
                items={tabs.map(t => ({ key: t.key, label: `${t.label} (${t.count})` }))}
                value={tab.key}
                onValueChange={(k) => { setTabKey(k); setStateKey(null); }}
                fullWidth={false}
                className={styles.summaryTabsFlush}
              />
              {tab.key !== 'messages' && (
                <div className={`${styles.summarySwitchRow} ${styles.summarySwitchUnderTabs}`}>
                  <SegmentedControl
                    items={states.map(s => ({
                      key: s.key,
                      ariaLabel: `${s.label} (${ofKind.filter(i => i.now === s.key).length})`,
                      label: <span className={styles.segLabel}>{s.label}<Badge tone="neutral" size="xs" label={String(ofKind.filter(i => i.now === s.key).length)} /></span>,
                    }))}
                    value={state.key}
                    onValueChange={setStateKey}
                    size="md"
                    className={styles.summarySwitch}
                  />
                  {groups.length > 0 && (
                    <span className={ooo.viewToggle} role="group" aria-label="View">
                      <ActionButton tooltip="Collapse All" className={view === 'collapsed' ? ooo.viewToggleOn : undefined} aria-pressed={view === 'collapsed'} onClick={() => setView('collapsed')}>
                        <CollapseAllIcon size={20} color="var(--neutral-300)" />
                      </ActionButton>
                      <ActionButton tooltip="Expand All" tooltipLeft className={view === 'expanded' ? ooo.viewToggleOn : undefined} aria-pressed={view === 'expanded'} onClick={() => setView('expanded')}>
                        <ExpandAllIcon size={20} color="var(--neutral-300)" />
                      </ActionButton>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {tab?.key === 'messages' ? (
            <div className={`${styles.list} ${styles.cardList}`}>
              {threads.map(t => (
                <button
                  key={t.conversationId}
                  type="button"
                  className={`${styles.apptRow} ${styles.awayThread}`}
                  onClick={() => { goToComms?.({ channel: t.channel, conversationId: t.conversationId }); onClose(); }}
                >
                  <span className={styles.apptMain}>
                    <Avatar variant="patient" initials={initialsOf(t.patientName)} size="M" />
                    <span className={styles.apptText}>
                      <span className={styles.apptName}>{t.patientName}</span>
                      <span className={styles.apptSub}>
                        {[CHANNEL_LABELS[t.channel] || t.channel, t.replies ? `Replied by ${t.by.join(', ')} • ${t.replies} ${t.replies === 1 ? 'reply' : 'replies'}` : 'No reply yet'].filter(Boolean).join(' • ')}
                      </span>
                    </span>
                    {t.replies === 0 && <Badge tone="warning" size="sm" label="Needs Reply" />}
                  </span>
                </button>
              ))}
            </div>
          ) : tab && (groups.length === 0 ? (
            <span className={styles.empty}>Nothing {state.label.toLowerCase()} here.</span>
          ) : (
            <div className={styles.list}>
              {groups.map(([name, list]) => (
                <DeptGroup
                  key={`${tab.key}-${state.key}-${name}`}
                  title={name}
                  count={list.length}
                  noun={tab.noun}
                  lead={<Avatar variant="staff" initials={initialsOf(name)} size="M" userName={name} />}
                  defaultOpen={view ? view === 'expanded' : groups.length === 1}
                  items={list}
                  renderItem={(i) => (i.kind === 'appointment'
                    ? <ApptRow key={i.appointmentId} appt={i.appointment || {}} />
                    : (
                      <div key={i.taskId || i.programId} className={styles.apptRow}>
                        <div className={styles.apptMain}>
                          {(i.kind === 'task' ? TASK_SHAPE : PROGRAM_SHAPE).renderMain({
                            ...(i.task || i.program || {}),
                            status: i.kind === 'program' ? (programsById?.get(String(i.programId))?.status || i.program?.status) : (i.now === 'completed' ? 'completed' : i.task?.status),
                          })}
                        </div>
                      </div>
                    ))}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

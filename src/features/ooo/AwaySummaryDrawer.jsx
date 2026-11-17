import { useEffect, useMemo, useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Avatar } from '../../components/Avatar/Avatar';
import { AvatarGroup } from '../../components/AvatarGroup/AvatarGroup';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Badge } from '../../components/Badge/Badge';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { SegmentedControl } from '../../components/SegmentedControl/SegmentedControl';
import { Tabs } from '../../components/Tabs/Tabs';
import { Icon } from '../../components/Icon/Icon';
import { Link } from '../../components/Link/Link';
import { ActivityLog } from '../../components/ActivityLog/ActivityLog';
import { ScheduleDrawer } from '../../components/ScheduleDrawer/ScheduleDrawer';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';
import { ProgramHistoryDrawer } from '../patient/right-panel/tabs/care-programs/program-detail/ProgramHistoryDrawer/ProgramHistoryDrawer';
import { CollapseAllIcon } from '../../components/Icon/CollapseAllIcon';
import { ExpandAllIcon } from '../../components/Icon/ExpandAllIcon';
import { useAppStore } from '../../store/useAppStore';
import { formatDate, initialsOf } from './oooUtils';
import { PROGRAM_SHAPE, TASK_SHAPE } from './openWorkRows';
import { ApptRow, DeptGroup } from './ReassignParts';
import { AWAY_DEMO_ID, awayDemo } from './awaySummaryDemo';
import { awayItems, itemKey, loadAwayChanges, loadCatchUp, loadProgramsNow } from './awaySummary';
import { formatTime } from '../messages/messageUtils';
import listStyles from '../messages/MessagesView.module.css';
import styles from './reassign.module.css';
import ooo from './ooo.module.css';

const KINDS = [
  { key: 'appointment', label: 'Appointments', noun: 'Appointment', icon: 'solar:calendar-linear' },
  { key: 'task', label: 'Tasks', noun: 'Task', icon: 'solar:checklist-minimalistic-linear' },
  { key: 'program', label: 'Care Programs', noun: 'Program', icon: 'solar:heart-pulse-linear' },
];
const day = (iso) => new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const CHANNEL_LABELS = { sms: 'SMS', chat: 'Chat', email: 'Email', call: 'Call' };
const CALL_OUTCOME = { missed: 'Missed call', completed: 'Answered call', declined: 'Declined call', failed: 'Failed call' };
const STATES = [
  { key: 'completed', label: 'Completed' },
  { key: 'open', label: 'Still Open' },
  { key: 'cancelled', label: 'Cancelled' },
];

/**
 * While You Were Away: what the covering providers did with the user's work
 * during their Out of Office (opens from "Welcome back"). The reassigned
 * appointments, tasks and care programs as they stand now, completed or
 * still open, grouped by whoever has them now, each with its status and
 * assignee changes; and the conversations and calls to catch up on.
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
  const focusActivity = useAppStore(s => s.focusActivity);
  const inboxes = useAppStore(s => s.commsInboxes);
  const allPatients = useAppStore(s => s.allPatients);
  // The worked example (awaySummaryDemo) stands in for real data.
  const demo = useMemo(() => (jobId === AWAY_DEMO_ID ? awayDemo(me?.name || undefined) : null), [jobId, me?.name]);
  const job = demo?.job || jobs.find(j => j.id === jobId);
  const record = demo?.record || records.find(r => r.id === (recordId || job?.oooRecordId));
  const from = record?.startAt || job?.windowStart;
  const to = record?.endAt || job?.windowEnd;

  useEffect(() => {
    const st = useAppStore.getState();
    st.fetchReassignmentJobs?.();
    st.fetchOooRecords?.();
    st.fetchTasks?.();
    st.fetchAppointments?.();
    st.fetchCommsInboxes?.();
    st.fetchAllPatients?.();
  }, []);

  const programIds = useMemo(() => (demo ? [] : (job?.results || []).filter(r => r.programId).map(r => r.programId)), [job, demo]);
  const [programsById, setProgramsById] = useState(null);
  const [loadedChanges, setChanges] = useState(null); // itemKey → [{ type, from, to, by, at }]
  const [loadedCatchUp, setCatchUp] = useState(null); // { autoReplies, threads, calls }
  const changes = demo?.changes || loadedChanges;
  const catchUp = demo?.catchUp || loadedCatchUp;
  useEffect(() => {
    let live = true;
    loadProgramsNow(programIds).then(m => live && setProgramsById(m), () => live && setProgramsById(new Map()));
    return () => { live = false; };
  }, [programIds]);
  useEffect(() => {
    if (!job || demo) return undefined;
    let live = true;
    loadAwayChanges({ job, from, to }).then(m => live && setChanges(m), () => live && setChanges(new Map()));
    return () => { live = false; };
  }, [job, demo, from, to]);
  useEffect(() => {
    if (demo) return undefined;
    let live = true;
    loadCatchUp({ me, from, to, inboxes }).then(m => live && setCatchUp(m), () => live && setCatchUp({ autoReplies: 0, threads: [], calls: [] }));
    return () => { live = false; };
  }, [demo, me, from, to, inboxes]);

  const computed = useMemo(() => awayItems(job, {
    tasksById: new Map((tasks || []).map(t => [String(t.id), t])),
    apptsById: new Map((appointments || []).map(a => [String(a.id), a])),
    programsById: programsById || new Map(),
  }), [job, tasks, appointments, programsById]);
  const { items } = demo || computed;
  // Opening a thread from the example would land on nothing.
  const openThread = (x) => { if (demo) return; goToComms?.({ channel: x.channel, conversationId: x.conversationId }); onClose(); };

  const threads = catchUp?.threads || [];
  const calls = catchUp?.calls || [];
  // Calls by thread, like the Calls list: latest first, with how many are
  // still waiting on a call back.
  const callThreads = [];
  calls.forEach((x) => {
    let t = callThreads.find(c => c.conversationId === x.conversationId);
    if (!t) { t = { conversationId: x.conversationId, channel: x.channel, patientName: x.patientName, calls: [] }; callThreads.push(t); }
    t.calls.push(x);
  });
  callThreads.forEach((t) => {
    t.calls.sort((a, b) => new Date(b.at) - new Date(a.at));
    t.last = t.calls[0];
    t.waiting = t.calls.filter(x => x.outcome !== 'completed' && !x.calledBackBy.length).length;
  });
  callThreads.sort((a, b) => (b.waiting - a.waiting) || (new Date(b.last.at) - new Date(a.last.at)));
  const tabs = [
    ...KINDS.filter(k => items.some(i => i.kind === k.key)).map(k => ({ ...k, count: items.filter(i => i.kind === k.key).length })),
    ...(threads.length ? [{ key: 'messages', label: 'Messages', count: threads.length }] : []),
    ...(callThreads.length ? [{ key: 'calls', label: 'Calls', count: callThreads.length }] : []),
  ];
  const isComms = (k) => k === 'messages' || k === 'calls';
  const [tabKey, setTabKey] = useState(null);
  const tab = tabs.find(t => t.key === tabKey) || tabs[0];
  const ofKind = tab && !isComms(tab.key) ? items.filter(i => i.kind === tab.key) : [];
  const states = STATES.filter(s => s.key !== 'cancelled' || ofKind.some(i => i.now === 'cancelled'));
  // Opens on the first state that has something (Completed, else Still Open).
  const [stateKey, setStateKey] = useState(null);
  const state = states.find(s => s.key === stateKey)
    || states.find(s => ofKind.some(i => i.now === s.key)) || states[0];
  // Departments start collapsed (Collapse All on); Expand All opens them.
  const [view, setView] = useState('collapsed');
  // By department, as in the reassignment summary; each row shows whoever
  // has it now (it may have moved since it was reassigned).
  const byDept = new Map();
  ofKind.filter(i => i.now === state.key).forEach((i) => {
    const k = (i.appointment || i.task || i.program || {}).location || 'No Department';
    if (!byDept.has(k)) byDept.set(k, []);
    byDept.get(k).push(i);
  });
  const groups = [...byDept.entries()].sort(([a], [b]) => a.localeCompare(b));
  // Tasks and care programs have no department, so they're one flat list.
  const flat = tab?.key === 'task' || tab?.key === 'program';
  const holderAvatar = (name) => name && <Avatar variant="staff" initials={initialsOf(name)} size="S" userName={name} />;
  const coverNames = [...new Set(items.map(i => i.to).filter(Boolean))];
  const providerName = record?.userName || job?.fromUser || me?.name || '';
  const providerRole = record?.userRole || job?.fromUserRole || me?.role || null;
  // Names in Messages and Calls: a covering provider reads "Name (covering)".
  const covering = new Set([...coverNames, ...(record?.coverage || []).map(c => c.userName)].filter(Boolean));
  const who = (names) => names.map(n => (covering.has(n) ? `${n} (covering)` : n)).join(', ');
  const range = from ? `${formatDate(from)} → ${to ? formatDate(to) : ''}` : '';

  // Each tab's KPIs: what happened to that module, in its own terms.
  const kpisFor = (key) => {
    if (key === 'messages') {
      return [
        { label: 'New Messages', value: threads.reduce((n, t) => n + t.inbound, 0) },
        { label: 'Replied by Covering Provider', value: threads.filter(t => t.repliedBy.length).length },
        { label: 'Need a Reply', value: threads.filter(t => t.needsReply).length },
      ];
    }
    if (key === 'calls') {
      return [
        { label: 'Missed', value: calls.filter(x => x.outcome === 'missed').length },
        { label: 'Answered by Covering Provider', value: calls.filter(x => x.outcome === 'completed').length },
        { label: 'To Call Back', value: callThreads.reduce((n, t) => n + t.waiting, 0) },
      ];
    }
    const of = items.filter(i => i.kind === key);
    const n = (state) => of.filter(i => i.now === state).length;
    return [
      { label: 'Reassigned', value: of.length },
      { label: 'Completed', value: n('completed') },
      { label: 'Still Open', value: n('open') },
      // Only appointments get cancelled.
      ...(key === 'appointment' ? [{ label: 'Cancelled', value: n('cancelled') }] : []),
    ];
  };
  // An item's activity while I was away: the Out of Office reassignment,
  // then every status and assignee change, oldest first.
  const activityOf = (i) => [
    { type: 'reassigned', from: providerName, to: i.to, by: job?.createdBy || 'System', at: job?.createdAt || from },
    ...(changes?.get(itemKey(i)) || []),
  ];
  // The strip under an item: how much happened, opening its activity log.
  const [activityFor, setActivityFor] = useState(null);
  // Appointments and tasks open their own drawer at its Activity; care
  // programs (no history of their own) and the worked example show it here.
  // (The example's items aren't real records, so they open a real one with
  // the same patient or task name when there is one.)
  const realId = (i) => {
    if (!demo) return i.kind === 'appointment' ? i.appointmentId : i.taskId;
    if (i.kind === 'appointment') return (appointments || []).find(a => a.patient_name === i.appointment?.patientName)?.id;
    return (tasks || []).find(t => t.name === i.task?.name)?.id;
  };
  // The record's drawer opens on top of this summary, at its Activity, so
  // closing it comes back here.
  const [opened, setOpened] = useState(null); // { kind, id }
  const showActivity = (i) => {
    // A care program opens its Program History (the patient's activity log);
    // in the example, the real patient's with the same name and program.
    if (i.kind === 'program') {
      const prog = demo ? null : programsById?.get(String(i.programId));
      const patientId = prog?.patient_id || (demo && (allPatients || []).find(x => x.name === i.program?.patientName)?.id);
      if (patientId) {
        const code = prog?.code || i.program?.code;
        focusActivity?.('program', `${patientId}:${code}`, demo ? { latest: activityOf(i).length - 1 } : { from, to });
        setOpened({ kind: 'program', patientId, code, name: prog?.name || i.program?.name });
        return;
      }
    }
    const id = (i.kind === 'appointment' || i.kind === 'task') ? realId(i) : null;
    // (The example points at the real record's newest entries.)
    if (id != null) { focusActivity?.(i.kind, id, demo ? { latest: activityOf(i).length } : { from, to }); setOpened({ kind: i.kind, id }); return; }
    setActivityFor(i);
  };
  const recordAppt = opened?.kind === 'appointment' ? (appointments || []).find(a => String(a.id) === String(opened.id)) : null;
  const recordTask = opened?.kind === 'task' ? (tasks || []).find(t => String(t.id) === String(opened.id)) : null;
  const recordProgram = opened?.kind === 'program' ? opened : null;
  // The strip under an item: its latest change, and the rest of its history
  // one click away ("N more activities"). Nothing changed, no strip.
  const changeLines = (i) => {
    const list = changes?.get(itemKey(i)) || [];
    if (!list.length) return null;
    const last = list[list.length - 1];
    // Everything else in its history since the Out of Office reassignment.
    const more = activityOf(i).length - 1;
    return (
      <div className={`${styles.awayChanges} ${styles.awayNet}`}>
        {/* The change on one line, who and when on the next. */}
        <span className={styles.awayNetText}>
          <span>
            {last.type === 'activity' ? (
              <span className={styles.awayNetWhat}>{last.title}</span>
            ) : (
              <>
                <span className={styles.awayNetWhat}>{last.type === 'status' ? 'Status updated' : 'Assignee updated'}:</span>
                {' '}{last.from || 'None'} → {last.to || 'None'}
              </>
            )}
          </span>
          <span className={styles.awayNetBy}>by {who([last.by || 'System'])}, {day(last.at)}</span>
        </span>
        <Link onClick={() => showActivity(i)} className={styles.awayNetLink}>
          {more} more {more === 1 ? 'activity' : 'activities'}
          <Icon name="solar:alt-arrow-right-linear" size={12} color="currentColor" />
        </Link>
      </div>
    );
  };

  const renderRow = (i) => (i.kind === 'appointment'
                    ? <ApptRow key={i.appointmentId} appt={i.appointment || {}} trail={holderAvatar(i.holder || i.to)}>{changeLines(i)}</ApptRow>
                    : (
                      <div key={i.taskId || i.programId} className={styles.apptRow}>
                        <div className={styles.apptMain}>
                          {(i.kind === 'task' ? TASK_SHAPE : PROGRAM_SHAPE).renderMain({
                            ...(i.task || i.program || {}),
                            status: i.kind === 'program' ? (programsById?.get(String(i.programId))?.status || i.program?.status) : (i.now === 'completed' ? 'completed' : i.task?.status),
                          })}
                          <span className={styles.apptTrail}>{holderAvatar(i.holder || i.to)}</span>
                        </div>
                        {changeLines(i)}
                      </div>
                    ));

  return (
    <Drawer title="While You Were Away" width={640} onClose={onClose}>
      {!job ? (
        <EmptyState icon="solar:history-linear" title="This summary isn't available" />
      ) : (
        <div className={styles.summary}>
          {/* Whose time away this was, as "Reassigned From" in the reassignment summary. */}
          <div className={styles.summaryField}>
            <span className={styles.summaryLabel}>Provider</span>
            <div className={styles.summaryCard}>
              <Avatar variant="staff" initials={initialsOf(providerName)} size="M" />
              <span className={styles.summaryCardText}>
                <span className={styles.summaryCardMain}>{providerName}</span>
                {providerRole && <span className={styles.summaryCardSub}>{providerRole}</span>}
              </span>
            </div>
          </div>
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
          {tab && (
            <div className={styles.summaryField}>
              <Tabs
                items={tabs.map(t => ({ key: t.key, label: `${t.label} (${t.count})` }))}
                value={tab.key}
                onValueChange={(k) => { setTabKey(k); setStateKey(null); }}
                fullWidth={false}
                className={styles.summaryTabsFlush}
              />
              <div className={`${styles.awayKpis} ${styles.summarySwitchUnderTabs}`}>
                {kpisFor(tab.key).map(k => (
                  <div key={k.label} className={styles.awayKpi}>
                    <span className={styles.awayKpiValue}>{k.value}</span>
                    <span className={styles.awayKpiLabel}>{k.label}</span>
                  </div>
                ))}
              </div>
              {!isComms(tab.key) && (
                <div className={styles.summarySwitchRow}>
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
                  {groups.length > 0 && !flat && (
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
            // Like the Comms list: name and time, the last message, and how
            // many came in; bold while nobody has answered.
            <div className={styles.awayThreads}>
              {threads.map(t => (
                <button key={t.conversationId} type="button" className={listStyles.convItem} onClick={() => openThread(t)}>
                  <Avatar variant="patient" initials={initialsOf(t.patientName)} size="M" />
                  <div className={listStyles.convInfo}>
                    <div className={listStyles.convNameRow}>
                      <div className={t.needsReply ? listStyles.convName : `${listStyles.convName} ${listStyles.muted}`}>{t.patientName}</div>
                      <div className={listStyles.convTime}>{formatTime(t.lastAt)}</div>
                    </div>
                    <div className={listStyles.convPreviewRow}>
                      <div className={listStyles.convPreview}>
                        {CHANNEL_LABELS[t.channel] || t.channel} • {t.needsReply ? t.preview : `Replied by ${who(t.repliedBy)}`}
                      </div>
                      <span className={listStyles.convUnread}>{t.inbound}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : tab?.key === 'calls' ? (
            <div className={styles.awayThreads}>
              {callThreads.map(t => (
                <button key={t.conversationId} type="button" className={listStyles.convItem} onClick={() => openThread(t)}>
                  <Avatar variant="patient" initials={initialsOf(t.patientName)} size="M" />
                  <div className={listStyles.convInfo}>
                    <div className={listStyles.convNameRow}>
                      <div className={t.waiting ? listStyles.convName : `${listStyles.convName} ${listStyles.muted}`}>{t.patientName}</div>
                      <div className={listStyles.convTime}>{formatTime(t.last.at)}</div>
                    </div>
                    <div className={listStyles.convPreviewRow}>
                      <div className={listStyles.convPreview}>
                        {[
                          t.last.outcome === 'completed' && t.last.answeredBy ? `Answered by ${who([t.last.answeredBy])}` : (CALL_OUTCOME[t.last.outcome] || 'Call'),
                          t.last.calledBackBy.length ? `Called back by ${who(t.last.calledBackBy)}` : null,
                        ].filter(Boolean).join(' • ')}
                      </div>
                      {t.waiting > 0 && <span className={listStyles.convUnread}>{t.waiting}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : tab && (groups.length === 0 ? (
            <span className={styles.empty}>Nothing {state.label.toLowerCase()} here.</span>
          ) : flat ? (
            <div className={`${styles.list} ${styles.cardList}`}>
              {groups.flatMap(([, list]) => list).map(renderRow)}
            </div>
          ) : (
            <div className={styles.list}>
              {groups.map(([name, list]) => (
                <DeptGroup
                  key={`${tab.key}-${state.key}-${name}`}
                  title={name}
                  count={list.length}
                  noun={tab.noun}
                  controls={(
                    <AvatarGroup
                      variant="staff"
                      size="S"
                      max={3}
                      people={[...new Set(list.map(i => i.holder || i.to).filter(Boolean))].map(n => ({ id: n, name: n, initials: initialsOf(n) }))}
                    />
                  )}
                  defaultOpen={view ? view === 'expanded' : groups.length === 1}
                  items={list}
                  renderItem={renderRow}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {recordAppt && <ScheduleDrawer existingAppointment={recordAppt} onClose={() => setOpened(null)} source="ooo_summary" />}
      {recordTask && <TaskDetailDrawer task={recordTask} onClose={() => setOpened(null)} />}
      {recordProgram && (
        <ProgramHistoryDrawer
          program={{ name: recordProgram.name || recordProgram.code, code: recordProgram.code }}
          patientId={recordProgram.patientId}
          onClose={() => setOpened(null)}
        />
      )}
      {activityFor && (
        <ItemActivityDrawer
          title={itemTitle(activityFor)}
          noun={(KINDS.find(k => k.key === activityFor.kind)?.noun || 'item').toLowerCase()}
          activity={activityOf(activityFor)}
          onClose={() => setActivityFor(null)}
        />
      )}
    </Drawer>
  );
}

const itemTitle = (i) => (i.kind === 'appointment'
  ? `${i.appointment?.patientName || 'Appointment'} • ${i.appointment?.type || 'Appointment'}`
  : i.kind === 'task' ? (i.task?.name || 'Task')
    : `${i.program?.code || i.program?.name || 'Care Program'}${i.program?.patientName ? ` • ${i.program.patientName}` : ''}`);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * One item's activity while its owner was away, in the ActivityLog used by
 * the task and appointment drawers: newest first, under a month header.
 */
function ItemActivityDrawer({ title, noun, activity, onClose }) {
  const entries = [];
  let month = '';
  [...activity].sort((a, b) => new Date(b.at) - new Date(a.at)).forEach((c) => {
    const d = new Date(c.at);
    const label = Number.isNaN(d.getTime()) ? '' : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (label && label !== month) { entries.push({ t: 'group', label }); month = label; }
    const who = c.by || 'System';
    const meta = {
      avatar: <span className={styles.activityRailAvatar}><Avatar variant="staff" size="S" initials={initialsOf(who)} /></span>,
      when: c.at,
      date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      by: who,
    };
    const moved = { outcome: `${c.from || 'None'} → ${c.to || 'None'}`, outcomeColor: 'var(--neutral-300)' };
    if (c.type === 'status') entries.push({ ...meta, t: 'status_change', title: 'Status Updated', from: c.from || 'None', to: c.to || 'None' });
    else if (c.type === 'activity') entries.push({ ...meta, t: 'change', title: c.title });
    else if (c.type === 'assignee') entries.push({ ...meta, ...moved, t: 'change', title: 'Assignee Updated' });
    else entries.push({ ...meta, ...moved, by: null, t: 'change', title: `${who} reassigned the ${noun} (Out of Office)` });
  });
  return (
    <Drawer title={title} width={640} onClose={onClose}>
      <ActivityLog entries={entries} emptyLabel="No activity recorded." flushTop />
    </Drawer>
  );
}

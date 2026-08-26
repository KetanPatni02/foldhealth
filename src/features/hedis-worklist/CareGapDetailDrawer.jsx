import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { ClinicalNotePanel } from './ClinicalNotePanel';
import { useClinicalNotePanel } from './useClinicalNotePanel';
import { ClinicalNoteWorkspaceBody, HeaderActions as ClinicalNoteHeaderActions } from './ClinicalNotePanelParts';
import { ReviewerPickerPopover } from './ReviewerPickerPopover';
import { useAddTaskDrawer } from '../tasks/useAddTaskDrawer';
import { AddTaskDrawerBody } from '../tasks/AddTaskDrawerBody';
import { useScheduleDrawer } from '../../components/ScheduleDrawer/useScheduleDrawer';
import { ScheduleDrawerBookingBody } from '../../components/ScheduleDrawer/ScheduleDrawerBookingForm';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Avatar } from '../../components/Avatar/Avatar';
import { Icon } from '../../components/Icon/Icon';
import { TabStrip } from '../../components/TabStrip/TabStrip';
import { ActivityLog } from '../../components/ActivityLog/ActivityLog';
import { CardSkeleton } from '../../components/CardSkeleton/CardSkeleton';
import { OutreachTab } from '../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';
import { OUTREACH_LOG_COUNT } from '../patient/data/outreachLogMock';
import { useAppStore } from '../../store/useAppStore';
import { TABS, MORE_ACTIONS, toActivityLogEntries } from './CareGapDetailDrawer.utils';
import { CareGapDetailDrawerHeader } from './CareGapDetailDrawerHeader';
import styles from './CareGapDetailDrawer.module.css';

export function CareGapDetailDrawer({ member, gapCode, year, onClose }) {
  const showToast = useAppStore(s => s.showToast);
  const updateGapStatus = useAppStore(s => s.updateGapStatus);
  const updateGapAssignee = useAppStore(s => s.updateGapAssignee);
  const logCareGapActivity = useAppStore(s => s.logCareGapActivity);
  const currentActorName = useAppStore(s => s.currentActorName);
  const activityEntries = useAppStore(s => s.caregapActivity[member?.id]);
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  useEffect(() => { fetchPlatformUsers(); }, [fetchPlatformUsers]);
  const caregapActivityLoaded = useAppStore(s => s.caregapActivityLoaded);
  const fetchCaregapActivity = useAppStore(s => s.fetchCaregapActivity);
  useEffect(() => { fetchCaregapActivity(); }, [fetchCaregapActivity]);
  const openTaskFromActivity = useAppStore(s => s.openTaskFromActivity);
  const appointments = useAppStore(s => s.appointments);
  const fetchAppointments = useAppStore(s => s.fetchAppointments);
  useEffect(() => { fetchAppointments?.(); }, [fetchAppointments]);
  // Slice appointments to just this member. Supabase persists patient_id,
  // so a save from the inline Schedule pane immediately shows up here
  // after fetchAppointments refreshes.
  const memberAppointments = (appointments || []).filter(a => a.patient_id === member?.id);

  const gaps = member?.gaps ?? [];
  const [currentCode, setCurrentCode] = useState(gapCode);
  const gapKey = `${member?.id ?? ''}|${gapCode ?? ''}`;
  const [prevGapKey, setPrevGapKey] = useState(gapKey);
  if (prevGapKey !== gapKey) { setPrevGapKey(gapKey); setCurrentCode(gapCode); }

  const [statusOpen, setStatusOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const assigneeBtnRef = useRef(null);
  const [assigneePos, setAssigneePos] = useState(null);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const openAssignee = () => {
    const r = assigneeBtnRef.current?.getBoundingClientRect();
    if (!r) return;
    setAssigneeQuery('');
    setAssigneePos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };
  const closeAssignee = () => setAssigneePos(null);

  const [selectedYear, setSelectedYear] = useState(year);
  const [prevYear, setPrevYear] = useState(year);
  if (prevYear !== year) { setPrevYear(year); setSelectedYear(year); }
  const [yearOpen, setYearOpen] = useState(false);
  const yearOptions = [year, year - 1, year - 2];

  const moreBtnRef = useRef(null);
  const [moreMenuRect, setMoreMenuRect] = useState(null);
  const openMoreMenu = () => { const r = moreBtnRef.current?.getBoundingClientRect(); if (r) setMoreMenuRect(r); };
  const closeMoreMenu = () => setMoreMenuRect(null);
  // Route "Add Clinical Note" based on how many gaps are open for this member.
  // >1 → consolidated ClinicalNotePanel (dedicated drawer with a gap table).
  //  1 → inline left workspace on this drawer (like Add Task / Schedule).
  // Matches Figma 872:76360.
  const openClinicalNoteFlow = () => {
    if (openGapCount > 1) setShowClinicalNote(true);
    else setLeftWorkspace('clinical-note');
  };
  const runMoreAction = (a) => {
    closeMoreMenu();
    if (a.openClinicalNote) openClinicalNoteFlow();
    else if (a.key === 'task') setLeftWorkspace('task');
    else if (a.key === 'appointment') setLeftWorkspace('schedule');
    else showToast(`${a.label} — coming soon`);
  };

  const [activeTab, setActiveTab] = useState('Activity Log');
  const [showClinicalNote, setShowClinicalNote] = useState(false);
  // Single-slot left workspace — only one workspace mounts at a time
  // ('task' | 'schedule' | null). Sharing the slot means widening the
  // drawer, mounting the banner inline, and running the collapse
  // animation all key off the same state instead of two parallel flags.
  const [leftWorkspace, setLeftWorkspace] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commentExpanded, setCommentExpanded] = useState(false);

  // Open-gap count drives the "Add Note" routing rule (see openClinicalNoteFlow).
  // Mirrors the hook's own filter so both counts agree.
  const openGapCount = (member?.gaps ?? [])
    .filter(g => g.status !== 'Completed' && !String(g.status).startsWith('Closed'))
    .length;

  // Both workspace hooks are called unconditionally (React rules) and
  // their outputs only wire into the UI when their key is active.
  const addTask = useAddTaskDrawer({
    defaultStatus: undefined,
    initialMember: member?.name || '',
    onTaskCreated: () => showToast('Task created'),
    extraFields: { careGap: currentCode, measurementYear: selectedYear },
  });
  const scheduleDrawer = useScheduleDrawer({
    onClose: () => closeLeftWorkspace(),
    // On successful create, surface a toast, log an activity entry so the
    // Activity feed reflects the schedule action, and refresh the list
    // (the hook already calls createAppointment + fetchAppointments, but
    // this guarantees the local `memberAppointments` slice is up to date
    // before the pane collapses).
    onSave: (row) => {
      showToast('Appointment scheduled');
      // Match Figma 1230:74055 — Activity entry is a detail card with the
      // appointment type as title, a "date, time · provider" subtitle, and
      // the appointment's own status pill (default Scheduled).
      const subtitleBits = [];
      if (row?.date) subtitleBits.push(row.date);
      if (row?.time_start) subtitleBits.push(row.time_end ? `${row.time_start} – ${row.time_end}` : row.time_start);
      const subtitleLeft = subtitleBits.join(', ');
      const provider = row?.primary_user || '';
      logCareGapActivity(member.id, {
        when: new Date().toISOString(),
        actor: currentActorName(),
        t: 'appointment',
        title: 'Appointment Scheduled',
        detailCard: {
          title: row?.appointment_type_name || 'Appointment',
          subtitle: [subtitleLeft, provider].filter(Boolean).join(' • '),
          status: row?.status || 'Scheduled',
        },
      });
      fetchAppointments?.();
    },
    // Pre-populate the patient using the current gap's member. Passing the
    // synthesized object (not just an id) skips the patients.find lookup —
    // HEDIS members don't share ids with the appointments' patients table.
    initialSelectedPatient: member && {
      id: member.id,
      name: member.name,
      gender: member.gender,
      age: member.age,
      dob: member.dob,
      facility: member.facility,
      laceScore: member.laceScore,
    },
  });
  // Inline single-gap Clinical Note hook — always mounted (React rules) but
  // only wired into the UI when leftWorkspace === 'clinical-note'.
  const clinicalNote = useClinicalNotePanel({
    member,
    gapCode: currentCode,
    onClose: () => runLeftClose(),
  });

  // Two-phase close so the drawer collapses with the same easing it opens
  // with. Phase 1 (250ms) — drawer.width transitions 1260 → 630 while the
  // left pane is still mounted; its flex space shrinks in lock-step so it
  // reads as sliding back into the right pane. Phase 2 — actually unmount.
  const [leftClosing, setLeftClosing] = useState(false);
  const runLeftClose = () => {
    setLeftClosing(true);
    setTimeout(() => { setLeftWorkspace(null); setLeftClosing(false); }, 250);
  };
  const closeLeftWorkspace = () => {
    // Task workspace has a "discard unsaved changes?" guard; the scheduler
    // discards silently for parity with its standalone usage.
    if (leftWorkspace === 'task' && addTask.guardClose() === false) return;
    runLeftClose();
  };
  const inSplit = !!leftWorkspace || leftClosing;
  const isExpanded = !!leftWorkspace && !leftClosing;

  if (!member || gaps.length === 0) return null;

  const idx = Math.max(0, gaps.findIndex(g => g.code === currentCode));
  const gap = gaps[idx] ?? gaps[0];
  const canPrev = idx > 0;
  const canNext = idx < gaps.length - 1;
  const status = gap?.status ?? 'Open';
  const statusLocked = status === 'Completed';
  const activityLogEntries = toActivityLogEntries(activityEntries);
  const tabCounts = {
    'Activity Log': activityEntries?.length ?? 0,
    Outreaches: OUTREACH_LOG_COUNT,
    'Appt/Reminders': memberAppointments.length,
  };

  const goPrev = () => { if (canPrev) { setCurrentCode(gaps[idx - 1].code); setStatusOpen(false); } };
  const goNext = () => { if (canNext) { setCurrentCode(gaps[idx + 1].code); setStatusOpen(false); } };

  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text) return;
    logCareGapActivity(member.id, { when: new Date().toISOString(), actor: currentActorName(), t: 'comment', title: 'Added a Comment', commentBody: text });
    setCommentText('');
    setCommentExpanded(false);
  };

  return (
    <>
      {showClinicalNote && (
        <ClinicalNotePanel member={member} gapCode={gap.code} year={selectedYear} onClose={() => setShowClinicalNote(false)} />
      )}
      {addTask.showCloseConfirm && (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-warning)"
          title="Discard unsaved task?"
          description="You have unsaved changes. Closing now will discard them."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          variant="error"
          onConfirm={() => { addTask.setShowCloseConfirm(false); runLeftClose(); }}
          onCancel={() => addTask.setShowCloseConfirm(false)}
        />
      )}
      <ReviewerPickerPopover
        open={clinicalNote.reviewerPickerOpen}
        onClose={() => clinicalNote.setReviewerPickerOpen(false)}
        onConfirm={(reviewer) => clinicalNote.handleConfirmSubmitForReview(reviewer)}
      />
      <Drawer
        title="Care Gap Details"
        onClose={onClose}
        noCloseDivider
        // When the Add Task workspace is open we double the drawer width so
        // the left pane can host the full task form without cramping the
        // right pane's tabs. Reverts to the standard 700 when Add Task
        // closes — the transition reads as an expand/collapse.
        // 630px = right-pane fixed width. Match the closed-state drawer to
        // it too so opening/closing Add Task never causes the right pane
        // to jump — the drawer width simply expands leftward (1260) and
        // collapses back (630) with the same easing.
        width={isExpanded ? 1260 : 630}
        bodyClassName={inSplit ? `${styles.drawerBody} ${styles.drawerBodySplit}` : styles.drawerBody}
        headerRight={
          <div className={styles.headerNav}>
            <ActionButton icon="solar:alt-arrow-left-linear" size="L" tooltip="Previous gap" state={canPrev ? 'active' : 'disabled'} onClick={goPrev} />
            <ActionButton icon="solar:alt-arrow-right-linear" size="L" tooltip="Next gap" state={canNext ? 'active' : 'disabled'} onClick={goNext} />
            <span className={styles.headerDivider} />
          </div>
        }
        banner={inSplit ? undefined : (
          <div className={styles.patientBannerWrap}>
            <PatientBanner initials={member.in} name={member.name} gender={member.gender} age={member.age} dob={member.dob}
              memberId={member.memberId} hidePatientLabel onCall={() => showToast('Call — coming soon')} />
          </div>
        )}
      >
        {inSplit && (
          <div className={styles.leftPane}>
            <div className={styles.paneHeader}>
              <span className={styles.paneTitle}>
                {leftWorkspace === 'schedule'
                  ? 'Schedule Appointment'
                  : leftWorkspace === 'clinical-note'
                    ? 'Clinical Note'
                    : 'Add Task'}
              </span>
              <div className={styles.paneHeaderRight}>
                {leftWorkspace === 'schedule' ? (
                  <Button variant="primary" size="M" disabled={!scheduleDrawer.canSchedule} onClick={scheduleDrawer.handleSchedule}>
                    Schedule
                  </Button>
                ) : leftWorkspace === 'clinical-note' ? (
                  <ClinicalNoteHeaderActions
                    onSaveDraft={clinicalNote.handleSaveDraft}
                    onSubmitForReview={clinicalNote.handleSubmitForReview}
                    onSaveAndSign={clinicalNote.handleSaveAndSign}
                    onSignAndPrint={clinicalNote.handleSignAndPrint}
                  />
                ) : (
                  <Button variant="primary" size="M" disabled={!addTask.canSave} onClick={addTask.handleSave}>
                    Save Task
                  </Button>
                )}
                <span className={styles.headerDivider} />
                <CloseButton
                  size={18}
                  onClick={closeLeftWorkspace}
                  label={
                    leftWorkspace === 'schedule'
                      ? 'Close Schedule Appointment'
                      : leftWorkspace === 'clinical-note'
                        ? 'Close Clinical Note'
                        : 'Close Add Task'
                  }
                />
              </div>
            </div>
            <div className={`${styles.leftPaneBody} ${leftWorkspace === 'clinical-note' ? styles.leftPaneBodyClinicalNote : ''}`}>
              {leftWorkspace === 'schedule' ? (
                <ScheduleDrawerBookingBody {...scheduleDrawer} timezoneLabel="GMT" patientLocked />
              ) : leftWorkspace === 'clinical-note' ? (
                <ClinicalNoteWorkspaceBody v={clinicalNote} />
              ) : (
                <AddTaskDrawerBody {...addTask} />
              )}
            </div>
          </div>
        )}
        <div className={styles.contentBody}>
          {inSplit && (
            <div className={styles.patientBannerWrap}>
              <PatientBanner initials={member.in} name={member.name} gender={member.gender} age={member.age} dob={member.dob}
                memberId={member.memberId} hidePatientLabel onCall={() => showToast('Call — coming soon')} />
            </div>
          )}
          <CareGapDetailDrawerHeader
            gap={gap} member={member} selectedYear={selectedYear} setSelectedYear={setSelectedYear}
            yearOpen={yearOpen} setYearOpen={setYearOpen} yearOptions={yearOptions}
            moreOpen={moreOpen} setMoreOpen={setMoreOpen} status={status} statusLocked={statusLocked}
            statusOpen={statusOpen} setStatusOpen={setStatusOpen} updateGapStatus={updateGapStatus}
            assigneeBtnRef={assigneeBtnRef} assigneePos={assigneePos} openAssignee={openAssignee} closeAssignee={closeAssignee}
            showToast={showToast} setShowClinicalNote={setShowClinicalNote}
            onOpenClinicalNote={openClinicalNoteFlow}
            onScheduleAppointment={() => setLeftWorkspace('schedule')} moreBtnRef={moreBtnRef}
            moreMenuRect={moreMenuRect} openMoreMenu={openMoreMenu} closeMoreMenu={closeMoreMenu}
            goPrev={goPrev} goNext={goNext} canPrev={canPrev} canNext={canNext}
          />

          {/* Shared TabStrip — same underline motion the HCC drawer uses.
              Counts are baked into `label` as "(N)" so we skip the Badge
              default that `count` renders. `fullWidth={false}` because
              this drawer's `.drawerBody` already has `padding: 0` — the
              default bleed would apply a -24px margin and push the row
              past the drawer's own edges. */}
          <TabStrip
            items={TABS.map((tab) => ({
              key: tab.key,
              label: tabCounts[tab.key] != null
                ? `${tab.label} (${tabCounts[tab.key]})`
                : tab.label,
            }))}
            activeKey={activeTab}
            onChange={setActiveTab}
            fullWidth={false}
            size="S"
          />

          <div className={styles.tabContentWrap}>
            {activeTab === 'Activity Log' ? (
              <div className={styles.activityLog}>
                <div className={styles.commentInput}>
                  {commentExpanded ? (
                    <textarea aria-label="Add a comment" autoFocus className={styles.commentTextarea} placeholder="Add a comment, use @ to mention someone" rows={3}
                      value={commentText} onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') { setCommentExpanded(false); setCommentText(''); } }} />
                  ) : (
                    <Input placeholder="Add a comment" onFocus={() => setCommentExpanded(true)} style={{ cursor: 'text', width: '100%' }} />
                  )}
                  {commentExpanded && (
                    <div className={styles.commentActions}>
                      <Button variant="primary" size="S" disabled={!commentText.trim()} onClick={handleAddComment}>Comment</Button>
                      <Button variant="secondary" size="S" onClick={() => { setCommentExpanded(false); setCommentText(''); }}>Cancel</Button>
                    </div>
                  )}
                </div>
                {caregapActivityLoaded
                  ? <ActivityLog entries={activityLogEntries} emptyLabel="No activity yet for this care gap." onOpenTask={openTaskFromActivity} />
                  : <CardSkeleton />}
              </div>
            ) : activeTab === 'Outreaches' ? (
              <OutreachTab defaultPrograms={[gap.code]} defaultLogFor="care-program" hideLogForRow />
            ) : activeTab === 'Appt/Reminders' ? (
              memberAppointments.length === 0 ? (
                <div className={styles.emptyTab}>
                  <Icon name="solar:calendar-linear" size={36} color="var(--neutral-200)" />
                  <p className={styles.emptyTabTitle}>No appointments scheduled yet.</p>
                </div>
              ) : (
                <div className={styles.apptList}>
                  {memberAppointments.map(a => {
                    const meta = [
                      a.date,
                      a.time_start && (a.time_end ? `${a.time_start} – ${a.time_end}` : a.time_start),
                      a.primary_user,
                    ].filter(Boolean).join(' · ');
                    return (
                      <div key={a.id} className={styles.apptCard}>
                        <Icon name="solar:calendar-linear" size={18} color="var(--primary-300)" />
                        <div className={styles.apptCardBody}>
                          <div className={styles.apptCardTitle}>
                            {a.appointment_type_name || 'Appointment'}
                          </div>
                          {meta && <div className={styles.apptCardMeta}>{meta}</div>}
                        </div>
                        {a.status && (
                          <span className={styles.apptCardStatus}>{a.status}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className={styles.emptyTab}>
                <Icon name="solar:hourglass-line-linear" size={36} color="var(--neutral-200)" />
                <p className={styles.emptyTabTitle}>{activeTab} — coming soon</p>
              </div>
            )}
          </div>
        </div>
      </Drawer>

      {assigneePos && createPortal(
        (() => {
          // Effective assignee = gap-level override, else the member-level
          // default (same fallback the table row and the header chip use).
          const effectiveAssignee = gap.assignee ?? member?.assignee ?? null;
          return (
            <>
              <div aria-hidden="true" className={styles.assigneeMenuOverlay} onClick={closeAssignee} />
              <div className={styles.assigneeMenu} style={{ top: assigneePos.top, right: assigneePos.right }} role="menu">
                <div className={styles.assigneeMenuHeader}>{effectiveAssignee ? 'Change Assignee' : 'Assign to'}</div>
                <div className={styles.assigneeMenuSearch}>
                  <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
                  <input aria-label="Search users" autoFocus type="text" className={styles.assigneeMenuInput} placeholder="Search users…"
                    value={assigneeQuery} onChange={(e) => setAssigneeQuery(e.target.value)} />
                </div>
                <div className={styles.assigneeMenuList}>
                  {(() => {
                    const q = assigneeQuery.trim().toLowerCase();
                    const list = q ? platformUsers.filter(u => u.name.toLowerCase().includes(q)) : platformUsers;
                    if (list.length === 0) return <div className={styles.assigneeMenuEmpty}>{q ? 'No users match your search.' : 'No users found.'}</div>;
                    return list.map(u => (
                      <button key={u.id} type="button" className={`${styles.assigneeMenuItem} ${effectiveAssignee === u.name ? styles.assigneeMenuItemActive : ''}`}
                        onClick={() => { updateGapAssignee(member.id, gap.code, u.name); closeAssignee(); }}>
                        <Avatar variant="assignee" initials={u.initials} />
                        <span className={styles.assigneeMenuName}>{u.name}</span>
                        {effectiveAssignee === u.name && <Icon name="solar:check-read-linear" size={12} color="var(--primary-300)" />}
                      </button>
                    ));
                  })()}
                </div>
                {effectiveAssignee && (
                  <button type="button" className={styles.assigneeMenuClear} onClick={() => { updateGapAssignee(member.id, gap.code, null); closeAssignee(); }}>
                    <Icon name="solar:user-cross-linear" size={14} color="var(--status-error)" /> Unassign
                  </button>
                )}
              </div>
            </>
          );
        })(), document.body,
      )}

      {moreMenuRect && createPortal(
        <>
          <div aria-hidden="true" className={styles.moreMenuOverlay} onClick={closeMoreMenu} />
          <div className={styles.moreMenu} style={{ top: moreMenuRect.bottom + 6, left: Math.min(moreMenuRect.right - 220, window.innerWidth - 220 - 8) }}>
            {MORE_ACTIONS.map(a => (
              <button key={a.key} type="button" className={styles.moreMenuItem} onClick={() => runMoreAction(a)}>
                <Icon name={a.icon} size={16} color="var(--neutral-300)" /> {a.label}
              </button>
            ))}
          </div>
        </>, document.body,
      )}
    </>
  );
}

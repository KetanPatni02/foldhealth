import { useState, useEffect, useRef } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Textarea } from '../../components/Textarea/Textarea';
import { ClinicalNotePanel } from './ClinicalNotePanel';
import { useClinicalNotePanel } from './useClinicalNotePanel';
import { ClinicalNoteWorkspaceBody, ConsolidatedNoteBody, HeaderActions as ClinicalNoteHeaderActions } from './ClinicalNotePanelParts';
import { ReviewerPickerPopover } from './ReviewerPickerPopover';
import { ClinicalNotesTab } from './ClinicalNotesTab';
import { ClinicalNotePreviewBody } from './ClinicalNotePreviewBody';
import { TasksTab } from '../patient/left-panel/tabs/tasks/TasksTab/TasksTab';
import { useAddTaskDrawer } from '../tasks/useAddTaskDrawer';
import { AddTaskDrawerBody } from '../tasks/AddTaskDrawerBody';
import { useScheduleDrawer } from '../../components/ScheduleDrawer/useScheduleDrawer';
import { ScheduleDrawerBookingBody } from '../../components/ScheduleDrawer/ScheduleDrawerBookingForm';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Icon } from '../../components/Icon/Icon';
import { TabStrip } from '../../components/TabStrip/TabStrip';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { ActivityLog } from '../../components/ActivityLog/ActivityLog';
import { CardSkeleton } from '../../components/CardSkeleton/CardSkeleton';
import { OutreachTab } from '../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';
import { OUTREACH_LOG_COUNT } from '../patient/data/outreachLogMock';
import { useAppStore } from '../../store/useAppStore';
import { TABS, MORE_ACTIONS, toActivityLogEntries } from './CareGapDetailDrawer.utils';
import { CareGapDetailDrawerHeader } from './CareGapDetailDrawerHeader';
import styles from './CareGapDetailDrawer.module.css';

// Adapt store `tasks` rows to the { pending, overdue, completed } shape
// TasksTab consumes. Task titles come from `name`, due from due_date,
// priority passes through, and overdue is a simple date comparison —
// mirrors the classification used on the P360 tasks tab so the two
// surfaces stay in sync visually.
function groupTasksForTab(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pending = [];
  const overdue = [];
  const completed = [];
  (tasks || []).forEach((t) => {
    const shared = {
      id: t.id,
      title: t.name || 'Task',
      priority: t.priority || 'medium',
      due: t.due_date || '',
      subtasks: t.subtasks || 0,
      attachments: t.attachments || 0,
      comments: t.comments || 0,
    };
    if (t.status === 'completed') {
      completed.push({ ...shared, completedOn: t.completed_at || t.updated_at || '' });
      return;
    }
    const dueDate = t.due_date ? new Date(t.due_date) : null;
    if (dueDate && !Number.isNaN(dueDate.getTime()) && dueDate < today) {
      overdue.push(shared);
    } else {
      pending.push(shared);
    }
  });
  return { pending, overdue, completed };
}

// Compact MM/DD/YYYY formatter used by the preview subtitle. Kept local
// so the drawer file doesn't reach into date-utils modules for a one-off.
function formatPreviewDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

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
  // Clinical notes + tasks slices used by the Clinical Notes and Tasks tabs.
  const memberNotes = useAppStore(s => (member?.id ? s.clinicalNotesByMember?.[member.id] : null)) || [];
  const fetchClinicalNotesForMember = useAppStore(s => s.fetchClinicalNotesForMember);
  useEffect(() => { if (member?.id) fetchClinicalNotesForMember?.(member.id); }, [member?.id, fetchClinicalNotesForMember]);
  const allTasks = useAppStore(s => s.tasks);
  const openTaskFromNotification = useAppStore(s => s.openTaskFromNotification);
  // The eye affordance inside the Clinical Notes tab (and Activity Log) can
  // navigate to the Tasks page for a linked sign-off task. When that
  // navigation fires (activePage flips to 'tasks'), close this drawer so
  // the reviewer isn't looking at the Tasks page through our overlay.
  const activePage = useAppStore(s => s.activePage);
  useEffect(() => { if (activePage === 'tasks') onClose?.(); }, [activePage, onClose]);
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
  const [statusAnchorRect, setStatusAnchorRect] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const [selectedYear, setSelectedYear] = useState(year);
  const [prevYear, setPrevYear] = useState(year);
  if (prevYear !== year) { setPrevYear(year); setSelectedYear(year); }
  const [yearOpen, setYearOpen] = useState(false);
  const yearOptions = [year, year - 1, year - 2];

  const moreBtnRef = useRef(null);
  const [moreMenuRect, setMoreMenuRect] = useState(null);
  const openMoreMenu = () => { const r = moreBtnRef.current?.getBoundingClientRect(); if (r) setMoreMenuRect(r); };
  const closeMoreMenu = () => setMoreMenuRect(null);
  // Route Add Note based on how many gaps are open for this member.
  //   >1 → consolidated ClinicalNotePanel drawer (stacked-sections layout).
  //    1 → inline single-gap workspace on this drawer's left pane.
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
  // Called from the note-card eye affordance. Signed notes open a read-
  // only summary view (ClinicalNotePreviewBody) matching Figma 511:105429.
  // Draft / Pending Review notes open the editable workspace so the
  // author can amend before the reviewer signs. useClinicalNotePanel's
  // draft-restore effect (upstream 3e0aa74) hydrates the form fields from
  // the newest saved note for that gap so nothing extra is needed on the
  // editable path.
  const [previewNoteId, setPreviewNoteId] = useState(null);
  const [amendNoteId, setAmendNoteId] = useState(null);
  const openNoteInWorkspace = (dc) => {
    if (!dc?.gapCode && !dc?.noteId) return;
    if (dc.gapCode) {
      const found = gaps.find(g => g.code === dc.gapCode);
      if (found) setCurrentCode(found.code);
    }
    if (dc.noteId) setPreviewNoteId(dc.noteId);
    else setPreviewNoteId(null);
    // Signed AND Pending Review open the read-only preview
    // (ClinicalNotePreviewBody). The Signed preview surfaces an "Amend"
    // affordance that flips to the inline single-gap editor; the Pending
    // Review preview surfaces an "Edit" affordance that flips to the
    // stacked consolidated editor (leftWorkspace 'clinical-note-
    // consolidated'). Draft still edits inline directly.
    if (dc.status === 'Draft') {
      setAmendNoteId(dc.noteId || null);
      setLeftWorkspace('clinical-note');
    } else {
      setAmendNoteId(null);
      setLeftWorkspace('clinical-note-preview');
    }
  };
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
    onTaskCreated: (task) => {
      showToast('Task created');
      // Log an activity entry so the Care Gap Drawer's Activity Log
      // shows the create action, and close the left workspace so the
      // Tasks tab (which reads from the store) is immediately visible.
      logCareGapActivity(member?.id, {
        title: 'Task Added',
        detail: task?.name || 'Task',
        actor: currentActorName(),
        icon: 'solar:clipboard-list-linear',
        t: 'task',
        gapCodes: [currentCode],
        detailCard: {
          taskId: task?.id,
          title: task?.name || 'Task',
          assignee: task?.assigned_to || null,
          status: task?.status === 'completed' ? 'Completed' : 'Pending',
        },
      });
      runLeftClose();
    },
    // hedisMemberId lets the Tasks tab filter reliably (member.name is
    // fragile — two members can share a display name). extraFields is
    // spread into the task payload by useAddTaskDrawer.
    extraFields: { hedisMemberId: member?.id, careGap: currentCode, measurementYear: selectedYear },
    // These three fields have no columns in public.tasks — strip them
    // before the Supabase INSERT so the row is actually persisted (they
    // stay on the in-memory task object for the drawer's own use).
    dbOmit: ['hedisMemberId', 'careGap', 'measurementYear'],
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
  // When Amend is clicked from a preview, amendNoteId seeds the form from
  // that note's persisted payload (not just the latest draft).
  const clinicalNote = useClinicalNotePanel({
    member,
    gapCode: currentCode,
    onClose: () => { setAmendNoteId(null); runLeftClose(); },
    amendNoteId,
  });

  // Two-phase close so the drawer collapses with the same easing it opens
  // with. Phase 1 (250ms) — drawer.width transitions 1260 → 630 while the
  // left pane is still mounted; its flex space shrinks in lock-step so it
  // reads as sliding back into the right pane. Phase 2 — actually unmount.
  const [leftClosing, setLeftClosing] = useState(false);
  const runLeftClose = () => {
    setLeftClosing(true);
    setTimeout(() => { setLeftWorkspace(null); setLeftClosing(false); setPreviewNoteId(null); setAmendNoteId(null); }, 250);
  };
  const closeLeftWorkspace = () => {
    // Task workspace has a "discard unsaved changes?" guard; the scheduler
    // discards silently for parity with its standalone usage.
    if (leftWorkspace === 'task' && addTask.guardClose() === false) return;
    if (leftWorkspace === 'clinical-note' && amendNoteId) setAmendNoteId(null);
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
  // Clinical Notes tab reuses the ActivityLog note-variant card by
  // filtering activity entries to just t:'clinical_note'. That guarantees
  // the tab and the log render the exact same Draft / Pending Review /
  // Signed card format.
  const clinicalNoteEntries = activityLogEntries.filter(e => e.t === 'clinical_note' || e.t === 'group');
  // Count of actual note entries (excludes month-group headers) — used for
  // the tab label and empty-state gating.
  const clinicalNoteCount = clinicalNoteEntries.filter(e => e.t === 'clinical_note').length;
  // Tasks tab lists every task tied to this HEDIS member — sign-off tasks
  // (created by createCareGapSignOffTask) always have hedisMemberId set;
  // manually created tasks land here via the `member` denormalized field.
  const memberTasks = (allTasks || []).filter(
    t => (t.hedisMemberId && t.hedisMemberId === member?.id)
      || (member?.name && t.member === member.name),
  );
  const openTaskDetail = (task) => {
    // Reuses the same task-drawer opener the notifications trigger uses:
    // sets the Tasks page as active and stamps pendingOpenTaskId so
    // TasksView mounts the TaskDetailDrawer for that task on next paint.
    openTaskFromNotification?.(task.id);
    onClose?.();
  };
  const tabCounts = {
    'Activity Log': activityEntries?.length ?? 0,
    Outreaches: OUTREACH_LOG_COUNT,
    'Appt/Reminders': memberAppointments.length,
    'Clinical Notes': clinicalNoteCount,
    Tasks: memberTasks.length,
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
        {inSplit && (() => {
          // Look up the note we're previewing / editing once so both the
          // pane header title and its right-side actions can branch on the
          // note's status (Signed vs. Submitted / Pending Review).
          const previewNoteHoisted = (leftWorkspace === 'clinical-note-preview' || leftWorkspace === 'clinical-note-consolidated')
            ? (previewNoteId ? memberNotes.find(n => n.id === previewNoteId) : null)
              || memberNotes.find(n => (n.gapCodes || []).includes(currentCode))
            : null;
          const previewStatus = previewNoteHoisted?.status;
          return (
          <div className={styles.leftPane}>
            <div className={styles.paneHeader}>
              {(() => {
                if (leftWorkspace === 'schedule') {
                  return <span className={styles.paneTitle}>Schedule Appointment</span>;
                }
                if (leftWorkspace === 'task') {
                  return <span className={styles.paneTitle}>Add Task</span>;
                }
                if (leftWorkspace === 'clinical-note-consolidated') {
                  return <span className={styles.paneTitle}>Consolidated Clinical Note</span>;
                }
                const isPreview = leftWorkspace === 'clinical-note-preview';
                const previewNote = previewNoteHoisted;
                const codes = previewNote?.gapCodes?.length
                  ? previewNote.gapCodes
                  : [currentCode];
                const noteTitle = codes.length > 1
                  ? 'Consolidated Clinical Note'
                  : `${codes[0]} Visit Note`;
                // Preview mode shows title + "Signed by / Submitted for
                // Review to / Draft" subtitle stacked. Editable mode keeps a
                // single-line title.
                if (!isPreview) return <span className={styles.paneTitle}>{noteTitle}</span>;
                let subtitle = null;
                if (previewNote?.status === 'signed') {
                  const signer = previewNote.signedByName || previewNote.reviewerName || previewNote.authorName || 'Provider';
                  const when = previewNote.signedAt ? ` · ${formatPreviewDate(previewNote.signedAt)}` : '';
                  subtitle = `Signed by ${signer}${when}`;
                } else if (previewNote?.status === 'submitted') {
                  subtitle = `Submitted for Review to ${previewNote.reviewerName || '—'}`;
                } else if (previewNote?.status === 'draft') {
                  subtitle = `Draft · ${previewNote.authorName || 'You'} · ${formatPreviewDate(previewNote.updatedAt || previewNote.createdAt)}`;
                }
                return (
                  <div className={styles.paneTitleStack}>
                    <span className={styles.paneTitleSm}>{noteTitle}</span>
                    {subtitle && (
                      <span className={styles.paneSubtitleSm}>
                        <Icon name="solar:pen-new-square-linear" size={11} color="var(--primary-300)" />
                        {subtitle}
                      </span>
                    )}
                  </div>
                );
              })()}
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
                    canSaveDraft={clinicalNote.hasChanges}
                    canSign={clinicalNote.activeMandatoryComplete}
                  />
                ) : leftWorkspace === 'clinical-note-preview' ? (
                  // Preview affordances branch on the note's DB status:
                  //   • signed    → Displayed-to-Member + Print + Amend
                  //     (Amend seeds the editable workspace from this note's
                  //      persisted payload; the DB trigger snapshots the
                  //      prior row for versioned audit).
                  //   • submitted → Pending Review status pill + Edit
                  //     (Edit flips to the stacked consolidated editor so
                  //      the author can revise a note that is out for review
                  //      before it comes back).
                  previewStatus === 'submitted' ? (
                    <>
                      <span className={styles.previewPendingReview}>
                        <Icon name="solar:clock-circle-linear" size={16} color="var(--status-warning)" />
                        Pending Review
                      </span>
                      <span className={styles.headerDivider} />
                      <Button
                        variant="tertiary"
                        size="M"
                        leadingIcon="solar:pen-new-square-linear"
                        onClick={() => {
                          const note = previewNoteId ? memberNotes.find(n => n.id === previewNoteId) : memberNotes.find(n => (n.gapCodes || []).includes(currentCode));
                          if (note?.id) setAmendNoteId(note.id);
                          setLeftWorkspace('clinical-note-consolidated');
                        }}
                      >
                        Edit
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className={styles.previewDisplayed}>
                        <Icon name="solar:check-circle-linear" size={16} color="var(--status-success)" />
                        Displayed to Member
                      </span>
                      <span className={styles.headerDivider} />
                      <ActionButton
                        icon="solar:printer-linear"
                        size="L"
                        tooltip="Print"
                        onClick={() => {
                          const url = memberNotes.find(n => n.id === previewNoteId)?.pdfDataUrl || memberNotes.find(n => (n.gapCodes || []).includes(currentCode))?.pdfDataUrl;
                          if (url) { const w = window.open(url, '_blank'); try { w?.focus(); } catch {} }
                          else showToast('No PDF for this version');
                        }}
                      />
                      <Button
                        variant="tertiary"
                        size="M"
                        leadingIcon="solar:lock-keyhole-minimalistic-linear"
                        onClick={() => {
                          const note = previewNoteId ? memberNotes.find(n => n.id === previewNoteId) : memberNotes.find(n => (n.gapCodes || []).includes(currentCode));
                          if (note?.id) setAmendNoteId(note.id);
                          setLeftWorkspace('clinical-note');
                        }}
                      >
                        Amend
                      </Button>
                    </>
                  )
                ) : leftWorkspace === 'clinical-note-consolidated' ? (
                  <ClinicalNoteHeaderActions
                    onSaveDraft={clinicalNote.handleSaveDraft}
                    onSubmitForReview={clinicalNote.handleSubmitForReview}
                    onSaveAndSign={clinicalNote.handleSaveAndSign}
                    onSignAndPrint={clinicalNote.handleSignAndPrint}
                    canSaveDraft={clinicalNote.hasChanges}
                    canSign={clinicalNote.anyReadyForReview}
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
                        || leftWorkspace === 'clinical-note-preview'
                        || leftWorkspace === 'clinical-note-consolidated'
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
              ) : leftWorkspace === 'clinical-note-preview' ? (
                <ClinicalNotePreviewBody memberId={member?.id} gapCode={currentCode} noteId={previewNoteId} />
              ) : leftWorkspace === 'clinical-note-consolidated' ? (
                <ConsolidatedNoteBody v={clinicalNote} />
              ) : (
                <AddTaskDrawerBody {...addTask} />
              )}
            </div>
          </div>
          );
        })()}
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
            statusOpen={statusOpen} setStatusOpen={setStatusOpen} statusAnchorRect={statusAnchorRect} setStatusAnchorRect={setStatusAnchorRect} updateGapStatus={updateGapStatus}
            platformUsers={platformUsers} updateGapAssignee={updateGapAssignee}
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

          <div className={`${styles.tabContentWrap} ${activeTab === 'Tasks' ? styles.tabContentWrapFlush : ''}`}>
            {activeTab === 'Activity Log' ? (
              <div className={styles.activityLog}>
                <div className={styles.commentInput}>
                  {commentExpanded ? (
                    <Textarea autoFocus placeholder="Add a comment, use @ to mention someone" rows={3}
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
                  ? <ActivityLog entries={activityLogEntries} emptyLabel="No activity yet for this care gap." onOpenTask={openTaskFromActivity} onOpenNote={openNoteInWorkspace} />
                  : <CardSkeleton />}
              </div>
            ) : activeTab === 'Outreaches' ? (
              <OutreachTab defaultPrograms={[gap.code]} defaultLogFor="care-program" hideLogForRow />
            ) : activeTab === 'Clinical Notes' ? (
              // Flat column-headed list per Figma 1030:78586 — no timeline
              // rail, no month grouping. Card affordances are shared with
              // the Activity Log via ClinicalNoteCardActions.
              <ClinicalNotesTab entries={clinicalNoteEntries} onOpenNote={openNoteInWorkspace} onOpenTask={openTaskFromActivity} />
            ) : activeTab === 'Tasks' ? (
              // Same layout as the P360 patient profile's Tasks tab —
              // Pending / Overdue / Completed sections, checkbox rows,
              // priority + due columns, so a task looks identical in
              // both the drawer here and the P360 view.
              <TasksTab
                hideToolbar
                data={groupTasksForTab(memberTasks)}
                onTaskClick={openTaskDetail}
              />
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

      {moreMenuRect && (
        <MenuPopover
          anchorRect={moreMenuRect}
          items={MORE_ACTIONS.map(a => ({ key: a.key, label: a.label, icon: a.icon }))}
          onSelect={(key) => {
            const action = MORE_ACTIONS.find(x => x.key === key);
            if (action) runMoreAction(action);
          }}
          onClose={closeMoreMenu}
          ariaLabel="More actions"
          width={220}
        />
      )}
    </>
  );
}

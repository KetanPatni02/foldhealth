import { useState, useEffect, useRef, useMemo } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { PdfPreviewOverlay } from '../../components/PdfPreviewOverlay/PdfPreviewOverlay';
import { ClinicalNotePanel } from '../hedis-worklist/ClinicalNotePanel';
import { useAppStore } from '../../store/useAppStore';
import { toast } from '../../components/Toast/sonnerToast';
import {
  STATUS_LABELS, ASSIGNEE_OPTIONS, MEMBER_OPTIONS, TITLE_MAX, todayMMDDYYYY,
} from './TasksView.utils';
import { TaskDetailDrawerDetails } from './TaskDetailDrawerDetails';
import { TaskDetailDrawerSubtasks } from './TaskDetailDrawerSubtasks';
import { TaskDetailDrawerActivity } from './TaskDetailDrawerActivity';
import { TaskDetailDrawerHeader } from './TaskDetailDrawerHeader';
import { buildActivityLogItems } from './TaskDetailDrawer.utils.jsx';
import styles from './TasksView.module.css';

export function TaskDetailDrawer({ task, onClose, onSelectTask }) {
  const [activityTab, setActivityTab] = useState('All');
  const [activityToggle, setActivityToggle] = useState('Activity');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [subtaskName, setSubtaskName] = useState('');
  const [pdfPreview, setPdfPreview] = useState(null);
  const [editingNote, setEditingNote] = useState(false);
  const titleRef = useRef(null);
  const updateTask = useAppStore(s => s.updateTask);
  const deleteTask = useAppStore(s => s.deleteTask);
  const createTask = useAppStore(s => s.createTask);
  const claimTask = useAppStore(s => s.claimTask);
  const completeCareGapSignOffTask = useAppStore(s => s.completeCareGapSignOffTask);
  const hedisMembers = useAppStore(s => s.hedisMembers);
  const showToast = useAppStore(s => s.showToast);
  const hedisMember = task?.hedisMemberId ? hedisMembers.find(m => m.id === task.hedisMemberId) : null;
  const allTasks = useAppStore(s => s.tasks);
  const taskAuditLogs = useAppStore(s => s.taskAuditLogs);
  const fetchTaskAuditLog = useAppStore(s => s.fetchTaskAuditLog);
  const logTaskAudit = useAppStore(s => s.logTaskAudit);
  const taskPools = useAppStore(s => s.taskPools);
  const taskProfiles = useAppStore(s => s.taskProfiles);
  const allPatients = useAppStore(s => s.allPatients);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);

  useEffect(() => { if (task?.id) fetchTaskAuditLog(task.id); }, [task?.id, fetchTaskAuditLog]);

  const auditLog = task ? (taskAuditLogs[task.id] || []) : [];
  const activityLogItems = useMemo(
    () => buildActivityLogItems(auditLog, activityTab),
    [auditLog, activityTab],
  );

  if (!task) return null;

  const labels = Array.isArray(task.labels) ? task.labels : [];
  const memberInitials = task.member ? task.member.split(' ').map(w => w[0]).join('').slice(0, 2) : '';
  const assigneeInitials = task.assigned_to ? task.assigned_to.split(' ').map(w => w[0]).join('').slice(0, 2) : '';
  const subtasks = allTasks.filter(t => t.parent_task_id === task.id || (t.is_subtask && t.parent_task === task.name));
  const completedSubs = subtasks.filter(t => t.status === 'completed').length;

  const assigneeNames = (() => {
    const seen = new Set();
    const list = [];
    if (currentUserProfile?.name) { list.push(currentUserProfile.name); seen.add(currentUserProfile.name); }
    (taskProfiles || []).forEach(p => { if (p.name && !seen.has(p.name)) { list.push(p.name); seen.add(p.name); } });
    return list.length > 0 ? list : ASSIGNEE_OPTIONS;
  })();
  const memberNames = (allPatients || []).flatMap(p => p.name ? [p.name] : []);
  const memberOptionsForDrawer = memberNames.length > 0 ? memberNames : MEMBER_OPTIONS;

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'completed' && subtasks.length > 0 && completedSubs < subtasks.length) {
      toast.error(`Cannot complete: ${subtasks.length - completedSubs} subtask(s) still open`);
      return;
    }
    updateTask(task.id, { status: newStatus });
    const msg = `Status changed to ${STATUS_LABELS[newStatus]}`;
    if (newStatus === 'completed') toast.success(msg);
    else if (newStatus === 'missed') toast.error(msg);
    else toast.info(msg);
  };

  const handleTitleSave = () => {
    const trimmed = titleDraft.trim().slice(0, TITLE_MAX);
    if (trimmed && trimmed !== task.name) {
      updateTask(task.id, { name: trimmed });
      showToast('Title updated');
    }
    setEditingTitle(false);
  };

  const handleAddSubtask = async () => {
    const trimmed = subtaskName.trim();
    if (!trimmed) return;
    const sub = {
      name: trimmed.slice(0, TITLE_MAX),
      status: 'pending',
      priority: task.priority || 'medium',
      due_date: task.due_date || todayMMDDYYYY(),
      assigned_to: task.assigned_to || currentUserProfile?.name || null,
      assigned_to_id: task.assigned_to_id || currentUserProfile?.id || null,
      member: task.member,
      labels: [],
      parent_task: task.name,
      parent_task_id: task.id,
      is_subtask: true,
      attachments: 0,
      comments: 0,
      meta: '',
      description: '',
      pool: null,
      mentions: [],
      created_by: currentUserProfile?.name || 'Current User',
      created_by_id: currentUserProfile?.id || null,
    };
    const created = await createTask(sub);
    if (created) {
      logTaskAudit(task.id, 'subtask_added', { to: trimmed });
      setSubtaskName('');
      setShowAddSubtask(false);
      showToast('Subtask added');
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteTask(task.id);
    showToast('Task deleted');
    onClose();
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleTitleSave(); }
    if (e.key === 'Escape') setEditingTitle(false);
  };

  const handleAddComment = (text) => {
    if (!text) return;
    const mentions = (text.match(/@(\w+(?:\s+\w+)?)/g) || []).map(m => m.slice(1).trim());
    logTaskAudit(task.id, 'comment_added', { to: text });
    if (mentions.length > 0) {
      const existingMentions = Array.isArray(task.mentions) ? task.mentions : [];
      const newMentions = [...new Set([...existingMentions, ...mentions])];
      updateTask(task.id, { mentions: newMentions });
    }
    showToast('Comment added');
  };

  return (
    <Drawer title="Task Details" onClose={onClose}>
      <div className={styles.drawerContent}>
        <TaskDetailDrawerHeader
          task={task}
          labels={labels}
          editingTitle={editingTitle}
          titleDraft={titleDraft}
          setTitleDraft={setTitleDraft}
          setEditingTitle={setEditingTitle}
          titleRef={titleRef}
          onTitleSave={handleTitleSave}
          onTitleKeyDown={handleTitleKeyDown}
          onStatusChange={handleStatusChange}
          onClaim={async () => { await claimTask(task.id); showToast('Task claimed'); }}
          onCopyLink={() => { navigator.clipboard?.writeText(`${window.location.origin}/#/tasks?taskId=${task.id}`); showToast('Link copied'); }}
          onCopyId={() => { navigator.clipboard?.writeText(String(task.id)); showToast('ID copied'); }}
          onDelete={() => setShowDeleteConfirm(true)}
        />
        <TaskDetailDrawerDetails
          task={task}
          labels={labels}
          assigneeNames={assigneeNames}
          taskProfiles={taskProfiles}
          updateTask={updateTask}
          showToast={showToast}
          assigneeInitials={assigneeInitials}
          taskPools={taskPools}
          memberOptionsForDrawer={memberOptionsForDrawer}
          memberInitials={memberInitials}
          setPdfPreview={setPdfPreview}
          hedisMember={hedisMember}
          setEditingNote={setEditingNote}
          completeCareGapSignOffTask={completeCareGapSignOffTask}
          onClose={onClose}
          editingDesc={editingDesc}
          setEditingDesc={setEditingDesc}
          descDraft={descDraft}
          setDescDraft={setDescDraft}
        />
        <TaskDetailDrawerSubtasks
          task={task}
          subtasks={subtasks}
          completedSubs={completedSubs}
          showAddSubtask={showAddSubtask}
          setShowAddSubtask={setShowAddSubtask}
          subtaskName={subtaskName}
          setSubtaskName={setSubtaskName}
          handleAddSubtask={handleAddSubtask}
          updateTask={updateTask}
          onSelectTask={onSelectTask}
          allTasks={allTasks}
        />
        <TaskDetailDrawerActivity
          activityToggle={activityToggle}
          setActivityToggle={setActivityToggle}
          activityTab={activityTab}
          setActivityTab={setActivityTab}
          handleAddComment={handleAddComment}
          activityLogItems={activityLogItems}
          auditLog={auditLog}
        />
      </div>
      {showDeleteConfirm && (
        <ConfirmDialog
          icon="solar:danger-triangle-linear"
          iconColor="var(--status-error)"
          title="Delete this task?"
          description={subtasks.length > 0 ? `This task has ${subtasks.length} subtask(s). Deleting it will also delete all subtasks. This cannot be undone.` : 'This action cannot be undone.'}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="error"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {pdfPreview && (
        <PdfPreviewOverlay
          blob={pdfPreview.blob}
          filename={pdfPreview.filename}
          onClose={() => setPdfPreview(null)}
        />
      )}
      {editingNote && hedisMember && (
        <ClinicalNotePanel
          member={hedisMember}
          gapCode={task.hedisGapCodes?.[0]}
          year={2026}
          editingTaskId={task.id}
          onClose={() => setEditingNote(false)}
        />
      )}
    </Drawer>
  );
}

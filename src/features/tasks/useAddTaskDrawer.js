import { useState, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  STATUS_ORDER, STATUS_LABELS, PRIORITY_OPTIONS, ASSIGNEE_OPTIONS, MEMBER_OPTIONS, TITLE_MAX, todayMMDDYYYY,
} from './TasksView.utils';

export function useAddTaskDrawer({ defaultStatus, initialMember, onClose, onTaskCreated, extraFields }) {
  const initialStatus = defaultStatus || 'pending';
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState(initialStatus);
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [member, setMember] = useState(initialMember || '');
  const [pool, setPool] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [subtaskName, setSubtaskName] = useState('');
  const [stagedSubtasks, setStagedSubtasks] = useState([]);
  const editorRef = useRef(null);

  const createTask = useAppStore(s => s.createTask);
  const showToast = useAppStore(s => s.showToast);
  const taskProfiles = useAppStore(s => s.taskProfiles);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  const allPatients = useAppStore(s => s.allPatients);
  const taskPools = useAppStore(s => s.taskPools);

  const assigneeOptions = useMemo(() => {
    const list = [];
    const seenNames = new Set();
    if (currentUserProfile && currentUserProfile.name) {
      list.push({ value: currentUserProfile.name, label: `${currentUserProfile.name} (You)` });
      seenNames.add(currentUserProfile.name);
    }
    (taskProfiles || []).forEach(p => {
      if (seenNames.has(p.name)) return;
      list.push({ value: p.name, label: p.name });
      seenNames.add(p.name);
    });
    if (list.length === 0) return ASSIGNEE_OPTIONS.map(n => ({ value: n, label: n }));
    return list;
  }, [taskProfiles, currentUserProfile]);

  const memberOptions = useMemo(() => {
    const names = (allPatients || []).flatMap(p => p.name ? [p.name] : []);
    return names.length > 0 ? names : MEMBER_OPTIONS;
  }, [allPatients]);

  const isDirty =
    name.trim() !== '' ||
    dueDate !== '' ||
    assignedTo !== '' ||
    member !== '' ||
    pool !== '' ||
    description.replace(/<[^>]*>/g, '').trim() !== '' ||
    selectedLabels.length > 0 ||
    priority !== 'medium' ||
    status !== initialStatus ||
    stagedSubtasks.length > 0;

  const canSave = name.trim() !== '' && isDirty && name.length <= TITLE_MAX;

  const addStagedSubtask = () => {
    const trimmed = subtaskName.trim();
    if (!trimmed) return;
    setStagedSubtasks(prev => [...prev, trimmed.slice(0, TITLE_MAX)]);
    setSubtaskName('');
    setShowAddSubtask(false);
  };
  const removeStagedSubtask = (idx) => setStagedSubtasks(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!canSave) return;
    const me = currentUserProfile?.name || 'Dr. JeDee Potter';
    const meId = currentUserProfile?.id || null;
    const pickedAssignee = assignedTo
      ? (taskProfiles || []).find(p => p.name === assignedTo)
      : null;
    const finalAssigneeName = pool ? null : (assignedTo || me);
    const finalAssigneeId = pool
      ? null
      : (pickedAssignee?.id || (assignedTo === me ? meId : null) || meId);
    const task = {
      name: name.trim().slice(0, TITLE_MAX),
      status,
      priority,
      due_date: dueDate || todayMMDDYYYY(),
      assigned_to: finalAssigneeName,
      assigned_to_id: finalAssigneeId,
      member: member || (allPatients?.[0]?.name) || 'Celia Gerhold',
      labels: selectedLabels,
      meta: pool ? `Pool : ${pool}` : '',
      description: description || '',
      pool: pool || null,
      mentions: [],
      attachments: 0,
      comments: 0,
      is_subtask: false,
      parent_task: null,
      parent_task_id: null,
      created_by: me,
      created_by_id: meId,
      ...extraFields,
    };
    const result = await createTask(task);
    if (result) {
      await Promise.all(stagedSubtasks.map(subName => createTask({
        name: subName.slice(0, TITLE_MAX),
        status: 'pending',
        priority: 'medium',
        due_date: task.due_date,
        assigned_to: finalAssigneeName,
        assigned_to_id: finalAssigneeId,
        member: task.member,
        labels: [],
        parent_task: task.name,
        parent_task_id: result.id,
        is_subtask: true,
        attachments: 0,
        comments: 0,
        meta: '',
        description: '',
        pool: null,
        mentions: [],
        created_by: me,
        created_by_id: meId,
        ...extraFields,
      })));
      showToast('Task created');
      onTaskCreated?.(result);
    }
  };

  // Veto the drawer close when there are unsaved changes — the confirm opens
  // over the still-open drawer; "Keep editing" just dismisses the confirm.
  const guardClose = () => {
    if (isDirty) { setShowCloseConfirm(true); return false; }
    return true;
  };

  const toggleLabel = (l) => {
    setSelectedLabels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  return {
    name, setName,
    priority, setPriority,
    status, setStatus,
    dueDate, setDueDate,
    assignedTo, setAssignedTo,
    member, setMember,
    pool, setPool,
    description, setDescription,
    selectedLabels,
    showCloseConfirm, setShowCloseConfirm,
    showAddSubtask, setShowAddSubtask,
    subtaskName, setSubtaskName,
    stagedSubtasks,
    editorRef,
    assigneeOptions,
    memberOptions,
    taskPools,
    currentUserProfile,
    canSave,
    handleSave,
    guardClose,
    toggleLabel,
    addStagedSubtask,
    removeStagedSubtask,
    STATUS_ORDER,
    STATUS_LABELS,
    PRIORITY_OPTIONS,
    TITLE_MAX,
  };
}

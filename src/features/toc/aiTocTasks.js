// AI-generated TOC follow-up tasks. The worklist badge shows `patient.tasks`;
// this pool is sliced to that count so the drawer matches the cell.

import { resolveAiTaskCount } from './tocOutcome';

const AI_TOC_TASK_POOL = [
  { title: 'Complete post-discharge medication reconciliation', priority: 'high', subtasks: 2, attachments: 1, comments: 0 },
  { title: 'Schedule PCP follow-up within 7 days of discharge', priority: 'high', subtasks: 0, attachments: 0, comments: 1 },
  { title: 'Review red-flag symptoms with patient and caregiver', priority: 'medium', subtasks: 0, attachments: 1, comments: 0 },
  { title: 'Confirm home health nursing start date', priority: 'medium', subtasks: 0, attachments: 0, comments: 0 },
  { title: 'Coordinate transportation for follow-up appointment', priority: 'low', subtasks: 0, attachments: 0, comments: 0 },
  { title: 'Document social-work referral for prescription assistance', priority: 'medium', subtasks: 1, attachments: 0, comments: 2 },
];

export function buildAiTocTasks(patient) {
  const count = resolveAiTaskCount(patient);
  const due = patient?.dueOn || patient?.nextOutreach || '—';
  const pending = AI_TOC_TASK_POOL.slice(0, count).map((t, i) => ({
    id: `${patient?.id || 'toc'}-ai-${i}`,
    ...t,
    due,
  }));
  return { pending, overdue: [], completed: [] };
}

/** Map a list-row task into the Tasks worklist shape TaskDetailDrawer expects. */
export function toTaskPreview(task, patient, { done = false, overdue = false } = {}) {
  return {
    id: task.id,
    name: task.title || task.name,
    status: done ? 'completed' : overdue ? 'missed' : 'pending',
    priority: task.priority || 'medium',
    due_date: task.due || task.due_date || null,
    member: patient?.name || task.member || null,
    patient_id: patient?.id || null,
    program_code: 'TOC',
    assigned_to: patient?.assignee || null,
    assigned_to_id: null,
    description: task.context || task.description || '',
    labels: ['AI'],
    attachments: task.attachments || 0,
    comments: task.comments || 0,
    created_by: 'TOC Agent',
    completed_at: done ? (task.completedOn || new Date().toISOString()) : null,
  };
}

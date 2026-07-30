// Program Related Tasks step (Figma 482:441580). Open + Completed task lists.
// context = the "Care Program : …" / "By : …" line under the title.
// parentTask renders a "Parent Task : …" line above the title with a branch mark.
// priority: 'high' | 'medium' | 'low'; status: 'Pending' | 'Overdue' | 'Completed'.
export const PROGRAM_TASKS_MOCK = {
  open: [
    { id: 'pt-1', title: 'Record daily blood pressure readings', context: 'Care Program : Transitional Care Management (TCM)', priority: 'medium', status: 'Pending', due: '06/30/2026', subtasks: 2, attachments: 1, comments: 0 },
    { id: 'pt-2', title: 'Exercise for 30 minutes', context: 'Care Journey : Hypertension Control Journey ’24', priority: 'medium', status: 'Pending', due: '04/15/2025', subtasks: 2, attachments: 1, comments: 0 },
    { id: 'pt-3', title: 'Record daily blood pressure readings', context: 'Automation : Monthly DM2 Seminar', priority: 'medium', status: 'Pending', due: '04/15/2025', subtasks: 2, attachments: 0, comments: 3 },
    { id: 'pt-4', title: 'Send for Medication Reconciliation Sign Off', context: 'By : Deborah Hintz', priority: 'medium', status: 'Overdue', due: '03/08/2025', overdue: true, subtasks: 0, attachments: 0, comments: 0 },
  ],
  openTotal: 13,
  completed: [
    { id: 'pt-5', title: 'Sign off on ICT Meeting Summary & Care Plan', parentTask: 'Improve Appointment', context: 'By : Dr. Robert Frost', priority: 'medium', status: 'Completed', due: '03/08/2025', subtasks: 0, attachments: 1, comments: 3, done: true },
    { id: 'pt-6', title: 'Record daily blood pressure readings', context: 'By : Deborah Hintz', priority: 'medium', status: 'Completed', due: '03/08/2025', subtasks: 0, attachments: 0, comments: 0, done: true },
  ],
};

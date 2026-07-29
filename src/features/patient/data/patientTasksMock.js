// Tasks shown in the patient profile Quick View → Tasks tab.
// priority: 'high' | 'medium' | 'low' drives the P-column indicator.
// subtasks / attachments / comments render the meta-count row (0 = hidden).
export const PATIENT_TASKS_MOCK = {
  pending: [
    { id: 't-1', title: 'Review and follow up on test results for patients with urgent medical needs.', priority: 'high', due: '05/30/2024', subtasks: 2, attachments: 1, comments: 0 },
    { id: 't-2', title: 'Confirm receipts of all intake documents', priority: 'high', due: '05/30/2024', subtasks: 0, attachments: 1, comments: 3 },
    { id: 't-3', title: 'Place reminder call for appointment', priority: 'medium', due: '05/30/2024', subtasks: 0, attachments: 0, comments: 3 },
    { id: 't-4', title: 'Place reminder call for appointment', priority: 'low', due: '05/30/2024', subtasks: 0, attachments: 0, comments: 0 },
  ],
  overdue: [
    { id: 't-5', title: 'Send an ophthalmology referral', priority: 'high', due: '05/30/2024', subtasks: 2, attachments: 1, comments: 0 },
  ],
  completed: [
    { id: 't-6', title: 'Review and Update Billing and Coding Procedures', priority: 'high', due: '05/30/2024', completedOn: '09/20/2025', subtasks: 2, attachments: 1, comments: 0 },
    { id: 't-7', title: 'Develop Standardized Appointment Scheduling System', priority: 'high', due: '05/30/2024', completedOn: '09/20/2025', subtasks: 0, attachments: 1, comments: 3 },
    { id: 't-8', title: 'Develop Staff Training Programs', priority: 'medium', due: '05/30/2024', completedOn: '09/20/2025', subtasks: 0, attachments: 0, comments: 0 },
  ],
};

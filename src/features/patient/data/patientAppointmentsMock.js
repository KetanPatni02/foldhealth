// Booked appointments + reminders for a patient, shown in the program window's
// Appointment step. `programCode` ties an appointment to a care program's
// appointment type (see FALLBACK_APPOINTMENT_TYPES) — matching ones surface
// under "Program related appointments" when that program is open. `type` is
// 'Appointment' | 'Reminder'; `recurring` renders the ↻ badge.
export const PATIENT_APPOINTMENTS_MOCK = [
  { id: 'ap-1', title: 'Care Plan Review', subtitle: 'Reason for Visit', type: 'Reminder', programCode: null, date: '09/11/2024', time: '10:30 AM', assignee: 'Ivy Ralph', recurring: false },
  { id: 'ap-2', title: 'Follow up Appointment', subtitle: 'Reason for Visit', type: 'Appointment', programCode: null, date: '09/11/2024', time: '10:30 AM', assignee: 'Robert Langdon', recurring: false },
  { id: 'ap-3', title: 'Follow up Appointment', subtitle: 'Reason for Visit', type: 'Appointment', programCode: null, date: '09/11/2024', time: '10:30 AM', assignee: 'Dominic Ralph', recurring: true },
  { id: 'ap-4', title: 'Remind Patient for Lab Tests', subtitle: 'Reason for Visit', type: 'Reminder', programCode: null, date: '09/11/2024', time: '10:30 AM', assignee: 'Ivy Ralph', recurring: false },
  // Program-related bookings (matched to a program's appointment type).
  { id: 'ap-5', title: 'SNP Care Program Visit', subtitle: 'Reason for Visit', type: 'Appointment', programCode: 'SNP', date: '09/15/2024', time: '11:00 AM', assignee: 'Robert Langdon', recurring: false },
  { id: 'ap-6', title: 'Annual Wellness Visit', subtitle: 'Reason for Visit', type: 'Appointment', programCode: 'AWV', date: '09/20/2024', time: '09:00 AM', assignee: 'Ralph Kessler', recurring: false },
  { id: 'ap-7', title: 'TOC Inpatient Visit', subtitle: 'Reason for Visit', type: 'Appointment', programCode: 'TOC IP', date: '09/18/2024', time: '02:00 PM', assignee: 'Cameron Haley', recurring: false },
];

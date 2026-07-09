export const PATIENT_SYNOPSIS = `Annette Brave is a 56-year-old female with a history of Type 2 Diabetes and Hypertension. Her diabetes is currently poorly controlled with an HbA1c of 8.2% (target <7.0%). Her blood pressure is also above target at 142/88 mmHg.

She is currently enrolled in the HIU and TCM programs. On today's evaluation she appeared well, weighing 180 lb (BMI 29 kg/m\u00B2), with clear lung and heart sounds and no peripheral edema or orthostatic changes. A repeat lipid panel and basic metabolic panel have been ordered to better stratify cardiovascular and renal status before considering uptitration of her ACE inhibitor.

Her next steps include a telephonic check-in with the HIU nurse in two weeks to review home glucose logs and blood pressure readings, followed by an in-person reassessment with Dr. James Wilson on May 12, 2025 for repeat HbA1c, blood pressure measurement, and dietary log review. She is also enrolled in a monthly group diabetes education class beginning June 1, 2025, to reinforce self-management skills and ongoing support.`;

export const RECENT_NOTES = [
  { id: 'n1', title: 'SOAP Note', subtitle: 'No diagnosis reported', status: 'In Progress', statusColor: 'var(--status-warning)', createdBy: 'Dr. Emily Carter', createdDate: '02/19/2024', updatedBy: 'Dr Aldo Richman', updatedDate: '02/19/2024', template: 'SOAP Note' },
  { id: 'n2', title: 'Discharge Summary', subtitle: 'No diagnosis reported', status: 'In Progress', statusColor: 'var(--status-warning)', createdBy: 'Dr. Sarah Thompson', createdDate: '02/19/2024', updatedBy: 'Dr Aldo Richman', updatedDate: '02/19/2024', template: 'Discharge Summary' },
  { id: 'n3', title: 'Progress Note', subtitle: 'No diagnosis reported', status: 'In Progress', statusColor: 'var(--status-warning)', createdBy: 'Dr. Michael Lee', createdDate: '02/19/2024', updatedBy: 'Dr Aldo Richman', updatedDate: '02/19/2024', template: 'Progress Note' },
];

export const ACTIVE_CARE_PROGRAMS = [
  { id: 'cp1', name: 'Annual Wellness Visit (AWV)', progress: 35, status: 'Schedule with PCP', statusLink: true, statusNew: false, startDate: '09/01/2024', endDate: '02/19/2024', lastUpdated: '02/19/2024', assignee: 'Aldo Richman', pcp: 'Dr. Rob' },
  { id: 'cp2', name: 'Chronic Care Management (CCM)', progress: 60, status: 'Assigned to Nurse', statusLink: false, statusNew: false, startDate: '10/15/2024', endDate: '04/15/2025', lastUpdated: '02/19/2024', assignee: 'Sarah Kim', pcp: 'Dr. Wilson' },
  { id: 'cp3', name: 'Transitional Care (TCM)', progress: 10, status: 'New', statusLink: false, statusNew: true, startDate: '01/05/2025', endDate: '07/05/2025', lastUpdated: '02/19/2024', assignee: 'Aldo Richman', pcp: 'Dr. Rob' },
];

export const UPCOMING_APPOINTMENTS = [
  { id: 'ua1', title: 'Follow-up Appointment', subtitle: 'In-person visit', type: 'In-Person', date: '05/12/2025', time: '10:00 AM', assignee: 'Dr. James Wilson', createdBy: 'System', createdDate: '02/19/2024' },
  { id: 'ua2', title: 'Diabetes Education Class', subtitle: 'Group Session', type: 'Virtual', date: '06/01/2025', time: '2:00 PM', assignee: 'Group Session', createdBy: 'Dr. Emily Carter', createdDate: '02/19/2024' },
  { id: 'ua3', title: 'HIU Nurse Check-in', subtitle: 'Telephonic follow-up', type: 'Phone', date: '05/26/2025', time: '11:00 AM', assignee: 'Sarah Kim', createdBy: 'System', createdDate: '02/19/2024' },
];

export const CONDITION_TAGS = [
  { label: 'Diabetes', removable: true },
  { label: 'Hypertension', removable: true },
  { label: 'Needs Transportation', removable: true },
];

export const CARE_PLAN_RECOMMENDATIONS = [
  { step: 1, title: 'Lifestyle Modifications', conditions: 'Diabetes (Type 2), Hypertension, Obesity' },
  { step: 2, title: 'Early Hormonal Therapy', conditions: 'Perimenopause' },
  { step: 3, title: 'Regular Monitoring', conditions: 'Diabetes (Type 2), Hypertension, Hyperlipidemia' },
  { step: 4, title: 'Physical Therapy', conditions: 'Lower Back Pain, Osteoarthritis' },
  { step: 5, title: 'Preventive Migraine Management', conditions: 'Chronic Migraines' },
];

export const ALL_APPOINTMENTS = [
  { id: 'a1', name: 'Dr. Matt Spencer', initials: 'MS', role: 'Physician', dateTime: '01/12/2026, 01:27 PM - 01:26 AM', location: 'Fold Wellness Clinic, Florida' },
  { id: 'a2', name: 'Nurse Jane Holloway', initials: 'JH', role: 'Nursing Staff', dateTime: '01/19/2026, 03:27 AM - 11:23 PM', location: 'Fold Wellness Clinic, Florida' },
  { id: 'a3', name: 'Dr. Rachel Collins', initials: 'RC', role: 'Psychologist', dateTime: '01/20/2026, 05:39 AM - 05:28 AM', location: 'Fold Wellness Clinic, Florida' },
  { id: 'a4', name: 'Dr. Liam Moore', initials: 'LM', role: 'Surgeon', dateTime: '01/27/2026, 06:49 AM - 02:12 AM', location: 'Fold Wellness Clinic, Florida' },
  { id: 'a5', name: 'Nurse Amy Chen', initials: 'AC', role: 'Nursing Staff', dateTime: '02/13/2026, 03:17 AM - 07:44 PM', location: 'Fold Wellness Clinic, Florida' },
  { id: 'a6', name: 'Dr. Tom Kim', initials: 'TK', role: 'Physiotherapist', dateTime: '02/18/2026, 05:16 PM - 03:08 PM', location: 'Fold Wellness Clinic, Florida' },
  { id: 'a7', name: 'Nurse Bella Smith', initials: 'BS', role: 'Nursing Staff', dateTime: '02/20/2026, 03:13 AM - 06:31 AM', location: 'Fold Wellness Clinic, Florida' },
];

export const HEADER_METRICS = {
  consent: '2/4',
  acuity: 'High-Risk',
  raf: '4.234',
  rafChange: '+0.5',
  nextAppt: '07/23/2025',
  lastContact: 'UTR(45d)',
  programs: ['AWV', 'HIU'],
  programsMore: 2,
};

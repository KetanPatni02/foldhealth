// Barrier / intervention / result picklists for Med Adherence (MAC/MAD/MAH).
// Seeded from Arine's "Steps Performed" checklist, split into the three kinds
// the team asked to keep apart (barrier ≠ what was done ≠ result). The final
// Fold lists are still pending Monique's outreach-log document.

export const BARRIERS = [
  'Cost Issue',
  'Forgetfulness',
  'Lack of Understanding',
  'Refused to Refill',
  'Side Effects',
  'Transportation',
  'Insurance Coverage',
];

export const INTERVENTIONS = [
  '90/100-day conversion',
  'Autofill Set-Up',
  'Pill Box Sent',
  'CPA Approved for Max DS + Refills',
  'Refill from Manufacturer/Program Assistance',
  'Schedule MD Appointment/Labs',
  'UTC Letter Mailed',
  'LIS (Extra Help) application',
  'Pharmacist review',
  'Pharmacist counseling',
  'Mail-order enrollment',
  'Prior authorization request',
];

// Same icons as the care plan (its tables and History), so a barrier or an
// intervention reads the same wherever it shows.
export const BARRIER_ICON = 'custom:barrier';
export const INTERVENTION_ICON = 'solar:checklist-minimalistic-linear';

// The barrier(s) each intervention addresses. Marking it Done offers to
// resolve them too (still to confirm against Monique's outreach-log list).
export const INTERVENTION_ADDRESSES = {
  '90/100-day conversion': ['Transportation'],
  'Autofill Set-Up': ['Forgetfulness'],
  'Pill Box Sent': ['Forgetfulness'],
  'CPA Approved for Max DS + Refills': ['Cost Issue'],
  'Refill from Manufacturer/Program Assistance': ['Cost Issue'],
  'Schedule MD Appointment/Labs': ['Side Effects'],
  'UTC Letter Mailed': [],
  'LIS (Extra Help) application': ['Cost Issue'],
  'Pharmacist review': ['Side Effects'],
  'Pharmacist counseling': ['Lack of Understanding', 'Refused to Refill'],
  'Mail-order enrollment': ['Transportation'],
  'Prior authorization request': ['Insurance Coverage'],
};

// The intervention template (Suresh, Session 7): what to do for each barrier,
// how many days it should take and which care-team role owns it. Logging a
// barrier offers these; each one picked becomes a task for that role. A
// sample until Monique sends the team's list.
// `role`: the member's care-team field (coordinator, pharmacist, socialWorker).
export const INTERVENTION_TEMPLATE = {
  'Cost Issue': [
    { intervention: 'LIS (Extra Help) application', days: 14, role: 'socialWorker' },
    { intervention: 'Refill from Manufacturer/Program Assistance', days: 7, role: 'socialWorker' },
    { intervention: 'CPA Approved for Max DS + Refills', days: 7, role: 'pharmacist' },
  ],
  Forgetfulness: [
    { intervention: 'Autofill Set-Up', days: 3, role: 'coordinator' },
    { intervention: 'Pill Box Sent', days: 5, role: 'coordinator' },
  ],
  'Lack of Understanding': [
    { intervention: 'Pharmacist counseling', days: 5, role: 'pharmacist' },
  ],
  'Refused to Refill': [
    { intervention: 'Pharmacist counseling', days: 5, role: 'pharmacist' },
    { intervention: 'Schedule MD Appointment/Labs', days: 10, role: 'coordinator' },
  ],
  'Side Effects': [
    { intervention: 'Pharmacist review', days: 3, role: 'pharmacist' },
    { intervention: 'Schedule MD Appointment/Labs', days: 10, role: 'coordinator' },
  ],
  Transportation: [
    { intervention: '90/100-day conversion', days: 7, role: 'pharmacist' },
    { intervention: 'Mail-order enrollment', days: 7, role: 'coordinator' },
  ],
  'Insurance Coverage': [
    { intervention: 'Prior authorization request', days: 7, role: 'pharmacist' },
  ],
};
export const ROLE_LABEL = { coordinator: 'Coordinator', pharmacist: 'Pharmacist', socialWorker: 'Social worker' };

export const MEASURE_RESULTS = [
  'Rx Pick Up Confirmed',
  'Rx Pick Up Pending',
  'Pending Refill Approval',
  'Refill Too Soon',
  'Rx Changed/Discontinued by MD or Member',
  'Pending Pharmacist Review',
];

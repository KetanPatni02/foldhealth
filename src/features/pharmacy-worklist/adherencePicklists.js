// Barrier / intervention / result picklists for Med Adherence (MAD/MAH/MAC).
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
];

export const MEASURE_RESULTS = [
  'Rx Pick Up Confirmed',
  'Rx Pick Up Pending',
  'Pending Refill Approval',
  'Refill Too Soon',
  'Rx Changed/Discontinued by MD or Member',
  'Pending Pharmacist Review',
];

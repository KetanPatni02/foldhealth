// Ancillary mock data shown in the non-Codes / non-Activity tabs of the DiagPanel.
// Phase 2 uses static stubs — same content for every drawer. Phase 3 will move these
// to per-member records in the store and wire CRUD.

// Comments render as a timeline (Figma 1:53466) so each entry carries an
// absolute date + time pair, not a relative string. `edited: true` toggles
// the small "Edited" badge after the author/role.
export const COMMENTS = [
  { id: 'c1', author: 'Delores Conn', role: 'Coder',       date: '06/01/2026', time: '12:30 PM', body: 'Patient reports a rash that has developed on their arm and is causing persistent itching. Patient has requested to send a photo for further assessment.' },
  { id: 'c2', author: 'Delores Conn', role: 'Coder',       date: '06/01/2026', time: '12:30 PM', edited: true, body: 'The patient is feeling uneasy about the performance of their tracheostomy and is interested in discussing potential changes or additional treatment options.' },
  { id: 'c3', author: 'Delores Conn', role: 'Coder',       date: '06/01/2026', time: '12:30 PM', body: 'Patient reports a rash that has developed on their arm and is causing persistent itching. Patient has requested to send a photo for further assessment.' },
];

// Documents render as a 2-column table (Figma 1:54865): "Document Name |
// Status". `ext` drives the per-extension file-icon variant (PDF/DOC/IMG).
export const DOCUMENTS = [
  { id: 'd1', name: 'Progress Chart', ext: 'pdf', type: 'Charts',           uploadedBy: 'Benjamin Cummings', role: 'Coder', date: '04/12/2025', time: '14:45', status: 'passed' },
  { id: 'd2', name: 'Lab Report',     ext: 'pdf', type: 'Lab',              uploadedBy: 'Benjamin Cummings', role: 'Coder', date: '04/12/2025', time: '14:45', status: 'passed' },
  { id: 'd3', name: 'ER Visit',       ext: 'img', type: 'Charts',           uploadedBy: 'Benjamin Cummings', role: 'Coder', date: '04/12/2025', time: '14:45', status: 'passed' },
  { id: 'd4', name: 'Progress Note',  ext: 'doc', type: 'Physical Tharepy', uploadedBy: 'Benjamin Cummings', role: 'Coder', date: '04/12/2025', time: '14:45', status: 'passed' },
];

// Notes render as a table (Figma 41:358849): "Note Title | Status | Actions".
// Each note has a title, an author (with role), and a signed flag that drives
// the green "Signed" badge in the Status column.
export const NOTES = [
  { id: 'n1', title: 'Clinical Progress Note', author: 'N. Richards',  role: 'Coder',      date: '04/12/2025', time: '14:45', signed: true, body: 'Acute-on-Chronic Combined Systolic and Diastolic Heart Failure (I50.43) confirmed via July 2025 inpatient admission. Admission BNP 380 pg/mL with clinical decompensation — dyspnea, orthopnea, 6 lb weight gain, bilateral pitting edema. Echo confirmed EF 45% with Grade II diastolic dysfunction. IV diuresis with Furosemide 80mg BID resulted in 4.2L net negative fluid balance. Discharge BNP 210 pg/mL. AKI (N17.9) noted as secondary cardiorenal complication.' },
];

// Claims render as a timeline (Figma 41:364778) — each carries submission
// date + time + provider so the meta line reads "date · time · provider".
export const CLAIMS = [
  { id: 'cl1', number: 'CLM-7845921', dos: '03/04/2025', amount: '$1,284.50', status: 'Paid',    date: '03/06/2025', time: '09:15 AM', submittedBy: 'Deborah Hintz', role: 'Coder' },
  { id: 'cl2', number: 'CLM-7845944', dos: '06/11/2025', amount: '$892.00',   status: 'Pending', date: '06/13/2025', time: '11:00 AM', submittedBy: 'Deborah Hintz', role: 'Coder' },
];

export const OUTREACH = [
  { id: 'o1', type: 'Phone Call', channel: 'Voice', time: 'Today, 2:15 PM', by: 'Delores Conn', outcome: 'Spoke with patient — confirmed next appointment' },
  { id: 'o2', type: 'SMS', channel: 'Text', time: 'Yesterday, 10:30 AM', by: 'System', outcome: 'Appointment reminder delivered' },
  { id: 'o3', type: 'Email', channel: 'Email', time: '3 days ago', by: 'Care Team', outcome: 'Medication reconciliation summary sent' },
  { id: 'o4', type: 'Phone Call', channel: 'Voice', time: '1 week ago', by: 'A. Beauchamp', outcome: 'No answer — voicemail left' },
];

// History renders as a 4-column table (Figma 1:65653): "DOS | HCC Code |
// Claims | ICD Status". Each row summarizes one HCC review for a given DOS;
// `icdStatus` drives the green ✓ / red ✗ / dash button in the last column.
export const HISTORY = [
  { id: 'h1', dos: '03/04/2025', hccCode: 'HCC 18',  hccName: 'Diabetes w/ Complications', reviewedAt: '06/27/2025', by: 'A. Beauchamp',  role: 'Support Team', claims: 1, icdStatus: 'open'      },
  { id: 'h2', dos: '06/11/2025', hccCode: 'HCC 148', hccName: 'Diabetes w/ Complications', reviewedAt: '06/27/2025', by: 'Deborah Hintz', role: 'Coder',        claims: 1, icdStatus: 'accepted'  },
  { id: 'h3', dos: '01/10/2026', hccCode: 'HCC 20',  hccName: 'Diabetes w/ Complications', reviewedAt: '06/27/2025', by: 'Dr Aldo Richman', role: 'Physician',  claims: 1, icdStatus: 'open'      },
  { id: 'h4', dos: '03/10/2026', hccCode: 'HCC 18',  hccName: 'Diabetes w/ Complications', reviewedAt: '06/27/2025', by: 'Deborah Hintz', role: 'Coder',        claims: 1, icdStatus: 'dismissed' },
];

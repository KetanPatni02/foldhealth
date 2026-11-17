// Patient outreach history for the HCC Patient Outreach tab: the tab falls
// back to these while patient_outreach is missing or empty, and
// `bun run seed` writes them (patient_key resolved from hcc_members by name).
// Mostly PCP office calls, as in practice, plus one member call and a Note.
export const PATIENT_OUTREACH_MOCK = [
  {
    id: 'po-ab-1', patientName: 'Annette Brave', recipientType: 'pcp', receivedBy: 'Dr. Roland G. (PCP)',
    mode: 'Call', direction: 'outgoing', callVia: 'Practice Line (800 000-0000)', calledTo: 'Dr. Roland G. (PCP)',
    durationSec: 262, category: 'Successful', outcome: 'Spoke with Provider',
    notes: 'Requested the latest A1c and retinal exam notes. Office will fax them by Friday.',
    loggedBy: 'Delores Conn', loggedByRole: 'Support', loggedAt: '2026-09-01T10:12:00',
  },
  {
    id: 'po-ab-2', patientName: 'Annette Brave', recipientType: 'pcp', receivedBy: 'Dr. Roland G. (PCP)',
    mode: 'Call', direction: 'outgoing', callVia: 'Practice Line (800 000-0000)', calledTo: 'Dr. Roland G. (PCP)',
    durationSec: 45, category: 'Unsuccessful', outcome: 'No Answer / Left Voicemail',
    notes: 'Left a voicemail asking for the visit note from 08/26.',
    loggedBy: 'Delores Conn', loggedByRole: 'Support', loggedAt: '2026-09-15T14:40:00',
  },
  {
    id: 'po-ab-3', patientName: 'Annette Brave', recipientType: 'pcp', receivedBy: 'Dr. Roland G. (PCP)',
    mode: 'Email', emailTo: 'records@rolandclinic.example', emailSubject: 'Records request: visit notes',
    emailBody: 'Please send the 08/26 visit note and the latest echo report.',
    category: 'Successful', outcome: 'Spoke with Provider', notes: '',
    loggedBy: 'Marie Beauchamp', loggedByRole: 'Coder', loggedAt: '2026-10-02T09:05:00',
  },
  {
    id: 'po-ab-4', patientName: 'Annette Brave', recipientType: 'member', receivedBy: 'Annette Brave (Member)',
    mode: 'Call', direction: 'outgoing', callVia: 'Dr. Roland G. (PCP)', calledTo: 'Annette Brave (Member)',
    durationSec: 180, category: 'Successful', outcome: 'Spoke with Patient',
    notes: 'Member confirmed the 11/20 visit with Dr. Roland G.',
    loggedBy: 'Delores Conn', loggedByRole: 'Support', loggedAt: '2026-11-03T11:30:00',
  },
  {
    id: 'po-ab-5', patientName: 'Annette Brave', recipientType: 'pcp', receivedBy: 'Dr. Roland G. (PCP)',
    mode: 'In Person', category: 'Note',
    notes: 'Internal: office prefers email for records requests.',
    loggedBy: 'Marie Beauchamp', loggedByRole: 'Coder', loggedAt: '2026-11-04T16:00:00',
  },
  {
    id: 'po-fg-1', patientName: 'Frank Green', recipientType: 'pcp', receivedBy: 'Dr. Sandra K. (PCP)',
    mode: 'Call', direction: 'outgoing', callVia: 'Practice Line (800 000-0000)', calledTo: 'Dr. Sandra K. (PCP)',
    durationSec: 360, category: 'Successful', outcome: 'Spoke with Provider',
    notes: 'Spirometry was done in September; results will be faxed.',
    loggedBy: 'Delores Conn', loggedByRole: 'Support', loggedAt: '2026-10-21T13:15:00',
  },
];

// HCC Outreach history (Astrana): outreach to the Member and the PCP about
// the member's HCC gaps. The HCC chart's Outreach tab falls back to these
// when hcc_outreach_logs is empty or missing, and `bun run seed` writes them.
// `hccs` hold the gap's full name; the feed's badge shows "HCC 37".
const HCC_37 = 'HCC 37 - Diabetes with Chronic Complications';
const HCC_155 = 'HCC 155 - Major Depressive Disorder, Moderate';
const HCC_224 = 'HCC 224 - Acute on Chronic Heart Failure';
const HCC_111 = 'HCC 111 - COPD';
const HCC_238 = 'HCC 238 - Cardiac Arrhythmias and Heart Block';

const SUCCESS = 'var(--status-success)';
const ERROR = 'var(--status-error)';
const NOTE = 'var(--status-warning)';

export const HCC_OUTREACH_MOCK = [
  {
    id: 'hcco-ab-1', memberName: 'Annette Brave', logDate: '2025-11-04', logTime: '10:12 AM',
    type: 'Call', title: 'Outgoing Call', author: 'Delores Conn (Co-Ordinator)',
    hccs: [HCC_37], outcome: 'Provider Communication', outcomeColor: NOTE,
    note: 'Called Dr. Roland G.\'s office to request the latest A1c and retinal exam notes for HCC 37.',
    callDetails: {
      direction: 'outgoing', via: 'Delores Conn (581 824-1591)', to: 'Dr. Roland G. (PCP) (702 555-0148)',
      callType: 'Provider', durationMin: 4,
      transcript: [
        { speaker: 'Delores Conn', t: '00:04', text: 'Hi, this is Delores from Astrana, calling about records for Annette Brave.' },
        { speaker: 'Front Desk', t: '00:11', text: 'Sure, what dates do you need?' },
      ],
    },
  },
  {
    id: 'hcco-ab-2', memberName: 'Annette Brave', logDate: '2025-12-09', logTime: '02:40 PM',
    type: 'Call', title: 'Outgoing Call', author: 'Delores Conn (Co-Ordinator)',
    hccs: [], outcome: 'No Answer', outcomeColor: ERROR,
    note: 'Called the member to confirm her upcoming PCP visit. No answer, left a voicemail.',
    callDetails: {
      direction: 'outgoing', via: 'Delores Conn (581 824-1591)', to: 'Annette Brave (Member) (702 555-0193)',
      callType: 'Member', durationMin: 1, transcript: [],
    },
  },
  {
    id: 'hcco-ab-3', memberName: 'Annette Brave', logDate: '2026-01-15', logTime: '11:05 AM',
    type: 'Email', title: 'Email', author: 'Marie Beauchamp (Coder)',
    hccs: [HCC_155, HCC_224], outcome: 'Records Requested', outcomeColor: NOTE,
    note: 'Emailed the records request for the PHQ-9 and the last echo to the PCP office.',
  },
  {
    id: 'hcco-ab-4', memberName: 'Annette Brave', logDate: '2026-01-29', logTime: '09:30 AM',
    type: 'Call', title: 'Incoming Call', author: 'Delores Conn (Co-Ordinator)',
    hccs: [HCC_224], outcome: 'Provider Communication', outcomeColor: SUCCESS,
    note: 'PCP office called back: the echo is uploaded to the portal and the visit note will follow.',
    callDetails: {
      direction: 'incoming', via: 'Practice Line (800 000-0000)', to: 'Dr. Roland G. (PCP) (702 555-0148)',
      callType: 'Provider', durationMin: 3, transcript: [],
    },
  },
  {
    id: 'hcco-fg-1', memberName: 'Frank Green', logDate: '2025-10-21', logTime: '01:15 PM',
    type: 'Call', title: 'Outgoing Call', author: 'Delores Conn (Co-Ordinator)',
    hccs: [HCC_111], outcome: 'Provider Communication', outcomeColor: SUCCESS,
    note: 'Dr. Sandra K. confirmed spirometry was done in September; results will be faxed.',
    callDetails: {
      direction: 'outgoing', via: 'Delores Conn (581 824-1591)', to: 'Dr. Sandra K. (PCP) (702 555-0177)',
      callType: 'Provider', durationMin: 6, transcript: [],
    },
  },
  {
    id: 'hcco-fg-2', memberName: 'Frank Green', logDate: '2026-02-03', logTime: '10:45 AM',
    type: 'SMS', title: 'SMS Sent', author: 'Delores Conn (Co-Ordinator)',
    hccs: [], outcome: 'Message Delivered', outcomeColor: SUCCESS,
    note: 'Reminded the member to bring his inhalers to the Feb 12 visit.',
  },
  {
    id: 'hcco-bc-1', memberName: 'Brian Carter', logDate: '2026-01-08', logTime: '03:20 PM',
    type: 'Call', title: 'Outgoing Call', author: 'Marie Beauchamp (Coder)',
    hccs: [HCC_238, HCC_37], outcome: 'Provider Communication', outcomeColor: NOTE,
    note: 'Asked Dr. Ulysses H. to document the arrhythmia type and current anticoagulation at the next visit.',
    callDetails: {
      direction: 'outgoing', via: 'Marie Beauchamp (581 824-1592)', to: 'Dr. Ulysses H. (PCP) (702 555-0110)',
      callType: 'Provider', durationMin: 5, transcript: [],
    },
  },
];

export const PROGRAM_ACTIVITY_BY_MONTH = [
  {
    month: 'January 2025',
    cards: [
      {
        id: 'SNP-Jan',
        date: '1/30',
        day: 'Mon',
        program: 'SNP Program Updates',
        status: 'Engaged',
        statusType: 'success',
        activities: '3 Activities: Previsit Details \u2022 Upload Document \u2022 Send Letter \u2022 Outreach Log',
        avatars: [
          { initials: 'DC', variant: 'assignee' },
          { initials: 'SP', variant: 'assignee' },
          { initials: '+1', variant: 'count' },
        ],
        expanded: true,
        timelineItems: [
          { time: '02:30 PM', coordinator: 'Delores Conn (Co-Ordinator)', title: 'AMTX COC UTR Letter', status: 'Send Successfully to Patient', statusType: 'success', iconType: 'document', iconBg: '#e5f8fb', iconColor: '#109cae' },
          { time: '02:30 PM', coordinator: 'Delores Conn (Co-Ordinator)', title: 'Discharge Summary Document Added', status: '', statusType: '', iconType: 'document', iconBg: '#fdf7e5', iconColor: '#eeb200' },
          { time: '02:30 PM', coordinator: 'Delores Conn (Co-Ordinator)', title: 'Pre-visit Details', status: 'Reviewed', statusType: 'success', iconType: 'clipboard', iconBg: '#eee5ff', iconColor: '#5800ff' },
          { date: '06/01', time: '12:30 PM', coordinator: 'Delores Conn (Co-Ordinator)', title: '4th Outreach - Outgoing Call', status: 'Attended / Scheduled Appointment', statusType: 'success', iconType: 'call', iconBg: '#fff', iconColor: '#6f7a90' },
        ],
      },
    ],
  },
  {
    month: 'December 2024',
    cards: [
      {
        id: 'SNP-Dec',
        date: '12/30',
        day: 'Mon',
        program: 'SNP Program Updates',
        status: 'Engaged',
        statusType: 'success',
        activities: '3 Activities: Previsit Details \u2022 Upload Document \u2022 Send Letter \u2022 Outreach Log',
        avatars: [
          { initials: 'DC', variant: 'assignee' },
          { initials: 'SP', variant: 'assignee' },
          { initials: '+1', variant: 'count' },
        ],
        expanded: false,
        timelineItems: [],
      },
      {
        id: 'TOC-Dec',
        date: '1/11',
        day: 'Mon',
        program: 'TOC Program Updates',
        status: 'UTR',
        statusType: 'error',
        activities: '3 Activities: Previsit Details \u2022 Upload Document \u2022 Send Letter \u2022 Outreach Log',
        avatars: [{ initials: 'DC', variant: 'assignee' }],
        expanded: false,
        timelineItems: [],
      },
      {
        id: 'HUI-Dec',
        date: '12/11',
        day: 'Sat',
        program: 'HUI Program Updates',
        status: 'New',
        statusType: 'primary',
        activities: '3 Activities: Previsit Details \u2022 Upload Document \u2022 Send Letter \u2022 Outreach Log',
        avatars: [
          { initials: 'AJ', variant: 'assignee' },
          { initials: 'SP', variant: 'assignee' },
          { initials: '+1', variant: 'count' },
        ],
        expanded: false,
        timelineItems: [],
      },
    ],
  },
];

export const PROFILE_TABS = [
  'Overview', 'Timeline', 'Notes', 'Assessments', 'Care Management',
  'Care Programs', 'Tasks', 'Documents', 'Orders & Referrals', 'Demographics',
];

export const CARE_PROGRAMS_MOCK = [
  {
    id: 'cp-1',
    name: 'Annual Wellness Visit (AWV)',
    acuity: 'High',
    status: 'Enrolled',
    statusColor: 'var(--status-success)',
    startDate: '09/01/2024',
    endDate: '02/19/2024',
    lastUpdated: '02/19/2024',
    assignee: 'Aldo Richman',
    pcp: 'Dr. Robert Frost',
    progress: 0.75,
  },
  {
    id: 'cp-2',
    name: 'SNP Care Program (SNP)',
    acuity: null,
    status: 'Engaged',
    statusColor: 'var(--primary-300)',
    startDate: '03/15/2024',
    endDate: '02/19/2024',
    lastUpdated: '02/19/2024',
    assignee: 'Ivy Ralph',
    pcp: 'Dr. Robert Frost',
    progress: 0.6,
  },
  {
    id: 'cp-3',
    name: 'High Utilizers (HIU)',
    acuity: null,
    status: 'New',
    statusColor: 'var(--primary-300)',
    startDate: '03/15/2024',
    endDate: '02/19/2024',
    lastUpdated: '02/19/2024',
    assignee: 'Aldo Richman',
    pcp: 'Dr. John Doe',
    progress: 0,
  },
  {
    id: 'cp-4',
    name: 'Transitional Care Management (TCM)',
    acuity: null,
    status: 'Unable to Reach',
    statusColor: 'var(--status-error)',
    startDate: '03/15/2024',
    endDate: '02/19/2024',
    lastUpdated: '02/19/2024',
    assignee: 'Aldo Richman',
    pcp: 'Dr. Robert Frost',
    progress: 0.15,
  },
];

export const CP_SUB_TABS = ['All', 'New', 'Enrolled', 'Completed', 'Closed'];

export const CP_FILTERS = [
  { key: 'assignee', label: 'Assigned to' },
  { key: 'program', label: 'Care Program' },
  { key: 'status', label: 'Status' },
  { key: 'subStatus', label: 'Sub-Status' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
];

export const CM_FILTERS = [
  { label: 'Date' },
  { label: 'Assigned to' },
  { label: 'Status' },
  { label: 'Program', active: true, value: 'All' },
  { label: 'Action Type' },
  { label: 'Action Status' },
];

export const PROGRAM_STEPS_MOCK = [
  { id: 'step-1', name: 'Outreach', status: 'pending' },
  { id: 'step-2', name: 'Letters', status: 'completed', mandatory: true },
  {
    id: 'step-3', name: 'Program Directives', type: 'section', expanded: true,
    children: [
      { id: 'step-3a', name: 'Pre-visit', status: 'completed', mandatory: true },
      { id: 'step-3b', name: 'HRA', status: 'completed', hasAlert: true },
      { id: 'step-3c', name: 'BRCSI Assessment', status: 'completed' },
      { id: 'step-3d', name: 'SNP Assessment', status: 'completed', mandatory: true },
    ],
  },
  {
    id: 'step-4', name: 'Model of Care', type: 'section', expanded: false,
    children: [
      { id: 'step-4a', name: 'Care Plan', status: 'completed', mandatory: true },
    ],
  },
  { id: 'step-5', name: 'ICT Appointment', status: 'completed', mandatory: true },
  { id: 'step-6', name: 'Post Visit Checklist', status: 'completed', mandatory: true },
  { id: 'step-7', name: 'Open Care Gaps', status: 'pending' },
  { id: 'step-8', name: 'Medication Reconciliation', status: 'pending' },
  { id: 'step-9', name: 'Program Related Task', status: 'pending' },
  { id: 'step-10', name: 'Program Related Files', status: 'pending', mandatory: true },
  { id: 'step-11', name: 'Referral Review', status: 'pending', mandatory: true },
];

export const PROGRAM_LETTERS_MOCK = [
  { id: 'l-1', fileName: 'AMTX COC UTR Letter', fileType: 'PDF', sentVia: 'Email', lastSent: '02/19/2024', sentBy: 'Delores Conn' },
  { id: 'l-2', fileName: 'Discharge Summary', fileType: 'PDF', sentVia: 'Mail', lastSent: '02/15/2024', sentBy: 'Aldo Richman' },
  { id: 'l-3', fileName: 'Welcome Letter', fileType: 'PDF', sentVia: 'Email', lastSent: '01/10/2024', sentBy: 'Ivy Ralph' },
];

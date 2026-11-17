export const ACTIVE_CARE_PROGRAMS = [
  { id: 'cp1', name: 'Annual Wellness Visit (AWV)', progress: 35, status: 'Schedule with PCP', statusLink: true, statusNew: false, startDate: '09/01/2024', endDate: '02/19/2024', lastUpdated: '02/19/2024', assignee: 'Aldo Richman', pcp: 'Dr. Rob' },
  { id: 'cp2', name: 'Chronic Care Management (CCM)', progress: 60, status: 'Assigned to Nurse', statusLink: false, statusNew: false, startDate: '10/15/2024', endDate: '04/15/2025', lastUpdated: '02/19/2024', assignee: 'Sarah Kim', pcp: 'Dr. Wilson' },
  { id: 'cp3', name: 'Transitional Care (TCM)', progress: 10, status: 'New', statusLink: false, statusNew: true, startDate: '01/05/2025', endDate: '07/05/2025', lastUpdated: '02/19/2024', assignee: 'Aldo Richman', pcp: 'Dr. Rob' },
];

export const CONDITION_TAGS = [
  { label: 'Diabetes', removable: true },
  { label: 'Hypertension', removable: true },
  { label: 'Needs Transportation', removable: true },
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

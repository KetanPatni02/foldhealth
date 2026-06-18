// AWV (Annual Wellness Visit) worklist mock data. Mirrors the shape used
// by the HCC worklist (avatar initials + name + memberId + clinical
// vitals: decile / advillness / frailty / risk level) plus AWV-specific
// program tracking (status, due date, last AWV, NP appointment).

const C = {
  error:   'var(--status-error)',
  warning: 'var(--status-warning)',
  blue:    'var(--status-info)',
  success: 'var(--status-success)',
  grey200: 'var(--neutral-200)',
  grey300: 'var(--neutral-300)',
};

export const AWV_COLUMNS = [
  { k: 'status',   lb: 'Program Status',    w: 150 },
  { k: 'due',      lb: 'Due Date',          w: 140 },
  { k: 'outreach', lb: 'Outreach',          w: 150 },
  { k: 'assignee', lb: 'Assignee',          w: 170 },
  { k: 'np',       lb: 'NP Appointment',    w: 160 },
  { k: 'lastAwv',  lb: 'Last AWV Date',     w: 130 },
  { k: 'dec',      lb: 'Decile',            w: 80 },
  { k: 'ad',       lb: 'Advillness',        w: 100 },
  { k: 'fr',       lb: 'Frailty',           w: 90 },
  { k: 'rl',       lb: 'Risk Level',        w: 110 },
  { k: 'task',     lb: 'Task',              w: 90 },
];

// Program status — shapes the colored pill. Keep keys short (used as
// values) and labels human-readable.
export const AWV_STATUS = {
  'New':                 { color: C.blue,    bg: 'rgba(20,94,204,0.08)'  },
  'Outreach Required':   { color: C.warning, bg: 'rgba(217,165,11,0.10)' },
  'Awaiting Schedule':   { color: C.warning, bg: 'rgba(217,165,11,0.10)' },
  'Scheduled':           { color: C.success, bg: 'rgba(0,155,83,0.08)'   },
  'In Progress':         { color: C.blue,    bg: 'rgba(20,94,204,0.08)'  },
  'Completed':           { color: C.success, bg: 'rgba(0,155,83,0.08)'   },
  'Declined':            { color: C.error,   bg: 'rgba(215,40,37,0.08)'  },
};

// Risk-level pill colors (Low / Medium / High).
export const RISK_COLOR = {
  Low:    { color: C.success, bg: 'rgba(0,155,83,0.08)'   },
  Medium: { color: C.warning, bg: 'rgba(217,165,11,0.10)' },
  High:   { color: C.error,   bg: 'rgba(215,40,37,0.08)'  },
};

// 25 members — variety of program-status / due-date / risk so filter
// chips have meaningful buckets and the worklist looks realistic.
export const AWV_MEMBERS = [
  { id: 'awv-1',  in: 'AB', name: 'Annette Brave',    memberId: 'M-1000-2500', g: 'M', age: '67y 3m', status: 'Outreach Required', due: '08/15/2026', dueLabel: 'Due in 5D',    dueCol: C.blue,    outreach: 3, lastOutreach: '07/22/2026', assignee: 'A. Beauchamp', assigneeIn: 'AB', npAppt: null,         lastAwv: '08/12/2025', dec: '9',  ad: '3', fr: '2', rl: 'High',   task: 2 },
  { id: 'awv-2',  in: 'FG', name: 'Frank Green',      memberId: 'M-1200-1300', g: 'M', age: '68y 8m', status: 'Awaiting Schedule', due: '07/30/2026', dueLabel: 'Overdue: 5D',  dueCol: C.error,   outreach: 5, lastOutreach: '07/28/2026', assignee: 'M. Thompson', assigneeIn: 'MT', npAppt: '08/22/2026', lastAwv: '06/04/2025', dec: '7',  ad: '4', fr: '3', rl: 'Medium', task: 1 },
  { id: 'awv-3',  in: 'BC', name: 'Brian Carter',     memberId: 'M-1410-2210', g: 'M', age: '72y 5m', status: 'Scheduled',         due: '09/02/2026', dueLabel: 'Due in 21D',   dueCol: C.grey200, outreach: 2, lastOutreach: '07/14/2026', assignee: 'L. Torrance', assigneeIn: 'LT', npAppt: '09/02/2026', lastAwv: '09/18/2024', dec: '10', ad: '6', fr: '4', rl: 'High',   task: 3 },
  { id: 'awv-4',  in: 'DE', name: 'David Evans',      memberId: 'M-1820-9100', g: 'M', age: '75y 1m', status: 'In Progress',       due: '08/10/2026', dueLabel: 'Due Today',    dueCol: C.warning, outreach: 4, lastOutreach: '08/09/2026', assignee: 'E. Johnson',  assigneeIn: 'EJ', npAppt: '08/10/2026', lastAwv: '07/20/2025', dec: '10', ad: '5', fr: '5', rl: 'High',   task: 2 },
  { id: 'awv-5',  in: 'GH', name: 'Grace Hill',       memberId: 'M-1136-2748', g: 'F', age: '70y 10m', status: 'Completed',        due: '06/30/2026', dueLabel: 'Completed',    dueCol: C.success, outreach: 6, lastOutreach: '06/25/2026', assignee: 'O. Twist',    assigneeIn: 'OT', npAppt: '06/30/2026', lastAwv: '06/30/2026', dec: '8',  ad: '3', fr: '3', rl: 'Medium', task: 0 },
  { id: 'awv-6',  in: 'CD', name: 'Cynthia Davis',    memberId: 'M-1490-3300', g: 'F', age: '65y 2m', status: 'New',               due: '09/12/2026', dueLabel: 'Due in 30D',   dueCol: C.grey200, outreach: 0, lastOutreach: null,         assignee: 'A. Beauchamp', assigneeIn: 'AB', npAppt: null,         lastAwv: '07/30/2025', dec: '5',  ad: '1', fr: '1', rl: 'Low',    task: 1 },
  { id: 'awv-7',  in: 'EF', name: 'Emily Foster',     memberId: 'M-1750-4400', g: 'F', age: '60y 0m', status: 'Outreach Required', due: '08/14/2026', dueLabel: 'Due in 4D',    dueCol: C.blue,    outreach: 1, lastOutreach: '08/05/2026', assignee: 'K. Stroman',  assigneeIn: 'KS', npAppt: null,         lastAwv: '08/01/2025', dec: '6',  ad: '2', fr: '1', rl: 'Low',    task: 1 },
  { id: 'awv-8',  in: 'WJ', name: 'William Jammy',    memberId: 'M-1153-2779', g: 'M', age: '60y 10m', status: 'Awaiting Schedule', due: '08/20/2026', dueLabel: 'Due in 10D',  dueCol: C.warning, outreach: 4, lastOutreach: '07/28/2026', assignee: 'Oliver Twist', assigneeIn: 'OT', npAppt: null,        lastAwv: '01/20/2024', dec: '9',  ad: '4', fr: '2', rl: 'Medium', task: 2 },
  { id: 'awv-9',  in: 'JC', name: 'Jessica Clark',    memberId: 'M-1510-3430', g: 'F', age: '59y 4m', status: 'New',               due: '10/01/2026', dueLabel: 'Due in 45D',   dueCol: C.grey200, outreach: 0, lastOutreach: null,         assignee: null,           assigneeIn: null, npAppt: null,         lastAwv: '06/15/2025', dec: '4',  ad: '1', fr: '1', rl: 'Low',    task: 0 },
  { id: 'awv-10', in: 'RS', name: 'Richard Scott',    memberId: 'M-1357-3151', g: 'M', age: '64y 5m', status: 'Outreach Required', due: '09/05/2026', dueLabel: 'Due in 22D',   dueCol: C.grey200, outreach: 2, lastOutreach: '07/30/2026', assignee: 'D. Hintz',     assigneeIn: 'DH', npAppt: null,         lastAwv: '09/02/2025', dec: '6',  ad: '2', fr: '2', rl: 'Medium', task: 1 },
  { id: 'awv-11', in: 'DN', name: 'Dorothy Nguyen',   memberId: 'M-1340-3120', g: 'F', age: '77y 0m', status: 'Declined',          due: '07/15/2026', dueLabel: 'Declined',     dueCol: C.error,   outreach: 7, lastOutreach: '07/14/2026', assignee: 'M. Thompson',  assigneeIn: 'MT', npAppt: null,         lastAwv: '12/12/2024', dec: '8',  ad: '4', fr: '4', rl: 'High',   task: 2 },
  { id: 'awv-12', in: 'PM', name: 'Patricia Moore',   memberId: 'M-1306-3058', g: 'F', age: '62y 8m', status: 'Scheduled',         due: '08/28/2026', dueLabel: 'Due in 18D',   dueCol: C.warning, outreach: 2, lastOutreach: '08/01/2026', assignee: 'A. Beauchamp', assigneeIn: 'AB', npAppt: '08/28/2026', lastAwv: '08/15/2025', dec: '7',  ad: '3', fr: '3', rl: 'Medium', task: 1 },
  { id: 'awv-13', in: 'CR', name: 'Charles Rivera',   memberId: 'M-1323-3089', g: 'M', age: '73y 9m', status: 'Outreach Required', due: '08/12/2026', dueLabel: 'Due in 2D',    dueCol: C.warning, outreach: 1, lastOutreach: '08/08/2026', assignee: 'L. Torrance',  assigneeIn: 'LT', npAppt: null,         lastAwv: '07/22/2025', dec: '8',  ad: '4', fr: '3', rl: 'Medium', task: 2 },
  { id: 'awv-14', in: 'MJ', name: 'Michelle Jackson', memberId: 'M-1442-3306', g: 'F', age: '61y 5m', status: 'Completed',         due: '05/05/2026', dueLabel: 'Completed',    dueCol: C.success, outreach: 3, lastOutreach: '05/04/2026', assignee: 'E. Johnson',   assigneeIn: 'EJ', npAppt: '05/05/2026', lastAwv: '05/05/2026', dec: '6',  ad: '2', fr: '2', rl: 'Low',    task: 0 },
  { id: 'awv-15', in: 'LC', name: 'Linda Chen',       memberId: 'M-1272-2996', g: 'F', age: '66y 1m', status: 'Awaiting Schedule', due: '09/20/2026', dueLabel: 'Due in 40D',   dueCol: C.grey200, outreach: 5, lastOutreach: '08/01/2026', assignee: 'D. Hintz',     assigneeIn: 'DH', npAppt: null,         lastAwv: '10/12/2024', dec: '9',  ad: '5', fr: '4', rl: 'High',   task: 3 },
  { id: 'awv-16', in: 'KB', name: 'Kevin Brown',      memberId: 'M-1391-3213', g: 'M', age: '58y 11m', status: 'New',              due: '11/05/2026', dueLabel: 'Due in 80D',   dueCol: C.grey200, outreach: 0, lastOutreach: null,         assignee: null,            assigneeIn: null, npAppt: null,         lastAwv: '08/10/2025', dec: '3',  ad: '1', fr: '1', rl: 'Low',    task: 0 },
  { id: 'awv-17', in: 'SL', name: 'Sandra Lee',       memberId: 'M-1450-4012', g: 'F', age: '68y 3m', status: 'In Progress',       due: '08/11/2026', dueLabel: 'Due Today',    dueCol: C.warning, outreach: 4, lastOutreach: '08/10/2026', assignee: 'L. Torrance',  assigneeIn: 'LT', npAppt: '08/11/2026', lastAwv: '09/28/2025', dec: '9',  ad: '5', fr: '4', rl: 'High',   task: 1 },
  { id: 'awv-18', in: 'JW', name: 'James Walker',     memberId: 'M-1561-4520', g: 'M', age: '78y 2m', status: 'Outreach Required', due: '07/25/2026', dueLabel: 'Overdue: 2w',  dueCol: C.error,   outreach: 8, lastOutreach: '07/24/2026', assignee: 'M. Thompson',  assigneeIn: 'MT', npAppt: null,         lastAwv: '01/22/2025', dec: '10', ad: '7', fr: '5', rl: 'High',   task: 4 },
  { id: 'awv-19', in: 'TR', name: 'Thomas Reed',      memberId: 'M-1620-5025', g: 'M', age: '74y 6m', status: 'Scheduled',         due: '09/10/2026', dueLabel: 'Due in 30D',   dueCol: C.grey200, outreach: 1, lastOutreach: '08/05/2026', assignee: 'O. Twist',     assigneeIn: 'OT', npAppt: '09/10/2026', lastAwv: '02/01/2025', dec: '9',  ad: '6', fr: '4', rl: 'High',   task: 2 },
  { id: 'awv-20', in: 'AW', name: 'Anita White',      memberId: 'M-1730-5530', g: 'F', age: '69y 11m', status: 'Outreach Required', due: '08/16/2026', dueLabel: 'Due in 6D',   dueCol: C.blue,    outreach: 2, lastOutreach: '07/29/2026', assignee: 'K. Stroman',   assigneeIn: 'KS', npAppt: null,         lastAwv: '08/14/2025', dec: '7',  ad: '3', fr: '3', rl: 'Medium', task: 2 },
  { id: 'awv-21', in: 'CR', name: 'Charles Rivera',   memberId: 'M-1820-6210', g: 'M', age: '63y 9m', status: 'New',               due: '10/15/2026', dueLabel: 'Due in 60D',   dueCol: C.grey200, outreach: 0, lastOutreach: null,         assignee: 'A. Beauchamp', assigneeIn: 'AB', npAppt: null,         lastAwv: '10/25/2025', dec: '8',  ad: '4', fr: '3', rl: 'Medium', task: 1 },
  { id: 'awv-22', in: 'SL', name: 'Sandra Lee',       memberId: 'M-1910-6790', g: 'F', age: '68y 3m', status: 'Scheduled',         due: '08/30/2026', dueLabel: 'Due in 20D',   dueCol: C.warning, outreach: 3, lastOutreach: '08/01/2026', assignee: 'D. Hintz',     assigneeIn: 'DH', npAppt: '08/30/2026', lastAwv: '09/28/2025', dec: '9',  ad: '5', fr: '4', rl: 'High',   task: 1 },
  { id: 'awv-23', in: 'AN', name: 'Aaron Nguyen',     memberId: 'M-2010-7100', g: 'M', age: '65y 8m', status: 'Awaiting Schedule', due: '09/01/2026', dueLabel: 'Due in 22D',   dueCol: C.grey200, outreach: 3, lastOutreach: '07/24/2026', assignee: 'L. Torrance',  assigneeIn: 'LT', npAppt: null,         lastAwv: '06/01/2025', dec: '6',  ad: '2', fr: '2', rl: 'Medium', task: 0 },
  { id: 'awv-24', in: 'MH', name: 'Maria Hernandez',  memberId: 'M-2103-7720', g: 'F', age: '71y 4m', status: 'Outreach Required', due: '08/13/2026', dueLabel: 'Due in 3D',    dueCol: C.warning, outreach: 5, lastOutreach: '08/03/2026', assignee: 'M. Thompson',  assigneeIn: 'MT', npAppt: null,         lastAwv: '08/12/2025', dec: '7',  ad: '3', fr: '2', rl: 'Medium', task: 2 },
  { id: 'awv-25', in: 'PT', name: 'Paul Thompson',    memberId: 'M-2210-8050', g: 'M', age: '76y 7m', status: 'Completed',         due: '04/20/2026', dueLabel: 'Completed',    dueCol: C.success, outreach: 4, lastOutreach: '04/19/2026', assignee: 'O. Twist',     assigneeIn: 'OT', npAppt: '04/20/2026', lastAwv: '04/20/2026', dec: '8',  ad: '4', fr: '3', rl: 'Medium', task: 0 },
];

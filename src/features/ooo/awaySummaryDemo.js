// (Its care programs are patients with real Program History on dev, so
// "N more activities" opens something to look at.)
// A worked example of While You Were Away for demos and reviews: a week out
// of office where the covering providers completed, cancelled and handed on
// work, and patients wrote and called. Nothing here is saved; the drawer
// opens it with openAwaySummary(AWAY_DEMO_ID).

export const AWAY_DEMO_ID = 'away-demo';

const at = (d, h, m = 0) => new Date(2026, 10, d, h, m).toISOString();
const appt = (patientName, date, timeStart, timeEnd, type) => ({ patientName, date, timeStart, timeEnd, type, location: 'Palm Health Centre' });
const task = (name, priority, due) => ({ name, priority, due_date: due, status: 'pending', location: 'Palm Health Centre' });
const program = (code, name, patientName, status) => ({ code, name, patientName, status, startDate: '09-02-2026', progress: 40, location: 'Palm Health Centre' });

/** The example: { job, record, items, counts, changes, catchUp }. */
export function awayDemo(me = 'Devanshi Sharma') {
  const record = { id: `${AWAY_DEMO_ID}-record`, userName: me, userRole: 'Care Manager', startAt: at(16, 0), endAt: at(23, 0) };
  const items = [
    { kind: 'appointment', appointmentId: 'demo-a1', appointment: appt('James Rivera', '11-17-2026', '9:00 am', '9:30 am', 'Annual Wellness Visit'), to: 'Gaurav Gangurde', holder: 'Gaurav Gangurde', now: 'completed' },
    { kind: 'appointment', appointmentId: 'demo-a2', appointment: appt('Kendra Crona', '11-18-2026', '11:00 am', '11:30 am', 'Follow-up Appointment'), to: 'Balraj Chugh', holder: 'Ketan Patni', now: 'open' },
    { kind: 'appointment', appointmentId: 'demo-a3', appointment: appt('Maria Lopez', '11-19-2026', '9:30 am', '10:00 am', 'Specialty Consultation'), to: 'Gaurav Gangurde', holder: 'Gaurav Gangurde', now: 'cancelled' },
    { kind: 'appointment', appointmentId: 'demo-a4', appointment: appt('Diana Welch', '11-24-2026', '10:00 am', '10:30 am', 'Telehealth Consultation'), to: 'Balraj Chugh', holder: 'Balraj Chugh', now: 'open' },
    { kind: 'task', taskId: 'demo-t1', task: task('Prior authorization paperwork', 'High', '11-18-2026'), to: 'Gaurav Gangurde', holder: 'Gaurav Gangurde', now: 'completed' },
    { kind: 'task', taskId: 'demo-t2', task: task('Update care team contacts', 'Medium', '11-19-2026'), to: 'Balraj Chugh', holder: 'Gaurav Gangurde', now: 'completed' },
    { kind: 'task', taskId: 'demo-t3', task: task('Review care plan for Annette Brave', 'High', '11-20-2026'), to: 'Balraj Chugh', holder: 'Balraj Chugh', now: 'open' },
    { kind: 'task', taskId: 'demo-t4', task: { ...task('Follow up on lab results', 'Medium', '11-17-2026'), status: 'missed' }, to: 'Gaurav Gangurde', holder: 'Gaurav Gangurde', now: 'open' },
    { kind: 'program', programId: 'demo-p1', program: program('SNP', 'SNP Care Program (SNP)', 'Annette Brave', 'Completed'), to: 'Gaurav Gangurde', holder: 'Gaurav Gangurde', now: 'completed' },
    { kind: 'program', programId: 'demo-p2', program: program('SNP', 'SNP Care Program (SNP)', 'Derek Alton', 'Enrolled'), to: 'Balraj Chugh', holder: 'Balraj Chugh', now: 'open' },
  ].map(i => ({ ...i, outcome: 'reassigned' })).map((i) => {
    // A few departments, as a real week would have.
    const dept = { 'demo-a2': 'AstranaCare Centennial Hills', 'demo-a4': 'AstranaCare Centennial Hills', 'demo-t3': 'Carson City Center', 'demo-t4': 'Carson City Center', 'demo-p2': 'Shawnee Wellness Center' }[i.appointmentId || i.taskId || i.programId];
    if (!dept) return i;
    const key = i.appointment ? 'appointment' : i.task ? 'task' : 'program';
    return { ...i, [key]: { ...i[key], location: dept } };
  });

  const changes = new Map([
    ['appointment:demo-a1', [{ type: 'status', from: 'Booked', to: 'Checked In', by: 'Gaurav Gangurde', at: at(17, 8, 55) }, { type: 'status', from: 'Checked In', to: 'Checked Out', by: 'Gaurav Gangurde', at: at(17, 9, 34) }]],
    ['appointment:demo-a2', [{ type: 'assignee', from: 'Balraj Chugh', to: 'Ketan Patni', by: 'Balraj Chugh', at: at(17, 16, 20) }]],
    ['appointment:demo-a3', [{ type: 'status', from: 'Booked', to: 'Cancelled', by: 'Gaurav Gangurde', at: at(18, 12, 5) }]],
    ['task:demo-t1', [{ type: 'status', from: 'Pending', to: 'Completed', by: 'Gaurav Gangurde', at: at(17, 14, 10) }]],
    ['task:demo-t2', [{ type: 'assignee', from: 'Balraj Chugh', to: 'Gaurav Gangurde', by: 'Balraj Chugh', at: at(18, 10, 0) }, { type: 'status', from: 'Pending', to: 'Completed', by: 'Gaurav Gangurde', at: at(19, 11, 45) }]],
    ['task:demo-t4', [{ type: 'status', from: 'Pending', to: 'Missed', by: 'System', at: at(18, 0, 0) }]],
    ['program:demo-p1', [{ type: 'status', from: 'Enrolled', to: 'Completed', by: 'Gaurav Gangurde', at: at(20, 15, 30) }]],
  ]);

  const catchUp = {
    autoReplies: 4,
    threads: [
      { conversationId: 'demo-c1', channel: 'sms', patientName: 'Amy Phillips', inbound: 2, lastAt: at(21, 9, 12), preview: 'Can I move my refill pickup to Friday?', repliedBy: [], needsReply: true },
      { conversationId: 'demo-c2', channel: 'chat', patientName: 'Elena Garcia', inbound: 3, lastAt: at(20, 17, 40), preview: 'The new dose is making me dizzy in the mornings.', repliedBy: ['Balraj Chugh'], needsReply: true },
      { conversationId: 'demo-c3', channel: 'email', patientName: 'Annette Brave', inbound: 1, lastAt: at(18, 13, 2), preview: 'Attached are my home blood pressure readings.', repliedBy: ['Balraj Chugh'], needsReply: false },
    ],
    calls: [
      { id: 'demo-call1', conversationId: 'demo-c4', channel: 'call', patientName: 'Donna Baker', at: at(21, 15, 25), outcome: 'missed', calledBackBy: [] },
      { id: 'demo-call2', conversationId: 'demo-c5', channel: 'call', patientName: 'Kendra Crona', at: at(18, 10, 50), outcome: 'missed', calledBackBy: ['Gaurav Gangurde'] },
      { id: 'demo-call3', conversationId: 'demo-c6', channel: 'call', patientName: 'James Rivera', at: at(17, 16, 5), outcome: 'completed', answeredBy: 'Gaurav Gangurde', calledBackBy: [] },
    ],
  };

  const count = (k) => items.filter(i => i.now === k).length;
  return {
    job: { id: AWAY_DEMO_ID, fromUser: me, fromUserRole: 'Care Manager', createdBy: me, createdAt: at(15, 17, 30), results: items, windowStart: record.startAt, windowEnd: record.endAt },
    record,
    items,
    counts: { reassigned: items.length, completed: count('completed'), open: count('open'), cancelled: count('cancelled') },
    changes,
    catchUp,
  };
}

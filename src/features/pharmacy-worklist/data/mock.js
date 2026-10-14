// Pharmacy (Med Adherence) gap worklist. One row per member; each member
// carries every open measure in `measures`. The row shows its focus measure
// (see mostUrgentMeasure in pharmacyWorklist.utils.js); the Program view lists them all.
// In scope: MAD, MAH, MAC. SUPD is out of scope for now.
//
// measures[]: { code: 'MAD' | 'MAH' | 'MAC', pdc (plan-reported, null when
//   the plan doesn't send it), calcPdc (from claims), failDate, nextFillDue
//   (earliest next fill across its medications), daysLeft,
//   priorYearNonCompliant, excluded, projectedStatus, drugInteraction,
//   pickupConfirmed (date the pharmacy confirmed pickup, or null),
//   claim: { status: 'Paid' | 'Reversed', date, rxNumber } — latest claim,
//   medications: [med] }
// med: { id, name, generic, strength, unit, doseForm, route, sig, condition,
//   mpr, pdc, qty, daysSupply, lastFill, nextFill, status: 'Active' |
//   'Discontinued', nonAdherenceReason, notesToMd, internalNotes,
//   prescriber, pharmacy, refills: [{ date, qty, daysSupply, pharmacy,
//   prescriber, prescriberAddress }] (newest first) }
// interventionLog: newest first — one entry per call, recorded per measure:
//   { date, by, note, measures: { MAD: { barriers: [], interventions: [], result } } }
// callHistory: newest first — { date, contact (stakeholder), outcome,
//   result: 'success' | 'failed', by, note, measures?: ['MAD', …] }

function addDays(mdy, days) {
  const [m, d, y] = mdy.split('/').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(t.getUTCMonth() + 1)}/${p(t.getUTCDate())}/${t.getUTCFullYear()}`;
}

const addressLine = (o) => [o.address1, o.city, o.state, o.zip].filter(Boolean).join(', ');

// Refill history walking back from the last fill: each earlier fill lands
// `daysSupply + gap` days before the next (gaps are what drag PDC down).
function refillHistory({ lastFill, qty, daysSupply, gaps, prescriber, pharmacy }) {
  const fill = (date) => ({
    date, qty, daysSupply,
    pharmacy: pharmacy.name,
    prescriber: prescriber.name,
    prescriberAddress: addressLine(prescriber),
  });
  const out = [fill(lastFill)];
  for (const gap of gaps) out.push(fill(addDays(out[out.length - 1].date, -(daysSupply + gap))));
  return out;
}

function rx({ gaps = [3, 5], ...o }, member) {
  const prescriber = o.prescriber || member.prescriber;
  const pharmacy = o.pharmacy || member.pharmacy;
  return {
    status: 'Active', unit: 'MG', doseForm: 'Tablet', route: 'Oral',
    nonAdherenceReason: null, notesToMd: '', internalNotes: '',
    ...o,
    prescriber, pharmacy,
    nextFill: addDays(o.lastFill, o.daysSupply),
    refills: refillHistory({ ...o, gaps, prescriber, pharmacy }),
  };
}

function toUtc(mdy) {
  const [m, d, y] = mdy.split('/').map(Number);
  return Date.UTC(y, m - 1, d);
}

function measure(o, meds, member) {
  const medications = meds.map(m => rx(m, member));
  const nextFillDue = medications
    .map(m => m.nextFill)
    .reduce((min, d) => (!min || toUtc(d) < toUtc(min) ? d : min), null);
  return { ...o, nextFillDue, medications };
}

// Seed activity log: the member's past calls and barrier logs, newest first.
// Live actions append to it from the store (pharmacyWorklistSlice).
const isoAt = (mdy, hour = 10) => {
  const [m, d, y] = mdy.split('/').map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};
function seedActivity(base) {
  const calls = (base.callHistory || []).map((c, i) => ({
    at: isoAt(c.date, 10 + i), actor: c.by, t: 'outreach',
    title: `Outreach · ${c.contact}${c.measures?.length ? ` (${c.measures.join(', ')})` : ''}`,
    outcome: c.outcome,
    outcomeColor: c.result === 'failed' ? 'var(--status-error)' : 'var(--status-success)',
    note: c.note || undefined,
  }));
  const logs = (base.interventionLog || []).map(e => ({
    at: isoAt(e.date, 15), actor: e.by, t: 'note',
    title: `Barriers & interventions (${Object.keys(e.measures).join(', ')})`,
    note: Object.entries(e.measures)
      .map(([code, r]) => `${code}: ${[...r.barriers, ...r.interventions, r.result].filter(Boolean).join(', ')}`)
      .join('\n'),
  }));
  return [...calls, ...logs].toSorted((a, b) => b.at.localeCompare(a.at));
}

function member(base, buildMeasures) {
  return { ...base, measures: buildMeasures(base), activityLog: seedActivity(base) };
}

const CHOI = { name: 'Dr. Alan Choi', phone: '(626) 555-0142', fax: '(626) 555-0143', address1: '1798 N Garey Ave', city: 'Pomona', state: 'CA', zip: '91767' };
const PARK = { name: 'Dr. Helen Park', phone: '(213) 555-0177', fax: '(213) 555-0178', address1: '1866 N Orange Grove Ave Suite 202', city: 'Pomona', state: 'CA', zip: '91767' };
const OKAFOR = { name: 'Dr. Samuel Okafor', phone: '(562) 555-0164', fax: '(562) 555-0165', address1: '2801 Atlantic Ave', city: 'Long Beach', state: 'CA', zip: '90806' };
const LIN = { name: 'Dr. Grace Lin', phone: '(626) 555-0188', fax: '(626) 555-0189', address1: '440 E Huntington Dr', city: 'Arcadia', state: 'CA', zip: '91006' };
const ORTIZ = { name: 'Dr. Rafael Ortiz', phone: '(714) 555-0122', fax: '(714) 555-0123', address1: '1100 W Stewart Dr', city: 'Orange', state: 'CA', zip: '92868' };
const SHAH = { name: 'Dr. Vikram Shah', phone: '(818) 555-0131', fax: '(818) 555-0132', address1: '18300 Roscoe Blvd', city: 'Northridge', state: 'CA', zip: '91325' };

const CVS_9921 = { name: 'CVS Pharmacy #9921', phone: '(626) 555-0190', address1: '255 W Foothill Blvd', city: 'Claremont', state: 'CA', zip: '91711' };
const WAG_4410 = { name: 'Walgreens #4410', phone: '(213) 555-0120', address1: '1501 W Holt Ave', city: 'Pomona', state: 'CA', zip: '91768' };
const RITE_5532 = { name: 'Rite Aid #5532', phone: '(562) 555-0101', address1: '3901 Atlantic Ave', city: 'Long Beach', state: 'CA', zip: '90807' };
const CVS_3301 = { name: 'CVS Pharmacy #3301', phone: '(714) 555-0102', address1: '1501 W Chapman Ave', city: 'Orange', state: 'CA', zip: '92868' };
const COSTCO_112 = { name: 'Costco Pharmacy #112', phone: '(818) 555-0108', address1: '8810 Tampa Ave', city: 'Northridge', state: 'CA', zip: '91324' };
const WAG_2219 = { name: 'Walgreens #2219', phone: '(626) 555-0175', address1: '1 W Duarte Rd', city: 'Arcadia', state: 'CA', zip: '91007' };

export const PHARMACY_WORKLIST_MEMBERS = [
  member({
    id: '19401', initials: 'MG', name: 'Maria Gonzalez', gender: 'F', age: '71y 4m', dob: '06/02/1955',
    memberId: '19401', language: 'es', healthPlan: 'Humana Gold Plus', ipa: 'Astrana IPA', bookOfBusiness: 'Astrana',
    status: 'In Progress', assigneeName: null, assigneeInitials: null,
    leadNote: 'Call pharmacy first; member asked for Spanish-speaking staff.',
    followUpDue: '10/15/2026', barrier: 'Cost Issue', daysInQueue: 9,
    prescriber: CHOI, pharmacy: CVS_9921,
    phones: [{ number: '(626) 555-0111', label: 'Mobile', doNotUse: false }, { number: '(626) 555-0112', label: 'Home', doNotUse: true }],
    callHistory: [
      { date: '10/09/2026', contact: 'Pharmacy', outcome: 'Confirmed medication pickup date', result: 'success', by: 'Priya Natarajan', note: 'Metformin picked up today.', measures: ['MAD'] },
      { date: '10/08/2026', contact: 'Pharmacy', outcome: 'Pending — Pick up', result: 'failed', by: 'Priya Natarajan', note: 'Ready since 10/01.', measures: ['MAD'] },
    ],
  }, (b) => [
    measure({
      code: 'MAD', pdc: 78, calcPdc: 76, failDate: '10/24/2026', daysLeft: 11,
      priorYearNonCompliant: true, excluded: false, projectedStatus: 'Unlikely by year end', drugInteraction: false,
      pickupConfirmed: '10/09/2026', claim: { status: 'Paid', date: '07/06/2026', rxNumber: 'RX-4471902' },
    }, [{
      id: '19401-mad-1', name: 'Metformin ER', generic: 'metformin', strength: '500', sig: 'Take 1 tablet by mouth daily with evening meal',
      condition: 'Type 2 diabetes', mpr: 76, pdc: 78, qty: 90, daysSupply: 90, lastFill: '07/06/2026', gaps: [6, 12, 9],
      nonAdherenceReason: 'Cost Issue', notesToMd: 'Member reports $47 copay; generic alternatives?',
    }], b),
    measure({
      code: 'MAH', pdc: 88, calcPdc: 87, failDate: '11/30/2026', daysLeft: 48,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Paid', date: '07/20/2026', rxNumber: 'RX-4471955' },
    }, [{
      id: '19401-mah-1', name: 'Lisinopril', generic: 'lisinopril', strength: '10', sig: 'Take 1 tablet by mouth once daily',
      condition: 'Hypertension', mpr: 87, pdc: 88, qty: 90, daysSupply: 90, lastFill: '07/20/2026', gaps: [4, 6],
    }], b),
  ]),
  member({
    id: '19402', initials: 'RT', name: 'Robert Tanaka', gender: 'M', age: '68y 9m', dob: '01/11/1958',
    memberId: '19402', language: 'en', healthPlan: 'SCAN Classic', ipa: 'Astrana IPA', bookOfBusiness: 'Astrana',
    status: 'In Progress', assigneeName: 'Priya Natarajan', assigneeInitials: 'PN',
    leadNote: 'Pickup confirmed 3 weeks ago but plan still shows the gap — check with plan.',
    followUpDue: '10/14/2026', barrier: 'Forgetfulness', daysInQueue: 15,
    prescriber: PARK, pharmacy: WAG_4410,
    phones: [{ number: '(213) 555-0133', label: 'Mobile', doNotUse: false }],
    callHistory: [
      { date: '10/10/2026', contact: 'Member', outcome: 'Discussed daily medication routine and timing', result: 'success', by: 'Priya Natarajan', note: 'Set up pill organizer reminder.', measures: ['MAC'] },
      { date: '09/22/2026', contact: 'Pharmacy', outcome: 'Confirmed medication pickup date', result: 'success', by: 'Priya Natarajan', note: '', measures: ['MAC'] },
      { date: '09/18/2026', contact: 'Pharmacy', outcome: 'Pending — Pick up', result: 'failed', by: 'Priya Natarajan', note: '', measures: ['MAC'] },
    ],
  }, (b) => [
    measure({
      code: 'MAC', pdc: 82, calcPdc: 83, failDate: '11/02/2026', daysLeft: 20,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: '09/22/2026', claim: { status: 'Paid', date: '08/10/2026', rxNumber: 'RX-5520318' },
    }, [{
      id: '19402-mac-1', name: 'Atorvastatin', generic: 'atorvastatin', strength: '40', sig: 'Take 1 tablet by mouth at bedtime',
      condition: 'Hyperlipidemia', mpr: 83, pdc: 82, qty: 30, daysSupply: 30, lastFill: '08/10/2026', gaps: [3, 2, 8],
      nonAdherenceReason: 'Forgetfulness',
    }], b),
  ]),
  member({
    id: '19403', initials: 'LW', name: 'Linda Washington', gender: 'F', age: '74y 2m', dob: '08/19/1952',
    memberId: '19403', language: 'en', healthPlan: 'Blue Shield Medicare', ipa: 'Prospect Medical Group', bookOfBusiness: 'Prospect',
    status: 'In Progress', assigneeName: 'Marcus Reyes', assigneeInitials: 'MR',
    leadNote: 'Needs pharmacist review — plan PDC lower than our fills.',
    followUpDue: '10/13/2026', barrier: 'Side Effects', daysInQueue: 22,
    prescriber: OKAFOR, pharmacy: RITE_5532,
    phones: [{ number: '(562) 555-0150', label: 'Home', doNotUse: false }],
    callHistory: [
      { date: '10/09/2026', contact: 'Provider Office', outcome: 'Refill approval sent to pharmacy', result: 'success', by: 'Marcus Reyes', note: 'Faxed refill request for glipizide.', measures: ['MAD'] },
      { date: '10/02/2026', contact: 'Member', outcome: 'Side effects — Experienced', result: 'success', by: 'Marcus Reyes', note: 'Muscle aches on atorvastatin.', measures: ['MAC'] },
      { date: '09/25/2026', contact: 'Member', outcome: 'UTC', result: 'failed', by: 'Marcus Reyes', note: 'Left voicemail.' },
    ],
    interventionLog: [
      {
        date: '10/02/2026', by: 'Marcus Reyes', note: 'Discussed statin side effects; MD to review.',
        measures: {
          MAC: { barriers: ['Side Effects'], interventions: ['Schedule MD Appointment/Labs'], result: 'Pending Pharmacist Review' },
          MAD: { barriers: [], interventions: ['90/100-day conversion'], result: 'Pending Refill Approval' },
        },
      },
    ],
  }, (b) => [
    measure({
      code: 'MAD', pdc: 78, calcPdc: 84, failDate: '11/10/2026', daysLeft: 28,
      priorYearNonCompliant: true, excluded: false, projectedStatus: null, drugInteraction: true,
      pickupConfirmed: null, claim: { status: 'Paid', date: '09/20/2026', rxNumber: 'RX-6610274' },
    }, [
      {
        id: '19403-mad-1', name: 'Glipizide', generic: 'glipizide', strength: '5', sig: 'Take 1 tablet by mouth before breakfast',
        condition: 'Type 2 diabetes', mpr: 84, pdc: 80, qty: 30, daysSupply: 30, lastFill: '09/20/2026', gaps: [9, 3, 4],
      },
      {
        id: '19403-mad-2', name: 'Metformin', generic: 'metformin', strength: '1000', sig: 'Take 1 tablet by mouth twice daily with meals',
        condition: 'Type 2 diabetes', mpr: 86, pdc: 85, qty: 180, daysSupply: 90, lastFill: '08/12/2026', gaps: [7],
      },
    ], b),
    measure({
      code: 'MAC', pdc: 91, calcPdc: 90, failDate: '12/20/2026', daysLeft: 68,
      priorYearNonCompliant: false, excluded: false, projectedStatus: 'Already adherent', drugInteraction: true,
      oneFillToInvincible: true,
      pickupConfirmed: null, claim: { status: 'Paid', date: '09/28/2026', rxNumber: 'RX-6610281' },
    }, [{
      id: '19403-mac-1', name: 'Atorvastatin', generic: 'atorvastatin', strength: '20', sig: 'Take 1 tablet by mouth at bedtime',
      condition: 'Hyperlipidemia', mpr: 90, pdc: 91, qty: 30, daysSupply: 30, lastFill: '09/28/2026', gaps: [1, 2],
      nonAdherenceReason: 'Side Effects', notesToMd: 'Muscle aches — consider switching statin.',
    }], b),
  ]),
  member({
    id: '19404', initials: 'DN', name: 'David Nguyen', gender: 'M', age: '66y 1m', dob: '09/05/1960',
    memberId: '19404', language: 'vi', healthPlan: 'Humana Gold Plus', ipa: 'Astrana IPA', bookOfBusiness: 'Astrana',
    status: 'Open', assigneeName: 'Priya Natarajan', assigneeInitials: 'PN',
    leadNote: null,
    followUpDue: '10/16/2026', barrier: null, daysInQueue: 3,
    prescriber: LIN, pharmacy: CVS_9921,
    phones: [{ number: '(626) 555-0144', label: 'Mobile', doNotUse: false }],
    callHistory: [],
  }, (b) => [
    measure({
      code: 'MAH', pdc: 86, calcPdc: 86, failDate: '11/18/2026', daysLeft: 36,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Paid', date: '07/17/2026', rxNumber: 'RX-7038825' },
    }, [{
      id: '19404-mah-1', name: 'Losartan', generic: 'losartan', strength: '50', sig: 'Take 1 tablet by mouth once daily',
      condition: 'Hypertension', mpr: 86, pdc: 86, qty: 90, daysSupply: 90, lastFill: '07/17/2026', gaps: [8],
    }], b),
  ]),
  member({
    id: '19405', initials: 'BK', name: 'Barbara Klein', gender: 'F', age: '79y 6m', dob: '04/14/1947',
    memberId: '19405', language: 'en', healthPlan: 'Aetna Medicare Advantage', ipa: 'Prospect Medical Group', bookOfBusiness: 'Prospect',
    status: 'In Progress', assigneeName: 'Marcus Reyes', assigneeInitials: 'MR',
    leadNote: 'Daughter manages meds — call her line.',
    followUpDue: '10/12/2026', barrier: 'Transportation', daysInQueue: 31,
    prescriber: ORTIZ, pharmacy: CVS_3301,
    phones: [{ number: '(714) 555-0170', label: 'Caregiver', doNotUse: false }, { number: '(714) 555-0171', label: 'Home', doNotUse: false }],
    callHistory: [
      { date: '10/06/2026', contact: 'Caregiver', outcome: 'UTC', result: 'failed', by: 'Marcus Reyes', note: 'Left voicemail.' },
      { date: '09/29/2026', contact: 'Pharmacy', outcome: 'Pending — Pick up', result: 'failed', by: 'Marcus Reyes', note: 'Fill never picked up; claim reversed.', measures: ['MAH'] },
      { date: '09/15/2026', contact: 'Member', outcome: 'UTC', result: 'failed', by: 'Marcus Reyes', note: '' },
    ],
  }, (b) => [
    measure({
      code: 'MAH', pdc: 74, calcPdc: 72, failDate: '10/20/2026', daysLeft: 7,
      priorYearNonCompliant: true, excluded: false, projectedStatus: 'Unlikely by year end', drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Reversed', date: '09/28/2026', rxNumber: 'RX-8124407' },
    }, [{
      id: '19405-mah-1', name: 'Olmesartan', generic: 'olmesartan', strength: '20', sig: 'Take 1 tablet by mouth once daily',
      condition: 'Hypertension', mpr: 72, pdc: 74, qty: 60, daysSupply: 60, lastFill: '08/01/2026', gaps: [14, 10],
      nonAdherenceReason: 'Transportation', internalNotes: 'Daughter can pick up Saturdays only.',
    }], b),
    measure({
      code: 'MAC', pdc: 89, calcPdc: 88, failDate: '12/04/2026', daysLeft: 52,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Paid', date: '07/24/2026', rxNumber: 'RX-8124412' },
    }, [{
      id: '19405-mac-1', name: 'Simvastatin', generic: 'simvastatin', strength: '20', sig: 'Take 1 tablet by mouth in the evening',
      condition: 'Hyperlipidemia', mpr: 88, pdc: 89, qty: 90, daysSupply: 90, lastFill: '07/24/2026', gaps: [5],
    }], b),
  ]),
  member({
    id: '19406', initials: 'JO', name: 'James O’Connor', gender: 'M', age: '70y 0m', dob: '10/10/1956',
    memberId: '19406', language: 'en', healthPlan: 'SCAN Classic', ipa: 'Astrana IPA', bookOfBusiness: 'Astrana',
    status: 'Completed', assigneeName: 'Priya Natarajan', assigneeInitials: 'PN',
    leadNote: null,
    followUpDue: null, barrier: null, daysInQueue: 40,
    prescriber: PARK, pharmacy: WAG_4410,
    phones: [{ number: '(213) 555-0160', label: 'Mobile', doNotUse: false }],
    callHistory: [
      { date: '09/30/2026', contact: 'Pharmacy', outcome: 'Confirmed medication pickup date', result: 'success', by: 'Priya Natarajan', note: '90-day supply picked up.', measures: ['MAD'] },
      { date: '09/24/2026', contact: 'Pharmacy', outcome: 'Pending — Pick up', result: 'failed', by: 'Priya Natarajan', note: '', measures: ['MAD'] },
    ],
  }, (b) => [
    measure({
      code: 'MAD', pdc: 92, calcPdc: 92, failDate: '12/28/2026', daysLeft: 76,
      priorYearNonCompliant: false, excluded: true, projectedStatus: 'Already adherent', drugInteraction: false,
      pickupConfirmed: '09/30/2026', claim: { status: 'Paid', date: '09/30/2026', rxNumber: 'RX-9017736' },
    }, [{
      id: '19406-mad-1', name: 'Metformin', generic: 'metformin', strength: '1000', sig: 'Take 1 tablet by mouth twice daily with meals',
      condition: 'Type 2 diabetes', mpr: 92, pdc: 92, qty: 180, daysSupply: 90, lastFill: '09/30/2026', gaps: [2],
    }], b),
  ]),
  member({
    id: '19407', initials: 'SP', name: 'Sunita Patel', gender: 'F', age: '67y 8m', dob: '02/03/1959',
    memberId: '19407', language: 'hi', healthPlan: 'Blue Shield Medicare', ipa: 'Astrana IPA', bookOfBusiness: 'Astrana',
    status: 'Open', assigneeName: null, assigneeInitials: null,
    leadNote: 'Assign to Hindi-speaking coordinator if available.',
    followUpDue: null, barrier: null, daysInQueue: 2,
    prescriber: SHAH, pharmacy: COSTCO_112,
    phones: [{ number: '(818) 555-0119', label: 'Mobile', doNotUse: false }],
    callHistory: [],
  }, (b) => [
    measure({
      code: 'MAD', pdc: null, calcPdc: 85, failDate: '11/22/2026', daysLeft: 40,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Paid', date: '09/26/2026', rxNumber: 'RX-9150043' },
    }, [{
      id: '19407-mad-1', name: 'Metformin', generic: 'metformin', strength: '500', sig: 'Take 1 tablet by mouth twice daily with meals',
      condition: 'Type 2 diabetes', mpr: 85, pdc: null, qty: 60, daysSupply: 30, lastFill: '09/26/2026', gaps: [4, 6],
    }], b),
  ]),
  member({
    id: '19408', initials: 'TB', name: 'Thomas Brooks', gender: 'M', age: '72y 3m', dob: '07/09/1954',
    memberId: '19408', language: 'en', healthPlan: 'Aetna Medicare Advantage', ipa: 'Prospect Medical Group', bookOfBusiness: 'Prospect',
    status: 'In Progress', assigneeName: 'Marcus Reyes', assigneeInitials: 'MR',
    leadNote: null,
    followUpDue: '10/17/2026', barrier: 'Cost Issue', daysInQueue: 12,
    prescriber: ORTIZ, pharmacy: CVS_3301,
    phones: [{ number: '(714) 555-0181', label: 'Mobile', doNotUse: false }],
    callHistory: [
      { date: '10/07/2026', contact: 'Member', outcome: 'Cost/financial barrier', result: 'success', by: 'Marcus Reyes', note: 'Copay $47 — asked prescriber about generic.', measures: ['MAD'] },
      { date: '10/01/2026', contact: 'Pharmacy', outcome: 'Confirmed medication pickup date', result: 'success', by: 'Marcus Reyes', note: 'Januvia 30-day picked up.', measures: ['MAD'] },
    ],
    interventionLog: [
      {
        date: '10/07/2026', by: 'Marcus Reyes', note: 'Brand copay $47 on Januvia only; HCTZ combo and pravastatin are $0.',
        measures: {
          MAD: { barriers: ['Cost Issue'], interventions: ['Refill from Manufacturer/Program Assistance'], result: 'Rx Pick Up Confirmed' },
          MAC: { barriers: [], interventions: ['90/100-day conversion'], result: 'Refill Too Soon' },
        },
      },
    ],
  }, (b) => [
    measure({
      code: 'MAD', pdc: 81, calcPdc: 80, failDate: '11/06/2026', daysLeft: 24,
      priorYearNonCompliant: true, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: '10/01/2026', claim: { status: 'Paid', date: '09/01/2026', rxNumber: 'RX-1029584' },
    }, [{
      id: '19408-mad-1', name: 'Januvia', generic: 'sitagliptin', strength: '100', sig: 'Take 1 tablet by mouth once daily',
      condition: 'Type 2 diabetes', mpr: 80, pdc: 81, qty: 30, daysSupply: 30, lastFill: '09/01/2026', gaps: [6, 4, 7],
      nonAdherenceReason: 'Cost Issue', notesToMd: 'Brand copay too high — request generic or formulary alternative.',
    }], b),
    measure({
      code: 'MAH', pdc: 93, calcPdc: 93, failDate: '12/30/2026', daysLeft: 78,
      priorYearNonCompliant: false, excluded: false, projectedStatus: 'Already adherent', drugInteraction: false,
      oneFillToInvincible: true,
      pickupConfirmed: null, claim: { status: 'Paid', date: '08/07/2026', rxNumber: 'RX-1029590' },
    }, [{
      id: '19408-mah-1', name: 'Losartan-HCTZ', generic: 'losartan / hydrochlorothiazide', strength: '50-12.5', sig: 'Take 1 tablet by mouth once daily',
      condition: 'Hypertension', mpr: 93, pdc: 93, qty: 90, daysSupply: 90, lastFill: '08/07/2026', gaps: [1],
    }], b),
    measure({
      code: 'MAC', pdc: 80, calcPdc: 85, failDate: '11/25/2026', daysLeft: 43,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Paid', date: '07/21/2026', rxNumber: 'RX-1029602' },
    }, [{
      id: '19408-mac-1', name: 'Pravastatin', generic: 'pravastatin', strength: '40', sig: 'Take 1 tablet by mouth at bedtime',
      condition: 'Hyperlipidemia', mpr: 85, pdc: 80, qty: 90, daysSupply: 90, lastFill: '07/21/2026', gaps: [11],
    }], b),
  ]),
  member({
    id: '19409', initials: 'AH', name: 'Angela Hughes', gender: 'F', age: '69y 11m', dob: '11/02/1956',
    memberId: '19409', language: 'en', healthPlan: 'Humana Gold Plus', ipa: 'Astrana IPA', bookOfBusiness: 'Astrana',
    status: 'Open', assigneeName: 'Priya Natarajan', assigneeInitials: 'PN',
    leadNote: null,
    followUpDue: '10/20/2026', barrier: null, daysInQueue: 5,
    prescriber: CHOI, pharmacy: WAG_2219,
    phones: [{ number: '(626) 555-0166', label: 'Home', doNotUse: false }],
    callHistory: [],
  }, (b) => [
    measure({
      code: 'MAC', pdc: 90, calcPdc: 88, failDate: '12/12/2026', daysLeft: 60,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Paid', date: '09/24/2026', rxNumber: 'RX-2204718' },
    }, [{
      id: '19409-mac-1', name: 'Rosuvastatin', generic: 'rosuvastatin', strength: '20', sig: 'Take 1 tablet by mouth once daily',
      condition: 'Hyperlipidemia', mpr: 88, pdc: 90, qty: 30, daysSupply: 30, lastFill: '09/24/2026', gaps: [2, 3],
    }], b),
  ]),
  member({
    id: '19410', initials: 'CR', name: 'Carlos Ramirez', gender: 'M', age: '75y 5m', dob: '05/21/1951',
    memberId: '19410', language: 'es', healthPlan: 'SCAN Classic', ipa: 'Prospect Medical Group', bookOfBusiness: 'Prospect',
    status: 'In Progress', assigneeName: 'Marcus Reyes', assigneeInitials: 'MR',
    leadNote: null,
    followUpDue: '10/14/2026', barrier: null, daysInQueue: 18,
    prescriber: OKAFOR, pharmacy: RITE_5532,
    phones: [{ number: '(562) 555-0158', label: 'Mobile', doNotUse: false }],
    callHistory: [
      { date: '10/11/2026', contact: 'Pharmacy', outcome: 'Pending — Pick up', result: 'failed', by: 'Marcus Reyes', note: 'Recheck pickup 10/14.', measures: ['MAH'] },
      { date: '10/04/2026', contact: 'Provider Office', outcome: 'Refill approval sent to pharmacy', result: 'success', by: 'Marcus Reyes', note: '', measures: ['MAH'] },
    ],
  }, (b) => [
    measure({
      code: 'MAH', pdc: 83, calcPdc: 82, failDate: '10/31/2026', daysLeft: 18,
      priorYearNonCompliant: false, excluded: false, projectedStatus: null, drugInteraction: false,
      pickupConfirmed: null, claim: { status: 'Paid', date: '08/13/2026', rxNumber: 'RX-3381960' },
    }, [{
      id: '19410-mah-1', name: 'Valsartan', generic: 'valsartan', strength: '80', sig: 'Take 1 tablet by mouth once daily',
      condition: 'Hypertension', mpr: 82, pdc: 83, qty: 60, daysSupply: 60, lastFill: '08/13/2026', gaps: [5, 8],
    }], b),
  ]),
];

import { parseLocalDate } from '../../../lib/localDate';

/**
 * CIS-CMB10: Childhood Immunization Status, Combination 10.
 *
 * Children who turn 2 during the measurement year need all ten antigens
 * below by their 2nd birthday. Two rule sets run side by side and are never
 * merged:
 *   • HEDIS counting rules decide which recorded doses count (min ages,
 *     1st-2nd birthday windows, nothing after the 2nd birthday, one dose
 *     per antigen per day).
 *   • ACIP planning rules (min intervals, per-dose min ages, the routine
 *     schedule) decide when the next dose is due and whether the remaining
 *     doses can still fit before the 2nd birthday.
 *
 * Verify the antigen table against the current NCQA tech specs each
 * measurement year; dose counts and windows move between years.
 */

export const CIS_CODE = 'CIS-CMB10';

export const CIS_ANTIGEN_STATUS = {
  met: 'Met',
  dueNow: 'Due Now',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  onTrack: 'On-Track',
  cannotMeet: "Can't Meet",
};

export const CIS_DOSE_STATUS = {
  completed: 'Completed',
  notCounted: 'Does Not Count',
  pending: 'Enter date',
  dueNow: 'Due now',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  onTrack: 'On track',
  cannotMeet: "Can't be met",
};

export const CIS_EVALUATION = {
  compliant: 'Compliant',
  onTrack: 'On track',
  atRisk: 'At risk',
  cannotMeet: "Can't be met",
  notEligible: 'Not eligible',
};

// A gap with this many days or fewer before the 2nd birthday, and doses
// still outstanding, is At risk even when nothing is overdue yet.
export const AT_RISK_DAYS = 60;

// Rotavirus: Rotarix is a 2-dose series, RotaTeq (or an unknown brand) 3.
const ROTARIX_CVX = ['119'];
const ROTARIX_RE = /rotarix/i;
// Live attenuated influenza only counts when given on the 2nd birthday.
const LAIV_CVX = ['111', '149'];
const LAIV_RE = /laiv|flumist/i;
// No routine rotavirus dose after 8 months 0 days of age (ACIP).
const RV_MAX_AGE_DAYS = 243;

/**
 * `schedule` is the ACIP routine age in months per dose ({ from, by }; past
 * `by` is Overdue). `minAgeDays` / `intervalDays` are ACIP minimums used for
 * planning only. `hedisMinAgeDays` / `window` are the HEDIS counting rules.
 * `record` is the unspecified-brand vaccine written to patient_immunizations
 * when a dose is entered in the tracker. `measureCode` is the HEDIS CIS
 * indicator. Listed in the order the routine schedule starts them.
 */
export const CIS_ANTIGENS = [
  {
    key: 'hepb', measureCode: 'CISHEPB', label: 'Hep B', name: 'Hepatitis B', doses: 3,
    record: { title: 'Hep B', code: '45' },
    hedisMinAgeDays: 0,
    cvx: ['08', '45', '51', '110', '146'],
    match: /hep(atitis)?[\s-]*b\b|engerix|recombivax|pediarix|vaxelis/i,
    schedule: [{ from: 0, by: 2 }, { from: 1, by: 3 }, { from: 6, by: 19 }],
    minAgeDays: [0, 28, 164], intervalDays: [28, 56],
  },
  {
    key: 'dtap', measureCode: 'CISDTP', label: 'DTaP', name: 'Diphtheria, tetanus, pertussis', doses: 4,
    record: { title: 'DTaP', code: '107' },
    hedisMinAgeDays: 42,
    cvx: ['20', '50', '106', '107', '110', '120', '130', '146'],
    match: /dtap|pediarix|pentacel|vaxelis|kinrix|quadracel|infanrix|daptacel/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 7 }, { from: 15, by: 19 }],
    minAgeDays: [42, 70, 98, 365], intervalDays: [28, 28, 182],
  },
  {
    key: 'ipv', measureCode: 'CISOPV', label: 'IPV', name: 'Polio', doses: 3,
    record: { title: 'IPV', code: '10' },
    hedisMinAgeDays: 42,
    cvx: ['10', '89', '110', '120', '130', '146'],
    match: /\bipv\b|polio|ipol|pediarix|pentacel|vaxelis|kinrix|quadracel/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 19 }],
    minAgeDays: [42, 70, 98], intervalDays: [28, 28],
  },
  {
    key: 'hib', measureCode: 'CISHIB', label: 'HiB', name: 'Haemophilus influenzae type b', doses: 3,
    record: { title: 'Hib', code: '17' },
    hedisMinAgeDays: 42,
    cvx: ['17', '46', '47', '48', '49', '50', '51', '120', '146', '148'],
    match: /\bhib\b|pedvax|acthib|hiberix|pentacel|vaxelis/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 12, by: 16 }],
    minAgeDays: [42, 70, 365], intervalDays: [28, 56],
  },
  {
    key: 'pcv', measureCode: 'CISPNEU', label: 'PCV', name: 'Pneumococcal conjugate', doses: 4,
    record: { title: 'PCV', code: '152' },
    hedisMinAgeDays: 42,
    cvx: ['100', '133', '152', '215', '216'],
    match: /\bpcv|pneumococcal conjugate|prevnar|vaxneuvance/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 7 }, { from: 12, by: 16 }],
    minAgeDays: [42, 70, 98, 365], intervalDays: [28, 28, 56],
  },
  {
    key: 'rv', measureCode: 'CISROTA', label: 'Rotavirus', name: 'Rotavirus', doses: 3,
    record: { title: 'Rotavirus', code: '122' },
    hedisMinAgeDays: 42,
    cvx: ['116', '119', '122'],
    match: /rota/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 7 }],
    minAgeDays: [42, 70, 98], intervalDays: [28, 28],
  },
  {
    key: 'flu', measureCode: 'CISINFL', label: 'Influenza', name: 'Influenza', doses: 2,
    record: { title: 'Influenza', code: '88' },
    hedisMinAgeDays: 180,
    cvx: ['88', '111', '140', '141', '149', '150', '153', '155', '158', '161', '171', '186', '197', '205'],
    match: /influenza|\bflu|fluzone|fluarix|flulaval|afluria|flucelvax/i,
    schedule: [{ from: 6, by: 8 }, { from: 7, by: 9 }],
    minAgeDays: [180, 208], intervalDays: [28],
  },
  {
    key: 'mmr', measureCode: 'CISMMR', label: 'MMR', name: 'Measles, mumps, rubella', doses: 1,
    record: { title: 'MMR', code: '03' },
    window: true,
    cvx: ['03', '94'],
    match: /\bmmr|proquad/i,
    schedule: [{ from: 12, by: 16 }],
    minAgeDays: [0], intervalDays: [],
  },
  {
    key: 'vzv', measureCode: 'CISVZV', label: 'VZV', name: 'Varicella (chickenpox)', doses: 1,
    record: { title: 'Varicella', code: '21' },
    window: true,
    cvx: ['21', '94'],
    match: /varicella|varivax|\bvzv\b|mmrv|proquad/i,
    schedule: [{ from: 12, by: 16 }],
    minAgeDays: [0], intervalDays: [],
  },
  {
    key: 'hepa', measureCode: 'CISHEPA', label: 'Hep A', name: 'Hepatitis A', doses: 1,
    record: { title: 'Hep A', code: '85' },
    window: true,
    cvx: ['31', '83', '85'],
    match: /hep(atitis)?[\s-]*a\b|havrix|vaqta/i,
    schedule: [{ from: 12, by: 24 }],
    minAgeDays: [0], intervalDays: [],
  },
];

// ── date helpers (local calendar days) ──
const DAY_MS = 86400000;
const toDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
const daysBetween = (later, earlier) => Math.round((toDay(later) - toDay(earlier)) / DAY_MS);
const maxDate = (...ds) => ds.filter(Boolean).reduce((a, b) => (b > a ? b : a));
const sameDay = (a, b) => daysBetween(a, b) === 0;
const normCvx = (code) => String(code ?? '').trim().replace(/^0+(?=\d)/, '');

/** Last routine month of a schedule slot, within the 2nd year. */
export const scheduleEndMonth = (slot) => (slot.from === 0 || slot.by - slot.from <= 1 ? slot.from : Math.min(slot.by - 1, 23));

/** Whole months between `dob` and `on`. */
export function ageInMonths(dob, on) {
  let m = (on.getFullYear() - dob.getFullYear()) * 12 + (on.getMonth() - dob.getMonth());
  if (on.getDate() < dob.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Antigen keys an immunization record counts toward (combo vaccines hit several). */
export function antigensForImmunization(imm) {
  const cvx = normCvx(imm?.code);
  const title = String(imm?.title || '');
  return CIS_ANTIGENS
    .filter(a => (cvx && a.cvx.map(normCvx).includes(cvx)) || a.match.test(title))
    .map(a => a.key);
}

const isRotarix = (dose) => ROTARIX_CVX.includes(normCvx(dose.code)) || ROTARIX_RE.test(dose.title);
const isLaiv = (dose) => LAIV_CVX.includes(normCvx(dose.code)) || LAIV_RE.test(dose.title);

const mdy = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

// Why a recorded dose does not count for HEDIS, or null when it does. Each
// reason names the date that decided it, e.g. "Given after the 2nd birthday
// (03/31/2026)". A dose that does not count takes its slot in the series
// (see evaluateAntigen), so the reason shows in place of a new dose row.
function invalidReason(antigen, dose, dob, firstBirthday, secondBirthday) {
  if (dose.date > secondBirthday) return { text: `Given after the 2nd birthday (${mdy(secondBirthday)})` };
  if (antigen.window && dose.date < firstBirthday) return { text: `Given before the 1st birthday (${mdy(firstBirthday)})` };
  const ageDays = daysBetween(dose.date, dob);
  if (ageDays < 0) return { text: `Dated before the date of birth (${mdy(dob)})` };
  if (antigen.hedisMinAgeDays && ageDays < antigen.hedisMinAgeDays) {
    const from = mdy(addDays(dob, antigen.hedisMinAgeDays));
    return { text: antigen.hedisMinAgeDays === 180 ? `Given before 6 months of age (${from})` : `Given before 42 days of age (${from})` };
  }
  if (antigen.key === 'flu' && isLaiv(dose) && !sameDay(dose.date, secondBirthday)) {
    return { text: `Nasal (LAIV) flu vaccine only counts on the 2nd birthday (${mdy(secondBirthday)})` };
  }
  return null;
}

const minDate = (...ds) => ds.filter(Boolean).reduce((a, b) => (b < a ? b : a));
// Doses whose window opens within this many days read as Upcoming.
const UPCOMING_DAYS = 30;

function recommendedLabel(slot) {
  if (slot.from === 0) return 'Birth (0 mo)';
  if (slot.by - slot.from <= 1) return `${slot.from} months`;
  return `${slot.from}–${slot.by - 1} months`;
}

/**
 * Every dose of one antigen as display rows: recorded doses (counted or
 * not), doses marked given but not dated yet, then the planned doses still
 * needed. Each row carries the recommended age, earliest allowed date, the
 * routine start / due window and a status.
 *
 * @param {object} antigen    – CIS_ANTIGENS entry
 * @param {Array}  doses      – recorded doses ({ id, title, code, date }), date order
 * @param {number} pending    – doses marked given with no date yet
 */
function evaluateAntigen(antigen, doses, ctx, pending = 0) {
  const { dob, today, firstBirthday, secondBirthday } = ctx;
  const valid = [];
  const invalid = [];
  const reasons = new Map();
  for (const dose of doses) {
    const reason = invalidReason(antigen, dose, dob, firstBirthday, secondBirthday)
      || (valid.some(v => sameDay(v.date, dose.date)) ? { text: `Same day as another dose (${mdy(dose.date)}), counted once` } : null);
    if (reason) {
      reasons.set(dose, reason);
      invalid.push({ ...dose, reason: reason.text });
    } else valid.push(dose);
  }
  const required = antigen.key === 'rv'
    ? (valid.length > 0 && valid.every(isRotarix) ? 2 : 3)
    : antigen.doses;

  // Routine window + earliest allowed date for the dose filling `slotIdx`.
  const slotMeta = (slotIdx, prev) => {
    const slot = antigen.schedule[Math.min(slotIdx, antigen.schedule.length - 1)];
    const lastMin = antigen.minAgeDays[antigen.minAgeDays.length - 1] ?? 0;
    const earliest = maxDate(
      addDays(dob, antigen.minAgeDays[slotIdx] ?? lastMin),
      addDays(dob, antigen.hedisMinAgeDays ?? 0),
      prev ? addDays(prev, antigen.intervalDays[slotIdx - 1] ?? 28) : null,
      antigen.window ? firstBirthday : null,
    );
    const start = maxDate(addMonths(dob, slot.from), antigen.window ? firstBirthday : null);
    const due = minDate(
      addMonths(dob, slot.by),
      secondBirthday,
      antigen.key === 'rv' ? addDays(dob, RV_MAX_AGE_DAYS) : null,
    );
    // Last month of the routine range (2 months → the 2-month date;
    // 6–18 months → the 18-month date), for "start – end" display.
    const recommendedEnd = slot.from === 0 || slot.by - slot.from <= 1 ? null : minDate(addMonths(dob, slot.by - 1), secondBirthday);
    const recommendedShort = slot.from === 0 || slot.by - slot.from <= 1
      ? `${slot.from} mo`
      : `${slot.from}-${slot.by - 1} mo`;
    // `ageMonths` (routine age the dose starts at) drives the by-age view;
    // `ageEndMonths` is the last month of its range, for the timeline.
    return {
      recommended: recommendedLabel(slot),
      recommendedShort,
      ageMonths: slot.from,
      ageEndMonths: scheduleEndMonth(slot),
      earliest,
      start,
      recommendedEnd,
      due,
    };
  };

  const rows = [];
  let validSeen = 0;
  let lateSlots = 0;
  let prevValid = null;
  for (const dose of doses) {
    const meta = slotMeta(validSeen + lateSlots, prevValid);
    const reason = reasons.get(dose);
    if (reason) {
      rows.push({ kind: 'given', record: dose, counts: false, reason: reason.text, status: CIS_DOSE_STATUS.notCounted, ...meta });
      // A dose that does not count still takes its slot: the list stays at
      // the series length and shows why, instead of opening a repeat dose.
      if (validSeen + lateSlots < required) lateSlots += 1;
    } else {
      rows.push({ kind: 'given', record: dose, counts: true, extra: validSeen >= required, status: CIS_DOSE_STATUS.completed, ...meta });
      validSeen += 1;
      prevValid = dose.date;
    }
  }
  let slotIdx = validSeen + lateSlots;
  for (let i = 0; i < pending && slotIdx < required; i++, slotIdx++) {
    rows.push({ kind: 'pending', counts: false, status: CIS_DOSE_STATUS.pending, ...slotMeta(slotIdx, prevValid) });
  }

  // Remaining doses planned at ACIP minimums, never earlier than today.
  let prev = prevValid;
  let completion = valid.length >= required ? valid[required - 1].date : null;
  for (; slotIdx < required; slotIdx++) {
    const meta = slotMeta(slotIdx, prev);
    const planned = maxDate(meta.earliest, today);
    const eligibleFrom = maxDate(meta.start, meta.earliest);
    let status;
    if (planned > meta.due && (planned > secondBirthday || antigen.key === 'rv')) status = CIS_DOSE_STATUS.cannotMeet;
    else if (today > meta.due) status = CIS_DOSE_STATUS.overdue;
    else if (today >= eligibleFrom) status = CIS_DOSE_STATUS.dueNow;
    else if (daysBetween(eligibleFrom, today) <= UPCOMING_DAYS) status = CIS_DOSE_STATUS.upcoming;
    else status = CIS_DOSE_STATUS.onTrack;
    rows.push({ kind: 'planned', counts: false, status, plannedDate: planned, nextDue: eligibleFrom, ...meta });
    prev = planned;
    completion = planned;
  }
  rows.forEach((r, i) => { r.number = i + 1; });

  const planned = rows.filter(r => r.kind === 'planned');
  const has = (st) => planned.some(r => r.status === st);
  let status;
  if (valid.length >= required) status = CIS_ANTIGEN_STATUS.met;
  // Short with nothing left to give (the open slots hold doses that do not
  // count), or a remaining dose can't fit before the 2nd birthday.
  else if (lateSlots > 0 || has(CIS_DOSE_STATUS.cannotMeet)) status = CIS_ANTIGEN_STATUS.cannotMeet;
  else if (has(CIS_DOSE_STATUS.overdue)) status = CIS_ANTIGEN_STATUS.overdue;
  else if (has(CIS_DOSE_STATUS.dueNow) || rows.some(r => r.kind === 'pending')) status = CIS_ANTIGEN_STATUS.dueNow;
  else if (has(CIS_DOSE_STATUS.upcoming)) status = CIS_ANTIGEN_STATUS.upcoming;
  else status = CIS_ANTIGEN_STATUS.onTrack;

  return {
    key: antigen.key,
    measureCode: antigen.measureCode,
    label: antigen.label,
    name: antigen.name,
    required,
    requiredLabel: antigen.key === 'rv' && valid.length === 0 ? '2 or 3' : String(required),
    valid,
    invalid,
    rows,
    status,
    nextDueDate: planned[0]?.nextDue ?? null,
    earliestCompletion: completion,
    blocker: status === CIS_ANTIGEN_STATUS.cannotMeet && antigen.key === 'rv'
      ? 'Rotavirus series cannot be finished by 8 months of age'
      : null,
  };
}

/**
 * Evaluate a child's CIS Combination 10 status.
 *
 * @param {object} args
 * @param {string|Date} args.dob              – member date of birth
 * @param {Array}  args.immunizations         – patient_immunizations rows
 *                                              ({ title, code, dateAdministered }).
 *                                              A row with no date and a
 *                                              `pendingFor` antigen key is a
 *                                              dose marked given, date to come.
 * @param {number} [args.measurementYear]     – defaults to today's year
 * @param {Date}   [args.today]
 */
export function evaluateCis({ dob, immunizations = [], measurementYear, today = new Date() }) {
  const birth = parseLocalDate(dob);
  const now = toDay(today);
  const year = measurementYear || now.getFullYear();
  if (!birth) {
    return { evaluation: CIS_EVALUATION.notEligible, reason: 'Date of birth is missing, so the measure cannot be evaluated.', antigens: [], metCount: 0, total: CIS_ANTIGENS.length };
  }
  const dobDay = toDay(birth);
  const firstBirthday = addMonths(dobDay, 12);
  const secondBirthday = addMonths(dobDay, 24);
  const ctx = { dob: dobDay, today: now, firstBirthday, secondBirthday };

  const dosesByAntigen = Object.fromEntries(CIS_ANTIGENS.map(a => [a.key, []]));
  // Doses marked given in the tracker but not dated yet (`pendingFor`).
  const pendingByAntigen = Object.fromEntries(CIS_ANTIGENS.map(a => [a.key, 0]));
  for (const imm of immunizations) {
    const date = parseLocalDate(imm?.dateAdministered);
    if (!date) {
      if (imm?.pendingFor in pendingByAntigen) pendingByAntigen[imm.pendingFor] += 1;
      continue;
    }
    const dose = { id: imm.id, title: imm.title || '', code: imm.code || '', date: toDay(date) };
    for (const key of antigensForImmunization(imm)) dosesByAntigen[key].push(dose);
  }
  const antigens = CIS_ANTIGENS.map(a => evaluateAntigen(
    a,
    dosesByAntigen[a.key].sort((x, y) => x.date - y.date),
    ctx,
    pendingByAntigen[a.key],
  ));

  const allRows = antigens.flatMap(a => a.rows);
  const countOf = (st) => allRows.filter(r => r.status === st).length;
  const doses = {
    total: antigens.reduce((n, a) => n + a.required, 0),
    completed: antigens.reduce((n, a) => n + Math.min(a.valid.length, a.required), 0),
    dueNow: countOf(CIS_DOSE_STATUS.dueNow) + countOf(CIS_DOSE_STATUS.pending),
    overdue: countOf(CIS_DOSE_STATUS.overdue),
    upcoming: countOf(CIS_DOSE_STATUS.upcoming),
    onTrack: countOf(CIS_DOSE_STATUS.onTrack),
    cannotMeet: countOf(CIS_DOSE_STATUS.cannotMeet),
    notCounted: countOf(CIS_DOSE_STATUS.notCounted),
  };

  const metCount = antigens.filter(a => a.status === CIS_ANTIGEN_STATUS.met).length;
  const daysLeft = daysBetween(secondBirthday, now);
  const reportingYear = secondBirthday.getFullYear();
  const base = {
    dob: dobDay,
    firstBirthday,
    secondBirthday,
    ageMonths: ageInMonths(dobDay, now),
    daysLeft,
    reportingYear,
    antigens,
    doses,
    metCount,
    total: antigens.length,
  };

  if (reportingYear < year) {
    return { ...base, evaluation: CIS_EVALUATION.notEligible, reason: `Turned 2 in ${reportingYear}, before measurement year ${year}.` };
  }
  if (metCount === antigens.length) {
    return { ...base, evaluation: CIS_EVALUATION.compliant, reason: 'All 10 vaccines meet the Combination 10 requirements.' };
  }
  const blocked = antigens.filter(a => a.status === CIS_ANTIGEN_STATUS.cannotMeet);
  if (daysLeft < 0 || blocked.length) {
    const reason = daysLeft < 0
      ? 'The 2nd birthday has passed with vaccines outstanding. Later doses do not count for this measure.'
      : `${blocked.map(a => a.label).join(', ')} cannot be completed before the 2nd birthday.`;
    return { ...base, evaluation: CIS_EVALUATION.cannotMeet, reason };
  }
  const overdue = antigens.filter(a => a.status === CIS_ANTIGEN_STATUS.overdue);
  const outstanding = antigens.length - metCount;
  if (overdue.length || daysLeft <= AT_RISK_DAYS) {
    const reason = overdue.length
      ? `${overdue.map(a => a.label).join(', ')} ${overdue.length === 1 ? 'is' : 'are'} behind schedule. ${outstanding} of ${antigens.length} vaccines still outstanding.`
      : `${daysLeft} days left before the 2nd birthday with ${outstanding} vaccine${outstanding === 1 ? '' : 's'} outstanding.`;
    return { ...base, evaluation: CIS_EVALUATION.atRisk, reason };
  }
  return { ...base, evaluation: CIS_EVALUATION.onTrack, reason: `${metCount} of ${antigens.length} vaccines complete. Remaining doses fit before the 2nd birthday.` };
}

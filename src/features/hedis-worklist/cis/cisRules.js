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
  dueNow: 'Due now',
  overdue: 'Overdue',
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
 */
export const CIS_ANTIGENS = [
  {
    key: 'dtap', label: 'DTaP', name: 'Diphtheria, tetanus, pertussis', doses: 4,
    hedisMinAgeDays: 42,
    cvx: ['20', '50', '106', '107', '110', '120', '130', '146'],
    match: /dtap|pediarix|pentacel|vaxelis|kinrix|quadracel|infanrix|daptacel/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 7 }, { from: 15, by: 19 }],
    minAgeDays: [42, 70, 98, 365], intervalDays: [28, 28, 182],
  },
  {
    key: 'ipv', label: 'IPV', name: 'Polio', doses: 3,
    hedisMinAgeDays: 42,
    cvx: ['10', '89', '110', '120', '130', '146'],
    match: /\bipv\b|polio|ipol|pediarix|pentacel|vaxelis|kinrix|quadracel/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 19 }],
    minAgeDays: [42, 70, 98], intervalDays: [28, 28],
  },
  {
    key: 'mmr', label: 'MMR', name: 'Measles, mumps, rubella', doses: 1,
    window: true,
    cvx: ['03', '94'],
    match: /\bmmr|proquad/i,
    schedule: [{ from: 12, by: 16 }],
    minAgeDays: [0], intervalDays: [],
  },
  {
    key: 'hib', label: 'HiB', name: 'Haemophilus influenzae type b', doses: 3,
    hedisMinAgeDays: 42,
    cvx: ['17', '46', '47', '48', '49', '50', '51', '120', '146', '148'],
    match: /\bhib\b|pedvax|acthib|hiberix|pentacel|vaxelis/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 12, by: 16 }],
    minAgeDays: [42, 70, 365], intervalDays: [28, 56],
  },
  {
    key: 'hepb', label: 'Hep B', name: 'Hepatitis B', doses: 3,
    hedisMinAgeDays: 0,
    cvx: ['08', '45', '51', '110', '146'],
    match: /hep(atitis)?[\s-]*b\b|engerix|recombivax|pediarix|vaxelis/i,
    schedule: [{ from: 0, by: 2 }, { from: 1, by: 3 }, { from: 6, by: 19 }],
    minAgeDays: [0, 28, 164], intervalDays: [28, 56],
  },
  {
    key: 'vzv', label: 'VZV', name: 'Varicella (chickenpox)', doses: 1,
    window: true,
    cvx: ['21', '94'],
    match: /varicella|varivax|\bvzv\b|mmrv|proquad/i,
    schedule: [{ from: 12, by: 16 }],
    minAgeDays: [0], intervalDays: [],
  },
  {
    key: 'pcv', label: 'PCV', name: 'Pneumococcal conjugate', doses: 4,
    hedisMinAgeDays: 42,
    cvx: ['100', '133', '152', '215', '216'],
    match: /\bpcv|pneumococcal conjugate|prevnar|vaxneuvance/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 7 }, { from: 12, by: 16 }],
    minAgeDays: [42, 70, 98, 365], intervalDays: [28, 28, 56],
  },
  {
    key: 'hepa', label: 'Hep A', name: 'Hepatitis A', doses: 1,
    window: true,
    cvx: ['31', '83', '85'],
    match: /hep(atitis)?[\s-]*a\b|havrix|vaqta/i,
    schedule: [{ from: 12, by: 24 }],
    minAgeDays: [0], intervalDays: [],
  },
  {
    key: 'rv', label: 'Rotavirus', name: 'Rotavirus', doses: 3,
    hedisMinAgeDays: 42,
    cvx: ['116', '119', '122'],
    match: /rota/i,
    schedule: [{ from: 2, by: 3 }, { from: 4, by: 5 }, { from: 6, by: 7 }],
    minAgeDays: [42, 70, 98], intervalDays: [28, 28],
  },
  {
    key: 'flu', label: 'Influenza', name: 'Influenza', doses: 2,
    hedisMinAgeDays: 180,
    cvx: ['88', '111', '140', '141', '149', '150', '153', '155', '158', '161', '171', '186', '197', '205'],
    match: /influenza|\bflu|fluzone|fluarix|flulaval|afluria|flucelvax/i,
    schedule: [{ from: 6, by: 8 }, { from: 7, by: 9 }],
    minAgeDays: [180, 208], intervalDays: [28],
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

// Why a recorded dose does not count for HEDIS, or null when it does.
function invalidReason(antigen, dose, dob, firstBirthday, secondBirthday) {
  if (dose.date > secondBirthday) return 'Given after the 2nd birthday';
  if (antigen.window && dose.date < firstBirthday) return 'Given before the 1st birthday';
  const ageDays = daysBetween(dose.date, dob);
  if (ageDays < 0) return 'Dated before the date of birth';
  if (antigen.hedisMinAgeDays && ageDays < antigen.hedisMinAgeDays) {
    return antigen.hedisMinAgeDays === 180 ? 'Given before 6 months of age' : 'Given before 42 days of age';
  }
  if (antigen.key === 'flu' && isLaiv(dose) && !sameDay(dose.date, secondBirthday)) {
    return 'Nasal (LAIV) flu vaccine only counts on the 2nd birthday';
  }
  return null;
}

function evaluateAntigen(antigen, doses, ctx) {
  const { dob, today, firstBirthday, secondBirthday } = ctx;
  const valid = [];
  const invalid = [];
  for (const dose of doses) {
    const reason = invalidReason(antigen, dose, dob, firstBirthday, secondBirthday);
    if (reason) invalid.push({ ...dose, reason });
    else if (!valid.some(v => sameDay(v.date, dose.date))) valid.push(dose);
  }
  const required = antigen.key === 'rv'
    ? (valid.length > 0 && valid.every(isRotarix) ? 2 : 3)
    : antigen.doses;
  const base = {
    key: antigen.key,
    label: antigen.label,
    name: antigen.name,
    required,
    requiredLabel: antigen.key === 'rv' && valid.length === 0 ? '2 or 3' : String(required),
    valid,
    invalid,
  };
  if (valid.length >= required) {
    return { ...base, status: CIS_ANTIGEN_STATUS.met, nextDueDate: null, earliestCompletion: valid[required - 1].date };
  }

  // Plan the remaining doses at ACIP minimums, never earlier than today.
  const minStart = antigen.window ? firstBirthday : null;
  let prev = valid.length ? valid[valid.length - 1].date : null;
  let nextEligible = null;
  let completion = null;
  for (let idx = valid.length; idx < required; idx++) {
    const earliest = maxDate(
      addDays(dob, antigen.minAgeDays[idx] ?? 0),
      prev ? addDays(prev, antigen.intervalDays[idx - 1] ?? 28) : null,
      minStart,
    );
    if (idx === valid.length) nextEligible = earliest;
    const planned = maxDate(earliest, today);
    prev = planned;
    completion = planned;
  }

  const slot = antigen.schedule[valid.length] || antigen.schedule[antigen.schedule.length - 1];
  const recommendedFrom = addMonths(dob, slot.from);
  const recommendedBy = addMonths(dob, slot.by);
  const nextDueDate = maxDate(nextEligible, recommendedFrom);
  const rvTooOld = antigen.key === 'rv' && daysBetween(completion, dob) > RV_MAX_AGE_DAYS;

  let status;
  if (completion > secondBirthday || rvTooOld) status = CIS_ANTIGEN_STATUS.cannotMeet;
  else if (today > recommendedBy) status = CIS_ANTIGEN_STATUS.overdue;
  else if (today >= nextDueDate) status = CIS_ANTIGEN_STATUS.dueNow;
  else status = CIS_ANTIGEN_STATUS.onTrack;

  return {
    ...base,
    status,
    nextDueDate,
    recommendedBy,
    earliestCompletion: completion,
    blocker: rvTooOld ? 'Rotavirus series cannot be finished by 8 months of age' : null,
  };
}

/**
 * Evaluate a child's CIS Combination 10 status.
 *
 * @param {object} args
 * @param {string|Date} args.dob              – member date of birth
 * @param {Array}  args.immunizations         – patient_immunizations rows
 *                                              ({ title, code, dateAdministered })
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
  for (const imm of immunizations) {
    const date = parseLocalDate(imm?.dateAdministered);
    if (!date) continue;
    const dose = { id: imm.id, title: imm.title || '', code: imm.code || '', date: toDay(date) };
    for (const key of antigensForImmunization(imm)) dosesByAntigen[key].push(dose);
  }
  const antigens = CIS_ANTIGENS.map(a => evaluateAntigen(
    a,
    dosesByAntigen[a.key].sort((x, y) => x.date - y.date),
    ctx,
  ));

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

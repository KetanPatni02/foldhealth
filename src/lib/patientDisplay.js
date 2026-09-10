import { formatDobDisplay, deriveDob } from './patientDob';

/** "Ny Mm" age from a MM/DD/YYYY dob string. */
export function ageFromDobMdy(mdy, today = new Date()) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(mdy || ''));
  if (!m) return '';
  const birth = new Date(+m[3], +m[1] - 1, +m[2]);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  return years >= 0 ? `${years}y ${months}m` : '';
}

export const LANGUAGE_CODE_MAP = {
  'En(US-Native)': 'en',
  'Es(US-Native)': 'es',
  'Chinese (Yue-Basic)': 'yue',
  'Chinese (Mandarin)': 'zh',
  French: 'fr',
  Vietnamese: 'vi',
  Tagalog: 'tl',
  Korean: 'ko',
  Arabic: 'ar',
};

export const LANGUAGE_LABEL_MAP = Object.fromEntries(
  Object.entries(LANGUAGE_CODE_MAP).map(([label, code]) => [code, label]),
);

export function genderLabelFrom(g) {
  const s = String(g || '').toLowerCase();
  if (!s) return '';
  if (s === 'f' || s.includes('female')) return 'Female';
  if (s === 'm' || s.includes('male')) return 'Male';
  if (s.includes('non') && s.includes('binary')) return 'Non-binary';
  return g;
}

export function genderCodeFrom(label) {
  if (label === 'Male') return 'M';
  if (label === 'Female') return 'F';
  return label || null;
}

export function formatPatientDisplayName(legalName, chosenName) {
  const legal = String(legalName || '').trim();
  const chosen = String(chosenName || '').trim();
  if (!legal) return chosen || '';
  if (!chosen) return legal;
  return `${legal} (${chosen})`;
}

function resolveDobMdy(patient, p360) {
  return formatDobDisplay(p360?.date_of_birth)
    || formatDobDisplay(patient?.dob)
    || deriveDob(p360?.age || patient?.age, patient?.name)
    || '';
}

function resolvePrimaryLanguageLabel(patient, p360) {
  return p360?.primary_language
    || p360?.language_preference
    || LANGUAGE_LABEL_MAP[patient?.language]
    || patient?.language
    || '';
}

/**
 * Single source of truth for patient identity fields shown in the P360
 * profile surfaces. Merges the worklist/patient row with p360_profiles
 * basic info, with p360 winning on demographics the user edits in the drawer.
 */
export function resolvePatientDisplay(patient, p360 = null) {
  const p = p360?.patient_id === patient?.id ? p360 : null;
  const legalName = patient?.name || '';
  const chosenName = (p?.chosen_name || patient?.chosenName || '').trim();
  const dob = resolveDobMdy(patient, p);
  const age = dob ? ageFromDobMdy(dob) : (p?.age || patient?.age || '');
  const gender = genderLabelFrom(p?.gender_identity || patient?.gender);
  const primaryLanguage = resolvePrimaryLanguageLabel(patient, p);
  const languageCode = LANGUAGE_CODE_MAP[primaryLanguage] || patient?.language || 'en';

  return {
    legalName,
    chosenName,
    displayName: formatPatientDisplayName(legalName, chosenName),
    dob,
    age,
    gender,
    language: languageCode,
    primaryLanguage,
    secondaryLanguage: p?.secondary_language || '',
  };
}

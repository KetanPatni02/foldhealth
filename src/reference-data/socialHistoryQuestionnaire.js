// The Social History questionnaire, as the Fold QA app asks it.
//
// One definition feeds both the Social History drawer (which renders the form)
// and the PAMI/Hx Social History card (which lists whatever has been
// answered), so a question's label and options can only change in one place.
//
// Answers are stored per patient as `{ [question.id]: value }`:
//   select → string (a dropdown), radio → string (options laid out under the
//   question), multi → string[], text → string,
//   number → string of a whole number within the question's min / max
//
// Tobacco has its own section: "Tobacco status" uses the tobacco-use value
// set ("Never user"). Alcohol and other substances used to repeat
// the tobacco questions; they were dropped there since Tobacco covers them.
//
// SDOH and AUDIT-C render as forms (`form` on the section): the same fields
// the Form Builder offers, so they read and score the same everywhere.

import { SDOH_ITEMS, SDOH_TITLE, normalizeSdohAnswers } from './sdohScreening';
import { instrumentFields } from '../features/forms/builder/validatedInstruments';

// AUDIT-C's three questions, keyed as the drawer has always saved them.
const AUDIT_C_FIELDS = instrumentFields('auditc', { c1: 'audit_c_frequency', c2: 'audit_c_intensity', c3: 'audit_c_binge' });

// The PAMI/Hx card lists answers by label; the instrument's full questions
// are too long there, so it keeps the short names.
const AUDIT_C_SUMMARY = {
  c1: 'Drink frequency (AUDIT-C)',
  c2: 'Drink intensity (AUDIT-C)',
  c3: 'Binge frequency (AUDIT-C)',
};

// `shortTitle` labels the drawer's section toggle, where the full titles
// ("Social Determinants of Health (SDOH)") would not fit a segment.
export const SOCIAL_HISTORY_SECTIONS = [
  {
    id: 'tobacco',
    shortTitle: 'Tobacco',
    title: 'Tobacco',
    questions: [
      {
        id: 'tobacco_status',
        label: 'Tobacco status',
        type: 'select',
        options: [
          'Never user', 'Former user', 'Current every day user', 'Current some day user',
          'Current Heavy tobacco user', 'Current Light tobacco user',
          'Tobacco user, current status unknown', 'Unknown if ever used tobacco',
        ],
      },
      { id: 'tobacco_type', label: 'Tobacco type', type: 'multi', options: ['Cigarettes', 'eCigarette', 'Smokeless', 'Cigar/Pipe'] },
      { id: 'tobacco_comment', label: 'Tobacco comment', type: 'text' },
    ],
  },
  {
    id: 'exercise',
    shortTitle: 'Exercise',
    title: 'Exercise',
    questions: [
      { id: 'exercise_regular', label: 'Do you exercise on a regular basis?', type: 'radio', options: ['Yes', 'No'] },
      // Typed rather than picked. Days in a week: a whole number, 0 to 7.
      { id: 'exercise_days', label: 'In an average week, how many days do you exercise?', type: 'number', min: 0, max: 7 },
      {
        id: 'exercise_duration',
        label: 'On the days when you exercised, for how long did you exercise?',
        type: 'radio',
        options: ['10-20 min', '20-40 min', '40-60 min', '> 1 hr'],
      },
      { id: 'exercise_type', label: 'What type of exercise do you do?', type: 'text' },
    ],
  },
  {
    id: 'sdoh',
    shortTitle: 'SDOH',
    title: SDOH_TITLE,
    // Rendered as a form: the same locked fields the Form Builder offers as
    // a Health Component (see sdohScreening.js). `questions` mirrors them so
    // the PAMI/Hx card can list the answers like any other section's.
    form: SDOH_ITEMS,
    questions: SDOH_ITEMS.map(it => ({ id: it.code, label: it.text, type: 'form' })),
  },
  {
    id: 'substances',
    shortTitle: 'Substances',
    title: 'Alcohol and other substances',
    // AUDIT-C renders as the Form Builder's validated instrument, under the
    // answer keys the drawer always used. Tobacco lives in its own section.
    form: AUDIT_C_FIELDS,
    questions: [
      ...AUDIT_C_FIELDS.filter(f => f.code).map(f => ({ id: f.linkId, label: f.text, summaryLabel: AUDIT_C_SUMMARY[f.code], type: 'form' })),
      { id: 'other_substances', label: 'Other substances', type: 'text' },
    ],
  },
];

/**
 * Saved answers in the form the current fields expect: SDOH's old "0 - Never"
 * style ends, and AUDIT-C answers saved with a hyphen ("2-4 times a month")
 * where the instrument uses an en dash.
 */
export function normalizeSocialAnswers(answers = {}) {
  const out = normalizeSdohAnswers(answers);
  ['audit_c_frequency', 'audit_c_intensity', 'audit_c_binge'].forEach((k) => {
    if (typeof out[k] === 'string') out[k] = out[k].replace(/(\d)-(\d)/, '$1–$2');
  });
  return out;
}

/** Every question, in form order. */
export const SOCIAL_HISTORY_QUESTIONS = SOCIAL_HISTORY_SECTIONS.flatMap(s => s.questions);

/** An answer as display text, or '' when unanswered. */
export function formatSocialAnswer(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value).trim();
}

/** Answered questions, in form order, as `{ id, label, value }` for display. */
export function answeredSocialHistory(answers = {}) {
  return SOCIAL_HISTORY_QUESTIONS
    .map(q => ({ id: q.id, label: q.summaryLabel || q.label, value: formatSocialAnswer(answers[q.id]) }))
    .filter(a => a.value);
}

/**
 * Whether `text` is an acceptable answer to a `number` question: a whole
 * number within its min / max. Empty is acceptable (it clears the answer).
 */
export function isValidNumberAnswer(question, text) {
  const t = String(text ?? '').trim();
  if (t === '') return true;
  if (!/^\d+$/.test(t)) return false;
  const n = Number(t);
  return n >= (question.min ?? 0) && n <= (question.max ?? Infinity);
}

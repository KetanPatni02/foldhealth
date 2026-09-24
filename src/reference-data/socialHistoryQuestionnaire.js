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
// Two labels repeat on purpose, because the source form repeats them:
// "Tobacco status" and "Tobacco comment" appear under both Tobacco and
// Alcohol, tobacco and other substances. The two statuses are different
// questions: the first uses the tobacco-use value set ("Never user"), the
// second the smoking-status one ("Never smoker"): so they get distinct ids,
// and a `summaryLabel` so the PAMI/Hx card, which lists answers by label,
// doesn't show two identical "Tobacco status" rows. The drawer keeps the
// source form's wording.

const SDOH_FREQUENCY = ['0 - Never', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10 - Always'];

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
    title: 'Social Determinants of Health (SDOH)',
    questions: [
      { id: 'sdoh_food', label: '1. I worried about not having enough food or money for food.', type: 'select', options: SDOH_FREQUENCY },
      { id: 'sdoh_utilities', label: '2. I worried that my electric, gas, or water would be shut off.', type: 'select', options: SDOH_FREQUENCY },
      { id: 'sdoh_housing', label: '3. I worried that I would not have a steady place to live.', type: 'select', options: SDOH_FREQUENCY },
      { id: 'sdoh_isolation', label: '4. I feel lonely or isolated from others around me.', type: 'select', options: SDOH_FREQUENCY },
      {
        id: 'sdoh_safety',
        label: '5. I have others in my life, including friends and family, who threaten, insult, or make fun of me.',
        type: 'select',
        options: SDOH_FREQUENCY,
      },
      {
        id: 'sdoh_household',
        label: '6. Who lives at home with you?',
        type: 'multi',
        options: [
          'No one (I live alone)', 'Spouse/Partner/Significant Other', 'Parent(s)', 'Child(ren)',
          'Sibling(s)', 'Other family member(s)', 'Non-family friend, housemate, roommate, or tenant',
        ],
      },
      {
        id: 'sdoh_access',
        label: '7. Which things are at a distance you can comfortably get to on your own?',
        type: 'multi',
        options: ['Grocery store / Market', 'Community Center', 'Public Park', 'Public Pool', 'Gym or Fitness Center', 'Church'],
      },
      {
        id: 'sdoh_transport',
        label: '8. For transportation, what do you rely on?',
        type: 'multi',
        options: [
          'Personal car / vehicle', 'Public Transportation (bus, metro, light rail, train)',
          'Someone to drive me (Family, friend, taxi, Lyft/Uber)', 'Bike / e-bike',
          'Motorized scooter', 'Walk', 'Wheelchair',
        ],
      },
    ],
  },
  {
    id: 'substances',
    shortTitle: 'Substances',
    title: 'Alcohol, tobacco and other substances',
    questions: [
      {
        id: 'audit_c_frequency',
        label: 'Drink frequency (AUDIT-C)',
        type: 'select',
        options: ['Never', 'Monthly or less', '2-4 times a month', '2-3 times a week', '4 or more times a week'],
      },
      {
        id: 'audit_c_intensity',
        label: 'Drink intensity (AUDIT-C)',
        type: 'select',
        options: ['None', '1 or 2', '3 or 4', '5 or 6', '7 to 9', '10 or more'],
      },
      {
        id: 'audit_c_binge',
        label: 'Binge frequency (AUDIT-C)',
        type: 'select',
        options: ['Never', 'Less than monthly', 'Monthly', 'Weekly', 'Daily or almost daily'],
      },
      {
        id: 'smoking_status',
        label: 'Tobacco status',
        summaryLabel: 'Smoking status',
        type: 'select',
        options: [
          'Never smoker', 'Former smoker', 'Current everyday smoker', 'Current some day smoker',
          'Current Heavy tobacco smoker', 'Current Light tobacco smoker',
          'Smoker, current status unknown', 'Unknown if ever smoked',
        ],
      },
      { id: 'substances_tobacco_comment', label: 'Tobacco comment', summaryLabel: 'Smoking comment', type: 'text' },
      { id: 'other_substances', label: 'Other substances', type: 'text' },
    ],
  },
];

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

// The SDOH (Social Determinants of Health) screening, as Form Builder fields.
//
// One definition feeds both places it appears:
//   • the Form Builder's Health Components palette, where an author drops it
//     into any form as a locked group (questions and options can't be edited,
//     so answers stay comparable across forms), and
//   • the Social History drawer's SDOH section, which renders these fields
//     with the form renderer and saves each answer as it is given.
//
// Each question's `code` is its stable id. The drawer uses it as the answer
// key (the same keys the drawer saved before it rendered a form), and a copy
// dropped into a form keeps it alongside the form's own linkIds.
//
// The five "I worried…" questions are 0–10 Ratings from Never to Always; the
// three "which / who" questions are tick-all-that-apply checkboxes.

import { DEFAULT_RATING_FILL, ratingOptions } from '../features/forms/builder/rating';

export const SDOH_TITLE = 'Social Determinants of Health (SDOH)';

const frequency = (code, text) => ({
  linkId: code,
  code,
  type: 'choice',
  control: 'rating',
  text,
  required: false,
  locked: true,
  ratingElement: 'circle',
  ratingScale: 10,
  showRatingScale: true,
  fillColor: DEFAULT_RATING_FILL,
  ratingLabels: 'custom',
  ratingLowLabel: 'Never',
  ratingHighLabel: 'Always',
  options: ratingOptions(10),
});

// A "none" answer (`exclusive`) can't be ticked alongside the others.
const pickAll = (code, text, options, exclusive) => ({
  linkId: code,
  code,
  type: 'choice',
  control: 'checkbox',
  text,
  required: false,
  locked: true,
  options: options.map(value => (value === exclusive ? { value, exclusive: true } : { value })),
});

export const SDOH_ITEMS = [
  frequency('sdoh_food', 'I worried about not having enough food or money for food.'),
  frequency('sdoh_utilities', 'I worried that my electric, gas, or water would be shut off.'),
  frequency('sdoh_housing', 'I worried that I would not have a steady place to live.'),
  frequency('sdoh_isolation', 'I feel lonely or isolated from others around me.'),
  frequency('sdoh_safety', 'I have others in my life, including friends and family, who threaten, insult, or make fun of me.'),
  pickAll('sdoh_household', 'Who lives at home with you?', [
    'No one (I live alone)', 'Spouse/Partner/Significant Other', 'Parent(s)', 'Child(ren)',
    'Sibling(s)', 'Other family member(s)', 'Non-family friend, housemate, roommate, or tenant',
  ], 'No one (I live alone)'),
  pickAll('sdoh_access', 'Which things are at a distance you can comfortably get to on your own?', [
    'Grocery store / Market', 'Community Center', 'Public Park', 'Public Pool', 'Gym or Fitness Center', 'Church',
  ]),
  pickAll('sdoh_transport', 'For transportation, what do you rely on?', [
    'Personal car / vehicle', 'Public Transportation (bus, metro, light rail, train)',
    'Someone to drive me (Family, friend, taxi, Lyft/Uber)', 'Bike / e-bike',
    'Motorized scooter', 'Walk', 'Wheelchair',
  ]),
];

/** A fresh, locked SDOH group for the Form Builder palette to drop. */
export function makeSdohGroup() {
  return {
    type: 'group',
    text: SDOH_TITLE,
    healthKey: 'sdoh',
    locked: true,
    items: SDOH_ITEMS.map(it => ({ ...it, options: it.options.map(o => ({ ...o })) })),
  };
}

/**
 * Answers saved before the drawer rendered a form stored the scale's ends as
 * "0 - Never" and "10 - Always". As Rating values they are "0" and "10".
 */
export function normalizeSdohAnswers(answers = {}) {
  const out = { ...answers };
  SDOH_ITEMS.forEach((it) => {
    const v = out[it.code];
    if (it.control === 'rating' && typeof v === 'string' && /^\d+\s*-/.test(v)) out[it.code] = String(parseInt(v, 10));
  });
  return out;
}

/**
 * The Form Builder's Rating question.
 *
 * A Rating is a `choice` field with `control: 'rating'`, so scoring, logic,
 * required checks and analytics treat it like any other single-choice
 * question. Its options are generated from the scale: one per point, each
 * scored with its own number: and it carries its display settings:
 *
 *   ratingElement    which icon the scale is drawn with (RATING_ELEMENTS key)
 *   ratingScale      how many points (RATING_SCALES)
 *   showRatingScale  whether the scale's numbers are shown
 *   fillColor        hex colour for a selected element
 *   ratingLabels     which words anchor the ends (RATING_LABELS key)
 *   ratingLowLabel / ratingHighLabel  the words, when ratingLabels is 'custom'
 */

// `icon` is what the settings panel's Rating Elements dropdown shows; NPS uses
// the in-repo gauge, the same icon as the palette card.
//
// `look` is how the question draws (Figma "Nov–Dec • Devanshi"):
//   slider: a track filled to the chosen point, `thumb` riding its end
//            (Star 251:5922, Heart 247:5783, User 251:6143, Thumbs 251:6062)
//            Circle uses the same slider with a plain round handle.
//   dots  : a row of dots filled up to the chosen point (Circle 190:30868),
//            no longer used by any element
//   tiles : numbered tiles, the chosen one coloured by its NPS group
//            (NPS 209:19439)
//
// `fixedScale` locks the number of points: NPS is always 0–10.
export const RATING_ELEMENTS = [
  { key: 'star', label: 'Star', icon: 'solar:star-linear', look: 'slider', thumb: 'solar:star-bold' },
  { key: 'heart', label: 'Heart', icon: 'solar:heart-linear', look: 'slider', thumb: 'solar:heart-bold' },
  { key: 'user', label: 'User', icon: 'solar:user-linear', look: 'slider', thumb: 'solar:user-bold' },
  { key: 'thumbs-up', label: 'Thumbs Up', icon: 'solar:like-linear', look: 'slider', thumb: 'solar:like-bold' },
  { key: 'circle', label: 'Circle', icon: 'solar:record-linear', look: 'slider', thumb: 'dot' },
  { key: 'nps', label: 'NPS', icon: 'custom:rating', look: 'tiles', fixedScale: 10, labels: 'likely' },
];

export const RATING_SCALES = [3, 4, 5, 6, 7, 8, 9, 10];

// Stored with the form as data, not a style: the colour the author picked.
// The default is --neutral-300's value (a hex, since the colour picker and
// saved forms hold hex).
export const DEFAULT_RATING_FILL = '#4F5A70';

export const DEFAULT_RATING_SCALE = 10;

// The words under each end of the scale, so a respondent knows which way is
// good. `mid` sits under the middle where the pair has a natural neutral.
export const RATING_LABELS = [
  { key: 'agree', label: 'Disagree – Agree', low: 'Strongly Disagree', mid: 'Neutral', high: 'Strongly Agree' },
  { key: 'good', label: 'Bad – Good', low: 'Very Bad', high: 'Very Good' },
  { key: 'satisfied', label: 'Dissatisfied – Satisfied', low: 'Very Dissatisfied', high: 'Very Satisfied' },
  { key: 'likely', label: 'Unlikely – Likely', low: 'Not at All Likely', high: 'Extremely Likely' },
  { key: 'custom', label: 'Custom' },
  { key: 'none', label: 'None' },
];

export const DEFAULT_RATING_LABELS = 'agree';

/** Which label preset a field uses: its own, else its element's, else the default. */
export const ratingLabelsKey = (field) =>
  field.ratingLabels || ratingElement(field.ratingElement).labels || DEFAULT_RATING_LABELS;

/** The field's end labels, or null when it shows none. */
export function ratingAnchors(field) {
  const key = ratingLabelsKey(field);
  if (key === 'none') return null;
  if (key === 'custom') {
    const low = String(field.ratingLowLabel || '').trim();
    const high = String(field.ratingHighLabel || '').trim();
    return low || high ? { low, high } : null;
  }
  const preset = RATING_LABELS.find(l => l.key === key) || RATING_LABELS[0];
  return { low: preset.low, mid: preset.mid, high: preset.high };
}

export const ratingElement = (key) => RATING_ELEMENTS.find(e => e.key === key) || RATING_ELEMENTS[0];

/**
 * One option per point on the scale, 0…n, each scored with its own number.
 * The scale starts at 0 so the lowest answer means none at all.
 */
export function ratingOptions(scale) {
  return Array.from({ length: scale + 1 }, (_, i) => ({ value: String(i), score: i }));
}

/**
 * Ratings saved before the scale started at 0 have options 1…n, and older
 * NPS questions may have fewer than 0–10. Rebuild them, in this list and any
 * nested group, so they draw like new ones.
 */
export function upgradeRatingFields(items) {
  return (items || []).map((it) => {
    if (it.items) return { ...it, items: upgradeRatingFields(it.items) };
    if (it.control !== 'rating') return it;
    const fixed = ratingElement(it.ratingElement).fixedScale;
    const scale = fixed || it.ratingScale || DEFAULT_RATING_SCALE;
    const stale = it.options?.[0]?.value !== '0' || it.options.length !== scale + 1;
    return stale ? { ...it, ratingScale: scale, options: ratingOptions(scale) } : it;
  });
}

/** A new Rating question, as the palette drops it. */
export function makeRatingField() {
  return {
    type: 'choice',
    control: 'rating',
    text: 'Rating',
    required: false,
    ratingElement: 'star',
    ratingScale: DEFAULT_RATING_SCALE,
    showRatingScale: true,
    fillColor: DEFAULT_RATING_FILL,
    ratingLabels: DEFAULT_RATING_LABELS,
    options: ratingOptions(DEFAULT_RATING_SCALE),
  };
}

/** Whether a field is a Net Promoter Score question. */
export const isNpsField = (field) => field?.control === 'rating' && field.ratingElement === 'nps';

/** The standard NPS question, used when an author switches a Rating to NPS. */
export const NPS_QUESTION = 'How likely are you to recommend us to a friend or colleague?';

/**
 * A 0–10 answer's NPS group: 0–6 detractor, 7–8 passive, 9–10 promoter.
 *
 * @returns {'detractor'|'passive'|'promoter'}
 */
export function npsGroup(point) {
  if (point <= 6) return 'detractor';
  if (point <= 8) return 'passive';
  return 'promoter';
}

/** The tile tone for each NPS group. */
export const NPS_TONE = { detractor: 'low', passive: 'mid', promoter: 'high' };

/**
 * Net Promoter Score for a set of 0–10 answers: % promoters minus %
 * detractors, a whole number from -100 to 100 (null with no answers).
 */
export function npsScore(points) {
  const counts = { detractor: 0, passive: 0, promoter: 0 };
  points.forEach((p) => { counts[npsGroup(p)] += 1; });
  const n = points.length;
  const score = n ? Math.round(((counts.promoter - counts.detractor) / n) * 100) : null;
  return { ...counts, total: n, score };
}

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
 */

// `icon` is what the settings panel's Rating Elements dropdown shows; NPS uses
// the in-repo gauge, the same icon as the palette card.
//
// `look` is how the question draws (Figma "Nov–Dec • Devanshi"):
//   slider: a track filled to the chosen point, `thumb` riding its end
//            (Star 251:5922, Heart 247:5783, User 251:6143, Thumbs 251:6062)
//   dots  : a row of dots filled up to the chosen point (Circle 190:30868)
//   tiles : numbered tiles, the chosen one coloured by band (NPS 209:19439)
export const RATING_ELEMENTS = [
  { key: 'star', label: 'Star', icon: 'solar:star-linear', look: 'slider', thumb: 'solar:star-bold' },
  { key: 'heart', label: 'Heart', icon: 'solar:heart-linear', look: 'slider', thumb: 'solar:heart-bold' },
  { key: 'user', label: 'User', icon: 'solar:user-linear', look: 'slider', thumb: 'solar:user-bold' },
  { key: 'thumbs-up', label: 'Thumbs Up', icon: 'solar:like-linear', look: 'slider', thumb: 'solar:like-bold' },
  { key: 'circle', label: 'Circle', icon: 'solar:record-linear', look: 'dots' },
  { key: 'nps', label: 'NPS', icon: 'custom:rating', look: 'tiles' },
];

export const RATING_SCALES = [3, 4, 5, 6, 7, 8, 9, 10];

// Stored with the form as data, not a style: the colour the author picked.
export const DEFAULT_RATING_FILL = '#8C5AE2';

export const DEFAULT_RATING_SCALE = 10;

export const ratingElement = (key) => RATING_ELEMENTS.find(e => e.key === key) || RATING_ELEMENTS[0];

/** One option per point on the scale, 1…n, each scored with its own number. */
export function ratingOptions(scale) {
  return Array.from({ length: scale }, (_, i) => ({ value: String(i + 1), score: i + 1 }));
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
    options: ratingOptions(DEFAULT_RATING_SCALE),
  };
}

/**
 * Which third of the scale a point falls in, for the NPS tile colour: the
 * bottom third reads as disagreement, the middle as neutral, the top as
 * agreement. On 1–10 that is 1–3, 4–6 and 7–10, matching Figma 247:6000
 * (1 red, 4 orange, 7 green).
 *
 * @returns {'low'|'mid'|'high'}
 */
export function ratingBand(point, scale) {
  if (scale <= 1) return 'high';
  const p = (point - 1) / (scale - 1);
  if (p < 1 / 3) return 'low';
  if (p < 2 / 3) return 'mid';
  return 'high';
}

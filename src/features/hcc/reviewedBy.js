// "Last Reviewed by" attribution helpers for ICD cards.
//
// An ICD is reviewed only by a coding role — Coder, QA, or Compliance. Support
// handles the *document* review workflow (pass/fail), never the ICD review, so
// an activity whose actor is Support must not surface as "Last Reviewed by …".
// This also normalizes legacy role labels that predate the QA / Compliance
// rename (Reviewer 1 / Reviewer → QA, Reviewer 2 → Compliance) so DB rows
// seeded before the rename display correctly without waiting on a migration.

const SUPPORT_SUFFIX = /\(\s*Support(?:\s*Team)?\s*\)\s*$/i;

// Rename any legacy reviewer label embedded in a "Name (Role)" string.
export function normalizeReviewerLabel(by) {
  if (!by) return by;
  return by
    .replace(/\(Reviewer 2\)/g, '(Compliance)')
    .replace(/\(Reviewer 1\)/g, '(QA)')
    .replace(/\(Reviewer\)/g, '(QA)');
}

// The name to show after "Last Reviewed by", or null when the ICD has not been
// reviewed by a coding role yet (e.g. only Support has touched it so far — its
// document workflow precedes the coder's ICD review).
export function reviewedByLabel(by) {
  if (!by || SUPPORT_SUFFIX.test(by)) return null;
  return normalizeReviewerLabel(by);
}

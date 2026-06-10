/**
 * Tiny CMS HCC V28 ICD whitelist used by the upload-OCR mock.
 *
 * Per Jira impl note: "All ICD codes extracted by OCR must be validated
 * against the active CMS V28 HCC codeset. If a code does not map or is
 * unrecognized, leave the ICD field blank." The mock OCR runs each
 * extracted code through `isValidV28Code(code)` and marks `valid: false`
 * on unrecognized codes; the review panel renders those as muted /
 * struck-through chips so the Support user can spot what got dropped.
 *
 * Real implementation pulls from the live CMS V28 codeset on the server.
 */
export const V28_ICD_WHITELIST = new Set([
  // Diabetes (HCC 18)
  'E11.21', 'E11.22', 'E11.40', 'E11.42', 'E11.9', 'E10.9',
  // Heart failure (HCC 85)
  'I50.1', 'I50.21', 'I50.22', 'I50.32', 'I50.33', 'I50.9',
  // COPD (HCC 111)
  'J44.0', 'J44.1', 'J44.9',
  // Atrial fibrillation (HCC 96)
  'I48.0', 'I48.1', 'I48.91', 'I48.21',
  // Major depression (HCC 58)
  'F32.1', 'F32.2', 'F33.1', 'F33.2',
  // CKD (HCC 137)
  'N18.3', 'N18.4', 'N18.5', 'N18.6',
  // Vascular disease (HCC 108)
  'I70.211', 'I70.221', 'I70.231',
  // Cancer (various HCCs)
  'C50.911', 'C61', 'C18.9',
]);

export function isValidV28Code(code) {
  return V28_ICD_WHITELIST.has((code || '').trim().toUpperCase());
}

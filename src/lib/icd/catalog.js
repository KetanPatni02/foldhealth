/**
 * Bundled fallback ICD catalog.
 *
 * Used as a graceful fallback for the shared ICD search whenever the WHO
 * ICD-11 API is unconfigured (no creds in local dev) or unreachable. It is
 * also the seed source for the Supabase `icd_codes` cache table (see
 * `scripts/seed.js`).
 *
 * These are common HCC-relevant ICD-10-CM codes so the app's diagnosis search
 * stays useful offline. Shape mirrors the WHO-normalized result:
 *   { code, title, hcc }
 */
export const FALLBACK_ICDS = [
  // Diabetes
  { code: 'E11.9',  title: 'Type 2 diabetes mellitus without complications', hcc: 'HCC 38' },
  { code: 'E11.22', title: 'Type 2 diabetes mellitus with diabetic chronic kidney disease', hcc: 'HCC 37, 326' },
  { code: 'E11.21', title: 'Type 2 diabetes mellitus with diabetic nephropathy', hcc: 'HCC 37' },
  { code: 'E11.65', title: 'Type 2 diabetes mellitus with hyperglycemia', hcc: 'HCC 37' },
  { code: 'E11.40', title: 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', hcc: 'HCC 37' },
  { code: 'E11.51', title: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene', hcc: 'HCC 37' },
  { code: 'E10.9',  title: 'Type 1 diabetes mellitus without complications', hcc: 'HCC 38' },
  // Heart failure
  { code: 'I50.9',  title: 'Heart failure, unspecified', hcc: 'HCC 226' },
  { code: 'I50.32', title: 'Chronic diastolic (congestive) heart failure', hcc: 'HCC 226' },
  { code: 'I50.42', title: 'Chronic combined systolic and diastolic heart failure', hcc: 'HCC 226' },
  { code: 'I50.22', title: 'Chronic systolic (congestive) heart failure', hcc: 'HCC 226' },
  // Chronic kidney disease
  { code: 'N18.30', title: 'Chronic kidney disease, stage 3 unspecified', hcc: 'HCC 329' },
  { code: 'N18.4',  title: 'Chronic kidney disease, stage 4 (severe)', hcc: 'HCC 328' },
  { code: 'N18.5',  title: 'Chronic kidney disease, stage 5', hcc: 'HCC 327' },
  { code: 'N18.6',  title: 'End stage renal disease', hcc: 'HCC 326' },
  // COPD / respiratory
  { code: 'J44.9',  title: 'Chronic obstructive pulmonary disease, unspecified', hcc: 'HCC 280' },
  { code: 'J44.1',  title: 'Chronic obstructive pulmonary disease with (acute) exacerbation', hcc: 'HCC 280' },
  { code: 'J44.0',  title: 'Chronic obstructive pulmonary disease with (acute) lower respiratory infection', hcc: 'HCC 280' },
  { code: 'J45.909', title: 'Unspecified asthma, uncomplicated', hcc: 'HCC 281' },
  { code: 'J96.11', title: 'Chronic respiratory failure with hypoxia', hcc: 'HCC 277' },
  // Cardiovascular
  { code: 'I25.10', title: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', hcc: 'HCC 224' },
  { code: 'I48.91', title: 'Unspecified atrial fibrillation', hcc: 'HCC 238' },
  { code: 'I48.0',  title: 'Paroxysmal atrial fibrillation', hcc: 'HCC 238' },
  { code: 'I73.9',  title: 'Peripheral vascular disease, unspecified', hcc: 'HCC 267' },
  { code: 'I10',    title: 'Essential (primary) hypertension', hcc: '' },
  // Cerebrovascular / neuro
  { code: 'I63.9',  title: 'Cerebral infarction, unspecified', hcc: 'HCC 253' },
  { code: 'I69.30', title: 'Unspecified sequelae of cerebral infarction', hcc: 'HCC 253' },
  { code: 'G30.9',  title: "Alzheimer's disease, unspecified", hcc: 'HCC 127' },
  { code: 'F03.90', title: 'Unspecified dementia without behavioral disturbance', hcc: 'HCC 127' },
  { code: 'G20',    title: "Parkinson's disease", hcc: 'HCC 78' },
  { code: 'G35',    title: 'Multiple sclerosis', hcc: 'HCC 77' },
  // Behavioral health
  { code: 'F32.9',  title: 'Major depressive disorder, single episode, unspecified', hcc: 'HCC 155' },
  { code: 'F33.1',  title: 'Major depressive disorder, recurrent, moderate', hcc: 'HCC 155' },
  { code: 'F20.9',  title: 'Schizophrenia, unspecified', hcc: 'HCC 151' },
  { code: 'F41.1',  title: 'Generalized anxiety disorder', hcc: '' },
  // Metabolic / nutrition
  { code: 'E66.01', title: 'Morbid (severe) obesity due to excess calories', hcc: 'HCC 48' },
  { code: 'E43',    title: 'Unspecified severe protein-calorie malnutrition', hcc: 'HCC 63' },
  { code: 'E44.0',  title: 'Moderate protein-calorie malnutrition', hcc: 'HCC 63' },
  { code: 'E78.5',  title: 'Hyperlipidemia, unspecified', hcc: '' },
  { code: 'E03.9',  title: 'Hypothyroidism, unspecified', hcc: '' },
  // Cancer (examples)
  { code: 'C50.919', title: 'Malignant neoplasm of unspecified site of unspecified female breast', hcc: 'HCC 12' },
  { code: 'C34.90', title: 'Malignant neoplasm of unspecified part of unspecified bronchus or lung', hcc: 'HCC 9' },
  { code: 'C61',    title: 'Malignant neoplasm of prostate', hcc: 'HCC 12' },
  // Other common
  { code: 'D64.9',  title: 'Anemia, unspecified', hcc: '' },
  { code: 'M06.9',  title: 'Rheumatoid arthritis, unspecified', hcc: 'HCC 40' },
  { code: 'K70.30', title: 'Alcoholic cirrhosis of liver without ascites', hcc: 'HCC 62' },
  { code: 'B20',    title: 'Human immunodeficiency virus [HIV] disease', hcc: 'HCC 1' },
];

export function filterFallbackIcds(query, limit = 15) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return FALLBACK_ICDS
    .filter((i) => i.code.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))
    .slice(0, limit)
    .map((i) => ({ ...i, hasCode: true }));
}

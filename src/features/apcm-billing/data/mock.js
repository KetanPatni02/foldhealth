// Billing month = previous calendar month from today (May 24, 2026 → April 2026)
export const BILLING_MONTH = 'April 2026';
export const DATE_OF_SERVICE = '04/30/2026'; // Last day of billing month

// 36-month lookback cutoff = April 2023
// lastEncounterDate before 04/01/2023 → triggers "No Visit in Last 36 Months"

export function getCptCode(isQmb, chronicCount) {
  if (!isQmb) return 'G0556';
  return chronicCount < 2 ? 'G0557' : 'G0558';
}

export const APCM_PATIENTS = [
  // ── Eligible tab ──────────────────────────────────────────────────────────

  {
    id: 'ap1',
    name: 'Eleanor Ramirez',
    memberId: '#A00012ER001',
    language: 'en',
    ehrId: '1234567',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 3,
    cptCode: 'G0558',
    icdCodes: [
      { code: 'I10',   description: 'Essential (primary) hypertension' },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
      { code: 'J44.1', description: 'COPD with acute exacerbation' },
    ],
    lastEncounterDate: '05/13/2022', // 47 months ago — outside 36-month window
    reasons: [
      'No Visit in Last 36 Months — Patient has no qualifying visit in the past 36 months, which is required to bill APCM services.',
      'Chronic Condition Not Selected — 3 conditions are currently selected but the chart may contain additional active chronic conditions not yet marked. Review and select all qualifying conditions before attesting.',
    ],
    renderingProvider: 'Dr. Sarah Chen',
    renderingProviderInitials: 'SC',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-001',
  },

  {
    id: 'ap2',
    name: 'Marcus Thompson',
    memberId: '#B00034MT002',
    language: 'en',
    ehrId: '2345678',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 1,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'I25.10', description: 'Atherosclerotic heart disease of native coronary artery' },
    ],
    lastEncounterDate: '12/04/2024', // 16 months ago — within window
    reasons: [
      'Chronic Condition Not Selected — Only I25.10 (Atherosclerotic heart disease) is marked as chronic. The chart may contain additional qualifying conditions — selecting them could change this patient\'s CPT code.',
    ],
    renderingProvider: 'Dr. Kevin Patel',
    renderingProviderInitials: 'KP',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-001',
  },

  {
    id: 'ap3',
    name: 'Lisa Chang',
    memberId: '#C00056LC003',
    language: 'zh',
    ehrId: '3456789',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 1,
    cptCode: 'G0557',
    icdCodes: [
      { code: 'N18.3', description: 'Chronic kidney disease, stage 3 (moderate)' },
      { code: 'E78.5', description: 'Hyperlipidemia, unspecified' },
    ],
    lastEncounterDate: '04/02/2026', // 1 month ago — within window
    reasons: [
      'Chronic Condition Not Selected — Only 1 chronic condition is selected. E78.5 (Hyperlipidemia) is present in the chart — confirm whether it qualifies as chronic and select it to update the CPT code.',
      'Diagnosis Not Charted in Last 36 Months — E78.5 (Hyperlipidemia, unspecified) appears in claims history but may not have been explicitly documented on a qualifying visit note within the 36-month window.',
    ],
    renderingProvider: 'Dr. Sarah Chen',
    renderingProviderInitials: 'SC',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-002',
  },

  {
    id: 'ap4',
    name: 'David Okafor',
    memberId: '#D00078DO004',
    language: 'en',
    ehrId: '4567890',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 2,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'I50.9', description: 'Heart failure, unspecified' },
      { code: 'I10',   description: 'Essential (primary) hypertension' },
    ],
    lastEncounterDate: '11/08/2022', // 41 months ago — outside 36-month window
    reasons: [
      'No Visit in Last 36 Months — Patient has no qualifying visit in the past 36 months, which is required to bill APCM services.',
      'Diagnosis Not Charted in Last 36 Months — Heart failure (I50.9) cannot be confirmed as charted without a qualifying visit within the required 36-month window.',
      'Chronic Condition Not Selected — I50.9 (Heart failure) may not have been marked as chronic during enrollment. Verify the chronic condition flag is set correctly in Athena before attesting.',
    ],
    renderingProvider: 'Dr. Kevin Patel',
    renderingProviderInitials: 'KP',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-002',
  },

  {
    id: 'ap9',
    name: 'Sandra Nguyen',
    memberId: '#I00178SN009',
    language: 'vi',
    ehrId: '9012345',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 2,
    cptCode: 'G0558',
    icdCodes: [
      { code: 'E11.65', description: 'Type 2 diabetes mellitus with hyperglycemia' },
      { code: 'I11.9',  description: 'Hypertensive heart disease without heart failure' },
    ],
    lastEncounterDate: '07/14/2025', // 9 months ago — within window
    reasons: [
      'Chronic Condition Not Selected — 2 conditions are selected for APCM billing. Review Athena for additional chronic diagnoses not yet flagged — selecting them may affect the CPT code assignment.',
    ],
    renderingProvider: 'Dr. Anita Rao',
    renderingProviderInitials: 'AR',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-001',
  },

  {
    id: 'ap10',
    name: 'Bernard Walsh',
    memberId: '#J00200BW010',
    language: 'en',
    ehrId: '9123456',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 1,
    cptCode: 'G0557',
    icdCodes: [
      { code: 'C61', description: 'Malignant neoplasm of prostate' },
    ],
    lastEncounterDate: '07/20/2021', // 57 months ago — outside 36-month window
    reasons: [
      'No Visit in Last 36 Months — Patient has no qualifying visit in the past 36 months, which is required to bill APCM services.',
      'Chronic Condition Not Selected — Only C61 (Malignant neoplasm of prostate) is marked as chronic. Check the chart for additional qualifying conditions — selecting them would change the CPT code.',
      'Diagnosis Not Charted in Last 36 Months — C61 cannot be confirmed as charted without a qualifying visit within the required 36-month window.',
    ],
    renderingProvider: 'Dr. Kevin Patel',
    renderingProviderInitials: 'KP',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-003',
  },

  {
    id: 'ap11',
    name: 'Fatima Al-Hassan',
    memberId: '#K00222FA011',
    language: 'ar',
    ehrId: '9234567',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 3,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'M05.79', description: 'Rheumatoid arthritis with rheumatoid factor, multiple sites' },
      { code: 'E03.9',  description: 'Hypothyroidism, unspecified' },
      { code: 'I10',    description: 'Essential (primary) hypertension' },
    ],
    lastEncounterDate: '02/22/2025', // 14 months ago — within window
    reasons: [
      'Ambiguous ICD-10 from EMR Mapping — M05.79 (Rheumatoid arthritis with rheumatoid factor) was re-mapped from SNOMED by Athena, which may have introduced ambiguity in the ICD-10 code required for APCM billing.',
      'Chronic Condition Not Selected — 3 conditions are currently selected. Confirm that all active chronic conditions documented in Athena are flagged — additional selections may affect billing eligibility.',
    ],
    renderingProvider: 'Dr. Sarah Chen',
    renderingProviderInitials: 'SC',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-002',
  },

  {
    id: 'ap12',
    name: 'George Tanaka',
    memberId: '#L00244GT012',
    language: 'en',
    ehrId: '9345678',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 4,
    cptCode: 'G0558',
    icdCodes: [
      { code: 'I48.0',  description: 'Paroxysmal atrial fibrillation' },
      { code: 'I10',    description: 'Essential (primary) hypertension' },
      { code: 'E11.9',  description: 'Type 2 diabetes mellitus without complications' },
      { code: 'N18.4',  description: 'Chronic kidney disease, stage 4 (severe)' },
    ],
    lastEncounterDate: '11/03/2025', // 5 months ago — within window
    reasons: [
      'Chronic Condition Not Selected — 4 conditions are currently selected. Athena may contain additional qualifying chronic diagnoses not yet marked for billing. A chart review before attesting is recommended.',
      'Diagnosis Not Charted in Last 36 Months — N18.4 (Chronic kidney disease, stage 4) must be explicitly documented on a qualifying visit note within the 36-month window.',
    ],
    renderingProvider: 'Dr. Anita Rao',
    renderingProviderInitials: 'AR',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-001',
  },

  {
    id: 'ap13',
    name: 'Cynthia Brooks',
    memberId: '#M00266CB013',
    language: 'en',
    ehrId: '9456789',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 2,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'N41.1', description: 'Chronic prostatitis' },
    ],
    lastEncounterDate: '02/28/2026', // 2 months ago — within window
    reasons: [
      'Ambiguous ICD-10 from EMR Mapping — Athena\'s EMR converts ICD-10 to SNOMED and back to ICD-10, which can introduce ambiguity, preventing us from identifying the correct ICD-10 needed for APCM billing.',
      'Chronic Condition Not Selected — N41.1 (Chronic prostatitis) may not be appropriate for this patient\'s profile. Verify the correct chronic condition is selected before billing.',
    ],
    renderingProvider: 'Dr. Kevin Patel',
    renderingProviderInitials: 'KP',
    comment: '',
    tab: 'eligible',
    billingStatus: 'pending',
    programId: 'PROG-003',
  },

  // ── New / Changes tab ─────────────────────────────────────────────────────

  {
    id: 'ap5',
    name: 'Maria Garcia',
    memberId: '#E00090MG005',
    language: 'es',
    ehrId: '5678901',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 4,
    cptCode: 'G0558',
    icdCodes: [
      { code: 'E11.9',   description: 'Type 2 diabetes mellitus without complications' },
      { code: 'I10',     description: 'Essential (primary) hypertension' },
      { code: 'M79.3',   description: 'Panniculitis, unspecified' },
      { code: 'Z87.891', description: 'Personal history of other specified conditions' },
    ],
    lastEncounterDate: '01/14/2025', // 15 months ago — within window
    reasons: [
      'Ambiguous ICD-10 from EMR Mapping — Athena\'s EMR converts ICD-10 to SNOMED and back, which can introduce ambiguity in identifying the correct ICD-10 needed for APCM billing.',
      'Chronic Condition Not Selected — Z87.891 (Personal history of other specified conditions) may not qualify as an active chronic condition for APCM. Verify this code should be included — removing it may change the CPT code.',
    ],
    renderingProvider: 'Dr. Sarah Chen',
    renderingProviderInitials: 'SC',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-001',
  },

  {
    id: 'ap6',
    name: 'James Wilson',
    memberId: '#F00112JW006',
    language: 'en',
    ehrId: '6789012',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 3,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'J44.0',  description: 'COPD with acute lower respiratory infection' },
      { code: 'F32.1',  description: 'Major depressive disorder, single episode, moderate' },
      { code: 'E78.00', description: 'Pure hypercholesterolemia, unspecified' },
    ],
    lastEncounterDate: '10/05/2022', // 42 months ago — outside 36-month window
    reasons: [
      'No Visit in Last 36 Months — Patient has no qualifying office visit in the past 36 months, which is required to bill APCM services.',
      'Chronic Condition Not Selected — 3 conditions are selected but the chronic condition flag may not be set correctly for all of them. Confirm each is marked as chronic in Athena before attesting.',
    ],
    renderingProvider: 'Dr. Kevin Patel',
    renderingProviderInitials: 'KP',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-003',
  },

  {
    id: 'ap7',
    name: 'Priya Patel',
    memberId: '#G00134PP007',
    language: 'hi',
    ehrId: '7890123',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 2,
    cptCode: 'G0558',
    icdCodes: [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
      { code: 'I73.9', description: 'Peripheral vascular disease, unspecified' },
    ],
    lastEncounterDate: '02/18/2023', // 38 months ago — outside 36-month window
    reasons: [
      'No Visit in Last 36 Months — Patient\'s most recent qualifying visit was over 36 months ago, which is required to bill APCM services.',
      'Diagnosis Not Charted in Last 36 Months — A chronic condition in claims history cannot be confirmed as charted without a qualifying visit within the 36-month window.',
      'Chronic Condition Not Selected — I73.9 (Peripheral vascular disease) was not previously billed as chronic for this patient. Selecting it now may update the CPT code.',
    ],
    renderingProvider: 'Dr. Anita Rao',
    renderingProviderInitials: 'AR',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-002',
  },

  {
    id: 'ap8',
    name: 'Robert Kim',
    memberId: '#H00156RK008',
    language: 'ko',
    ehrId: '8901234',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 2,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'G47.33', description: 'Obstructive sleep apnea (adult)(pediatric)' },
      { code: 'E66.01', description: 'Morbid (severe) obesity due to excess calories' },
    ],
    lastEncounterDate: '09/12/2022', // 43 months ago — outside 36-month window
    reasons: [
      'No Visit in Last 36 Months — Patient has no qualifying visit in the past 36 months, which is required to bill APCM services.',
      'Chronic Condition Not Selected — Both G47.33 and E66.01 are new to this patient\'s APCM profile. Ensure the chronic condition toggle is enabled for each in Athena before submitting the claim.',
    ],
    renderingProvider: 'Dr. Anita Rao',
    renderingProviderInitials: 'AR',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-003',
  },

  {
    id: 'ap14',
    name: 'Dorothy Mensah',
    memberId: '#N00288DM014',
    language: 'en',
    ehrId: '9567890',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 3,
    cptCode: 'G0558',
    icdCodes: [
      { code: 'I10',    description: 'Essential (primary) hypertension' },
      { code: 'E11.9',  description: 'Type 2 diabetes mellitus without complications' },
      { code: 'Z87.39', description: 'Personal history of other musculoskeletal disorders' },
    ],
    lastEncounterDate: '04/25/2026', // 5 days ago — within window
    reasons: [
      'Ambiguous ICD-10 from EMR Mapping — Athena\'s EMR converts ICD-10 to SNOMED and back, which can introduce ambiguity in identifying the correct ICD-10 needed for APCM billing.',
      'Chronic Condition Not Selected — Z87.39 (Personal history of other musculoskeletal disorders) may not qualify as an active chronic condition for APCM. Verify this code before billing.',
    ],
    renderingProvider: 'Dr. Sarah Chen',
    renderingProviderInitials: 'SC',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-001',
  },

  {
    id: 'ap15',
    name: 'Alejandro Cruz',
    memberId: '#O00310AC015',
    language: 'es',
    ehrId: '9678901',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 1,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'K21.0', description: 'Gastro-esophageal reflux disease with esophagitis' },
    ],
    lastEncounterDate: '08/30/2025', // 8 months ago — within window
    reasons: [
      'Ambiguous ICD-10 from EMR Mapping — K21.0 (GERD with esophagitis) could not be unambiguously re-mapped after Athena\'s SNOMED conversion, preventing accurate ICD-10 identification for APCM billing.',
      'Chronic Condition Not Selected — K21.0 is the only condition selected. Check the chart for additional chronic diagnoses that may qualify — selecting them would change this patient\'s CPT code.',
    ],
    renderingProvider: 'Dr. Kevin Patel',
    renderingProviderInitials: 'KP',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-002',
  },

  {
    id: 'ap16',
    name: 'Helen Park',
    memberId: '#P00332HP016',
    language: 'ko',
    ehrId: '9789012',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: true,
    chronicConditionCount: 5,
    cptCode: 'G0558',
    icdCodes: [
      { code: 'I48.19', description: 'Other persistent atrial fibrillation' },
      { code: 'I50.32', description: 'Chronic diastolic heart failure' },
      { code: 'E11.9',  description: 'Type 2 diabetes mellitus without complications' },
      { code: 'N18.3',  description: 'Chronic kidney disease, stage 3 (moderate)' },
      { code: 'I10',    description: 'Essential (primary) hypertension' },
    ],
    lastEncounterDate: '05/07/2023', // 23 months ago — within window
    reasons: [
      'Diagnosis Not Charted in Last 36 Months — A chronic condition exists in claims history but hasn\'t been charted on a qualifying visit within the 36-month window required for APCM eligibility.',
      'Chronic Condition Not Selected — Patient has 5 selected conditions but Athena may contain additional qualifying diagnoses not yet flagged for billing. Review all conditions before attesting.',
    ],
    renderingProvider: 'Dr. Anita Rao',
    renderingProviderInitials: 'AR',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-003',
  },

  {
    id: 'ap17',
    name: 'Thomas Adeyemi',
    memberId: '#Q00354TA017',
    language: 'en',
    ehrId: '9890123',
    billingMonth: BILLING_MONTH,
    dateOfService: DATE_OF_SERVICE,
    isQmb: false,
    chronicConditionCount: 2,
    cptCode: 'G0556',
    icdCodes: [
      { code: 'M54.5',  description: 'Low back pain' },
      { code: 'M17.11', description: 'Primary osteoarthritis, right knee' },
    ],
    lastEncounterDate: '12/20/2022', // 40 months ago — outside 36-month window
    reasons: [
      'No Visit in Last 36 Months — Patient\'s most recent qualifying visit was over 36 months ago, which is required to bill APCM services.',
      'Chronic Condition Not Selected — Both M54.5 and M17.11 are new to this patient\'s APCM profile. Ensure the chronic condition toggle is enabled for each in Athena before submitting the claim.',
    ],
    renderingProvider: 'Dr. Sarah Chen',
    renderingProviderInitials: 'SC',
    comment: '',
    tab: 'new-changes',
    billingStatus: 'pending',
    programId: 'PROG-002',
  },
];

export const LANG_MAP = {
  en: 'English', es: 'Spanish', zh: 'Chinese', ko: 'Korean',
  vi: 'Vietnamese', hi: 'Hindi', bn: 'Bengali', ar: 'Arabic',
};

export const PROVIDERS = [...new Set(APCM_PATIENTS.map(p => p.renderingProvider))];

export const CPT_CODES = ['G0556', 'G0557', 'G0558'];

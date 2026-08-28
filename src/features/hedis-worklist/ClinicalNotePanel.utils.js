export const CURRENT_USER = 'Isabeth Partida Fra';
export const GENDER_LABEL = { M: 'Male', F: 'Female', O: 'Other' };

export const MEASURE_NAMES = {
  CBP:        'Controlling Blood Pressure',
  COL:        'Colorectal Cancer Screening',
  'COA-FS':   'Care for Older Adults: Functional Status',
  'COA-M':    'Care for Older Adults: Medication Review',
  BCS:        'Breast Cancer Screening',
  DM:         'Diabetes HbA1c Control',
  ABA:        'Adult BMI Assessment',
  FUH:        'Follow-Up After Hospitalization',
  AMR:        'Asthma Medication Ratio',
  KED:        'Kidney Health Evaluation',
  EED:        'Eye Exam for Patients With Diabetes',
  GSD3:       'Glycemic Status Assessment (HbA1c > 9%)',
  OMW:        'Osteoporosis Management in Women',
  BPD:        'Blood Pressure Documentation',
  CCS:        'Cervical Cancer Screening',
  CHL:        'Chlamydia Screening',
  CISCMG10:   'Childhood Immunization Status (Combo 10)',
  COB:        'Care for Older Adults: Body / BMI',
  DEV:        'Developmental Screening (First 3 Years)',
  IMACMB2:    'Immunizations for Adolescents (Combo 2)',
  LSC:        'Lead Screening in Children',
  POLYACH:    'Polypharmacy — Anticholinergic Meds',
  PPC1A:      'Prenatal Care — Timeliness',
  PPC2A:      'Postpartum Care',
  SUPD:       'Statin Use in Persons with Diabetes',
  TRCEA:      'Transitions of Care — Engagement',
  TRCMA:      'Transitions of Care — Med Reconciliation',
  W30A:       'Well-Child First 15 Months',
  W30B:       'Well-Child 15–30 Months',
  WCV:        'Well-Care Visit (Children/Adolescents)',
  APE:        'Adult Preventive Exam',
  FMC:        'Follow-Up After ED Visit for Mental Illness',
  MRP:        'Medication Reconciliation Post-Discharge',
};

export const EED_EXAM_TYPES = [
  { value: 'dilated', label: 'Dilated retinal eye exam' },
  { value: 'non-dilated', label: 'Non-dilated retinal eye exam' },
  { value: 'fundus-photo', label: 'Fundus photography' },
];

export const EED_LATERALITIES = [
  { value: 'both', label: 'Both eyes' },
  { value: 'left', label: 'Left eye' },
  { value: 'right', label: 'Right eye' },
];

export const EED_EVIDENCE_TYPES = [
  'Completed Eye Exam (Retinal or Dilated) in the calendar year',
  'Negative Eye Exam (Retinal or Dilated) prior year',
  'Patient-reported only (no chart documentation)',
];

export const EED_EXAM_RESULTS = [
  'Negative - no retinopathy',
  'Mild non-proliferative DR',
  'Moderate / severe NPDR',
  'Proliferative DR',
];

export const EED_FOLLOW_UP_OPTIONS = [
  { key: 'referOphthalmology', label: 'Refer to ophthalmology' },
  { key: 'laserTreatment',     label: 'Laser treatment recommended' },
  { key: 'antiVegf',            label: 'Anti-VEGF therapy discussed' },
  { key: 'annualScheduled',    label: 'Annual follow-up scheduled' },
];

// CBP (Controlling Blood Pressure) — Location where the BP reading was taken.
export const CBP_LOCATIONS = [
  { value: 'outpatient', label: 'Outpatient visit' },
  { value: 'telehealth', label: 'Telehealth visit' },
  { value: 'clinic',     label: 'Clinic' },
  { value: 'home',       label: 'Home' },
];

// Yes / No radio pattern used for the medication + monitoring questions.
export const CBP_YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no',  label: 'No' },
];

// Yes + "Patient denies" pattern used for the three symptom-severity blocks.
export const CBP_SYMPTOM_OPTIONS = [
  { value: 'yes',     label: 'Yes' },
  { value: 'denies',  label: 'Patient denies any symptoms at this time' },
];

// ── Generic gap templates ────────────────────────────────────────────────
// One entry per HEDIS gap code that doesn't have its own bespoke component
// (CBP + EED still ship their own hand-crafted forms above). Each template
// is a flat list of field descriptors that `GenericEvidenceForm` renders in
// the standard Fold layout. Field descriptor shape:
//   { key, label, type, options?, required?, placeholder?, description?,
//     column? }
// Types: 'text' | 'number' | 'date' | 'select' | 'radio' | 'checkbox'.
// `column: 2` opts the field into a 2-up grid row (must appear in pairs).
const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const GAP_TEMPLATES = {
  BCS: [
    { key: 'screeningDate', label: 'Screening Date', type: 'date', required: true, column: 2 },
    { key: 'modality', label: 'Modality', type: 'select', required: true, column: 2,
      options: [
        { value: 'mammogram', label: 'Mammography' },
        { value: 'tomo', label: 'Digital breast tomosynthesis' },
        { value: 'mri', label: 'Breast MRI' },
      ] },
    { key: 'result', label: 'Result', type: 'select', required: true,
      options: [
        { value: 'negative', label: 'Negative' },
        { value: 'positive', label: 'Positive — further workup needed' },
        { value: 'inconclusive', label: 'Inconclusive' },
      ] },
    { key: 'facility', label: 'Facility Name', type: 'text', placeholder: 'Enter facility name' },
    { key: 'nextDue', label: 'Next Screening Due', type: 'date' },
    { key: 'patientEducated', label: 'Reviewed screening recommendations with patient', type: 'checkbox' },
  ],
  GSD3: [
    { key: 'a1cValue', label: 'HbA1c Value (%)', type: 'number', required: true, column: 2, placeholder: '9.2' },
    { key: 'a1cDate', label: 'HbA1c Draw Date', type: 'date', required: true, column: 2 },
    { key: 'diabetesType', label: 'Diabetes Type', type: 'select',
      options: [
        { value: 't1', label: 'Type 1' },
        { value: 't2', label: 'Type 2' },
        { value: 'gestational', label: 'Gestational' },
      ] },
    { key: 'currentManagement', label: 'Current Management', type: 'radio',
      options: [
        { value: 'insulin', label: 'Insulin' },
        { value: 'oral', label: 'Oral agents' },
        { value: 'both', label: 'Insulin + oral agents' },
        { value: 'lifestyle', label: 'Lifestyle only' },
      ] },
    { key: 'planUpdated', label: 'Treatment plan updated at this visit?', type: 'radio', options: YES_NO, required: true },
    { key: 'notes', label: 'Additional Notes', type: 'text', placeholder: 'Enter notes' },
  ],
  DM: [
    { key: 'a1cValue', label: 'HbA1c Value (%)', type: 'number', required: true, column: 2, placeholder: '7.2' },
    { key: 'a1cDate', label: 'HbA1c Draw Date', type: 'date', required: true, column: 2 },
    { key: 'diabetesType', label: 'Diabetes Type', type: 'select', required: true, column: 2,
      options: [
        { value: 't1', label: 'Type 1' },
        { value: 't2', label: 'Type 2' },
        { value: 'gestational', label: 'Gestational' },
        { value: 'other', label: 'Other / Secondary' },
      ] },
    { key: 'currentManagement', label: 'Current Management', type: 'radio', required: true, column: 2,
      options: [
        { value: 'insulin', label: 'Insulin' },
        { value: 'oral', label: 'Oral agents' },
        { value: 'both', label: 'Insulin + oral agents' },
        { value: 'lifestyle', label: 'Lifestyle only' },
      ] },
    { key: 'lastEyeExamDate', label: 'Last Dilated Eye Exam Date', type: 'date', column: 2 },
    { key: 'lastFootExamDate', label: 'Last Comprehensive Foot Exam Date', type: 'date', column: 2 },
    { key: 'bpSystolic', label: 'Systolic BP (mmHg)', type: 'number', column: 2, placeholder: '128' },
    { key: 'bpDiastolic', label: 'Diastolic BP (mmHg)', type: 'number', column: 2, placeholder: '82' },
    { key: 'nephropathyScreened', label: 'Nephropathy screening completed (uACR/eGFR)?', type: 'radio', options: YES_NO, required: true },
    { key: 'planUpdated', label: 'Diabetes management plan updated at this visit?', type: 'radio', options: YES_NO, required: true },
    { key: 'counselingProvided', label: 'Diabetes self-management education/counseling provided', type: 'checkbox' },
    { key: 'notes', label: 'Additional Notes', type: 'text', placeholder: 'Enter clinical notes' },
  ],
  OMW: [
    { key: 'fractureDate', label: 'Fracture Date', type: 'date', required: true, column: 2 },
    { key: 'fractureSite', label: 'Fracture Site', type: 'select', required: true, column: 2,
      options: [
        { value: 'hip', label: 'Hip' },
        { value: 'spine', label: 'Spine' },
        { value: 'wrist', label: 'Wrist' },
        { value: 'other', label: 'Other' },
      ] },
    { key: 'bmdDone', label: 'BMD test completed?', type: 'radio', options: YES_NO, required: true },
    { key: 'bmdDate', label: 'BMD Test Date', type: 'date' },
    { key: 'pharmacotherapy', label: 'Pharmacotherapy started?', type: 'radio', options: YES_NO },
    { key: 'medicationName', label: 'Medication Name', type: 'text', placeholder: 'e.g., Alendronate 70mg weekly' },
  ],
  COL: [
    { key: 'modality', label: 'Screening Modality', type: 'select', required: true,
      options: [
        { value: 'fit', label: 'FIT (annually)' },
        { value: 'fit-dna', label: 'FIT-DNA / Cologuard (every 3y)' },
        { value: 'colonoscopy', label: 'Colonoscopy (every 10y)' },
        { value: 'sigmoidoscopy', label: 'Flexible sigmoidoscopy (every 5y)' },
        { value: 'ct-colonography', label: 'CT colonography (every 5y)' },
      ] },
    { key: 'screeningDate', label: 'Screening Date', type: 'date', required: true, column: 2 },
    { key: 'nextDue', label: 'Next Screening Due', type: 'date', column: 2 },
    { key: 'result', label: 'Result', type: 'select', required: true,
      options: [
        { value: 'negative', label: 'Negative' },
        { value: 'positive', label: 'Positive — follow-up needed' },
        { value: 'inconclusive', label: 'Inconclusive' },
      ] },
    { key: 'notes', label: 'Additional Notes', type: 'text' },
  ],
  KED: [
    { key: 'egfrValue', label: 'eGFR Value (mL/min/1.73m²)', type: 'number', required: true, column: 2, placeholder: '82' },
    { key: 'egfrDate', label: 'eGFR Test Date', type: 'date', required: true, column: 2 },
    { key: 'uacrValue', label: 'uACR Value (mg/g)', type: 'number', required: true, column: 2, placeholder: '14' },
    { key: 'uacrDate', label: 'uACR Test Date', type: 'date', required: true, column: 2 },
    { key: 'ckdStage', label: 'CKD Stage', type: 'select',
      options: [
        { value: 'no-ckd', label: 'No CKD' },
        { value: 'stage-1', label: 'Stage 1' },
        { value: 'stage-2', label: 'Stage 2' },
        { value: 'stage-3a', label: 'Stage 3a' },
        { value: 'stage-3b', label: 'Stage 3b' },
        { value: 'stage-4', label: 'Stage 4' },
        { value: 'stage-5', label: 'Stage 5' },
      ] },
    { key: 'nephrologyReferral', label: 'Nephrology referral placed?', type: 'radio', options: YES_NO },
  ],
  'COA-FS': [
    { key: 'assessmentDate', label: 'Assessment Date', type: 'date', required: true },
    { key: 'adlStatus', label: 'ADL Status', type: 'select', required: true, column: 2,
      options: [
        { value: 'independent', label: 'Independent' },
        { value: 'assistance', label: 'Requires assistance' },
        { value: 'dependent', label: 'Dependent' },
      ] },
    { key: 'iadlStatus', label: 'IADL Status', type: 'select', required: true, column: 2,
      options: [
        { value: 'independent', label: 'Independent' },
        { value: 'assistance', label: 'Requires assistance' },
        { value: 'dependent', label: 'Dependent' },
      ] },
    { key: 'cognitiveStatus', label: 'Cognitive Status', type: 'select',
      options: [
        { value: 'alert', label: 'Alert & oriented' },
        { value: 'mild', label: 'Mild impairment' },
        { value: 'moderate', label: 'Moderate impairment' },
        { value: 'severe', label: 'Severe impairment' },
      ] },
    { key: 'fallRisk', label: 'Fall risk identified?', type: 'radio', options: YES_NO },
    { key: 'notes', label: 'Additional Notes', type: 'text' },
  ],
  'COA-M': [
    { key: 'reviewDate', label: 'Medication Review Date', type: 'date', required: true, column: 2 },
    { key: 'medCount', label: 'Number of Medications', type: 'number', required: true, column: 2 },
    { key: 'anyChanges', label: 'Any changes made?', type: 'radio', options: YES_NO, required: true },
    { key: 'deprescribing', label: 'Deprescribing performed?', type: 'radio', options: YES_NO },
    { key: 'reconciledInEhr', label: 'Reconciled list posted to EHR', type: 'checkbox' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ],
  BPD: [
    { key: 'bpDate', label: 'BP Reading Date', type: 'date', required: true, column: 2 },
    { key: 'systolic', label: 'Systolic (mmHg)', type: 'number', required: true, column: 2, placeholder: '128' },
    { key: 'diastolic', label: 'Diastolic (mmHg)', type: 'number', required: true, column: 2, placeholder: '82' },
    { key: 'position', label: 'Position', type: 'radio',
      options: [
        { value: 'sitting', label: 'Sitting' },
        { value: 'standing', label: 'Standing' },
        { value: 'supine', label: 'Supine' },
      ] },
    { key: 'method', label: 'Method', type: 'radio',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'automated', label: 'Automated' },
      ] },
  ],
  CCS: [
    { key: 'screeningDate', label: 'Screening Date', type: 'date', required: true, column: 2 },
    { key: 'modality', label: 'Modality', type: 'select', required: true, column: 2,
      options: [
        { value: 'pap', label: 'Pap only' },
        { value: 'hpv', label: 'HPV only' },
        { value: 'cotest', label: 'Co-test (Pap + HPV)' },
      ] },
    { key: 'result', label: 'Result', type: 'select', required: true,
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'abnormal', label: 'Abnormal' },
        { value: 'insufficient', label: 'Insufficient sample' },
      ] },
    { key: 'nextDue', label: 'Next Screening Due', type: 'date' },
  ],
  CHL: [
    { key: 'screeningDate', label: 'Screening Date', type: 'date', required: true, column: 2 },
    { key: 'testType', label: 'Test Type', type: 'select', required: true, column: 2,
      options: [
        { value: 'urine-naat', label: 'Urine NAAT' },
        { value: 'vaginal-swab', label: 'Vaginal swab' },
        { value: 'other', label: 'Other' },
      ] },
    { key: 'result', label: 'Result', type: 'radio', required: true,
      options: [
        { value: 'negative', label: 'Negative' },
        { value: 'positive', label: 'Positive' },
      ] },
    { key: 'treatmentGiven', label: 'Treatment provided?', type: 'radio', options: YES_NO },
  ],
  CISCMG10: [
    { key: 'assessmentDate', label: 'Assessment Date', type: 'date', required: true },
    { key: 'upToDate', label: 'All required immunizations up to date?', type: 'radio', options: YES_NO, required: true },
    { key: 'missingCount', label: 'Number of Missing Immunizations', type: 'number', column: 2 },
    { key: 'catchupDate', label: 'Catch-up Plan Date', type: 'date', column: 2 },
    { key: 'catchupPlan', label: 'Catch-up Plan', type: 'text', placeholder: 'e.g., DTaP #4 at next visit' },
  ],
  COB: [
    { key: 'assessmentDate', label: 'Assessment Date', type: 'date', required: true, column: 2 },
    { key: 'bmiValue', label: 'BMI', type: 'number', required: true, column: 2, placeholder: '24.5' },
    { key: 'bmiCategory', label: 'BMI Category', type: 'select',
      options: [
        { value: 'underweight', label: 'Underweight (<18.5)' },
        { value: 'normal', label: 'Normal (18.5–24.9)' },
        { value: 'overweight', label: 'Overweight (25–29.9)' },
        { value: 'obese', label: 'Obese (≥30)' },
      ] },
    { key: 'weightCounseling', label: 'Weight counseling provided?', type: 'radio', options: YES_NO },
  ],
  DEV: [
    { key: 'screeningDate', label: 'Screening Date', type: 'date', required: true, column: 2 },
    { key: 'toolUsed', label: 'Tool Used', type: 'select', required: true, column: 2,
      options: [
        { value: 'asq3', label: 'ASQ-3' },
        { value: 'asq-se', label: 'ASQ:SE-2' },
        { value: 'mchat-r', label: 'M-CHAT-R' },
        { value: 'peds', label: 'PEDS' },
        { value: 'other', label: 'Other standardized tool' },
      ] },
    { key: 'score', label: 'Score', type: 'text', placeholder: 'e.g., 45' },
    { key: 'result', label: 'Result', type: 'select', required: true,
      options: [
        { value: 'typical', label: 'Typical development' },
        { value: 'at-risk', label: 'At risk — monitor' },
        { value: 'concern', label: 'Concern — refer' },
      ] },
    { key: 'referral', label: 'Referral placed?', type: 'radio', options: YES_NO },
  ],
  IMACMB2: [
    { key: 'assessmentDate', label: 'Assessment Date', type: 'date', required: true },
    { key: 'meningococcal', label: 'Meningococcal complete?', type: 'radio', options: YES_NO, required: true, column: 2 },
    { key: 'tdap', label: 'Tdap complete?', type: 'radio', options: YES_NO, required: true, column: 2 },
    { key: 'hpv', label: 'HPV complete?', type: 'radio', options: YES_NO, required: true },
    { key: 'catchupPlan', label: 'Missing Vaccine Plan', type: 'text', placeholder: 'Enter catch-up plan' },
  ],
  LSC: [
    { key: 'screeningDate', label: 'Screening Date', type: 'date', required: true, column: 2 },
    { key: 'testType', label: 'Test Type', type: 'radio', required: true, column: 2,
      options: [
        { value: 'capillary', label: 'Capillary' },
        { value: 'venous', label: 'Venous' },
      ] },
    { key: 'leadLevel', label: 'Lead Level (µg/dL)', type: 'number', required: true, placeholder: '3.2' },
    { key: 'followUp', label: 'Follow-up needed?', type: 'radio', options: YES_NO },
  ],
  POLYACH: [
    { key: 'reviewDate', label: 'Review Date', type: 'date', required: true, column: 2 },
    { key: 'anticholinergicCount', label: 'Number of anticholinergic medications', type: 'number', required: true, column: 2 },
    { key: 'deprescribingAttempted', label: 'Deprescribing attempted?', type: 'radio', options: YES_NO, required: true },
    { key: 'deprescribedMeds', label: 'Deprescribed Medications', type: 'text', placeholder: 'e.g., Diphenhydramine 25mg' },
    { key: 'patientEducated', label: 'Patient educated on anticholinergic risks', type: 'checkbox' },
  ],
  PPC1A: [
    { key: 'firstVisitDate', label: 'First Prenatal Visit Date', type: 'date', required: true, column: 2 },
    { key: 'trimester', label: 'Trimester at First Visit', type: 'select', required: true, column: 2,
      options: [
        { value: '1st', label: '1st trimester' },
        { value: '2nd', label: '2nd trimester' },
        { value: '3rd', label: '3rd trimester' },
      ] },
    { key: 'edd', label: 'Estimated Due Date', type: 'date', column: 2 },
    { key: 'provider', label: 'Provider', type: 'text', placeholder: 'Enter provider name', column: 2 },
  ],
  PPC2A: [
    { key: 'deliveryDate', label: 'Delivery Date', type: 'date', required: true, column: 2 },
    { key: 'visitDate', label: 'Postpartum Visit Date', type: 'date', required: true, column: 2 },
    { key: 'daysBetween', label: 'Days Delivery → Visit', type: 'number', column: 2 },
    { key: 'depressionScreen', label: 'Depression screening completed?', type: 'radio', options: YES_NO, column: 2 },
    { key: 'contraceptionCounseling', label: 'Contraception counseling provided?', type: 'radio', options: YES_NO },
  ],
  SUPD: [
    { key: 'prescriptionDate', label: 'Prescription Date', type: 'date', required: true, column: 2 },
    { key: 'statinName', label: 'Statin Name', type: 'text', required: true, column: 2, placeholder: 'e.g., Atorvastatin 40mg' },
    { key: 'intensity', label: 'Statin Intensity', type: 'select', required: true,
      options: [
        { value: 'low', label: 'Low intensity' },
        { value: 'moderate', label: 'Moderate intensity' },
        { value: 'high', label: 'High intensity' },
      ] },
    { key: 'adherenceAssessed', label: 'Adherence assessed?', type: 'radio', options: YES_NO },
  ],
  TRCEA: [
    { key: 'dischargeDate', label: 'Discharge Date', type: 'date', required: true, column: 2 },
    { key: 'engagementDate', label: 'Engagement Date', type: 'date', required: true, column: 2 },
    { key: 'engagementType', label: 'Engagement Type', type: 'select', required: true,
      options: [
        { value: 'in-person', label: 'In-person visit' },
        { value: 'phone', label: 'Phone call' },
        { value: 'video', label: 'Video visit' },
        { value: 'home', label: 'Home visit' },
      ] },
    { key: 'provider', label: 'Provider', type: 'text', placeholder: 'Enter provider name' },
  ],
  TRCMA: [
    { key: 'dischargeDate', label: 'Discharge Date', type: 'date', required: true, column: 2 },
    { key: 'reconciliationDate', label: 'Reconciliation Date', type: 'date', required: true, column: 2 },
    { key: 'medsReconciled', label: 'Medications reconciled?', type: 'radio', options: YES_NO, required: true },
    { key: 'discrepancies', label: 'Discrepancies Identified', type: 'text', placeholder: 'Describe any discrepancies' },
    { key: 'provider', label: 'Reconciling Provider', type: 'text', placeholder: 'Enter provider name' },
  ],
  W30A: [
    { key: 'visitDate', label: 'Visit Date', type: 'date', required: true, column: 2 },
    { key: 'ageAtVisit', label: 'Age at Visit', type: 'text', column: 2, placeholder: 'e.g., 4 months' },
    { key: 'visitNumber', label: 'Visit Number in Period', type: 'number', column: 2 },
    { key: 'provider', label: 'Provider', type: 'text', required: true, column: 2, placeholder: 'Enter provider name' },
    { key: 'anticipatoryGuidance', label: 'Anticipatory guidance provided', type: 'checkbox' },
  ],
  W30B: [
    { key: 'visitDate', label: 'Visit Date', type: 'date', required: true, column: 2 },
    { key: 'ageAtVisit', label: 'Age at Visit', type: 'text', column: 2, placeholder: 'e.g., 18 months' },
    { key: 'visitNumber', label: 'Visit Number in Period', type: 'number', column: 2 },
    { key: 'provider', label: 'Provider', type: 'text', required: true, column: 2, placeholder: 'Enter provider name' },
    { key: 'devScreeningCompleted', label: 'Developmental screening completed?', type: 'radio', options: YES_NO },
  ],
  WCV: [
    { key: 'visitDate', label: 'Visit Date', type: 'date', required: true, column: 2 },
    { key: 'provider', label: 'Provider', type: 'text', required: true, column: 2, placeholder: 'Enter provider name' },
    { key: 'bmiDocumented', label: 'BMI or BMI percentile documented?', type: 'radio', options: YES_NO },
    { key: 'guidanceTopics', label: 'Anticipatory Guidance Topics', type: 'text', placeholder: 'e.g., nutrition, physical activity, safety' },
  ],
  APE: [
    { key: 'visitDate', label: 'Visit Date', type: 'date', required: true, column: 2 },
    { key: 'provider', label: 'Provider', type: 'text', required: true, column: 2, placeholder: 'Enter provider name' },
    { key: 'bmi', label: 'BMI', type: 'number', column: 2, placeholder: '24.5' },
    { key: 'bp', label: 'Blood Pressure', type: 'text', column: 2, placeholder: '124/78' },
    { key: 'screeningsOffered', label: 'Screenings Offered', type: 'text', placeholder: 'e.g., colorectal, depression, tobacco use' },
  ],
  FMC: [
    { key: 'edDischargeDate', label: 'ED Discharge Date', type: 'date', required: true },
    { key: 'sevenDayFollowUp', label: '7-day follow-up completed?', type: 'radio', options: YES_NO, required: true, column: 2 },
    { key: 'sevenDayDate', label: '7-day Follow-up Date', type: 'date', column: 2 },
    { key: 'thirtyDayFollowUp', label: '30-day follow-up completed?', type: 'radio', options: YES_NO, required: true, column: 2 },
    { key: 'thirtyDayDate', label: '30-day Follow-up Date', type: 'date', column: 2 },
    { key: 'provider', label: 'Follow-up Provider', type: 'text', placeholder: 'Enter provider name' },
  ],
  MRP: [
    { key: 'dischargeDate', label: 'Discharge Date', type: 'date', required: true, column: 2 },
    { key: 'reconciliationDate', label: 'Reconciliation Date', type: 'date', required: true, column: 2 },
    { key: 'medCount', label: 'Medications Reconciled', type: 'number', column: 2 },
    { key: 'provider', label: 'Reconciling Provider', type: 'text', required: true, column: 2, placeholder: 'Enter provider name' },
    { key: 'discrepancies', label: 'Discrepancies Identified', type: 'text', placeholder: 'Describe any discrepancies' },
  ],
};

// MANDATORY_FIELDS keeps CBP + EED's hand-crafted lists; everything under
// GAP_TEMPLATES derives its required fields from the template's `required`
// flags via `mandatoryFieldsFor` below.
export const MANDATORY_FIELDS = {
  EED: ['evidenceType', 'examType', 'examDate', 'examiningProvider', 'examResult', 'icd10', 'patientCounseledOn'],
  CBP: ['bpDate', 'systolic', 'diastolic', 'location'],
};

function mandatoryFieldsFor(code) {
  if (MANDATORY_FIELDS[code]) return MANDATORY_FIELDS[code];
  const t = GAP_TEMPLATES[code];
  return t ? t.filter(f => f.required).map(f => f.key) : [];
}

function defaultTemplateData(code) {
  const t = GAP_TEMPLATES[code];
  if (!t) return {};
  const out = { evidenceLabel: `${code} Evidence` };
  for (const f of t) {
    out[f.key] = f.type === 'checkbox' ? false : '';
  }
  return out;
}

export function defaultGapData(code) {
  switch (code) {
    case 'CBP':
      return {
        evidenceLabel: 'CBP Evidence',
        bpDate: '',
        systolic: '',
        diastolic: '',
        location: '',
        selfMonitors: '',
        takingMeds: '',
        symptomsLow: '',
        symptomsMid: '',
        symptomsHigh: '',
      };
    case 'EED':
      return {
        evidenceLabel: 'EED Evidence',
        evidenceType: '',
        examType: '',
        examDate: '',
        examiningProvider: '',
        npi: '',
        examResult: '',
        laterality: '',
        icd10: '',
        followUp: { referOphthalmology: false, laserTreatment: false, antiVegf: false, annualScheduled: false },
        nextExamDue: '',
        patientCounseledOn: '',
      };
    default:
      return defaultTemplateData(code);
  }
}

export function isMandatoryComplete(code, data) {
  const req = mandatoryFieldsFor(code);
  if (!req.length || !data) return false;
  return req.every(f => !!data[f]);
}

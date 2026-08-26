export const CURRENT_USER = 'Isabeth Partida Fra';
export const GENDER_LABEL = { M: 'Male', F: 'Female', O: 'Other' };

export const MEASURE_NAMES = {
  CBP:      'Controlling Blood Pressure',
  COL:      'Colorectal Cancer Screening',
  'COA-FS': 'Care for Older Adults: Functional Status',
  'COA-M':  'Care for Older Adults: Medication Review',
  BCS:      'Breast Cancer Screening',
  DM:       'Diabetes HbA1c Control',
  ABA:      'Adult BMI Assessment',
  FUH:      'Follow-Up After Hospitalization',
  AMR:      'Asthma Medication Ratio',
  KED:      'Kidney Health Evaluation',
  EED:      'Eye Exam for Patients With Diabetes',
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

export const MANDATORY_FIELDS = {
  EED: ['evidenceType', 'examType', 'examDate', 'examiningProvider', 'examResult', 'icd10', 'patientCounseledOn'],
  CBP: ['bpDate', 'systolic', 'diastolic', 'location'],
};

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
      return {};
  }
}

export function isMandatoryComplete(code, data) {
  const req = MANDATORY_FIELDS[code];
  if (!req || !data) return false;
  return req.every(f => !!data[f]);
}

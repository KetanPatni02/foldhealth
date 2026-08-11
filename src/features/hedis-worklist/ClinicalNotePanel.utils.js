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
};

export const COL_METHODS = [
  'Colonoscopy',
  'Flexible sigmoidoscopy or CT colonography',
  'Stool DNA test (e.g., Cologuard®)',
  'Fecal Occult Blood Test (FOBT)',
  'Fecal Immunochemical Test (FIT)',
];

export const MANDATORY_FIELDS = {
  CBP: ['location', 'bpMedication'],
  COL: ['screeningMethod', 'colResultDate'],
  KED: ['egfr', 'uacr', 'egfrResultDate', 'uacrResultDate'],
};

export function defaultGapData(code) {
  switch (code) {
    case 'CBP':
      return {
        selfReported: false, digitalBaseline: false, location: '',
        bpMedication: '', bpManagement: false, medEducation: false,
        referredPcp: false, noFurtherQuestions: false,
      };
    case 'COL':
      return { screeningMethod: '', colResultDate: '' };
    case 'KED':
      return { egfr: '', uacr: '', egfrResultDate: '', uacrResultDate: '' };
    default:
      return {};
  }
}

export function isMandatoryComplete(code, data) {
  const req = MANDATORY_FIELDS[code];
  if (!req) return false;
  return req.every(f => !!data[f]);
}

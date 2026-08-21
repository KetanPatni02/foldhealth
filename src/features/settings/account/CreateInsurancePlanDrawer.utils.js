export function readImagePreviewUrl(file, onReady) {
  const reader = new FileReader();
  reader.onload = () => onReady(reader.result);
  reader.readAsDataURL(file);
}

export function preventDefaultDrag(e) {
  e.preventDefault();
}

export const MEDICAL_BENEFITS_OPTIONS = [
  'HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'HSA-Qualified HDHP',
].map(t => ({ value: t, label: t }));

export const COVERAGE_TYPE_OPTIONS = [
  { value: 'Individual',        label: 'Individual' },
  { value: 'Employee+Spouse',   label: 'Employee + Spouse' },
  { value: 'Employee+Child',    label: 'Employee + Child' },
  { value: 'Employee+Children', label: 'Employee + Children' },
  { value: 'Family',            label: 'Family' },
];

export const FIELD_INFO = {
  groupNumber: "The identifier assigned by the insurance company to the employer or organization's specific benefit plan, used to link a member to their group's coverage terms.",
  externalId: "A unique identifier used to reference the member or record in an external system (e.g., a payer's or third-party system's internal ID), distinct from the insurer's own member ID.",
  ediPayerId: 'A unique code assigned to an insurance payer for electronic claims submission (EDI transactions), used to route claims to the correct payer.',
  rxBin: 'RxBIN 6-digit code that routes your prescription claim to the right Prescription Benefits benefit manager.',
  rxPcn: 'Rx PCN Secondary routing code that identifies your specific plan within that benefit manager.',
  rxGroup: "Rx Group identifies your employer's drug benefit group, used to apply your exact copays and formulary.",
};

export const REQUIRED_FIELDS = [
  { key: 'planName',             label: 'Plan Name' },
  { key: 'groupNumber',          label: 'Group Number' },
  { key: 'ediPayerId',           label: 'EDI Payer ID' },
  { key: 'memberSupportPhone',   label: 'Member Support Phone Number' },
  { key: 'providerSupportPhone', label: 'Provider Support Phone Number' },
  { key: 'addressLine1',         label: 'Address Line 1' },
  { key: 'zipcode',              label: 'Zipcode' },
  { key: 'city',                 label: 'City' },
  { key: 'state',                label: 'State' },
];

export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function numericOnly(value) {
  return value.replace(/[^0-9.]/g, '');
}

export function emptyTier(id) {
  return {
    id,
    tierName: '',
    coverageFamily: false,
    familyAccumulator: false,
    coverageType: '',
    inNetDeductible: '', inNetOopMax: '',
    inNetDeductibleFam: '', inNetOopMaxFam: '',
    inNetCopayPcp: '', inNetCopaySpecialist: '', inNetCopayUrgent: '', inNetCopayEr: '',
    inNetCopayInpatient: '', inNetCopayOutpatientSurgical: '',
    inNetCopayRoutineXray: '', inNetCopayAdvancedDiag: '', inNetCopayCTMRI: '',
    inNetCoinsurancePcp: '', inNetCoinsuranceSpecialist: '', inNetCoinsuranceUrgent: '', inNetCoinsuranceEr: '',
    outNetDeductible: '', outNetOopMax: '',
    outNetDeductibleFam: '', outNetOopMaxFam: '',
    outNetCopayPcp: '', outNetCopaySpecialist: '', outNetCopayUrgent: '', outNetCopayEr: '',
    outNetCopayInpatient: '', outNetCopayOutpatientSurgical: '',
    outNetCopayRoutineXray: '', outNetCopayAdvancedDiag: '', outNetCopayCTMRI: '',
    outNetCoinsurancePcp: '', outNetCoinsuranceSpecialist: '', outNetCoinsuranceUrgent: '', outNetCoinsuranceEr: '',
  };
}

export const EMPTY_FORM = {
  planName: '', planType: 'Medical', groupNumber: '', externalId: '',
  ediPayerId: '', providerNetworkName: '', planLogoUrl: '',
  planStartDate: '', planEndDate: '',
  providerPortal: '', medicalBenefits: '',
  memberSupportPhone: '', providerSupportPhone: '',
  addressLine1: '', addressLine2: '', zipcode: '', city: '', state: '',
  planWebsiteUrl: '', additionalNote: '',
  pbmName: '', pbmPhone: '', pbmUrl: '',
  rxBin: '', rxPcn: '', rxGroup: '',
  planMotto: 'Right Care - Right Provider - Right Price',
};

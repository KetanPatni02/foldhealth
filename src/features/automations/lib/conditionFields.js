/* The rows of the Edit Condition panel ("field · operator · value"), how each
   reads a patient record, and the plain-language sentence built from the
   filled rows. The same sentence is the canvas card summary and the panel
   footer (the Figma shows two different sentences for one condition).

   A condition node stores { rules: { [fieldKey]: { op, value, unit } } };
   empty rows are ignored. Patient records are all_patients rows in store
   shape (src/store: fetchAllPatients). */

import { CHANNELS } from './catalog';

const opt = (...labels) => labels.map(l => (typeof l === 'string' ? { value: l, label: l } : l));

export const UNITS_AGE = opt({ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' });
export const UNITS_TIME = opt({ value: 'days', label: 'Days' }, { value: 'weeks', label: 'Weeks' }, { value: 'months', label: 'Months' });

// `input`: 'select' | 'multi' | 'number' (number + unit). `ops`: operator
// choices, first is the default. `group`: the section header in the panel.
export const FIELDS = [
  { key: 'contactType', group: 'Contact basic info', label: 'Contact type', ops: ['is', 'is not'], input: 'select', options: opt('Patient', 'Prospect', 'Employee', 'Dependent') },
  { key: 'gender', group: 'Contact basic info', label: 'Gender', ops: ['is', 'is not'], input: 'select', options: opt('Male', 'Female', 'Other') },
  { key: 'sexAtBirth', group: 'Contact basic info', label: 'Sex at birth', ops: ['is', 'is not'], input: 'select', options: opt('Male', 'Female', 'Intersex') },
  { key: 'age', group: 'Contact basic info', label: 'Age', ops: ['is over', 'is under', 'is'], input: 'number', units: UNITS_AGE },
  { key: 'tags', group: 'Contact basic info', label: 'Tags', ops: ['are', 'include any of'], input: 'multi', optionsFrom: 'tags' },
  { key: 'location', group: 'Contact basic info', label: 'Location', ops: ['is', 'is not'], input: 'select', optionsFrom: 'locations' },
  { key: 'registeredFor', group: 'Membership', label: 'Member', ops: ['is registered for', 'is not registered for'], input: 'select', optionsFrom: 'programs' },
  { key: 'lastAppointment', group: 'Membership', label: 'Last appointment', ops: ['is within', 'is more than'], input: 'number', units: UNITS_TIME, suffix: 'ago' },
  { key: 'membership', group: 'Membership', label: 'Membership', ops: ['is'], input: 'select', options: opt('Active member', 'Inactive member', 'Not a member') },
  { key: 'membershipType', group: 'Membership', label: 'Membership type', ops: ['is', 'is not'], input: 'select', options: opt('Employee', 'Spouse', 'Child', 'One-off') },
  { key: 'membershipStart', group: 'Membership', label: 'Membership', ops: ['started within', 'started more than'], input: 'number', units: UNITS_TIME, suffix: 'ago' },
  { key: 'loginStatus', group: 'App login and activity', label: 'Member login status', ops: ['is'], input: 'select', options: opt('Logged in to the app', 'Never logged in') },
  { key: 'lastActivity', group: 'App login and activity', label: 'Last activity', ops: ['was within', 'was more than'], input: 'number', units: UNITS_TIME, suffix: 'ago' },
  { key: 'enrollmentStatus', group: 'Other', label: 'Member enrollment status', ops: ['is'], input: 'select', options: opt('Enrolled', 'Pending', 'Not enrolled') },
  { key: 'employer', group: 'Other', label: 'Employer', ops: ['is', 'is not'], input: 'select', optionsFrom: 'employers' },
  { key: 'consent', group: 'Other', label: 'Member consent', ops: ['is'], input: 'select', options: opt('Consented', 'Not consented') },
  // Fields used by the single-purpose conditions.
  { key: 'emergencyContact', group: 'Contact', label: 'Emergency contact', ops: ['is'], input: 'select', options: opt('On file', 'Missing') },
  { key: 'deactivated', group: 'Contact', label: 'Member', ops: ['is'], input: 'select', options: opt('Deactivated') },
  { key: 'language', group: 'Communication', label: 'Preferred language', ops: ['is', 'is not'], input: 'select', options: opt('English', 'Spanish', 'French', 'Chinese', 'Vietnamese') },
  { key: 'inbox', group: 'Communication', label: 'Communication inbox', ops: ['includes'], input: 'multi', options: opt('Email', 'SMS', 'Chat', 'Phone') },
  { key: 'preferredChannel', group: 'Communication', label: 'Preferred mode', ops: ['is any of'], input: 'channels', options: CHANNELS.map(c => ({ value: c.key, label: c.label })) },

  // ── Member matching only. Fields, labels, order and sections follow the
  // PO's "When member matches selected conditions" drawer (screen recording,
  // 2026-11-17; Figma "Mar-Present 2026" 5191:5389 / 5191:5390). `isNew`
  // marks the PO's additions. `input: 'rules'` is a list of field · operator
  // · value rows added with "Add rule". `ops: []` shows no operator. `extra`
  // is a second picker under the value. `execution` fields set how the
  // automation runs rather than who matches, so they never filter members.
  { key: 'isDeceased', group: 'Member profile', label: 'Deceased', input: 'rules', ruleFields: [
    { key: 'deceased', label: 'Is deceased', ops: ['=='], options: opt('Yes', 'No') },
    { key: 'deceasedDate', label: 'Deceased date (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'addressState', group: 'Member profile', label: 'Member Address State', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'states', placeholder: 'Select Member Address State' },
  { key: 'addressZip', group: 'Member profile', label: 'Member Address Zip Code', ops: ['equals', 'not equals'], input: 'multi', optionsFrom: 'zips', placeholder: 'Select Member Address Zip Code' },
  { key: 'membershipLength', group: 'Member profile', label: 'Active Membership Length', ops: ['more than', 'less than'], input: 'number', units: UNITS_TIME },
  { key: 'isDependent', group: 'Member profile', label: 'Is Dependent', ops: ['equals'], input: 'select', options: opt('Yes', 'No') },
  { key: 'weeklyCheckin', group: 'Member profile', label: 'When members are registered for weekly check-in', ops: ['equals'], input: 'select', options: opt('Yes', 'No') },
  { key: 'populationGroup', group: 'Pop Group & Attributes', label: 'Population Group', ops: ['is in', 'is not in'], input: 'multi', optionsFrom: 'popGroups', placeholder: 'Search Groups' },
  { key: 'customField', group: 'Pop Group & Attributes', label: 'Filter by Custom Field', input: 'rules', ruleFields: [
    { key: 'value', label: 'Custom field value', ops: ['Equals', 'Contains', 'Not equals'], input: 'text' },
  ] },
  { key: 'ehrCustomField', group: 'Pop Group & Attributes', label: 'Filter by EHR Custom Field', input: 'rules', info: 'Fields synced from the EHR, such as custom demographics.', ruleFields: [
    { key: 'value', label: 'EHR field value', ops: ['Equals', 'Contains', 'Not equals'], input: 'text' },
  ] },
  { key: 'coverage', group: 'Coverage and contract', label: 'Coverage', isNew: true, input: 'rules', ruleFields: [
    { key: 'payer', label: 'Payer', ops: ['Equals', 'Not equals'], optionsFrom: 'payers' },
    { key: 'plan', label: 'Plan name', ops: ['Equals', 'Not equals', 'Contains'], input: 'text' },
  ] },
  { key: 'healthPlanCode', group: 'Coverage and contract', label: 'Health Plan Code', ops: ['Is', 'Is not'], input: 'select', optionsFrom: 'planCodes' },
  { key: 'lob', group: 'Coverage and contract', label: 'Line of Business (LOB)', ops: ['equals', 'not equals'], input: 'multi', options: opt('Medicare Advantage', 'Medicare', 'Medicaid', 'Commercial', 'Exchange'), placeholder: 'Select Line of Business' },
  { key: 'hpGroup', group: 'Coverage and contract', label: 'HP Group', ops: ['equals', 'not equals'], input: 'select', options: opt('Group A', 'Group B', 'Group C'), placeholder: 'Select HP Group' },
  { key: 'contractType', group: 'Coverage and contract', label: 'Contract Type', ops: ['equals', 'not equals'], input: 'select', options: opt('Full risk', 'Shared savings', 'Fee for service', 'Capitation'), placeholder: 'Select Contract Type' },
  { key: 'ownedIpa', group: 'Coverage and contract', label: 'Is Owned IPA', ops: ['equals'], input: 'select', options: opt('Yes', 'No') },
  { key: 'networkMarket', group: 'Coverage and contract', label: 'Network Market', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'locations', placeholder: 'Select Network Market' },
  { key: 'snpMember', group: 'Coverage and contract', label: 'Is SNP Member', ops: ['equals'], input: 'select', options: opt('Yes', 'No') },
  { key: 'snpType', group: 'Coverage and contract', label: 'SNP Type', ops: ['equals', 'not equals'], input: 'select', options: opt('C-SNP', 'D-SNP', 'I-SNP'), placeholder: 'Select SNP Type' },
  { key: 'pcp', group: 'Care team and location', label: 'Primary Care Provider', ops: ['equals', 'not equals'], input: 'multi', optionsFrom: 'providers', placeholder: 'Select Primary Care Providers' },
  { key: 'pcpCounty', group: 'Care team and location', label: 'PCP County', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'counties', placeholder: 'Select PCP County' },
  { key: 'pcpVendor', group: 'Care team and location', label: 'PCP Vendor', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'vendors', placeholder: 'Select PCP Vendor' },
  { key: 'pcpPod', group: 'Care team and location', label: 'PCP Pod', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'pods', placeholder: 'Select PCP Pod' },
  { key: 'pcpState', group: 'Care team and location', label: 'PCP State', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'states', placeholder: 'Select PCP State' },
  { key: 'careTeam', group: 'Care team and location', label: 'Care Team', isNew: true, ops: ['Contains', 'Does not contain'], input: 'multi', optionsFrom: 'providers', placeholder: 'Search care team members' },
  { key: 'familyRole', group: 'Care team and location', label: 'Family & Caregivers Role', input: 'rules', ruleFields: [
    { key: 'roles', label: 'Roles', ops: ['Contains', 'Does not contain'], options: opt('Caregiver', 'Decision maker', 'Emergency contact', 'Guardian', 'Power of attorney') },
  ] },
  { key: 'practiceServices', group: 'Care team and location', label: 'Practice Location Services', ops: ['equals', 'not equals'], input: 'multi', options: opt('Primary care', 'Behavioral health', 'Lab', 'Imaging', 'Telehealth'), placeholder: 'Select Practice Location Services' },
  { key: 'practiceState', group: 'Care team and location', label: 'Practice Location State', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'states', placeholder: 'Select Practice Location State' },
  { key: 'practiceZip', group: 'Care team and location', label: 'Practice Location Zip Code', ops: ['equals', 'not equals'], input: 'multi', optionsFrom: 'zips', placeholder: 'Select Practice Location Zip Code' },
  { key: 'commMode', group: 'Communication and consent', label: 'Communication Mode', ops: ['equals', 'not equals'], input: 'multi', options: CHANNELS.map(c => ({ value: c.key, label: c.label })), placeholder: 'Select Communication Mode' },
  { key: 'commTime', group: 'Communication and consent', label: 'Preferred Communication Time', ops: ['equals', 'not equals'], input: 'select', options: opt('Morning', 'Afternoon', 'Evening'), placeholder: 'Select Preferred Communication Time' },
  { key: 'engagement', group: 'Communication and consent', label: 'Patient Engagement', isNew: true, input: 'rules', ruleFields: [
    { key: 'lastResponse', label: 'Last response (days ago)', ops: ['<=', '>'], input: 'number' },
    { key: 'appUsage', label: 'App usage', ops: ['=='], options: opt('Active', 'Inactive', 'Never used') },
    { key: 'outreachAttempts', label: 'Outreach attempts', ops: ['>=', '<'], input: 'number' },
  ] },
  { key: 'chronicCondition', group: 'Clinical conditions', label: 'Chronic Condition', input: 'rules', ruleFields: [
    { key: 'condition', label: 'Condition', ops: ['==', '!='], options: opt('Diabetes', 'Hypertension', 'CHF', 'COPD', 'CKD', 'Asthma', 'Depression') },
  ] },
  { key: 'diagnosis', group: 'Clinical conditions', label: 'Diagnosis', input: 'rules', ruleFields: [
    { key: 'code', label: 'ICD-10 code', ops: ['==', 'Starts with'], input: 'text' },
    { key: 'recorded', label: 'Recorded (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'problem', group: 'Clinical conditions', label: 'Problem', input: 'rules', ruleFields: [
    { key: 'name', label: 'Problem', ops: ['Contains', '=='], input: 'text' },
    { key: 'status', label: 'Status', ops: ['=='], options: opt('Active', 'Resolved', 'Inactive') },
  ] },
  { key: 'procedure', group: 'Clinical conditions', label: 'Procedure', isNew: true, input: 'rules', ruleFields: [
    { key: 'code', label: 'CPT code', ops: ['==', 'Starts with'], input: 'text' },
    { key: 'performed', label: 'Performed (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'hccGap', group: 'Clinical conditions', label: 'HCC Gap', isNew: true, input: 'rules', ruleFields: [
    { key: 'category', label: 'HCC category', ops: ['==', '!='], input: 'text' },
    { key: 'status', label: 'Gap status', ops: ['=='], options: opt('Open', 'Closed', 'Dismissed') },
  ] },
  { key: 'labResult', group: 'Results and measurements', label: 'Lab Result', isNew: true, input: 'rules', ruleFields: [
    { key: 'analyte', label: 'Lab Analyte', ops: ['=='], options: opt('HbA1c', 'LDL', 'eGFR', 'Creatinine', 'Potassium', 'TSH') },
    { key: 'lastValue', label: 'Last value', ops: ['==', '!=', '>', '>=', '<', '<='], input: 'number' },
    { key: 'performed', label: 'Performed - recent (days)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'vital', group: 'Results and measurements', label: 'Vital', isNew: true, input: 'rules', ruleFields: [
    { key: 'vital', label: 'Vital', ops: ['=='], options: opt('Systolic BP', 'Diastolic BP', 'BMI', 'Weight', 'Heart rate', 'SpO2') },
    { key: 'lastValue', label: 'Last value', ops: ['==', '!=', '>', '>=', '<', '<='], input: 'number' },
    { key: 'recorded', label: 'Recorded - recent (days)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'imagingResult', group: 'Results and measurements', label: 'Imaging Result', isNew: true, input: 'rules', ruleFields: [
    { key: 'study', label: 'Study', ops: ['=='], options: opt('Mammogram', 'DEXA scan', 'Chest X-ray', 'CT', 'MRI') },
    { key: 'result', label: 'Result', ops: ['==', '!='], options: opt('Normal', 'Abnormal', 'Pending') },
    { key: 'performed', label: 'Performed - recent (days)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'homeMonitoring', group: 'Results and measurements', label: 'Home Monitoring', isNew: true, input: 'rules', ruleFields: [
    { key: 'device', label: 'Device', ops: ['=='], options: opt('Blood pressure', 'Glucose', 'Weight', 'Pulse oximeter') },
    { key: 'lastValue', label: 'Last reading', ops: ['==', '!=', '>', '>=', '<', '<='], input: 'number' },
    { key: 'noReading', label: 'Days without a reading', ops: ['>', '>='], input: 'number' },
  ] },
  { key: 'medicationOrders', group: 'Medications and immunizations', label: 'Medication Orders', isNew: true, input: 'rules', ruleFields: [
    { key: 'medication', label: 'Medication', ops: ['Contains', '=='], input: 'text' },
    { key: 'status', label: 'Status', ops: ['=='], options: opt('Active', 'On hold', 'Discontinued') },
  ] },
  { key: 'historicalMedications', group: 'Medications and immunizations', label: 'Historical Medications', isNew: true, input: 'rules', ruleFields: [
    { key: 'medication', label: 'Medication', ops: ['Contains', '=='], input: 'text' },
    { key: 'lastFilled', label: 'Last filled (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'immunization', group: 'Medications and immunizations', label: 'Immunization', isNew: true, input: 'rules', ruleFields: [
    { key: 'vaccine', label: 'Vaccine', ops: ['==', '!='], options: opt('Influenza', 'COVID-19', 'Pneumococcal', 'Shingles', 'Tdap') },
    { key: 'given', label: 'Given (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'labOrder', group: 'Orders', label: 'Lab Order', isNew: true, input: 'rules', ruleFields: [
    { key: 'test', label: 'Test', ops: ['Contains', '=='], input: 'text' },
    { key: 'status', label: 'Status', ops: ['=='], options: opt('Ordered', 'In progress', 'Resulted', 'Cancelled') },
  ] },
  { key: 'imagingOrder', group: 'Orders', label: 'Imaging Order', isNew: true, input: 'rules', ruleFields: [
    { key: 'study', label: 'Study', ops: ['Contains', '=='], input: 'text' },
    { key: 'status', label: 'Status', ops: ['=='], options: opt('Ordered', 'Scheduled', 'Completed', 'Cancelled') },
  ] },
  { key: 'procedureOrder', group: 'Orders', label: 'Procedure Order', isNew: true, input: 'rules', ruleFields: [
    { key: 'procedure', label: 'Procedure', ops: ['Contains', '=='], input: 'text' },
    { key: 'status', label: 'Status', ops: ['=='], options: opt('Ordered', 'Scheduled', 'Completed', 'Cancelled') },
  ] },
  { key: 'referralOrder', group: 'Referrals', label: 'Referral Order', isNew: true, input: 'rules', ruleFields: [
    { key: 'specialty', label: 'Specialty', ops: ['Contains', '=='], input: 'text' },
    { key: 'status', label: 'Status', ops: ['=='], options: opt('Sent', 'Scheduled', 'Completed', 'Declined', 'No response') },
  ] },
  { key: 'providerReferral', group: 'Referrals', label: 'Provider Referral Submission', input: 'rules', ruleFields: [
    { key: 'status', label: 'Referral status', ops: ['==', '!='], options: opt('Submitted', 'Accepted', 'Rejected') },
    { key: 'submitted', label: 'Submitted (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'careProgramGap', group: 'Care programs and quality', label: 'Care Program/Gap', ops: ['equals', 'not equals'], input: 'multi', optionsFrom: 'programs', placeholder: 'Select Care Program/Gap' },
  { key: 'gapStatus', group: 'Care programs and quality', label: 'Care Program/Gap Status', ops: ['equals', 'not equals'], input: 'select', options: opt('Eligible', 'Enrolled', 'Active', 'Closed', 'Declined'), placeholder: 'Select Care Program/Gap Status' },
  { key: 'gapSubStatus', group: 'Care programs and quality', label: 'Care Program/Gap Sub Status', ops: ['equals', 'not equals'], input: 'select', options: opt('Outreach pending', 'Outreach attempted', 'Scheduled', 'Awaiting documents', 'Completed'), placeholder: 'Select Care Program/Gap Sub Status' },
  { key: 'gapEligibility', group: 'Care programs and quality', label: 'Care Program/Gap Eligibility Check', ops: ['equals', 'not equals'], input: 'select', options: opt('Eligible', 'Not eligible', 'Pending review'), placeholder: 'Select Care Program/Gap Eligibility Check' },
  { key: 'noActivity', group: 'Care programs and quality', label: 'No Activity on Care Program/Gap for the past', ops: [], input: 'number', units: UNITS_TIME, placeholder: 'Enter number of days' },
  { key: 'carePlan', group: 'Care programs and quality', label: 'Care Plan', input: 'rules', ruleFields: [
    { key: 'status', label: 'Care plan status', ops: ['==', '!='], options: opt('Draft', 'Active', 'In review', 'Completed') },
    { key: 'goal', label: 'Goal', ops: ['Contains'], input: 'text' },
  ] },
  { key: 'fmc', group: 'Care programs and quality', label: 'FMC', ops: ['equals', 'not equals'], input: 'select', options: opt('Compliant', 'Non-compliant', 'Not eligible'), placeholder: 'Select FMC' },
  { key: 'tfu', group: 'Care programs and quality', label: 'TFU', ops: ['equals', 'not equals'], input: 'select', options: opt('Compliant', 'Non-compliant', 'Not eligible'), placeholder: 'Select TFU' },
  { key: 'fua', group: 'Care programs and quality', label: 'FUA', ops: ['equals', 'not equals'], input: 'select', options: opt('Compliant', 'Non-compliant', 'Not eligible'), placeholder: 'Select FUA' },
  { key: 'fum', group: 'Care programs and quality', label: 'FUM', ops: ['equals', 'not equals'], input: 'select', options: opt('Compliant', 'Non-compliant', 'Not eligible'), placeholder: 'Select FUM' },
  { key: 'careUtilization', group: 'Utilization and encounters', label: 'Care Utilization', isNew: true, input: 'rules', ruleFields: [
    { key: 'erVisits', label: 'ER visits (12 months)', ops: ['>=', '<'], input: 'number' },
    { key: 'admissions', label: 'Inpatient admissions (12 months)', ops: ['>=', '<'], input: 'number' },
  ] },
  { key: 'eventLocationStatus', group: 'Utilization and encounters', label: "Patient's Event Location Status", ops: [], input: 'select', options: opt('Admitted', 'In ED', 'Discharged', 'Transferred'), placeholder: "Select Patient's Event Location Status" },
  { key: 'eventLocation', group: 'Utilization and encounters', label: 'Event Location', ops: ['equals', 'not equals'], input: 'multi', optionsFrom: 'locations', placeholder: 'Select Locations' },
  { key: 'claim', group: 'Utilization and encounters', label: 'Claim', isNew: true, input: 'rules', ruleFields: [
    { key: 'type', label: 'Claim type', ops: ['=='], options: opt('Inpatient', 'Outpatient', 'Professional', 'Pharmacy') },
    { key: 'serviced', label: 'Date of service (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'appointment', group: 'Utilization and encounters', label: 'Appointment', ops: ['equals', 'not equals'], input: 'select', optionsFrom: 'appointmentTypes', placeholder: 'Choose appointment' },
  { key: 'patientAppointments', group: 'Utilization and encounters', label: 'Patient Appointments', isNew: true, input: 'rules', ruleFields: [
    { key: 'status', label: 'Status', ops: ['=='], options: opt('Scheduled', 'Completed', 'No-show', 'Cancelled') },
    { key: 'when', label: 'Within (days)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'notes', group: 'Utilization and encounters', label: 'Notes', isNew: true, input: 'rules', ruleFields: [
    { key: 'type', label: 'Note type', ops: ['=='], options: opt('Progress note', 'Care plan note', 'Phone call', 'Discharge summary') },
    { key: 'written', label: 'Written (days ago)', ops: ['<=', '>'], input: 'number' },
  ] },
  { key: 'automationLimit', group: 'Execution settings', label: 'Automation Limit', ops: [], input: 'number', execution: true, placeholder: 'Enter limit', info: 'The most members this automation runs for.' },
  { key: 'executionControl', group: 'Execution settings', label: 'Execution Control', ops: [], input: 'select', execution: true, options: opt('Once per member', 'Once per care program', 'Every time the trigger fires'), placeholder: 'Add context' },
  { key: 'frequency', group: 'Execution settings', label: 'Frequency', ops: [], input: 'number', execution: true, units: UNITS_TIME, placeholder: 'Number' },
];

// The member matching condition's sections, in the PO's order. A
// [key, label, overrides] entry reuses a shared field with the drawer's own
// label so it reads exactly like the PO version.
const MATCHING_SECTIONS = [
  { group: 'Member profile', keys: [
    ['membership', 'Membership Status', { placeholder: 'Select Membership Status' }], ['membershipType', 'Membership Type', { placeholder: 'Select Membership Type' }],
    ['contactType', 'Contact Type', { placeholder: 'Search Contact Types' }], ['loginStatus', 'Member Login Status', { placeholder: 'Select Member Login Status' }],
    'membershipLength', 'isDependent', ['gender', 'Gender', { placeholder: 'Select Gender' }], ['sexAtBirth', 'Sex At Birth'], ['age', 'Age'],
    ['language', 'Language'], 'isDeceased', 'addressState', 'addressZip', 'weeklyCheckin',
  ] },
  { group: 'Pop Group & Attributes', keys: ['populationGroup', ['tags', 'Tags', { placeholder: 'Search Tag' }], 'customField', 'ehrCustomField'] },
  { group: 'Coverage and contract', keys: [
    'coverage', 'healthPlanCode', 'lob', 'hpGroup', 'contractType', 'ownedIpa', 'networkMarket', 'snpMember', 'snpType',
    ['employer', 'Employers', { placeholder: 'Select Employer' }], ['membershipStart', 'Employee Membership Start'], ['enrollmentStatus', 'Employee Enrollment Status', { placeholder: 'Select Status' }],
  ] },
  { group: 'Care team and location', keys: [
    'pcp', 'pcpCounty', 'pcpVendor', 'pcpPod', 'pcpState', 'careTeam', 'familyRole',
    ['location', 'Locations', { placeholder: 'Select Locations' }], 'practiceServices', 'practiceState', 'practiceZip',
  ] },
  { group: 'Communication and consent', keys: [
    'commMode', 'commTime',
    ['consent', 'Consent Received', { ops: ['equals', 'not equals'], placeholder: 'Select Consent Received', extra: { key: 'types', placeholder: 'Select Consent Types', options: opt('CCM', 'APCM', 'BHI', 'RPM', 'Treatment', 'Telehealth') } }],
    'engagement',
  ] },
  { group: 'Clinical conditions', keys: ['chronicCondition', 'diagnosis', 'problem', 'procedure', 'hccGap'] },
  { group: 'Results and measurements', keys: ['labResult', 'vital', 'imagingResult', 'homeMonitoring'] },
  { group: 'Medications and immunizations', keys: ['medicationOrders', 'historicalMedications', 'immunization'] },
  { group: 'Orders', keys: ['labOrder', 'imagingOrder', 'procedureOrder'] },
  { group: 'Referrals', keys: ['referralOrder', 'providerReferral'] },
  { group: 'Care programs and quality', keys: [
    'careProgramGap', 'gapStatus', 'gapSubStatus', ['registeredFor', 'Care Program Assigned', { ops: [], placeholder: 'Select Option' }], 'gapEligibility',
    'noActivity', 'carePlan', 'fmc', 'tfu', 'fua', 'fum',
  ] },
  { group: 'Utilization and encounters', keys: ['careUtilization', 'eventLocationStatus', 'eventLocation', 'claim', 'appointment', 'patientAppointments', 'notes'] },
  { group: 'Execution settings', keys: ['automationLimit', 'executionControl', 'frequency'] },
];

export const fieldDef = (key) => FIELDS.find(f => f.key === key) || null;

/** The rows a condition type shows, grouped: [{ group, fields }]. */
export function fieldsFor(conditionDef) {
  if (conditionDef?.fields === 'all') {
    return MATCHING_SECTIONS.map(sec => ({
      group: sec.group,
      fields: sec.keys.map(k => {
        const [key, label, extra] = Array.isArray(k) ? k : [k];
        const f = fieldDef(key);
        return f && { ...f, ...(label ? { label } : null), ...extra };
      }).filter(Boolean),
    }));
  }
  const keys = Array.isArray(conditionDef?.fields) ? conditionDef.fields : [];
  const groups = [];
  keys.map(fieldDef).filter(Boolean).forEach(f => {
    let g = groups.find(x => x.group === f.group);
    if (!g) { g = { group: f.group, fields: [] }; groups.push(g); }
    g.fields.push(f);
  });
  return groups;
}

const ruleSet = (x) => x && x.field && x.value !== '' && x.value != null;

/** A rules field's value as a `{ combinator, rules }` tree (older saves stored a flat list). */
export const ruleTree = (v) => {
  if (Array.isArray(v)) return { combinator: 'and', rules: v };
  return v && typeof v === 'object' && Array.isArray(v.rules) ? v : null;
};
const leaves = (node) => (node?.rules || []).flatMap(c => (Array.isArray(c?.rules) ? leaves(c) : [c]));

export const isFilled = (r) => {
  if (!r || r.value == null || r.value === '') return false;
  if (Array.isArray(r.value) && !r.value.some(x => x && typeof x === 'object')) return r.value.length > 0;
  const tree = ruleTree(r.value);
  if (tree) return leaves(tree).some(ruleSet);
  return true;
};
export const filledRules = (rules) => Object.entries(rules || {}).filter(([, r]) => isFilled(r));

const unitWord = (unit, n) => {
  const u = (unit || 'days').replace(/s$/, '');
  return Number(n) === 1 ? u : `${u}s`;
};
const list = (arr) => {
  const a = arr.map(String);
  return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
};
const orList = (arr) => {
  const a = arr.map(String);
  return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} or ${a.at(-1)}`;
};

// "Line of Business (LOB)" → "line of business (LOB)": acronyms and
// measurements (HbA1c, ICD-10, PDC) keep their case mid-sentence.
const sentenceCase = (label) => label.split(' ')
  .map(w => (/[A-Z].*[A-Z]|\d|\(/.test(w) ? w : w.toLowerCase()))
  .join(' ');

/** One label per rule with a value, e.g. ["Is deceased == Yes"], in order. */
export function ruleLabels(f, node) {
  return leaves(node).filter(ruleSet).map(c => {
    const rf = f.ruleFields.find(y => y.key === c.field);
    return `${rf?.label || c.field} ${c.op || rf?.ops[0] || ''} ${c.value}`;
  });
}

/** "HbA1c > 9 and (LDL > 190 or eGFR < 60)" for a rules field's tree. */
export function describeRules(f, node, nested = false) {
  if (!node) return '';
  const parts = node.rules.map(c => {
    if (Array.isArray(c?.rules)) return describeRules(f, c, true);
    if (!ruleSet(c)) return '';
    const rf = f.ruleFields.find(y => y.key === c.field);
    return `${rf?.label || c.field} ${String(c.op || rf?.ops[0] || '').toLowerCase()} ${c.value}`;
  }).filter(Boolean);
  if (!parts.length) return '';
  const joined = parts.join(node.combinator === 'or' ? ' or ' : ' and ');
  return nested && parts.length > 1 ? `(${joined})` : joined;
}

/** One phrase per filled row, e.g. "tagged High Risk and Hypertensive". */
function phrase(key, r) {
  const f = fieldDef(key);
  if (!f) return null;
  const v = r.value;
  const op = r.op || f.ops?.[0] || '';
  const neg = /not/.test(op);
  switch (key) {
    case 'contactType': return `the contact type ${neg ? 'is not' : 'is'} ${String(v).toLowerCase()}`;
    case 'gender': return `gender ${neg ? 'is not' : 'is'} ${String(v).toLowerCase()}`;
    case 'sexAtBirth': return `sex at birth ${neg ? 'is not' : 'is'} ${String(v).toLowerCase()}`;
    case 'age': return op === 'is' ? `age is ${v} ${unitWord(r.unit || 'years', v)}` : `age ${op} ${v} ${unitWord(r.unit || 'years', v)}`;
    case 'tags': return op === 'are' ? `tagged ${list(v)}` : `tagged ${orList(v)}`;
    case 'location': return `located ${neg ? 'outside' : 'in'} ${v}`;
    case 'registeredFor': return `${neg ? 'not registered' : 'registered'} for ${v}`;
    case 'lastAppointment': return `last appointment ${op === 'is within' ? 'within' : 'more than'} ${v} ${unitWord(r.unit, v)} ago`;
    case 'membership': return v === 'Not a member' ? 'without a membership' : `with an ${String(v).replace(' member', '').toLowerCase()} membership`;
    case 'membershipType': return `membership type ${neg ? 'is not' : 'is'} ${String(v).toLowerCase()}`;
    case 'membershipStart': return `membership started ${op === 'started within' ? 'within' : 'more than'} ${v} ${unitWord(r.unit, v)} ago`;
    case 'loginStatus': return v === 'Never logged in' ? 'never logged in to the app' : 'logged in to the app';
    case 'lastActivity': return `last active ${op === 'was within' ? 'within' : 'more than'} ${v} ${unitWord(r.unit, v)} ago`;
    case 'enrollmentStatus': return `enrollment status is ${String(v).toLowerCase()}`;
    case 'employer': return `employer ${neg ? 'is not' : 'is'} ${v}`;
    case 'consent': return v === 'Consented' ? 'consent on file' : 'no consent on file';
    case 'emergencyContact': return v === 'On file' ? 'an emergency contact on file' : 'no emergency contact on file';
    case 'deactivated': return 'the member is deactivated';
    case 'language': return `preferred language ${neg ? 'is not' : 'is'} ${v}`;
    case 'inbox': return `uses ${orList(v)}`;
    case 'preferredChannel': return `preferred mode is ${orList((v || []).map(k => CHANNELS.find(c => c.key === k)?.label || k))}`;
    default: {
      if (f.input === 'rules') {
        const text = describeRules(f, ruleTree(v));
        return text ? `${sentenceCase(f.label)}: ${text}` : null;
      }
      const label = sentenceCase(f.label);
      if (f.input === 'number') {
        const unit = f.units?.find(u => u.value === r.unit)?.label || f.units?.[0]?.label || '';
        return `${label} ${op} ${v} ${unit.toLowerCase()}${f.suffix ? ` ${f.suffix}` : ''}`.replace(/\s+/g, ' ').trim();
      }
      return `${label} ${op} ${Array.isArray(v) ? orList(v) : v}`;
    }
  }
}

/** "When the contact type is patient with an active membership and tagged High Risk and Hypertensive". */
export function summarizeRules(rules) {
  const parts = filledRules(rules).map(([k, r]) => phrase(k, r)).filter(Boolean);
  if (!parts.length) return null;
  return `When ${list(parts)}`;
}

// ── Evaluation ──
// Each field reads the patient record when it carries that fact. Facts the
// record doesn't hold (sex at birth, emergency contact, last app activity,
// enrollment status, employer) fall back to a stable per-member draw so a
// simulated run is repeatable; `known: false` marks those in the reasons.

export const hash01 = (s) => {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
};

const daysAgo = (iso, now) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? Math.floor((now - d) / 86400000) : null;
};
const toDays = (n, unit) => Number(n) * (unit === 'weeks' ? 7 : unit === 'months' ? 30 : unit === 'years' ? 365 : 1);
const norm = (s) => String(s ?? '').trim().toLowerCase();
const genderOf = (g) => {
  const n = norm(g);
  if (n.startsWith('m')) return 'male';
  if (n.startsWith('f')) return 'female';
  return n ? 'other' : '';
};

function evalField(key, r, p, now) {
  const op = r.op || fieldDef(key)?.ops?.[0];
  const neg = /not/.test(op);
  const v = r.value;
  const draw = (rate) => ({ ok: hash01(`${p.id}:${key}:${JSON.stringify(v)}`) < rate, known: false });
  switch (key) {
    case 'contactType': return { ok: (norm(v) === 'patient') !== neg, known: true };
    case 'gender': return { ok: (genderOf(p.gender) === norm(v)) !== neg, known: !!p.gender };
    case 'age': {
      if (p.age == null) return draw(0.5);
      const years = Number(p.age);
      const target = r.unit === 'months' ? Number(v) / 12 : Number(v);
      const ok = op === 'is over' ? years > target : op === 'is under' ? years < target : Math.floor(years) === Math.floor(target);
      return { ok, known: true };
    }
    case 'tags': {
      const tags = (p.tags || []).map(norm);
      const want = (v || []).map(norm);
      const ok = op === 'are' ? want.every(t => tags.includes(t)) : want.some(t => tags.includes(t));
      return { ok, known: true };
    }
    case 'location': {
      const here = [p.city, p.state, p.location].map(norm);
      return { ok: here.includes(norm(v)) !== neg, known: here.some(Boolean) };
    }
    case 'registeredFor': {
      const progs = [p.activeCareProgram].flat().filter(Boolean).map(norm);
      return { ok: progs.some(x => x.includes(norm(v))) !== neg, known: true };
    }
    case 'lastAppointment': {
      const d = daysAgo(p.lastVisit, now);
      if (d == null) return draw(0.4);
      const lim = toDays(v, r.unit);
      return { ok: op === 'is within' ? d <= lim : d > lim, known: true };
    }
    case 'membership': {
      const active = !!p.coverageType;
      return { ok: v === 'Active member' ? active : v === 'Not a member' ? !p.coverageType : !active, known: true };
    }
    case 'membershipType': return draw(neg ? 0.7 : 0.3);
    case 'loginStatus': return { ok: v === 'Never logged in' ? !p.patientAppActive : !!p.patientAppActive, known: true };
    case 'consent': {
      const yes = !!(p.ccmConsent || p.apcmConsent);
      return { ok: v === 'Consented' ? yes : !yes, known: true };
    }
    case 'language': return { ok: (norm(p.language || 'en').startsWith(norm(v).slice(0, 2))) !== neg, known: true };
    case 'inbox': {
      const has = { email: !!p.email, sms: !!p.phone, phone: !!p.phone, chat: !!p.patientAppActive };
      return { ok: (v || []).some(x => has[norm(x)]), known: true };
    }
    case 'deactivated': return { ok: norm(p.status) === 'inactive', known: p.status != null };
    default: return draw(0.65);
  }
}

/** { matched, reasons: [{ ok, text, known }] } for a condition's rules against one patient. */
export function evaluateRules(rules, patient, now = new Date()) {
  const rows = filledRules(rules).filter(([k]) => !fieldDef(k)?.execution);
  if (!rows.length) return { matched: true, reasons: [] };
  const reasons = rows.map(([k, r]) => {
    const res = evalField(k, r, patient, now);
    return { ...res, text: phrase(k, r) };
  });
  return { matched: reasons.every(x => x.ok), reasons };
}

/** The member's channel for a preferred-mode split, from what the record holds. */
export function preferredChannelOf(patient) {
  if (patient.preferredChannel) return patient.preferredChannel;
  if (patient.patientAppActive) return 'chat';
  if (patient.email) return 'email';
  if (patient.phone) return 'sms';
  return 'none';
}

/** Option lists that come from data rather than the field definition. */
export function dynamicOptions(patients = [], programs = []) {
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
  return {
    tags: uniq(patients.flatMap(p => p.tags || [])).map(t => ({ value: t, label: t })),
    locations: uniq(patients.flatMap(p => [p.city, p.state])).map(t => ({ value: t, label: t })),
    programs: uniq([...programs, ...patients.map(p => p.activeCareProgram)]).map(t => ({ value: t, label: t })),
    employers: uniq(patients.map(p => p.employer || p.groupNumber)).map(t => ({ value: t, label: t })),
    payers: uniq(patients.map(p => p.coverageType)).map(t => ({ value: t, label: t })),
    planCodes: uniq(patients.flatMap(p => [p.hpCode, p.planCode])).map(t => ({ value: t, label: t })),
    states: uniq(patients.map(p => p.state)).map(t => ({ value: t, label: t })),
    zips: uniq(patients.map(p => p.zip)).map(t => ({ value: t, label: t })),
    providers: uniq(patients.map(p => p.pcp)).map(t => ({ value: t, label: t })),
  };
}

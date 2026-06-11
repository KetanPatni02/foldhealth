/**
 * Form-builder component catalog.
 *
 * Three palette groups (matching the Figma): Health Components (pre-built
 * clinical sections), Basic (primitive inputs), and Custom (user-saved
 * reusable components, supplied at runtime).
 *
 * Each entry's `make()` returns a field *template* (no linkId). The builder
 * assigns fresh linkIds recursively when the item is dropped onto the canvas.
 *
 * Field shape (a pragmatic, FHIR-Questionnaire-aligned subset):
 *   { type, text, required, description, placeholder, control, options[], items[], healthKey }
 * - type:    'string'|'text'|'boolean'|'choice'|'integer'|'decimal'|'date'|'display'|'group'
 * - control: UI hint within a type ('radio'|'checkbox'|'dropdown'|'stars'|'email'|'tel'|'currency'|'image'|'paragraph')
 * - options: [{ value, score? }] for choice types (value doubles as the label)
 */

import { validatedPaletteEntries } from './validatedInstruments';

const opt = (value, score) => (score == null ? { value } : { value, score });

const choice = (text, control, options) => ({
  type: 'choice',
  text,
  control,
  required: false,
  options,
});

// ── Basic primitives ───────────────────────────────────────────────────────
export const BASIC = [
  { key: 'small-text', label: 'Small text', icon: 'solar:text-linear',
    make: () => ({ type: 'string', text: 'Short answer', placeholder: 'Type your answer', required: false }) },
  { key: 'large-text', label: 'Large text', icon: 'solar:text-square-linear',
    make: () => ({ type: 'text', text: 'Long answer', placeholder: 'Type your answer', required: false }) },
  { key: 'email', label: 'Email', icon: 'solar:letter-linear',
    make: () => ({ type: 'string', control: 'email', text: 'Email', placeholder: 'name@example.com', required: false }) },
  { key: 'consent', label: 'Consent', icon: 'solar:check-square-linear',
    make: () => ({ type: 'boolean', control: 'consent', text: 'I agree to the terms', required: true }) },
  { key: 'single-select', label: 'Single select', icon: 'solar:check-circle-linear',
    make: () => choice('Single choice question', 'radio', [opt('Option 1'), opt('Option 2'), opt('Option 3')]) },
  { key: 'multi-select', label: 'Multi select', icon: 'solar:checklist-minimalistic-linear',
    make: () => ({ ...choice('Select all that apply', 'checkbox', [opt('Option 1'), opt('Option 2'), opt('Option 3')]), repeats: true }) },
  { key: 'dropdown', label: 'Dropdown', icon: 'solar:alt-arrow-down-linear',
    make: () => choice('Choose one', 'dropdown', [opt('Option 1'), opt('Option 2'), opt('Option 3')]) },
  { key: 'phone', label: 'Phone number', icon: 'solar:phone-linear',
    make: () => ({ type: 'string', control: 'tel', text: 'Phone number', placeholder: '(555) 000-0000', required: false }) },
  { key: 'date', label: 'Date', icon: 'solar:calendar-linear',
    make: () => ({ type: 'date', text: 'Select a date', required: false }) },
  { key: 'paragraph', label: 'Paragraph', icon: 'solar:paragraph-spacing-linear',
    make: () => ({ type: 'display', control: 'paragraph', text: 'Add descriptive text for the respondent.' }) },
  { key: 'number', label: 'Number', icon: 'solar:hashtag-linear',
    make: () => ({ type: 'integer', text: 'Number', placeholder: '0', required: false }) },
  { key: 'currency', label: 'Currency', icon: 'solar:dollar-linear',
    make: () => ({ type: 'decimal', control: 'currency', text: 'Amount', placeholder: '0.00', required: false }) },
];

// ── Health components (pre-built clinical sections) ─────────────────────────
const group = (text, healthKey, items) => ({ type: 'group', text, healthKey, items });

export const HEALTH = [
  { key: 'chief-complaint', label: 'Chief Complaint', icon: 'solar:clipboard-heart-linear',
    make: () => group('Chief Complaint', 'chiefComplaint', [
      { type: 'text', text: 'What brings you in today?', placeholder: 'Describe your main concern', required: true },
      { type: 'integer', text: 'How many days have you had this?', placeholder: '0' },
    ]) },
  { key: 'patient-demographics', label: 'Patient Demographics', icon: 'solar:user-id-linear',
    make: () => group('Patient Demographics', 'patientDemographics', [
      { type: 'string', text: 'Full name', required: true },
      { type: 'date', text: 'Date of birth', required: true },
      choice('Sex', 'radio', [opt('Female'), opt('Male'), opt('Other')]),
    ]) },
  { key: 'provider-info', label: 'Provider Info', icon: 'solar:stethoscope-linear',
    make: () => group('Provider Info', 'providerInfo', [
      { type: 'string', text: 'Primary care provider' },
      { type: 'string', text: 'Clinic / facility' },
    ]) },
  { key: 'patient-communication', label: 'Patient Communication', icon: 'solar:chat-round-line-linear',
    make: () => group('Patient Communication', 'patientCommunication', [
      choice('Preferred contact method', 'radio', [opt('Phone'), opt('Email'), opt('Text')]),
      { type: 'string', control: 'tel', text: 'Best phone number' },
    ]) },
  { key: 'patient-address', label: 'Patient Address', icon: 'solar:map-point-linear',
    make: () => group('Patient Address', 'patientAddress', [
      { type: 'string', text: 'Street address' },
      { type: 'string', text: 'City' },
      { type: 'string', text: 'State' },
      { type: 'string', text: 'ZIP code' },
    ]) },
  { key: 'emergency-contact', label: 'Emergency Contact', icon: 'solar:siren-rounded-linear',
    make: () => group('Emergency Contact', 'emergencyContact', [
      { type: 'string', text: 'Contact name', required: true },
      { type: 'string', text: 'Relationship' },
      { type: 'string', control: 'tel', text: 'Phone number', required: true },
    ]) },
  { key: 'vitals', label: 'Vitals', icon: 'solar:heart-pulse-linear',
    make: () => group('Vitals', 'vitals', [
      { type: 'decimal', text: 'Height (cm)' },
      { type: 'decimal', text: 'Weight (kg)' },
      { type: 'string', text: 'Blood pressure', placeholder: '120/80' },
    ]) },
  { key: 'medications', label: 'Medications', icon: 'solar:pills-linear',
    make: () => group('Medications', 'medications', [
      { type: 'string', text: 'Medication name', placeholder: 'Search and add medication' },
      choice('Status', 'dropdown', [opt('active'), opt('completed'), opt('stopped')]),
      { type: 'date', text: 'Started on' },
      { type: 'date', text: 'Stop date' },
    ]) },
  { key: 'allergies', label: 'Allergies', icon: 'solar:danger-triangle-linear',
    make: () => group('Allergies', 'allergies', [
      { type: 'string', text: 'Allergen' },
      choice('Reaction severity', 'radio', [opt('Mild'), opt('Moderate'), opt('Severe')]),
    ]) },
  { key: 'conditions', label: 'Conditions', icon: 'solar:clipboard-list-linear',
    make: () => group('Conditions', 'conditions', [
      { type: 'string', text: 'Condition' },
      { type: 'date', text: 'Diagnosed on' },
    ]) },
  { key: 'immunizations', label: 'Immunizations', icon: 'solar:test-tube-linear',
    make: () => group('Immunizations', 'immunizations', [
      { type: 'string', text: 'Vaccine' },
      { type: 'date', text: 'Date administered' },
    ]) },
  { key: 'social-history', label: 'Social History', icon: 'solar:users-group-rounded-linear',
    make: () => group('Social History', 'socialHistory', [
      choice('Do you smoke?', 'radio', [opt('Never'), opt('Former'), opt('Current')]),
      choice('Alcohol use', 'radio', [opt('None'), opt('Occasional'), opt('Regular')]),
    ]) },
  { key: 'family-history', label: 'Family History', icon: 'solar:users-group-two-rounded-linear',
    make: () => group('Family History', 'familyHistory', [
      { type: 'string', text: 'Condition' },
      { type: 'string', text: 'Relationship' },
    ]) },
];

export const PALETTE_TABS = [
  { key: 'health', label: 'Health Components' },
  { key: 'basic', label: 'Basic' },
  { key: 'custom', label: 'Custom' },
];

// Validated instruments lead the Health tab (locked, evidence-based scales),
// followed by the editable pre-built sections.
export const HEALTH_WITH_VALIDATED = [...validatedPaletteEntries(), ...HEALTH];

export function paletteFor(tab, customComponents = []) {
  if (tab === 'health') return HEALTH_WITH_VALIDATED;
  if (tab === 'basic') return BASIC;
  return customComponents;
}

// Find a catalog entry across the built-in groups (for the drag overlay).
export function findCatalogEntry(key) {
  return [...HEALTH, ...BASIC].find((e) => e.key === key) || null;
}

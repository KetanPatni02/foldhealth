// "Send To" for the patient send drawers (Compose Email, New SMS, Send
// Assessment, Send Content): who the message goes to, their contact, the
// optional protected link, and the checks that gate Send.

export const RECIPIENT_TYPES = ['Patient', 'Care Giver', 'Emergency Contact', 'Decision Maker', 'Alternate Decision Maker'];

// Each verification method and the detail the recipient must have on record.
export const VERIFICATION_METHODS = [
  { value: 'name', label: 'Name', detail: 'name', field: 'name' },
  { value: 'dob', label: 'Date of Birth', detail: 'date of birth', field: 'dob' },
  { value: 'otp_email', label: 'OTP via Email', detail: 'email address', field: 'email' },
  { value: 'otp_sms', label: 'OTP via SMS', detail: 'phone number', field: 'phone' },
];

export const INVALID_ATTEMPT_POLICIES = ['Maximum total attempts'];

export const DEFAULT_PROTECTION = {
  on: false,
  methods: ['name', 'dob'],
  required: 2,
  policy: INVALID_ATTEMPT_POLICIES[0],
  maxAttempts: 3,
};

// "Verify ID to access links in this mail" (Compose Email from Comms,
// Figma 2900:34239): off by default.
export const DEFAULT_ID_VERIFICATION = {
  on: false,
  methods: ['name', 'dob'],
  minimum: 2,
  action: INVALID_ATTEMPT_POLICIES[0],
  attemptsPerWindow: 5,
  windowMinutes: 3,
  lockMinutes: 15,
};

/**
 * Contact methods a drawer needs (Reference Table 3):
 * 'email' | 'phone' | 'both' (Email, SMS.) | 'either' (Email or SMS).
 */
const has = (v) => !!String(v || '').trim();

/**
 * The first failed check as a message (Reference Table 4), or null.
 * `contact` is the resolved recipient ({ name, email, phone, dob }), null when
 * none of that type is recorded.
 */
export function recipientError({ type, contact, need, protection }) {
  const patient = type === 'Patient';
  const who = patient ? 'This patient' : `The ${type} for this patient`;
  const a = (w) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
  if (!contact) return `No ${type} is recorded for this patient. Add ${a(type)} to send.`;
  const email = has(contact.email);
  const phone = has(contact.phone);
  const missing = need === 'email' ? (!email && 'email address')
    : need === 'phone' ? (!phone && 'phone number')
      : need === 'both' ? ((!email && 'email address') || (!phone && 'phone number'))
        : null;
  if (missing) return `${who} does not have ${a(missing)} on record. Add ${a(missing)} to send.`;
  if (need === 'either' && !email && !phone) return `${who} does not have an email address or phone number on record. Add one to send.`;
  if (protection?.on) {
    const gap = VERIFICATION_METHODS.find(m => protection.methods.includes(m.value) && !has(contact[m.field]));
    if (gap) return `${who} does not have ${a(gap.detail)} on record, which is required for the selected verification method. Add it or remove this verification method to send.`;
  }
  return null;
}

/**
 * Stand-in contacts until a patient's are recorded in `patient_contacts`: a
 * complete Care Giver, an Emergency Contact with a phone only, no Decision
 * Maker, and an Alternate Decision Maker without a date of birth, so every
 * check can be seen.
 */
export function sampleContactsFor(patientId) {
  return [
    { id: `${patientId}-cg`, patientId, type: 'Care Giver', name: 'Maria Lopez', email: 'maria.lopez@example.com', phone: '(415) 555-0142', dob: '1979-04-12' },
    { id: `${patientId}-ec`, patientId, type: 'Emergency Contact', name: 'Daniel Lopez', email: '', phone: '(415) 555-0199', dob: '1982-09-03' },
    { id: `${patientId}-adm`, patientId, type: 'Alternate Decision Maker', name: 'Rosa Alvarez', email: 'rosa.alvarez@example.com', phone: '(415) 555-0177', dob: '' },
  ];
}

/**
 * The resolved recipient for a Send To type: the patient themself, or the
 * patient's contact of that type (null when none is recorded).
 */
export function contactFor(type, patient, contacts = []) {
  if (type === 'Patient') return patient ? { name: patient.name, email: patient.email, phone: patient.phone, dob: patient.dob } : null;
  return contacts.find(c => c.type === type) || null;
}

/** "Male • 03/29/1992 (31Y)" from what's on record. */
export function personMeta({ gender, dob, age, email } = {}) {
  const d = dob ? new Date(`${String(dob).slice(0, 10)}T00:00:00`) : null;
  const valid = d && !Number.isNaN(d.getTime());
  const years = age ?? (valid ? Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000)) : null);
  const dobText = valid ? `${d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}${years != null ? ` (${years}Y)` : ''}` : '';
  const parts = [gender ? gender[0].toUpperCase() + gender.slice(1).toLowerCase() : '', dobText].filter(Boolean);
  return parts.length ? parts.join(' • ') : (email || '');
}

export const contactToRow = (c) => ({
  id: c.id,
  patient_id: c.patientId,
  type: c.type,
  name: c.name,
  email: c.email || null,
  phone: c.phone || null,
  dob: c.dob || null,
});

export const rowToContact = (r) => ({
  id: r.id,
  patientId: r.patient_id,
  type: r.type,
  name: r.name,
  email: r.email || '',
  phone: r.phone || '',
  dob: r.dob || '',
});

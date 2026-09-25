import { useState } from 'react';

export const REFERRAL_CHANNELS = [
  { key: 'efax', label: 'eFax', icon: 'solar:printer-linear' },
  { key: 'email', label: 'Email', icon: 'solar:letter-linear' },
  { key: 'sms', label: 'SMS', icon: 'solar:chat-square-linear' },
  { key: 'chat', label: 'Chat', icon: 'solar:chat-round-linear' },
];
export const REFERRAL_MAX_BYTES = 5 * 1024 * 1024;
// "Send From" option for an email address typed in by the user instead of
// one of the practice's sender lines.
export const CUSTOM_SENDER = '__custom__';
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || '').trim());

// Standard specialty list offered by the provider filter (always shown, so
// the filter is usable before every profile has a specialty set).
export const MEDICAL_SPECIALTIES = [
  'Behavioral Health', 'Cardiology', 'Dermatology', 'Endocrinology', 'Family Medicine',
  'Gastroenterology', 'General Practice', 'Geriatrics', 'Internal Medicine', 'Nephrology',
  'Neurology', 'OB/GYN', 'Oncology', 'Ophthalmology', 'Orthopedics', 'Pediatrics',
  'Podiatry', 'Psychiatry', 'Pulmonology', 'Radiology', 'Rheumatology', 'Urology',
];

// The provider's address for a channel, or '' when they can't receive it.
export function providerContact(provider, channel) {
  if (!provider) return '';
  if (channel === 'efax') return provider.fax || '';
  if (channel === 'email') return provider.email || '';
  if (channel === 'sms') return provider.phone || '';
  if (channel === 'chat') return provider.chatEnabled ? 'Fold chat' : '';
  return '';
}

// `files` = new uploads; `docs` = the patient's existing documents picked
// via "Select from Documents".
const EMPTY = { channel: 'efax', senderId: '', customSender: '', providerId: '', files: [], docs: [], reason: '', note: '', noteOpen: false };

/**
 * State for the Care Gap "Send Referral" pane. `reset(senderDefaults)`
 * takes { efax, email, sms } default sender line ids.
 */
export function useCareGapReferralForm() {
  const [values, setValues] = useState(EMPTY);
  const [defaults, setDefaults] = useState({});
  const set = (key) => (value) => setValues(v => ({ ...v, [key]: value }));

  const reset = (senderDefaults = {}) => {
    setDefaults(senderDefaults);
    setValues({ ...EMPTY, senderId: senderDefaults.efax || '' });
  };
  // Switching channel swaps in that channel's default sender line.
  const setChannel = (channel) => setValues(v => ({ ...v, channel, senderId: defaults[channel] || '', customSender: '' }));
  const addFiles = (files) => setValues(v => ({
    ...v,
    files: [...v.files, ...(files || []).filter(f => f.size <= REFERRAL_MAX_BYTES && !v.files.some(x => x.name === f.name && x.size === f.size))],
  }));
  const removeFile = (index) => setValues(v => ({ ...v, files: v.files.filter((_, i) => i !== index) }));
  const addDocs = (docs) => setValues(v => ({
    ...v,
    docs: [...v.docs, ...(docs || []).filter(d => !v.docs.some(x => x.id === d.id))],
  }));
  const removeDoc = (id) => setValues(v => ({ ...v, docs: v.docs.filter(d => d.id !== id) }));

  return { values, set, setChannel, addFiles, removeFile, addDocs, removeDoc, reset };
}

// Members of a shared phone number (FCS-5677): every patient whose phone is
// the same number, matched on the last ten digits. An SMS is logged for one
// of them; a message that names no one belongs to its conversation's patient.

import { initialsOf } from './commsUtils';

export const phoneKey = (raw) => String(raw || '').replace(/\D/g, '').slice(-10);

const toMember = (p, ownerId) => ({
  id: String(p.id),
  name: p.name,
  initials: p.initials || initialsOf(p.name),
  gender: p.gender,
  dob: p.dob,
  age: p.age,
  isOwner: String(p.id) === ownerId,
});

// Demo families on the test patients' real numbers, shown until the database
// has the same patients (same ids; annette_shared_number_migration.sql,
// alok_test_patient_migration.sql), so the shared-number flow can be seen.
const DEMO_FAMILIES = {
  11089: [
    { id: 'sms-family-11089-liam', name: 'Liam Johnson', gender: 'Male', dob: '1992-03-29' },
    { id: 'sms-family-11089-ava', name: 'Ava Carter', gender: 'Female', dob: '1995-08-14' },
  ],
  11052: [
    { id: 'sms-family-11052-priya', name: 'Priya Kumar', gender: 'Female', age: 27 },
    { id: 'sms-family-11052-rohan', name: 'Rohan Kumar', gender: 'Male', age: 6 },
  ],
};

/**
 * Everyone on the conversation's number, its patient first. A number with
 * one member (or none on record) is not shared.
 */
export function membersForConversation(conversation, patients = []) {
  const ownerId = conversation?.patient_id != null ? String(conversation.patient_id) : null;
  const key = phoneKey(conversation?.patient_phone);
  const onNumber = key.length === 10 ? patients.filter(p => phoneKey(p.phone) === key) : [];
  const owner = onNumber.find(p => String(p.id) === ownerId)
    || patients.find(p => String(p.id) === ownerId)
    || (conversation ? { id: ownerId, name: conversation.patient_name } : null);
  let others = onNumber.filter(p => String(p.id) !== ownerId);
  if (!others.length && DEMO_FAMILIES[ownerId]) others = DEMO_FAMILIES[ownerId];
  return [owner, ...others].filter(p => p?.id != null).map(p => toMember(p, ownerId));
}

/** Who a message is logged for: its own pick, else the conversation's patient. */
export function loggedFor(message, conversation) {
  if (message?.logged_for_patient_id) {
    return { id: String(message.logged_for_patient_id), name: message.logged_for_name || conversation?.patient_name || '' };
  }
  return { id: conversation?.patient_id != null ? String(conversation.patient_id) : null, name: conversation?.patient_name || '' };
}

const GENDER = { m: 'Male', f: 'Female' };
const genderOf = (g) => GENDER[String(g || '').trim()[0]?.toLowerCase()] || (g ? String(g) : '');

function dobParts(dob) {
  const d = dob ? new Date(/^\d{4}-\d{2}-\d{2}/.test(String(dob)) ? `${String(dob).slice(0, 10)}T00:00:00` : dob) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const date = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  return { date, years: Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000)) };
}

const ageOf = (m) => {
  const dob = dobParts(m.dob);
  if (dob) return `${dob.years}Y`;
  return m.age != null && m.age !== '' ? `${m.age}Y` : '';
};

/** "Male • 03/29/1992 (31Y)" */
export function memberMeta(m) {
  const dob = dobParts(m.dob);
  const age = ageOf(m);
  const when = dob ? `${dob.date}${age ? ` (${age})` : ''}` : age;
  return [genderOf(m.gender), when].filter(Boolean).join(' • ');
}

/** "John Doe (M • 31Y)" */
export function memberLabel(m) {
  const short = [genderOf(m.gender)[0], ageOf(m)].filter(Boolean).join(' • ');
  return short ? `${m.name} (${short})` : m.name;
}

export const sharedBy = (members) => `This number is shared by ${members.length} members.`;
export const logForHelper = (members) => `${sharedBy(members)} Select one to log this SMS for`;

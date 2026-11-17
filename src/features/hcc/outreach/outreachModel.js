// Patient-level outreach (HCC): the rules the form and history share.
// Outreach is saved once on the patient (Member ID) and shows on every DOS,
// HCC, ICD and document for that patient.

export const RECIPIENTS = [
  { key: 'pcp', label: 'PCP / PCP Office' },
  { key: 'member', label: 'Member' },
];
export const recipientLabel = (key) => RECIPIENTS.find(r => r.key === key)?.label || key;

export const MODES = ['Call', 'Email', 'In Person'];
export const MODE_ICON = {
  Call: 'solar:phone-calling-linear',
  Email: 'solar:letter-linear',
  'In Person': 'solar:user-linear',
  // The other outreach types PCP Outreach can log.
  General: 'solar:document-text-linear',
  Virtual: 'solar:videocamera-linear',
  Chat: 'solar:chat-round-linear',
  SMS: 'solar:chat-line-linear',
  Letter: 'solar:letter-opened-linear',
};

export const CATEGORIES = ['Successful', 'Unsuccessful', 'Note'];

// Launch outcome list (story Outcome List), the same rows the migration
// seeds into outreach_outcomes. Note takes no outcome.
export const LAUNCH_OUTCOMES = [
  { id: 'oo-spoke-provider', category: 'Successful', label: 'Spoke with Provider', recipients: ['pcp'], active: true },
  { id: 'oo-f2f-provider', category: 'Successful', label: 'Face-to-Face Visit with Provider', recipients: ['pcp'], active: true },
  { id: 'oo-provider-declined', category: 'Successful', label: 'Provider Declined', recipients: ['pcp'], active: true },
  { id: 'oo-spoke-patient', category: 'Successful', label: 'Spoke with Patient', recipients: ['member'], active: true },
  { id: 'oo-no-answer', category: 'Unsuccessful', label: 'No Answer / Left Voicemail', recipients: ['pcp', 'member'], active: true },
  { id: 'oo-utr', category: 'Unsuccessful', label: 'Unable to Reach (UTR)', recipients: ['pcp', 'member'], active: true },
  { id: 'oo-wrong-number', category: 'Unsuccessful', label: 'Wrong Number', recipients: ['pcp', 'member'], active: true },
];

/** Care programs an entry can be tagged with, from where it was logged. */
export const PROGRAMS = ['RA', 'AWV', 'HEDIS'];

/**
 * A program's configured outcomes; the launch list when the program has none
 * of its own yet.
 */
export function outcomesForProgram(list, program = 'RA') {
  const own = (list || []).filter(o => (o.program || 'RA') === program);
  return own.length ? own : LAUNCH_OUTCOMES;
}

/**
 * Selectable outcome labels for a category and recipient: active ones only
 * (a deactivated outcome still reads on the entries that used it). Note has none.
 */
export function outcomesFor(category, recipient, list = LAUNCH_OUTCOMES) {
  if (!category || category === 'Note') return [];
  return list.filter(o => o.active !== false && o.category === category && o.recipients.includes(recipient)).map(o => o.label);
}

/** Only contact attempts count toward the sequence and Last Outreach. */
export const isCounted = (entry) => entry.category === 'Successful' || entry.category === 'Unsuccessful';

// "MM/DD/YYYY, HH:mm" (DateTimePicker) → Date, or null.
export function parseFormDatetime(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})/.exec(value || '');
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), Number(m[4]), Number(m[5]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatFormDatetime(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * The first missing or invalid field, as the message Save shows, or null when
 * the form can be saved.
 */
export function validateOutreach(form, now = new Date()) {
  if (!form.receivedBy) return 'Select who received the outreach (Received By).';
  if (!form.mode) return 'Select the mode (Call, Email or In Person).';
  const at = parseFormDatetime(form.datetime);
  if (!at) return 'Enter the date and time.';
  if (at.getTime() > now.getTime()) return 'Date and time can’t be in the future.';
  if (!form.category) return 'Select a category (Successful, Unsuccessful or Note).';
  if (form.category !== 'Note' && !form.outcome) return 'Select an outcome.';
  if (form.mode === 'Email') {
    if (!form.emailTo?.trim()) return 'Enter the email To address.';
    if (!form.emailSubject?.trim()) return 'Enter the email subject.';
  }
  const hasText = form.notes?.trim()
    || (form.mode === 'Call' && form.transcript?.trim())
    || (form.mode === 'Email' && form.emailBody?.trim());
  if (!hasText) return form.mode === 'Call' ? 'Add notes or a call transcript.' : form.mode === 'Email' ? 'Add the email body or notes.' : 'Add notes.';
  return null;
}

const ORDINAL = (n) => {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${suffix}`;
};

/**
 * Entry id → "4th Outreach", counting Successful and Unsuccessful only,
 * oldest first, within each care program (an RA call doesn't move the AWV count).
 */
export function sequenceLabels(entries) {
  const counted = [...entries].filter(isCounted).sort((a, b) => String(a.loggedAt).localeCompare(String(b.loggedAt)));
  const out = {};
  const n = {};
  for (const e of counted) {
    const p = e.program || 'RA';
    n[p] = (n[p] || 0) + 1;
    out[e.id] = `${ORDINAL(n[p])} Outreach`;
  }
  return out;
}

/**
 * Last Outreach Date / Outcome for a patient: the latest Successful or
 * Unsuccessful entry (Notes don't count), or null.
 */
export function lastOutreachOf(entries) {
  let last = null;
  for (const e of entries || []) {
    if (!isCounted(e)) continue;
    if (!last || String(e.loggedAt) > String(last.loggedAt)) last = e;
  }
  return last ? { loggedAt: last.loggedAt, category: last.category, outcome: last.outcome } : null;
}

/** The measure year an entry falls in (calendar year). */
export const measureYearOf = (entry) => Number(String(entry.loggedAt).slice(0, 4)) || null;

/** Entries grouped by month ("Nov 2026"), newest first. */
export function groupByMonth(entries) {
  const sorted = [...entries].sort((a, b) => String(b.loggedAt).localeCompare(String(a.loggedAt)));
  const groups = [];
  for (const e of sorted) {
    const d = new Date(e.loggedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.find(x => x.key === key);
    if (!g) {
      g = { key, label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), entries: [] };
      groups.push(g);
    }
    g.entries.push(e);
  }
  return groups;
}

const minutesSeconds = (sec) => {
  if (sec == null) return null;
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Structured summary rows (AC-7), filled from what the entry has. Rows with
 * no value are left out.
 */
export function structuredSummary(entry) {
  const at = new Date(entry.loggedAt);
  const when = Number.isNaN(at.getTime())
    ? null
    : `${at.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  // A Note is an internal update, not a contact: no call rows.
  const isCall = entry.mode === 'Call' && entry.category !== 'Note';
  const numbers = isCall && (entry.callVia || entry.calledTo)
    ? `${entry.callVia || '-'} → ${entry.calledTo || '-'}`
    : null;
  return [
    { label: 'Called By', value: entry.loggedByRole ? `${entry.loggedBy} (${entry.loggedByRole})` : entry.loggedBy },
    { label: 'Received By', value: entry.receivedBy ? `${entry.receivedBy} · ${recipientLabel(entry.recipientType)}` : recipientLabel(entry.recipientType) },
    { label: 'Mode', value: entry.mode },
    { label: 'Direction', value: isCall && entry.direction ? (entry.direction === 'incoming' ? 'Incoming' : 'Outgoing') : null },
    { label: entry.mode === 'Email' ? 'Email' : 'Numbers', value: entry.mode === 'Email' ? entry.emailTo : numbers },
    { label: 'Date & Time', value: when },
    { label: 'Duration', value: isCall ? minutesSeconds(entry.durationSec) : null },
    { label: 'Category', value: entry.category },
    { label: 'Outcome', value: entry.category === 'Note' ? null : entry.outcome },
    // Moved from HCC-level outreach: the HCCs it was logged against.
    { label: 'HCC (reference)', value: entry.hccRefs?.length ? entry.hccRefs.map(h => /^HCC\s*\d+/i.exec(h)?.[0] || h).join(', ') : null },
  ].filter(r => r.value);
}

export const VIEW_ONLY_ROLES = ['Physician'];
export const canLogOutreach = (role) => !VIEW_ONLY_ROLES.includes(role);

import { INTERVENTION_ADDRESSES, INTERVENTION_TEMPLATE, ROLE_LABEL } from './adherencePicklists';
import { addDaysMdy, daysFromToday, todayMdy } from './pharmacyWorklist.utils';

// The barrier loop (Suresh, Session 7): a barrier is logged, the template
// offers its interventions, each picked one becomes a task for the care-team
// role that owns it, and a task left past its due date goes to the team lead.

// Barriers a save adds to a gap: in `after`, not in `before` (gap-wide or on
// any of its drugs). `before` / `after`: { MAD: record, ... }.
const barriersOf = (rec) => [...new Set([...(rec?.barriers || []), ...(rec?.medications || []).flatMap(d => d.barriers)])];
export function addedBarriers(before, after) {
  return Object.entries(after).flatMap(([code, rec]) => {
    const had = new Set(barriersOf(before[code]));
    return barriersOf(rec).filter(b => !had.has(b)).map(barrier => ({ code, barrier }));
  });
}

// Who owns a role on this member: the care-team column, else the assignee.
export function ownerFor(member, role) {
  const name = member?.[role] || member?.assigneeName || null;
  return { name, role, roleLabel: ROLE_LABEL[role] || role, fromAssignee: !member?.[role] };
}

// The template's interventions for each added barrier, with the owner and
// due date filled in, skipping any the gap already has.
// `added`: [{ code, barrier }]; `current`: { MAD: [interventions already on it] }.
export function interventionPlan(member, added, current = {}, today = todayMdy()) {
  return added.flatMap(({ code, barrier }) => (INTERVENTION_TEMPLATE[barrier] || [])
    .filter(t => !(current[code] || []).includes(t.intervention))
    .map(t => ({
      key: `${code}|${barrier}|${t.intervention}`,
      code, barrier,
      intervention: t.intervention,
      days: t.days,
      due: addDaysMdy(today, t.days),
      owner: ownerFor(member, t.role),
    })));
}

// Every intervention task logged on the member, newest first, one per gap
// and intervention (the latest wins). Saved on interventionLog entries as
// `tasks: [{ code, barrier, intervention, due, owner, role, taskId }]`.
export function interventionTasks(member) {
  const seen = new Set();
  const out = [];
  for (const e of member?.interventionLog || []) {
    for (const t of e.tasks || []) {
      const k = `${t.code}|${t.intervention}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}
export const taskFor = (tasks, code, intervention) => tasks.find(t => t.code === code && t.intervention === intervention) || null;

// A task past its due date goes to the team lead (Suresh). `days`: how late.
export function escalation(task) {
  const d = daysFromToday(task?.due);
  return d != null && d < 0 ? { days: -d, to: 'Team lead' } : null;
}

// Where a barrier stands: an intervention that addresses it is under way, or
// it is only identified so far. Resolved barriers leave the active list.
export function barrierStatus(barrier, interventions) {
  return interventions.some(i => (INTERVENTION_ADDRESSES[i] || []).includes(barrier)) ? 'Intervention in progress' : 'Identified';
}

// Side effects or an allergy put the gap in front of the pharmacist
// (Session 7's "Pharmacist review" sub-status, pending the status model).
export const PHARMACIST_REVIEW_BARRIERS = ['Side Effects'];
export const needsPharmacistReview = (barriers) => barriers.some(b => PHARMACIST_REVIEW_BARRIERS.includes(b));

// The letter to the prescriber about a side effect, for the pharmacist to
// review before it is faxed. Plain text, one paragraph per line.
export function physicianLetter({ member, code, drug, prescriber, barrier, note, from }) {
  const today = todayMdy();
  return [
    today,
    '',
    `${prescriber?.name || 'Prescriber'}${prescriber?.fax ? ` (fax ${prescriber.fax})` : ''}`,
    '',
    `Re: ${member.name}, DOB ${member.dob || '-'}, Member ID ${member.memberId || member.id}`,
    '',
    `Our care team spoke with your patient about ${drug || 'their medication'} (${code}). They reported ${String(barrier).toLowerCase()}${note ? `: ${note}` : ''}.`,
    'Please review whether a dose change or an alternative in the same class would suit them, and send any new prescription to their pharmacy.',
    '',
    'Thank you,',
    from || 'Pharmacy care team',
  ].join('\n');
}

// @mentioning the pharmacist in a comment hands the member to them (Suresh):
// the member's Pharmacist, or anyone whose role is Pharmacist. Returns the
// person to assign, or null when no mention qualifies or they already own it.
// `mentions`: [{ id, name, initials, role }].
export function handoverFromMentions(member, mentions) {
  const hit = (mentions || []).find(u => u?.name && (u.name === member?.pharmacist || /pharmacist|pharmd/i.test(u.role || '')));
  return hit && hit.name !== member?.assigneeName ? hit : null;
}

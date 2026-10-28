import { cycleStart, daysFromToday, isActiveGap, parseMdy, prescribersOf } from './pharmacyWorklist.utils';

// Outreach, escalation and assignment rules from the status model spec
// (onboarding call; Sessions 1, 4 and 5; prototype review). Pure functions of
// an enriched member (enrichPharmacyMember) so the worklist, the drawer and
// the store read them the same way. Thresholds marked "to confirm" are open
// questions for Monique and Astrana.

// Queue timing: a member enters outreach when a fill or fail date is within
// 14 days (onboarding call). The PDC spec says 7 days to supply end; to confirm.
export const QUEUE_WINDOW_DAYS = 14;

// Pickup reminders (Session 4): text every two to three days once a fill is
// ready; call as the shelf time nears day 14, when the pharmacy returns it.
export const PICKUP_TEXT_EVERY_DAYS = 3;
export const PICKUP_CALL_FROM_DAY = 10;
export const RETURN_TO_STOCK_DAY = 14;

// Escalation (Session 4): after two failed attempts a borderline PDC goes to
// the prescriber; a comfortable PDC waits for a third. "Borderline" is below
// 85% here (the examples were 72% and 89.5%); to confirm.
export const BORDERLINE_PDC = 85;
const PRESCRIBER_CONTACTS = /prescriber|provider|physician|\bmd\b|doctor/i;
// Calls that were not an attempt to reach the member.
const NOT_MEMBER_CONTACTS = /pharmac/i;

export function inOutreachQueue(gap) {
  if (!isActiveGap(gap.status)) return false;
  const near = (mdy) => { const d = daysFromToday(mdy); return d != null && d <= QUEUE_WINDOW_DAYS; };
  return near(gap.nextFillDue) || near(gap.failDate);
}

// Where a fill on the pharmacy shelf stands, or null when none is waiting.
export function pickupReminder(gap) {
  if (!gap.pendingPickupSince || !isActiveGap(gap.status)) return null;
  const days = Math.max(0, -daysFromToday(gap.pendingPickupSince));
  if (days >= PICKUP_CALL_FROM_DAY) {
    return { action: 'call', days, label: 'Call the member', detail: `On the shelf ${days} days: the pharmacy returns it to stock around day ${RETURN_TO_STOCK_DAY}` };
  }
  return { action: 'text', days, label: 'Text a pickup reminder', detail: `On the shelf ${days} day${days === 1 ? '' : 's'}: remind the member every ${PICKUP_TEXT_EVERY_DAYS} days` };
}

// Failed attempts to reach the member on this gap since the last success this
// fill cycle, newest first. A prescriber call since then means the gap was
// already escalated.
function failedAttempts(gap, member) {
  const from = cycleStart(gap);
  let count = 0;
  for (const c of member.callHistory || []) {
    if (!(c.measures || []).includes(gap.code) || (parseMdy(c.date) || 0) < from) continue;
    if (PRESCRIBER_CONTACTS.test(c.contact || '')) return { count, escalated: true };
    if (c.kind === 'pharmacy-verification' || c.result === 'note' || NOT_MEMBER_CONTACTS.test(c.contact || '')) continue;
    if (c.result === 'success') break;
    count += 1;
  }
  return { count, escalated: false };
}

// Whether the gap goes to the prescriber of its drug now (not the PCP).
export function escalation(gap, member) {
  if (!isActiveGap(gap.status)) return null;
  const { count, escalated } = failedAttempts(gap, member);
  if (escalated) return null;
  const borderline = gap.pdc != null && gap.pdc < BORDERLINE_PDC;
  const needed = borderline ? 2 : 3;
  if (count < needed) return null;
  const prescriber = prescribersOf({ measures: [gap] })[0] || null;
  return {
    prescriber,
    attempts: count,
    reason: `${count} failed attempts to reach the member and PDC ${gap.pdc ?? 'unknown'}%${borderline ? ' (borderline)' : ''}`,
  };
}

// ── Auto-assignment ──
// Patient-level, by IPA ownership first, then health plan, from the PHARM
// care teams (Settings > Care Teams). Each rule's % is that coordinator's
// share: a member goes to whoever is furthest below their share, counting
// the members they already own. Members whose every gap is Not savable, or
// who have no gap left to work, are never assigned.
export const PHARM_TEAM_TYPE = 'PHARM';

// Health plans and IPAs in the pharmacy gap files, for routing rules in the
// Care Teams drawer, until the plan files feed a shared plan / IPA list.
export const PHARMACY_ROUTING_VALUES = {
  'Health Plan': ['Aetna Medicare Advantage', 'Blue Shield Medicare', 'Humana Gold Plus', 'SCAN Classic'],
  IPA: ['Astrana IPA', 'Prospect Medical Group'],
};

export const isAssignable = (m) => m.gaps.some(g => g.savability === 'Savable' && isActiveGap(g.status));

function routingRules(teams) {
  const rules = [];
  for (const t of teams || []) {
    if (t.kind !== 'care-program' || t.teamType !== PHARM_TEAM_TYPE) continue;
    for (const tm of t.members || []) {
      for (const r of tm.assignTo || []) {
        if ((r.dim === 'IPA' || r.dim === 'Health Plan') && r.value && Number(r.pct) > 0) {
          rules.push({ dim: r.dim, value: r.value, pct: Number(r.pct), coordinator: tm });
        }
      }
    }
  }
  return rules;
}

// The coordinator as a platform user (matched by id, then by name). Without
// a match the name is kept and the id left empty: a team's own ids are not
// profile ids.
function asUser(tm, users) {
  const u = (users || []).find(x => x.id === tm.userId) || (users || []).find(x => x.name === tm.name);
  return { id: u?.id || null, name: u?.name || tm.name, initials: u?.initials || tm.initials };
}

// [{ memberId, user, rule }] for every unassigned, assignable member a rule
// covers. Pure: the store applies it.
export function planAutoAssignment(members, teams, users) {
  const rules = routingRules(teams);
  if (!rules.length) return [];
  const load = new Map();
  for (const m of members) if (m.assigneeName) load.set(m.assigneeName, (load.get(m.assigneeName) || 0) + 1);
  const plan = [];
  for (const m of members) {
    if (m.assigneeName || !isAssignable(m)) continue;
    const byIpa = rules.filter(r => r.dim === 'IPA' && r.value === m.ipa);
    const pool = byIpa.length ? byIpa : rules.filter(r => r.dim === 'Health Plan' && r.value === m.healthPlan);
    if (!pool.length) continue;
    const pick = pool.toSorted((a, b) => (
      ((load.get(a.coordinator.name) || 0) + 1) / a.pct - ((load.get(b.coordinator.name) || 0) + 1) / b.pct
      || a.coordinator.name.localeCompare(b.coordinator.name)
    ))[0];
    load.set(pick.coordinator.name, (load.get(pick.coordinator.name) || 0) + 1);
    plan.push({ memberId: m.id, user: asUser(pick.coordinator, users), rule: `${pick.dim}: ${pick.value}` });
  }
  return plan;
}

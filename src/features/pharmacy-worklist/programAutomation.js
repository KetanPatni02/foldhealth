import { addDaysMdy, isActiveGap, parseMdy, todayMdy } from './pharmacyWorklist.utils';

// Phase 5 (Ajay, Nov 12): what the program does on its own around a fill,
// generic for any PDC program. Each rule reads the program settings, saved
// per organization (org_settings.pharmacy_program_config).

export const DEFAULT_PROGRAM_CONFIG = {
  // Refill reminder to the member, this many days before the next fill is due.
  reminderDays: 10,
  // A savable gap this close to failing alerts whoever last worked it...
  alertDays: 10,
  // ...and this close, goes to the manager too.
  escalateDays: 5,
  // Only P1 members raise alerts.
  highPriorityOnly: true,
  // A fill due this many days before an organization holiday is pushed earlier.
  holidayWindowDays: 7,
  // Flu season: off by default, since it covers half the year.
  fluSeasonOn: false,
  fluSeason: { start: '10/01', end: '03/31' },
  managerName: null,
};
export const programConfig = (saved) => ({ ...DEFAULT_PROGRAM_CONFIG, ...(saved || {}), fluSeason: { ...DEFAULT_PROGRAM_CONFIG.fluSeason, ...(saved?.fluSeason || {}) } });

// Refill reminder on an open gap with a next fill due: sent on the day
// `reminderDays` before it, or scheduled for that day.
export function refillReminder(gap, cfg = DEFAULT_PROGRAM_CONFIG, today = todayMdy()) {
  if (!gap?.nextFillDue || !isActiveGap(gap.status)) return null;
  const on = addDaysMdy(gap.nextFillDue, -cfg.reminderDays);
  const sent = parseMdy(on) <= parseMdy(today);
  return { on, sent, label: `${sent ? 'Sent' : 'Scheduled'} ${on} (${cfg.reminderDays} days before ${gap.nextFillDue})` };
}

// The IVR pickup check result saved on a gap (`ivrCheck: { date, result }`).
// Only "Not picked up" makes a task (Ajay): the rest needs no one.
export const IVR_RESULTS = ['Picked up', 'Not picked up', 'No answer'];
export const ivrCreatesTask = (result) => result === 'Not picked up';
export function ivrLine(check) {
  if (!check?.result) return null;
  return `${check.date}: ${check.result}${ivrCreatesTask(check.result) ? ' · follow-up task created' : ''}`;
}

// A fill due just before an organization holiday (or in flu season, when
// on) should be pushed earlier. Returns the reason, or null.
// `holidays`: the org's holiday configurations ([{ name, startAt }], Settings
// > Calendar), or [{ name, date: 'YYYY-MM-DD' }].
// Only a fill not yet due (from `today`) can still be pushed earlier.
export function earlyRefillWindow(nextFillDue, holidays = [], cfg = DEFAULT_PROGRAM_CONFIG, today = todayMdy()) {
  const due = parseMdy(nextFillDue);
  if (due == null || due < parseMdy(today)) return null;
  const DAY = 86400000;
  for (const h of holidays) {
    const day = h.date ? String(h.date) : h.startAt ? new Date(h.startAt).toLocaleDateString('en-CA') : '';
    const [y, mo, d] = day.split('-').map(Number);
    if (!y) continue;
    const at = Date.UTC(y, mo - 1, d);
    if (due <= at && at - due <= cfg.holidayWindowDays * DAY) {
      return { kind: 'holiday', label: `${h.name} on ${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}: refill before` };
    }
  }
  if (cfg.fluSeasonOn) {
    const md = nextFillDue.slice(0, 5);
    const { start, end } = cfg.fluSeason;
    const inSeason = start <= end ? md >= start && md <= end : md >= start || md <= end;
    if (inSeason) return { kind: 'flu', label: 'Flu season: refill early' };
  }
  return null;
}

// Longer fill (Ajay): a 30 or 60-day fill moves to 90, or 90 to 180. The
// request and its outcome are saved on the drug (`longerFill`).
export const LONGER_FILL_OUTCOMES = ['Approved', 'Declined'];
export const longerFillTarget = (daysSupply) => (daysSupply == null ? null : daysSupply < 90 ? 90 : daysSupply < 180 ? 180 : null);
export const longerFillLabel = (lf) => (lf ? `${lf.days}-day ${lf.status === 'Requested' ? 'requested' : lf.status.toLowerCase()}` : null);

// Deadline alerts (Ajay, Suresh): a savable open gap close to failing
// alerts the person who last worked the member, and closer still goes to the
// manager. Derived from the worklist; only each alert's outcome is saved
// (`alertOutcomes` on the member, keyed by alert).
export const ALERT_OUTCOMES = ['Pending', 'Accepted', 'Approved', 'Disapproved', 'Ignored'];
export const lastWorker = (m) => (m.callHistory || []).find(c => c.by)?.by || m.assigneeName || null;
export function deadlineAlerts(members, cfg = DEFAULT_PROGRAM_CONFIG) {
  const out = [];
  for (const m of members) {
    if (cfg.highPriorityOnly && m.priority !== 'P1') continue;
    for (const g of m.gaps || []) {
      if (!isActiveGap(g.status) || g.savability !== 'Savable' || g.allowableGapDays == null || g.allowableGapDays > cfg.alertDays) continue;
      const base = { memberId: m.id, member: m.name, code: g.code, daysLeft: g.allowableGapDays, failDate: g.failDate };
      const worker = lastWorker(m);
      const push = (kind, to, role) => {
        const key = `${g.code}|${kind}`;
        out.push({ ...base, key, kind, to, role, outcome: m.alertOutcomes?.[key]?.outcome || 'Pending', outcomeBy: m.alertOutcomes?.[key]?.by || null });
      };
      push('alert', worker, 'Last worked');
      if (g.allowableGapDays <= cfg.escalateDays) push('escalation', cfg.managerName || 'Manager', 'Manager');
    }
  }
  return out.toSorted((a, b) => a.daysLeft - b.daysLeft || a.member.localeCompare(b.member));
}
export const daysLeftText = (n) => (n <= 0 ? 'Fails today' : `${n} day${n === 1 ? '' : 's'} left`);

import { CIS_ANTIGEN_STATUS, CIS_DOSE_STATUS, CIS_EVALUATION } from './cisRules';

// Icon + label + colour per status, so status never relies on colour alone.
export const EVALUATION_BADGE = {
  [CIS_EVALUATION.compliant]: { tone: 'success', icon: 'solar:check-circle-linear' },
  [CIS_EVALUATION.onTrack]: { tone: 'primary', icon: 'solar:clock-circle-linear' },
  [CIS_EVALUATION.atRisk]: { tone: 'warning', icon: 'solar:danger-triangle-linear' },
  [CIS_EVALUATION.cannotMeet]: { tone: 'error', icon: 'solar:close-circle-linear' },
  [CIS_EVALUATION.notEligible]: { tone: 'grey', icon: 'solar:info-circle-linear' },
};
export const ANTIGEN_BADGE = {
  [CIS_ANTIGEN_STATUS.seriesComplete]: { tone: 'success', icon: 'solar:check-circle-linear' },
  [CIS_ANTIGEN_STATUS.immune]: { tone: 'success', icon: 'solar:shield-check-linear' },
  [CIS_ANTIGEN_STATUS.contraindicated]: { tone: 'info', icon: 'solar:forbidden-circle-linear' },
  [CIS_ANTIGEN_STATUS.agedOut]: { tone: 'grey', icon: 'solar:hourglass-line-linear' },
  [CIS_ANTIGEN_STATUS.overdue]: { tone: 'error', icon: 'solar:danger-triangle-linear' },
  [CIS_ANTIGEN_STATUS.dueNow]: { tone: 'warning', icon: 'solar:clock-circle-linear' },
  [CIS_ANTIGEN_STATUS.upcoming]: { tone: 'grey', icon: 'solar:calendar-minimalistic-linear' },
  [CIS_ANTIGEN_STATUS.onTrack]: { tone: 'white', icon: 'solar:clock-circle-linear' },
};
export const DOSE_BADGE = {
  [CIS_DOSE_STATUS.completed]: { tone: 'success', icon: 'solar:check-circle-linear' },
  [CIS_DOSE_STATUS.completedLate]: { tone: 'success', icon: 'solar:history-linear' },
  [CIS_DOSE_STATUS.dueNow]: { tone: 'warning', icon: 'solar:clock-circle-linear' },
  [CIS_DOSE_STATUS.overdue]: { tone: 'error', icon: 'solar:danger-triangle-linear' },
  [CIS_DOSE_STATUS.upcoming]: { tone: 'grey', icon: 'solar:calendar-minimalistic-linear' },
  [CIS_DOSE_STATUS.onTrack]: { tone: 'white', icon: 'solar:clock-circle-linear' },
  // Status info blue so it never reads as grey Upcoming.
  [CIS_DOSE_STATUS.contraindicated]: { tone: 'info', icon: 'solar:forbidden-circle-linear' },
  [CIS_DOSE_STATUS.agedOut]: { tone: 'grey', icon: 'solar:hourglass-line-linear' },
  // Counts, but nothing to give: greyed out per the spec.
  [CIS_DOSE_STATUS.immune]: { tone: 'grey', icon: 'solar:shield-check-linear' },
  [CIS_DOSE_STATUS.pending]: { tone: 'warning', icon: 'solar:pen-new-square-linear' },
};

export const fmtDate = (d) => (d ? d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '-');

// Closed doses (Immune, Contraindicated, Aged out) never open.
const CLOSED_DOSE = [CIS_DOSE_STATUS.immune, CIS_DOSE_STATUS.contraindicated, CIS_DOSE_STATUS.agedOut];

/** A planned dose can't be dated before its earliest allowed date. */
export const isLocked = (r) => r.kind === 'planned' && !CLOSED_DOSE.includes(r.status) && !!r.earliest && r.earliest > new Date();

/** The series started with the earliest recorded dose. */
export const seriesStartDate = (result) => result.antigens
  .flatMap(a => a.rows.filter(r => r.record).map(r => r.record.date))
  .reduce((min, dt) => (!min || dt < min ? dt : min), null);

/** Given and counted, on time or late. */
export const isGiven = (status) => status === CIS_DOSE_STATUS.completed || status === CIS_DOSE_STATUS.completedLate;

/** At least one dose is on record (given, counted or not). */
export const hasGivenDose = (result) => result.antigens.some(a => a.rows.some(r => r.kind === 'given'));

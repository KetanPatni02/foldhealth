import { parseLocalDate } from '../../../../../../lib/localDate';
import { programForLastKey } from '../../care-programs/CareProgramsTab/CareProgramsTab.utils';
import { isProgramClosed } from '../../../../data/programStatus';

/**
 * The program whose start the Overview measures from: the one the user last
 * worked in (More > program context), else the patient's earliest-started
 * open program.
 */
export function programContext(programs, lastKey) {
  const fromLast = programForLastKey(programs, lastKey);
  if (fromLast && parseLocalDate(fromLast.startDate)) return fromLast;
  return (programs || [])
    .filter(p => !isProgramClosed(p.status) && parseLocalDate(p.startDate))
    .sort((a, b) => parseLocalDate(a.startDate) - parseLocalDate(b.startDate))[0] || null;
}

/** Medications started or stopped on or after `since`, newest change first. */
export function medChangesSince(meds, since) {
  const from = parseLocalDate(since);
  if (!from) return [];
  const changes = [];
  (meds || []).forEach((m) => {
    const started = parseLocalDate(m.start);
    const stopped = parseLocalDate(m.stop);
    if (started && started >= from) changes.push({ med: m, kind: 'Added', date: started });
    if (stopped && stopped >= from) changes.push({ med: m, kind: 'Stopped', date: stopped, reason: m.stopReason });
  });
  return changes.sort((a, b) => b.date - a.date);
}

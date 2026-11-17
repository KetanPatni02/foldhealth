import { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';

const CATEGORY_COLOR = { Successful: 'var(--status-success)', Unsuccessful: 'var(--status-error)' };

/**
 * HCC worklist cell: the patient's Last Outreach Date or Outcome (Successful
 * and Unsuccessful only), the same on every DOS row for the patient.
 *
 * @param {object} props.member
 * @param {'date'|'outcome'} props.kind
 * @param {string} props.className – the column's width class
 */
export function LastOutreachCell({ member, kind, className, textClassName, mutedClassName }) {
  const enabled = useAppStore(s => s.hccOutreachEnabled);
  const fetchLast = useAppStore(s => s.fetchPatientOutreachLast);
  const last = useAppStore(s => s.patientOutreachLast.byKey[member.memberId] || s.patientOutreachLast.byName[member.name]);
  useEffect(() => { if (enabled) fetchLast(); }, [enabled, fetchLast]);

  const col = kind === 'date' ? 'lastOutreachDate' : 'lastOutreachOutcome';
  let content = <span className={mutedClassName}>-</span>;
  if (last && kind === 'date') {
    const d = new Date(last.loggedAt);
    if (!Number.isNaN(d.getTime())) {
      content = <span className={textClassName}>{d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>;
    }
  } else if (last && kind === 'outcome') {
    content = <span className={textClassName} style={{ color: CATEGORY_COLOR[last.category] }}>{last.outcome || last.category}</span>;
  }
  return <td data-col={col} className={className}>{content}</td>;
}

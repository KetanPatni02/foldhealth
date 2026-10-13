import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { OutreachTab } from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';
import { MEASURE_ORDER } from '../pharmacyWorklist.utils';
import { schemaOutcomeItems } from '../interventionSchema';
import { fillEventFor } from '../fillEvents';
import { mapOutcomesToIntervention } from '../outcomeMapping';
import { DEFAULT_CALL_TYPES } from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab.utils';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';

// Measure pills (MAD / MAH / MAC) pick outcomes from the Medication Adherence
// Intervention Schema; any other program pill keeps the standard list.
const measureOutcomeItems = (status, progs) => (
  progs.length && progs.every(p => MEASURE_ORDER.includes(p)) ? schemaOutcomeItems(status) : null
);

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The member's saved outreach (call history) in the Outreach Activity feed's
// shape, month-grouped, so the feed shows what was actually logged for this
// member — and still shows it after leaving and reopening the step.
function toLogGroups(callHistory) {
  const groups = [];
  (callHistory || []).forEach((c, i) => {
    const [mm, dd, yyyy] = c.date.split('/');
    const key = `${mm}-${yyyy}`;
    let g = groups.find(x => x.id === key);
    if (!g) { g = { id: key, label: `${MONTH[Number(mm) - 1]} ${yyyy}`, logs: [] }; groups.push(g); }
    const verification = c.kind === 'pharmacy-verification';
    g.logs.push({
      id: `ph-${i}-${c.date}`,
      type: c.type || 'Call',
      date: `${mm}/${dd}`,
      time: c.time || '',
      author: c.by,
      title: verification ? `Pharmacy verification · ${c.contact} (locked)` : (c.title ? `${c.title} · ${c.contact}` : `Outgoing Call · ${c.contact}`),
      programs: c.measures || [],
      outcome: c.outcome,
      outcomeColor: c.result === 'failed' ? 'var(--status-error)' : 'var(--status-success)',
      note: c.note,
    });
  });
  return groups;
}

// Adherence calls also go to the pharmacy and the prescriber.
const CALL_TYPES = [...DEFAULT_CALL_TYPES, 'Pharmacy', 'Prescriber'];

// Outreach step of the Pharmacy program: exactly the outreach form every
// program uses (same program pills), with the member's open measures
// (MAD / MAH / MAC) added and pre-selected in place of PHARM, so outcomes are
// logged per measure while the other care programs stay selectable.
export function PharmacyOutreachStep({ program }) {
  const member = usePharmacyProgramMember();
  const logPharmacyOutreach = useAppStore(s => s.logPharmacyOutreach);
  const logPharmacyInterventions = useAppStore(s => s.logPharmacyInterventions);

  // OutreachTab reads this once per mount (it keeps its own feed after that,
  // and a save appends to both it and the store).
  const logGroups = toLogGroups(member?.callHistory);

  const measures = useMemo(() => {
    const open = new Set((member?.measures || []).map(x => x.code));
    return open.size ? MEASURE_ORDER.filter(c => open.has(c)) : MEASURE_ORDER;
  }, [member]);

  // One outreach → one call-history row covering every measure it touched,
  // so the worklist Outreach cell counts it once. Pickup outcomes update the
  // measure and its medications' fill dates (see fillEvents.js).
  const handleSaved = (saved, { isEdit }) => {
    const entries = saved.filter(e => MEASURE_ORDER.includes(e.programs[0]));
    if (isEdit || !member || !entries.length) return;
    const first = entries[0];
    const outcomesOf = (e) => (e.outcomes?.length ? e.outcomes : [e.outcome]);
    // Same outcomes on every measure (a common note) read once; differing
    // per-measure outcomes keep their measure prefix.
    const distinct = new Set(entries.map(e => outcomesOf(e).join(', ')));
    const outcomes = distinct.size === 1 ? [...distinct] : entries.map(e => `${e.programs[0]}: ${outcomesOf(e).join(', ')}`);
    const codesWith = (event) => entries
      .filter(e => outcomesOf(e).some(o => fillEventFor(o) === event))
      .map(e => e.programs[0]);
    const firstOutcome = outcomesOf(first)[0] || '';
    logPharmacyOutreach(member.id, {
      date: `${first.date}/${new Date().getFullYear()}`,
      time: first.time,
      type: first.type,
      title: first.title,
      // Schema outcomes are "Stakeholder · Outcome"; the stakeholder is who was contacted.
      contact: firstOutcome.includes(' · ') ? firstOutcome.split(' · ')[0] : first.title,
      outcome: outcomes.join('; '),
      result: (first.outcomeColor || '').includes('error') ? 'failed' : 'success',
      by: first.author,
      note: [...new Set(entries.map(e => e.note).filter(Boolean))].join(' / '),
      measures: entries.map(e => e.programs[0]),
    }, { pickupCodes: codesWith('pickup'), pendingCodes: codesWith('pending-pickup') });

    // Barriers / interventions / results picked as outcomes also go to the
    // Barrier & Intervention log, per measure.
    const byMeasure = {};
    for (const e of entries) {
      const rec = mapOutcomesToIntervention(outcomesOf(e));
      if (rec) byMeasure[e.programs[0]] = rec;
    }
    if (Object.keys(byMeasure).length) {
      logPharmacyInterventions(member.id, {
        date: `${first.date}/${new Date().getFullYear()}`,
        by: first.author,
        note: [...new Set(entries.map(e => e.note).filter(Boolean))].join(' / '),
        source: 'Outreach',
        measures: byMeasure,
      });
    }
  };

  return (
    <OutreachTab
      key={`${member?.id || 'none'}-${measures.join()}`}
      initialLogGroups={logGroups}
      defaultPrograms={measures}
      scopedProgram={program.code}
      activityProgramCode={program.code}
      defaultLogFor="care-program"
      defaultFormOpen
      outcomeItems={measureOutcomeItems}
      callTypeOptions={CALL_TYPES}
      onSaved={handleSaved}
    />
  );
}

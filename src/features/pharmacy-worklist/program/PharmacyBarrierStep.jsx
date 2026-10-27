import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { DashboardCard } from '../../../components/DashboardCard/DashboardCard';
import { Icon } from '../../../components/Icon/Icon';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Select } from '../../../components/Select/Select';
import { BARRIERS, INTERVENTIONS, MEASURE_RESULTS } from '../adherencePicklists';
import { MEASURE_NAMES, MEASURE_ORDER, medLabel, todayMdy } from '../pharmacyWorklist.utils';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import { MeasureCode } from '../PharmacyCells';
import styles from './PharmacyBarrierStep.module.css';

// Newest log entry that recorded this measure.
function latestFor(log, code) {
  const e = (log || []).find(x => x.measures?.[code]);
  return e ? { date: e.date, source: e.source, rec: e.measures[code] } : null;
}

const NONE = { barriers: [], interventions: [], result: null };
const sameSet = (a, b) => a.length === b.length && a.every(v => b.includes(v));
const isChanged = (r, base) => !sameSet(r.barriers, base.barriers)
  || !sameSet(r.interventions, base.interventions) || (r.result || null) !== (base.result || null);

// Barrier & Intervention step of the Pharmacy program. Each measure's fields
// start filled with its current barriers / interventions / result (latest
// log entry — from this step or from Outreach); changing them and saving logs
// a new entry for just the measures that changed. Measures are recorded
// separately — a cost barrier on MAD (brand copay) doesn't imply one on MAC —
// and barrier, intervention and result stay apart for reporting.
export function PharmacyBarrierStep({ member: memberProp }) {
  const fromProfile = usePharmacyProgramMember();
  const member = memberProp || fromProfile;
  const logInterventions = useAppStore(s => s.logPharmacyInterventions);
  const currentUser = useAppStore(s => s.currentUserProfile);
  const showToast = useAppStore(s => s.showToast);

  const measures = useMemo(() => (member?.measures || [])
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code)), [member]);
  const [draft, setDraft] = useState({});
  const [note, setNote] = useState('');
  const current = (code) => latestFor(member?.interventionLog, code)?.rec || NONE;
  const rec = (code) => draft[code] || current(code);
  const patch = (code, p) => setDraft(d => ({ ...d, [code]: { ...rec(code), ...p } }));

  if (!member) {
    return (
      <div className={styles.empty}>
        <Icon name="solar:pills-linear" size={40} color="var(--neutral-200)" />
        <p>No MAD, MAH or MAC measures on file for this member.</p>
      </div>
    );
  }

  const changed = measures.filter(x => isChanged(rec(x.code), current(x.code)));

  // Only the barriers this member has (logged on any gap, on the worklist, or
  // as a medication's non-adherence reason) are offered; the rest of the
  // master list is one pick away.
  const memberBarriers = new Set([
    ...(member.interventionLog || []).flatMap(e => Object.values(e.measures).flatMap(r => r.barriers)),
    ...(member.barrier ? [member.barrier] : []),
    ...measures.flatMap(x => x.medications.map(d => d.nonAdherenceReason).filter(Boolean)),
  ]);
  // The member's own barriers lead the list; the rest of the master list follows.
  const barrierOptions = [...BARRIERS.filter(b => memberBarriers.has(b)), ...BARRIERS.filter(b => !memberBarriers.has(b))]
    .map(b => ({ value: b, label: b }));
  const interventionOptions = INTERVENTIONS.map(v => ({ value: v, label: v }));
  const resultOptions = MEASURE_RESULTS.map(v => ({ value: v, label: v }));

  const handleSave = () => {
    const recorded = {};
    for (const x of changed) {
      const { barriers, interventions, result } = rec(x.code);
      recorded[x.code] = { barriers, interventions, result };
    }
    logInterventions(member.id, { date: todayMdy(), by: currentUser?.name || 'You', note, measures: recorded });
    setDraft({});
    setNote('');
    showToast?.(`Updated ${Object.keys(recorded).join(', ')}`);
  };

  return (
    <div className={styles.wrap}>
      <span className={styles.muted}>Each measure shows its current barriers, interventions and result. Change them and save; only the measures you change are logged.</span>

      {measures.map(x => {
        const r = rec(x.code);
        const latest = latestFor(member.interventionLog, x.code);
        const dirty = isChanged(r, current(x.code));
        return (
          <DashboardCard
            key={x.code}
            className={dirty ? styles.dirty : undefined}
            // The code chip names the measure on hover; the header names the drugs.
            title={<span className={styles.measureTitle}><MeasureCode code={x.code} />{x.medications.map(medLabel).join(', ') || MEASURE_NAMES[x.code]}</span>}
            actions={(
              <span className={dirty ? styles.asOfDirty : styles.asOf}>
                {dirty
                  ? 'Unsaved changes'
                  : latest
                    ? `As of ${latest.date}${latest.source ? ` · ${latest.source}` : ''}`
                    : 'Nothing logged yet'}
              </span>
            )}
          >
            <div className={styles.fields}>
              <Select
                label="Barriers"
                multiple
                badges
                searchable
                portal
                options={barrierOptions}
                value={r.barriers}
                placeholder="Add barriers"
                onChange={v => patch(x.code, { barriers: v })}
              />
              <Select
                label="Interventions"
                multiple
                badges
                searchable
                portal
                options={interventionOptions}
                value={r.interventions}
                placeholder="Add interventions"
                onChange={v => patch(x.code, { interventions: v })}
              />
              <Select
                label="Result"
                portal
                options={resultOptions}
                value={r.result || ''}
                placeholder="Select result"
                onChange={v => patch(x.code, { result: v || null })}
              />
              {!dirty && latest?.source === 'Outreach' && latest.rec.barriers.length > 0 && (
                <span className={styles.flagged}>
                  <Icon name="solar:flag-linear" size={13} color="currentColor" />
                  Flagged from outreach on {latest.date}: {latest.rec.barriers.join(', ')}
                </span>
              )}
            </div>
          </DashboardCard>
        );
      })}

      <DashboardCard title="Note">
        <div className={styles.noteBody}>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="One note for the whole call" aria-label="Call note" />
          <div className={styles.foot}>
            {changed.length > 0 && <Button variant="ghost" size="L" onClick={() => setDraft({})}>Discard</Button>}
            <Button variant="primary" size="L" disabled={!changed.length} onClick={handleSave}>
              {changed.length ? `Save (${changed.map(x => x.code).join(', ')})` : 'Save'}
            </Button>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="History" count={(member.interventionLog || []).length || undefined}>
        {(member.interventionLog || []).length === 0 && <div className={styles.logEntry}><span className={styles.muted}>No barriers or interventions logged yet.</span></div>}
        {(member.interventionLog || []).map((e, i) => (
          <div key={`${e.date}-${i}`} className={styles.logEntry}>
            <div className={styles.logHead}>
              <span className={styles.logDate}>{e.date}</span>
              <span className={styles.muted}>by {e.by}</span>
              {e.source && <Badge size="S" tone="grey" icon={e.medication ? 'solar:pill-linear' : 'solar:phone-linear'} label={`From ${e.source.toLowerCase()}${e.medication ? ` · ${e.medication}` : ''}`} />}
            </div>
            {Object.entries(e.measures).map(([code, rr]) => (
              <div key={code} className={styles.logRow}>
                <MeasureCode code={code} />
                <div className={styles.logChips}>
                  {rr.barriers.map(b => <Badge key={b} size="S" tone="grey" label={b} />)}
                  {rr.interventions.map(v => <Badge key={v} size="S" tone="grey" label={v} />)}
                  {rr.result && <Badge size="S" tone="grey" icon="solar:check-circle-linear" label={rr.result} />}
                </div>
              </div>
            ))}
            {e.note ? <div className={styles.logNote}>{e.note}</div> : null}
          </div>
        ))}
      </DashboardCard>
    </div>
  );
}

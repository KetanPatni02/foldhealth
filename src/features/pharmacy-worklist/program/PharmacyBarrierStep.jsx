import { useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { ChipSelect } from '../../../components/ChipSelect/ChipSelect';
import { Icon } from '../../../components/Icon/Icon';
import { Textarea } from '../../../components/Textarea/Textarea';
import { BARRIERS, INTERVENTIONS, MEASURE_RESULTS } from '../adherencePicklists';
import { MEASURE_NAMES, MEASURE_ORDER, medLabel, todayMdy } from '../pharmacyWorklist.utils';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
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

// Barrier & Intervention step of the Pharmacy program. Each measure's chips
// start marked with its current barriers / interventions / result (latest
// log entry — from this step or from Outreach); changing them and saving logs
// a new entry for just the measures that changed. Measures are recorded
// separately — a cost barrier on MAD (brand copay) doesn't imply one on MAC —
// and barrier, intervention and result stay apart for reporting.
export function PharmacyBarrierStep() {
  const member = usePharmacyProgramMember();
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
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.cardTitle}>Barriers &amp; interventions</div>
          <span className={styles.muted}>Marked items are each measure’s current state. Change them and save — only the measures you change are logged.</span>
        </div>

        {measures.map(x => {
          const r = rec(x.code);
          const latest = latestFor(member.interventionLog, x.code);
          const dirty = isChanged(r, current(x.code));
          return (
            <section key={x.code} className={`${styles.measure} ${dirty ? styles.measureDirty : ''}`}>
              <div className={styles.measureHead}>
                <Badge size="S" tone="primary" label={x.code} />
                <span className={styles.measureName}>{MEASURE_NAMES[x.code]}</span>
                <span className={styles.muted}>{x.medications.map(medLabel).join(', ')}</span>
              </div>
              <span className={styles.asOf}>
                {dirty
                  ? 'Unsaved changes'
                  : latest
                    ? `Current as of ${latest.date}${latest.source ? ` · from ${latest.source.toLowerCase()}` : ''}`
                    : 'Nothing logged yet'}
              </span>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Barriers</span>
                  <ChipSelect ariaLabel={`${x.code} barriers`} tone="error" options={BARRIERS} value={r.barriers} onChange={v => patch(x.code, { barriers: v })} />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Interventions</span>
                  <ChipSelect ariaLabel={`${x.code} interventions`} options={INTERVENTIONS} value={r.interventions} onChange={v => patch(x.code, { interventions: v })} />
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Result</span>
                  <ChipSelect ariaLabel={`${x.code} result`} single tone="success" options={MEASURE_RESULTS} value={r.result} onChange={v => patch(x.code, { result: v })} />
                </div>
              </div>
            </section>
          );
        })}

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Note</span>
          <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="One note for the whole call" aria-label="Call note" />
        </div>
        <div className={styles.foot}>
          {changed.length > 0 && <Button variant="ghost" size="L" onClick={() => setDraft({})}>Discard</Button>}
          <Button variant="primary" size="L" disabled={!changed.length} onClick={handleSave}>
            {changed.length ? `Save (${changed.map(x => x.code).join(', ')})` : 'Save'}
          </Button>
        </div>
      </div>

      <div className={styles.sectionTitle}>History</div>
      {(member.interventionLog || []).length === 0 && <div className={styles.muted}>No barriers or interventions logged yet.</div>}
      {(member.interventionLog || []).map((e, i) => (
        <div key={`${e.date}-${i}`} className={styles.logEntry}>
          <div className={styles.logHead}>
            <span className={styles.logDate}>{e.date}</span>
            <span className={styles.muted}>by {e.by}</span>
            {e.source && <Badge size="S" tone="grey" icon="solar:phone-linear" label={`From ${e.source.toLowerCase()}`} />}
          </div>
          {Object.entries(e.measures).map(([code, r]) => (
            <div key={code} className={styles.logRow}>
              <Badge size="S" tone="primary" label={code} />
              <div className={styles.logChips}>
                {r.barriers.map(b => <Badge key={b} size="S" tone="error" label={b} />)}
                {r.interventions.map(v => <Badge key={v} size="S" tone="info" label={v} />)}
                {r.result && <Badge size="S" tone="success" icon="solar:check-circle-linear" label={r.result} />}
              </div>
            </div>
          ))}
          {e.note ? <div className={styles.logNote}>{e.note}</div> : null}
        </div>
      ))}
    </div>
  );
}

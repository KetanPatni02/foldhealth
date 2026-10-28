import { useMemo, useState } from 'react';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { ActivityLog, MetaLine } from '../../../components/ActivityLog/ActivityLog';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { DashboardCard } from '../../../components/DashboardCard/DashboardCard';
import { EmptyState } from '../../../components/EmptyState/EmptyState';
import { SubTabs } from '../../../components/SubTabs/SubTabs';
import { toActivityLogEntries } from '../../hedis-worklist/CareGapDetailDrawer.utils';
import { useAppStore } from '../../../store/useAppStore';
import { toast } from '../../../components/Toast/sonnerToast';
import { MEASURE_NAMES, MEASURE_ORDER, medLabel } from '../pharmacyWorklist.utils';
import { Sep } from '../PharmacyCells';
import { BARRIER_ICON, INTERVENTION_ADDRESSES, INTERVENTION_ICON } from '../adherencePicklists';
import { LOG_TYPE_ICON } from '../../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab.utils';
import styles from './PharmacyBarrierLog.module.css';

// An active barrier with its Resolve button beside it.
const BarrierChips = ({ items, onResolve, context }) => (items.length ? (
  <span className={styles.chips}>
    {items.map(v => (
      <span key={v} className={styles.resolvable}>
        <Badge size="S" tone="error" label={v} />
        <ActionButton size="S" icon="solar:check-circle-linear" tooltip={`Mark ${v} resolved`} aria-label={`Mark ${v} resolved for ${context}`} onClick={() => onResolve(v)} />
        {/* Holds the place of an intervention's ✕ so every ✓ lines up. */}
        <span className={styles.actionSlot} aria-hidden="true" />
      </span>
    ))}
  </span>
) : <span className={styles.none}>None</span>);

// An active intervention with Done and Didn't work beside it.
const InterventionChips = ({ items, context, onFinish }) => (
  <span className={styles.chips}>
    {items.map(v => (
      <span key={v} className={styles.resolvable}>
        <Badge size="S" tone="grey" label={v} />
        <ActionButton size="S" icon="solar:check-circle-linear" tooltip={`Mark ${v} done`} aria-label={`Mark ${v} done for ${context}`} onClick={() => onFinish(v, 'Done')} />
        <ActionButton size="S" icon="solar:close-circle-linear" tooltip={`${v} didn't work`} aria-label={`Mark ${v} didn't work for ${context}`} onClick={() => onFinish(v, "Didn't work")} />
      </span>
    ))}
  </span>
);

// One drug: its name, then its Barriers and Interventions on labelled lines
// (a line with nothing on it is left out).
const DrugBlock = ({ name, barriers, interventions, onResolve, onFinish }) => (
  <div className={styles.drugBlock}>
    <span className={styles.drugName}>{name}</span>
    <div className={styles.current}>
      {barriers.length > 0 && <><span className={styles.label}>Barriers</span><BarrierChips items={barriers} context={name} onResolve={onResolve} /></>}
      {interventions.length > 0 && <><span className={styles.label}>Interventions</span><InterventionChips items={interventions} context={name} onFinish={onFinish} /></>}
      {!barriers.length && !interventions.length && <span className={styles.none}>None</span>}
    </div>
  </div>
);

// The rail icon for a History entry: what happened to an item (resolved or
// done, didn't work), else where it came from (the outreach's own type, a
// medication edit), else what was logged (a barrier, or only interventions).
function railFor(e) {
  if (e.completed?.some(c => c.outcome !== 'Done')) return { icon: 'solar:close-circle-linear', avatarVariant: 'error' };
  if (e.completed || e.resolved) return { icon: 'solar:check-circle-linear', avatarVariant: 'success' };
  if (e.source === 'Outreach') {
    return { icon: LOG_TYPE_ICON[e.outreachType]?.icon || (e.outreachType === 'SMS' ? 'solar:chat-square-linear' : 'solar:phone-calling-linear'), avatarVariant: 'others' };
  }
  if (e.source === 'Medication review') return { icon: 'solar:pill-linear', avatarVariant: 'others' };
  const recs = Object.values(e.measures || {});
  return recs.some(r => r.barriers?.length)
    ? { icon: BARRIER_ICON, avatarVariant: 'error' }
    : { icon: INTERVENTION_ICON, avatarVariant: 'others' };
}

// Results aren't shown here; a gap whose record only set one is left out.
const hasBarrierData = (r) => r && (r.barriers.length > 0 || r.interventions.length > 0 || !r.result);

// One logged entry in the shared activity timeline: who, when and from where,
// then one line per gap it touched, or per drug when set per medication (the
// gap, the drug or drugs, the barriers and interventions recorded), then its
// note.
function EntryBody({ entry }) {
  return (
    <>
      <MetaLine entry={entry} />
      <span className={styles.entryGaps}>
        {entry.gaps.map(g => (
          <span key={g.key} className={styles.entryGap}>
            <span className={styles.entryContext}>
              <span className={styles.entryCode}>{g.code}</span>
              {g.drugs && <><span aria-hidden="true">·</span>{g.drugs}</>}
            </span>
            {g.completed ? (
              g.completed.outcome === 'Done'
                ? <Badge size="S" tone="success" icon="solar:check-circle-linear" label={`Done: ${g.completed.intervention}`} />
                : <Badge size="S" tone="error" icon="solar:close-circle-linear" label={`Didn't work: ${g.completed.intervention}`} />
            ) : g.resolved ? (
              <Badge size="S" tone="success" icon="solar:check-circle-linear" label={`Resolved: ${g.resolved}`} />
            ) : (
              <span className={styles.chips}>
                {g.rec.barriers.map(v => <Badge key={`b-${v}`} size="S" tone="error" label={v} />)}
                {g.rec.interventions.map(v => <Badge key={`i-${v}`} size="S" tone="grey" label={v} />)}
                {!g.rec.barriers.length && !g.rec.interventions.length && <span className={styles.none}>Cleared</span>}
              </span>
            )}
          </span>
        ))}
      </span>
      {entry.note && <span className={styles.note}>{entry.note}</span>}
    </>
  );
}

// Read-only Barriers & Interventions for the gap drawer. Active Barriers: per
// gap, what stands now (its newest entry) and which drugs carry a barrier.
// History: every entry across the gaps in one timeline. Here a barrier is
// resolved and an intervention marked Done or Didn't work; anything else
// changes through Update Barriers (`onEdit`) or an outreach. A gap with nothing logged at gap level shows only its drugs.
export function PharmacyBarrierLog({ member, onEdit }) {
  const [view, setView] = useState('active');
  const resolveBarrier = useAppStore(s => s.resolvePharmacyBarrier);
  const completeIntervention = useAppStore(s => s.completePharmacyIntervention);
  const resolve = (code, barrier, med) => {
    resolveBarrier(member.id, { code, barrier, medId: med?.id || null });
    toast.success(`Resolved ${barrier} on ${code}${med ? ` · ${med.name}` : ''}`);
  };
  // Done on an intervention that addresses a barrier still standing in the
  // same place asks whether to resolve that barrier too.
  const [prompt, setPrompt] = useState(null);
  const finish = ({ code, intervention, outcome, med, resolveToo = [] }) => {
    completeIntervention(member.id, { code, intervention, outcome, medId: med?.id || null, resolve: resolveToo });
    const where = `${code}${med ? ` · ${med.name}` : ''}`;
    if (outcome === 'Done') toast.success(`${intervention} done on ${where}${resolveToo.length ? `; resolved ${resolveToo.join(', ')}` : ''}`);
    else toast(`${intervention} marked didn't work on ${where}`);
  };
  const onFinish = (code, med, standing) => (intervention, outcome) => {
    const addressed = outcome === 'Done' ? (INTERVENTION_ADDRESSES[intervention] || []).filter(b => standing.includes(b)) : [];
    if (addressed.length) setPrompt({ code, intervention, med, addressed });
    else finish({ code, intervention, outcome, med });
  };

  const measures = useMemo(() => (member?.measures || [])
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code)), [member]);

  const active = useMemo(() => measures.map(x => {
    const latest = (member.interventionLog || []).find(e => hasBarrierData(e.measures?.[x.code]));
    const current = latest?.measures[x.code];
    // Logged for the whole gap, a barrier is every drug's reason too; only a
    // drug whose reason differs gets its own block.
    const gapLevel = current && !current.medications && (current.barriers.length > 0 || current.interventions.length > 0);
    const drugBarriers = x.medications.filter(d => d.status !== 'Discontinued' && d.nonAdherenceReason
      && !(gapLevel && current.barriers.includes(d.nonAdherenceReason)));
    return { x, latest, current, gapLevel, drugBarriers };
  }).filter(g => g.current?.barriers.length || g.current?.interventions.length || g.drugBarriers.length), [measures, member]);

  const history = useMemo(() => {
    const byCode = Object.fromEntries(measures.map(x => [x.code, x]));
    const raw = (member.interventionLog || []).map(e => ({
      t: 'note', when: e.date, actor: e.by, note: e.note, context: e.source || null, ...railFor(e),
      // The drug an entry names, else every drug on the gap it was logged for.
      // A resolution shows what was resolved, not the record left behind.
      gaps: (e.completed || e.resolved) ? [
        ...(e.completed || []).map(r => ({ ...r, key: `c-${r.code}-${r.medication || ''}-${r.intervention}`, completed: r })),
        ...(e.resolved || []).map(r => ({ ...r, key: `r-${r.code}-${r.medication || ''}-${r.barrier}`, resolved: r.barrier })),
      ].filter(r => byCode[r.code]).map(r => ({ ...r, drugs: r.medication || byCode[r.code].medications.map(medLabel).join(', ') }))
        : Object.entries(e.measures || {})
        .filter(([code, r]) => byCode[code] && hasBarrierData(r))
        .toSorted(([a], [b]) => MEASURE_ORDER.indexOf(a) - MEASURE_ORDER.indexOf(b))
        .flatMap(([code, r]) => (r.medications
          ? r.medications.map(d => ({ key: `${code}-${d.id}`, code, rec: d, drugs: d.name }))
          : [{ key: code, code, rec: r, drugs: e.medication || byCode[code].medications.map(medLabel).join(', ') }])),
    })).filter(e => e.gaps.length);
    return toActivityLogEntries(raw)
      .map(e => (e.t === 'group' ? e : { ...e, time: '', render: (entry) => <EntryBody entry={entry} /> }));
  }, [measures, member]);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <SubTabs
          tabs={[{ key: 'active', label: 'Active Barriers' }, { key: 'history', label: 'History' }]}
          activeKey={view}
          onChange={setView}
          size="S"
        />
        {onEdit && view === 'active' && <Button variant="ghost" size="S" leadingIcon="solar:pen-linear" onClick={onEdit}>Edit</Button>}
      </div>

      {view === 'active' && (active.length === 0 ? (
        <EmptyState
          icon="solar:clipboard-list-linear"
          title="No active barriers"
          description="Barriers and interventions show here once logged from an outreach or with Update Barriers."
        />
      ) : active.map(({ x, latest, current, gapLevel, drugBarriers }) => (
        <DashboardCard
          key={x.code}
          size="S"
          title={(
            <span className={styles.titleStack}>
              {`${x.code} (${MEASURE_NAMES[x.code] || x.code})`}
              {(gapLevel || latest) && (
                <span className={styles.titleSub}>
                  {gapLevel && 'Applies to all medications'}
                  {gapLevel && latest && <Sep />}
                  {latest && `Last logged ${latest.date}`}
                </span>
              )}
            </span>
          )}
        >
          {current?.medications ? (
            <div className={styles.drugs}>
              {current.medications.map(d => (
                <DrugBlock
                  key={d.id}
                  name={d.name}
                  barriers={d.barriers}
                  interventions={d.interventions}
                  onResolve={v => resolve(x.code, v, d)}
                  onFinish={onFinish(x.code, d, [...d.barriers, x.medications.find(m => m.id === d.id)?.nonAdherenceReason].filter(Boolean))}
                />
              ))}
            </div>
          ) : (current?.barriers.length > 0 || current?.interventions.length > 0) && (
            <div className={styles.current}>
              {current.barriers.length > 0 && <>
                <span className={styles.label}>Barriers</span>
                <BarrierChips items={current.barriers} context={x.code} onResolve={v => resolve(x.code, v)} />
              </>}
              {current.interventions.length > 0 && <>
                <span className={styles.label}>Interventions</span>
                <InterventionChips
                  items={current.interventions}
                  context={x.code}
                  onFinish={onFinish(x.code, null, [...current.barriers, ...drugBarriers.map(d => d.nonAdherenceReason)])}
                />
              </>}
            </div>
          )}
          {drugBarriers.length > 0 && !current?.medications && (
            <div className={`${styles.block} ${styles.drugs}`}>
              {drugBarriers.map(d => (
                <DrugBlock
                  key={d.id}
                  name={medLabel(d)}
                  barriers={[d.nonAdherenceReason]}
                  interventions={[]}
                  onResolve={v => resolve(x.code, v, { id: d.id, name: medLabel(d) })}
                />
              ))}
            </div>
          )}
        </DashboardCard>
      )))}

      {prompt && (
        <ConfirmDialog
          variant="primary"
          icon="solar:check-circle-linear"
          iconColor="var(--status-success)"
          title={`Also resolve ${prompt.addressed.join(', ')}?`}
          description={`${prompt.intervention} addresses ${prompt.addressed.join(', ')} on ${prompt.code}${prompt.med ? ` · ${prompt.med.name}` : ''}. Resolve it now, or keep it active if the member still faces it.`}
          confirmLabel="Resolve too"
          cancelLabel="Just mark done"
          onConfirm={() => { finish({ ...prompt, outcome: 'Done', resolveToo: prompt.addressed }); setPrompt(null); }}
          onCancel={() => { finish({ ...prompt, outcome: 'Done' }); setPrompt(null); }}
          onClose={() => setPrompt(null)}
        />
      )}

      {view === 'history' && <ActivityLog entries={history} flushTop emptyLabel="No barriers or interventions logged yet." />}
    </div>
  );
}

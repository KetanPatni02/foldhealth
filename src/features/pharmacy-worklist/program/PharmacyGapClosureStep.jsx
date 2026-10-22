import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { DatePicker } from '../../../components/DatePicker/DatePicker';
import { DashboardCard } from '../../../components/DashboardCard/DashboardCard';
import { Icon } from '../../../components/Icon/Icon';
import {
  GAP_STATUS_TONE, MEASURE_NAMES, MEASURE_ORDER, OPEN_GAPS, addDaysMdy, daysFromToday, fillDueTone, measureStatus, parseMdy, pdcTone,
} from '../pharmacyWorklist.utils';
import { MeasureCode, SubStatus } from '../PharmacyCells';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import styles from './PharmacyGapClosureStep.module.css';

const TONE_CLASS = { error: styles.toneError };

function Fact({ label, children, tone }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={`${styles.factValue} ${TONE_CLASS[tone] || ''}`}>{children ?? '—'}</span>
    </div>
  );
}

// MM/DD/YYYY (stored) ↔ YYYY-MM-DD (date input).
const toIso = (mdy) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mdy || '');
  return m ? `${m[3]}-${m[1]}-${m[2]}` : '';
};
const fromIso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
};

const latestDate = (dates) => dates.filter(Boolean).reduce((max, d) => (!max || parseMdy(d) > parseMdy(max) ? d : max), null);

// Recent Fill, per active drug: set by an outreach outcome (pickup confirmed /
// refill approval received) and editable here while closing the gap.
function RecentFill({ member, x }) {
  const setRecentFill = useAppStore(s => s.setPharmacyRecentFill);
  const active = x.medications.filter(d => d.status !== 'Discontinued');
  const hintOf = (d) => (!d.recentFill ? 'Set by a pickup or refill-approved outreach'
    : d.recentFillSource?.manual ? `Edited ${d.recentFillSource.date}`
    : d.recentFillSource?.outcome ? `From ${d.recentFillSource.outcome.split(' · ').pop()}`
    : null);
  return (
    <div className={`${styles.fact} ${styles.recentFills}`}>
      <span className={styles.factLabel}>Recent Fill Date</span>
      {active.map(d => (
        <div key={d.id} className={styles.recentFillRow}>
          {active.length > 1 && <span className={styles.factValue}>{d.name} {d.strength} {d.unit}</span>}
          <DatePicker
            value={toIso(d.recentFill)}
            onSelect={(iso) => setRecentFill(member.id, x.code, d.id, fromIso(iso) || null)}
            aria-label={`${d.name} recent fill date`}
          />
          {hintOf(d) && <span className={styles.factHint}>{hintOf(d)}</span>}
        </div>
      ))}
    </div>
  );
}

// Each pickup-confirmed verification is one closure cycle for the measure;
// it reopens when that fill's supply runs out (or earlier, on a reversal).
function closureCycles(member, x) {
  const supply = Math.max(0, ...x.medications.map(d => d.daysSupply || 0));
  const cycles = (member.callHistory || [])
    .filter(e => e.kind === 'pharmacy-verification' && (e.items || []).some(i => i.measure === x.code && i.pickedUp))
    .map(e => ({ closed: e.date, reopens: supply ? addDaysMdy(e.date, supply) : null, by: e.by }));
  // A pickup recorded before Fold verification (plan file / earlier call).
  if (x.pickupConfirmed && !cycles.some(c => c.closed === x.pickupConfirmed)) {
    cycles.push({ closed: x.pickupConfirmed, reopens: supply ? addDaysMdy(x.pickupConfirmed, supply) : null, by: null });
  }
  return cycles;
}

// Gap Closure / Outcome step of the Pharmacy program. Closure is per measure
// and repeats every fill, so the open/closed flag matters less than where the
// member sits in the current fill cycle: PDC, next fill and fail date.
export function PharmacyGapClosureStep() {
  const member = usePharmacyProgramMember();
  const measures = useMemo(() => (member?.measures || [])
    .toSorted((a, b) => MEASURE_ORDER.indexOf(a.code) - MEASURE_ORDER.indexOf(b.code)), [member]);

  if (!member) {
    return (
      <div className={styles.empty}>
        <Icon name="solar:pills-linear" size={40} color="var(--neutral-200)" />
        <p>No MAD, MAH or MAC measures on file for this member.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        <Icon name="solar:refresh-circle-linear" size={16} color="var(--status-info)" />
        <span>Closure repeats every fill: a confirmed pickup closes the measure, no reversal after 14 days makes it Safe, and it reopens when the next fill comes due or the claim reverses.</span>
      </div>

      {measures.map(x => {
        const st = measureStatus(x, member);
        const pickup = parseMdy(x.pickupConfirmed);
        // Fold closes on pickup; the plan only sees it once the claim lands,
        // and its report lags 1–4 weeks — flag the gap between the two.
        const planBehind = (st.label === 'Safe' || st.label === 'Picked up')
          && (x.claim?.status !== 'Paid' || parseMdy(x.claim.date) < pickup);
        const cycles = closureCycles(member, x);
        const failIn = daysFromToday(x.failDate);
        // Red only for an open gap's risk; a closed gap's numbers are history.
        const open = OPEN_GAPS.has(st.gap);
        const risk = (tone) => (open ? tone : null);
        return (
          <DashboardCard
            key={x.code}
            title={<span className={styles.measureTitle}><MeasureCode code={x.code} />{MEASURE_NAMES[x.code]}</span>}
            actions={<Badge size="S" tone={GAP_STATUS_TONE[st.gap]} label={st.gap} />}
          >
            <div className={styles.body}>
            <div className={styles.detail}><SubStatus label={st.label} /><span>{st.detail}</span></div>

            <div className={styles.facts}>
              <Fact label="PDC (Plan)" tone={risk(pdcTone(x.pdc))}>{x.pdc == null ? 'Not sent' : `${x.pdc}%`}</Fact>
              <Fact label="PDC (Claims)" tone={risk(pdcTone(x.calcPdc))}>{x.calcPdc == null ? null : `${x.calcPdc}%`}</Fact>
              {x.pdcProjected != null && <Fact label="PDC (Projected, with recent fill)" tone={risk(pdcTone(x.pdcProjected))}>{`${x.pdcProjected}%`}</Fact>}
              <Fact label="Next Fill Due" tone={risk(fillDueTone(x.nextFillDue))}>{x.nextFillDue}</Fact>
              <Fact label="Fail (Hopeless) Date" tone={risk(failIn != null && failIn <= 14 ? 'error' : null)}>
                {x.failDate ? `${x.failDate}${failIn != null ? ` · ${failIn}d` : ''}` : null}
              </Fact>
              <Fact label="Last Fill Date">{latestDate(x.medications.filter(d => d.status !== 'Discontinued').map(d => d.lastFill))}</Fact>
              <RecentFill member={member} x={x} />
              <Fact label="Allowable Days Left">{x.daysLeft}</Fact>
              <Fact label="Pickup Confirmed">{x.pickupConfirmed}</Fact>
              <Fact label="Reopens On">{st.reopensOn}</Fact>
              <Fact label="Latest Claim" tone={x.claim?.status === 'Reversed' ? 'error' : null}>
                {x.claim ? `${x.claim.status} ${x.claim.date}` : null}
              </Fact>
            </div>

            <div className={styles.signals}>
              <span className={styles.signalsLabel}>Plan Signals</span>
              {x.projectedStatus && <Badge size="S" tone="grey" label={x.projectedStatus} />}
              {x.oneFillToInvincible && <Badge size="S" tone="grey" label="1 fill left" />}
              {x.excluded && <Badge size="S" tone="grey" label="Excluded" />}
              {x.priorYearNonCompliant && <Badge size="S" tone="grey" label="Prior-year non-compliant" />}
              {!x.projectedStatus && !x.oneFillToInvincible && !x.excluded && !x.priorYearNonCompliant && <span className={styles.muted}>None reported</span>}
            </div>

            {planBehind && (
              <div className={styles.note}>
                <Icon name="solar:danger-triangle-linear" size={14} color="currentColor" />
                <span>Pickup verified in Fold, but the plan hasn’t received a paid claim for it yet. Its gap report may still show this measure open (it lags 1–4 weeks).</span>
              </div>
            )}

            <div className={styles.cycles}>
              <span className={styles.signalsLabel}>Closure History</span>
              {cycles.length === 0
                ? <span className={styles.muted}>No pickup-verified closures yet.</span>
                : cycles.map((c, i) => (
                  <div key={`${c.closed}-${i}`} className={styles.cycle}>
                    <Icon name="solar:check-circle-linear" size={14} color="var(--neutral-300)" />
                    <span>Closed {c.closed} (pickup confirmed{c.by ? ` by ${c.by}` : ''}){c.reopens ? ` · reopens ${c.reopens}` : ''}</span>
                  </div>
                ))}
            </div>
            </div>
          </DashboardCard>
        );
      })}
    </div>
  );
}

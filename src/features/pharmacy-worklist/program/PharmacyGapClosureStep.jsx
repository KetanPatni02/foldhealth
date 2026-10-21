import { useMemo } from 'react';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import {
  MEASURE_NAMES, MEASURE_ORDER, addDaysMdy, daysFromToday, fillDueTone, measureStatus, parseMdy, pdcTone,
} from '../pharmacyWorklist.utils';
import { GapStatus } from '../PharmacyCells';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import styles from './PharmacyGapClosureStep.module.css';

const TONE_CLASS = { error: styles.toneError, warning: styles.toneWarning, success: styles.toneSuccess };

function Fact({ label, children, tone }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={`${styles.factValue} ${TONE_CLASS[tone] || ''}`}>{children ?? '—'}</span>
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
        return (
          <section key={x.code} className={styles.card}>
            <div className={styles.cardHead}>
              <Badge size="S" tone="primary" label={x.code} />
              <span className={styles.measureName}>{MEASURE_NAMES[x.code]}</span>
              <GapStatus status={st} size="M" />
            </div>
            <div className={styles.detail}>{st.detail}</div>

            <div className={styles.facts}>
              <Fact label="PDC (plan)" tone={pdcTone(x.pdc)}>{x.pdc == null ? 'Not sent' : `${x.pdc}%`}</Fact>
              <Fact label="PDC (claims)" tone={pdcTone(x.calcPdc)}>{x.calcPdc == null ? null : `${x.calcPdc}%`}</Fact>
              <Fact label="Next fill due" tone={fillDueTone(x.nextFillDue)}>{x.nextFillDue}</Fact>
              <Fact label="Fail (hopeless) date" tone={failIn != null && failIn <= 14 ? 'error' : null}>
                {x.failDate ? `${x.failDate}${failIn != null ? ` · ${failIn}d` : ''}` : null}
              </Fact>
              <Fact label="Allowable days left">{x.daysLeft}</Fact>
              <Fact label="Pickup confirmed">{x.pickupConfirmed}</Fact>
              <Fact label="Reopens on">{st.reopensOn}</Fact>
              <Fact label="Latest claim" tone={x.claim?.status === 'Reversed' ? 'error' : null}>
                {x.claim ? `${x.claim.status} ${x.claim.date}` : null}
              </Fact>
            </div>

            <div className={styles.signals}>
              <span className={styles.signalsLabel}>Plan signals</span>
              {x.projectedStatus && <Badge size="S" tone={x.projectedStatus === 'Already adherent' ? 'success' : 'warning'} label={x.projectedStatus} />}
              {x.oneFillToInvincible && <Badge size="S" tone="success" label="1 fill left" />}
              {x.excluded && <Badge size="S" tone="grey" label="Excluded" />}
              {x.priorYearNonCompliant && <Badge size="S" tone="error" label="Prior-year non-compliant" />}
              {!x.projectedStatus && !x.oneFillToInvincible && !x.excluded && !x.priorYearNonCompliant && <span className={styles.muted}>None reported</span>}
            </div>

            {planBehind && (
              <div className={styles.note}>
                <Icon name="solar:danger-triangle-linear" size={14} color="currentColor" />
                <span>Pickup verified in Fold, but the plan hasn’t received a paid claim for it yet — its gap report may still show this measure open (lags 1–4 weeks).</span>
              </div>
            )}

            <div className={styles.cycles}>
              <span className={styles.signalsLabel}>Closure history</span>
              {cycles.length === 0
                ? <span className={styles.muted}>No pickup-verified closures yet.</span>
                : cycles.map((c, i) => (
                  <div key={`${c.closed}-${i}`} className={styles.cycle}>
                    <Icon name="solar:check-circle-linear" size={14} color="var(--status-success)" />
                    <span>Closed {c.closed} (pickup confirmed{c.by ? ` by ${c.by}` : ''}){c.reopens ? ` · reopens ${c.reopens}` : ''}</span>
                  </div>
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

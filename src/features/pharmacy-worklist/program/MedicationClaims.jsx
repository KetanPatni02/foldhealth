import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { InfoBar } from '../../../components/InfoBar/InfoBar';
import { PhoneLink } from '../../../components/PhoneLink/PhoneLink';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { annotateClaims, confirmedFills, matchFill, medLabel, parseMdy } from '../pharmacyWorklist.utils';
import { Sep } from '../PharmacyCells';
import styles from './MedicationClaims.module.css';


// Each claim status looks different, so a reversed, cancelled or rejected
// line never reads as a paid fill.
const CLAIM_BADGE = {
  Paid: { tone: 'success', icon: 'solar:check-circle-linear' },
  Pending: { tone: 'grey', icon: 'solar:clock-circle-linear' },
  Reversed: { tone: 'error', icon: 'solar:undo-left-linear' },
  Cancelled: { tone: 'warning', icon: 'solar:close-circle-linear' },
  Rejected: { tone: 'error', icon: 'solar:forbidden-circle-linear' },
  Deleted: { tone: 'grey', icon: 'solar:trash-bin-minimalistic-linear' },
};
// Where a fill confirmed in Fold stands against its claim.
const MATCH_BADGE = {
  verified: { tone: 'success', label: 'Claim matched' },
  pending: { tone: 'grey', label: 'Awaiting claim' },
  'no-claim': { tone: 'error', label: 'Claim not matched' },
  'other-coverage': { tone: 'error', label: 'Non–Part D claim' },
  voided: { tone: 'error', label: 'Fill reversed' },
};
// Claim fields still waiting on Astrana's feed definition.
const PENDING_FIELDS = 'Status values, transaction type, claim ID and sequence, fill and reversal dates, BIN / PCN / group, the negative-value rule and deleted-claim handling are pending confirmation from Astrana.';

const money = (n) => (n == null ? '—' : `${n < 0 ? '-' : ''}$${Math.abs(Number(n)).toFixed(2)}`);
const total = (c) => (c.planPaid == null && c.copay == null ? null : (c.planPaid || 0) + (c.copay || 0));
const byDate = (a, b) => (parseMdy(a.date) ?? 0) - (parseMdy(b.date) ?? 0);
// Within one claim group, the order things happened: when each transaction
// was processed (a rebill can carry the original fill date), then billed,
// reversed, rebilled.
const TXN_RANK = { Original: 0, Reversal: 1, Rebill: 2 };
const eventAt = (c) => parseMdy(c.reversalDate || c.processedDate || c.date) ?? 0;
const byEvent = (a, b) => eventAt(a) - eventAt(b) || TXN_RANK[a.txnType] - TXN_RANK[b.txnType] || a.claimSeq - b.claimSeq;

function ClaimStatusBadge({ claim }) {
  if (claim.effect === 'Not Part D') {
    return (
      <Tooltip label="Billed outside Part D: does not count in PDC" placement="bottom">
        <span><Badge size="S" tone="info" icon="solar:shield-linear" label={`Non–Part D · ${claim.coverage}`} /></span>
      </Tooltip>
    );
  }
  if (claim.effect === 'Superseded') return <Badge size="S" tone="grey" label="Replaced by a newer version" />;
  // A reversal line (a Reversal transaction, or negative values linked to a
  // fill) cancels its fill, whatever status the feed sent with it.
  if (claim.effect === 'Reversal') return <Badge size="S" tone={CLAIM_BADGE.Reversed.tone} icon={CLAIM_BADGE.Reversed.icon} label="Reversal" />;
  if (claim.effect === 'Invalid') {
    return (
      <Tooltip label="Days supply 0, or a negative value not linked to a fill: held for review and not counted in PDC" placement="bottom">
        <span><Badge size="S" tone="warning" icon="solar:eye-linear" label="Held for review" /></span>
      </Tooltip>
    );
  }
  const status = claim.effect === 'Reversed' && claim.claimStatus === 'Paid' ? 'Reversed' : (claim.claimStatus || 'Paid');
  const b = CLAIM_BADGE[status] || CLAIM_BADGE.Paid;
  return <Badge size="S" tone={b.tone} icon={b.icon} label={status} />;
}

function PendingConfirmation() {
  return (
    <Tooltip label={PENDING_FIELDS} placement="bottom" maxWidth={320}>
      <span><Badge size="S" tone="warning" icon="solar:info-circle-linear" label="Pending data confirmation" /></span>
    </Tooltip>
  );
}

// The story of one claim group, oldest step first: billed, reversed,
// rebilled, or billed to other insurance.
function claimStory(rows) {
  return rows.map(c => {
    if (c.txnType === 'Reversal') return `Reversed ${c.reversalDate || c.date}`;
    if (c.txnType === 'Rebill') return `Rebilled ${c.date} (seq ${c.claimSeq})`;
    if (c.effect === 'Not Part D') return `Billed to ${c.coverage} ${c.date}`;
    if (c.effect === 'Invalid') return `Held for review ${c.date}`;
    if (['Cancelled', 'Rejected', 'Deleted'].includes(c.claimStatus)) return `${c.claimStatus} ${c.date}`;
    return `Billed ${c.date}`;
  }).join(' → ');
}

function ClaimField({ label, children }) {
  return (
    <div className={styles.claimField}>
      <span className={styles.claimFieldLabel}>{label}</span>
      <span className={styles.claimFieldValue}>{children ?? '—'}</span>
    </div>
  );
}

function Section({ title, aside, children }) {
  return (
    <section className={styles.claimSection}>
      <div className={styles.claimSectionHead}>
        <span className={styles.claimSectionTitle}>{title}</span>
        {aside}
      </div>
      <div className={styles.claimInfoGrid}>{children}</div>
    </section>
  );
}

// Inline claim detail, as in the HCC Claims tab: back arrow and title, then
// the claim, its transaction, the drug dispensed, the pharmacy and the
// prescriber.
function ClaimDetail({ med, claim, onBack, onOpen, flush }) {
  const pharmacy = med.pharmacy?.name === claim.pharmacy ? med.pharmacy : { name: claim.pharmacy };
  const prescriber = med.prescriber;
  const original = claim.reversesClaimId || (claim.claimGroup !== claim.claimId ? claim.claimGroup : null);
  return (
    <div className={flush ? styles.claimDetailFlush : undefined}>
      <div className={styles.claimDetailHead}>
        <button type="button" className={styles.claimBackBtn} onClick={onBack} aria-label="Back to claims">
          <Icon name="solar:arrow-left-linear" size={18} color="var(--neutral-400)" />
        </button>
        <span className={styles.claimDetailTitle}>Claim Details for Fill: {claim.date}</span>
      </div>

      <Section title="Claim Information" aside={<ClaimStatusBadge claim={claim} />}>
        <ClaimField label="Claim Number">{claim.claimId}</ClaimField>
        <ClaimField label="Fill Date">{claim.date}</ClaimField>
        <ClaimField label="Status">{claim.claimStatus || 'Paid'}</ClaimField>
        <ClaimField label="Plan Paid">{money(claim.planPaid)}</ClaimField>
        <ClaimField label="Copay">{money(claim.copay)}</ClaimField>
        <ClaimField label="Total">{money(total(claim))}</ClaimField>
      </Section>

      <Section title="Transaction" aside={<PendingConfirmation />}>
        <ClaimField label="Transaction Type">{claim.txnType}</ClaimField>
        <ClaimField label="Claim Sequence">{`${claim.claimSeq}${claim.current ? ' · Current' : ''}`}</ClaimField>
        <ClaimField label={claim.txnType === 'Reversal' ? 'Reverses Claim' : 'Original Claim'}>
          {original ? <button type="button" className={styles.claimIdLink} onClick={() => onOpen(original)}>{original}</button> : null}
        </ClaimField>
        <ClaimField label="Reversal Date">{claim.reversalDate}</ClaimField>
        <ClaimField label="Processed Date">{claim.processedDate}</ClaimField>
        <ClaimField label="Coverage">{claim.coverage || 'Part D'}</ClaimField>
        <ClaimField label="BIN">{claim.bin}</ClaimField>
        <ClaimField label="PCN">{claim.pcn}</ClaimField>
        <ClaimField label="Group">{claim.rxGroup}</ClaimField>
        {claim.note && <ClaimField label="Note">{claim.note}</ClaimField>}
      </Section>

      <Section title="Drug Dispensed">
        <ClaimField label="Medication">{medLabel(med)}</ClaimField>
        <ClaimField label="Generic">{med.generic}</ClaimField>
        <ClaimField label="Gap">{med.measure}</ClaimField>
        <ClaimField label="Quantity">{claim.qty}</ClaimField>
        <ClaimField label="Days Supply">{claim.daysSupply}</ClaimField>
        <ClaimField label="Dose Form">{med.doseForm}</ClaimField>
      </Section>

      <Section title="Pharmacy">
        <ClaimField label="Name">{pharmacy.name}</ClaimField>
        <ClaimField label="NCPDP">{pharmacy.ncpdp}</ClaimField>
        <ClaimField label="Phone">{pharmacy.phone ? <PhoneLink number={pharmacy.phone} label={pharmacy.name} /> : null}</ClaimField>
      </Section>

      <Section title="Prescriber">
        <ClaimField label="Name">{claim.prescriber || prescriber?.name}</ClaimField>
        <ClaimField label="NPI">{prescriber?.npi}</ClaimField>
        <ClaimField label="Phone">{prescriber?.phone ? <PhoneLink number={prescriber.phone} label={prescriber.name} /> : null}</ClaimField>
      </Section>
    </div>
  );
}

function ClaimRow({ c, onOpen }) {
  const muted = c.voided || c.effect === 'Superseded' || c.effect === 'Invalid' || c.txnType === 'Reversal';
  return (
    <div className={`${styles.dataTableRow} ${styles.claimsGrid} ${muted ? styles.rowVoid : ''}`}>
      <span className={styles.idCell}>
        <button type="button" className={styles.claimIdLink} onClick={() => onOpen(c.claimId)}>{c.claimId || 'Claim'}</button>
        {/* The transaction type reads under the ID, with what it reverses. */}
        <span className={styles.rowMeta}>
          {c.txnType}
          {c.reversesClaimId && <>
            <Sep />Reverses <button type="button" className={styles.inlineLink} onClick={() => onOpen(c.reversesClaimId)}>{c.reversesClaimId}</button>
          </>}
        </span>
      </span>
      <span className={styles.claimDate}>{c.date}</span>
      <span className={styles.rowMeta}>{c.claimSeq}{c.current ? ' · Current' : ''}</span>
      <ClaimStatusBadge claim={c} />
      <span className={`${styles.claimAmount} ${c.voided || c.effect === 'Superseded' || c.effect === 'Invalid' ? styles.struck : ''}`}>{money(total(c))}</span>
    </div>
  );
}

// A fill confirmed in Fold (by hand, from a pickup or a refill approval):
// projected until its claim matches, so it never reads as a claim.
function FillRow({ f }) {
  const b = MATCH_BADGE[f.match.kind];
  return (
    <div className={`${styles.dataTableRow} ${styles.claimsGrid} ${styles.rowFill}`}>
      <span className={styles.idCell}>
        <span className={styles.fillLabel}>{f.manual ? 'Entered by hand' : f.source}</span>
        <span className={styles.rowMeta}>Fold fill<Sep />{f.match.detail}</span>
      </span>
      <span className={styles.claimDate}>{f.date}</span>
      <span className={styles.rowMeta}>—</span>
      <span className={styles.badges}>
        {f.match.kind !== 'verified' && <Badge size="S" tone="warning" label="Projected" />}
        <Badge size="S" tone={b.tone} label={b.label} />
      </span>
      <span className={styles.claimAmount}>—</span>
    </div>
  );
}

/**
 * Claim history for one medication. Claims are grouped into the story of
 * each fill (billed, reversed, rebilled, billed to other insurance); fills
 * confirmed in Fold sit in the same timeline with their source and match
 * status, tagged Projected until a claim matches. A claim ID opens its detail in the
 * same panel with a back arrow. The host owns which claim is open
 * (`selectedId` / `onSelect`), so it can hide its own tabs meanwhile.
 * `flush`: the open claim runs edge to edge in a padded host pane.
 */
export function MedicationClaims({ med, plan, selectedId, onSelect: setSelectedId, flush = false }) {
  const claims = annotateClaims(med.refills);
  const fills = confirmedFills(med).map(f => ({ ...f, match: matchFill(f, claims, plan) }));
  const selected = selectedId ? claims.find(c => c.claimId === selectedId) : null;

  if (selected) return <ClaimDetail med={med} claim={selected} onBack={() => setSelectedId(null)} onOpen={setSelectedId} flush={flush} />;

  const groups = new Map();
  for (const c of claims) groups.set(c.claimGroup, [...(groups.get(c.claimGroup) || []), c]);
  const timeline = [
    ...[...groups.values()].map(rows => ({ kind: 'claims', rows: rows.toSorted(byEvent), date: rows.toSorted(byDate).at(-1).date })),
    ...fills.map(f => ({ kind: 'fill', f, date: f.date })),
  ].toSorted((a, b) => byDate(b, a));

  return (
    <div className={styles.history}>
      {!timeline.length ? <p className={styles.empty}>No claims on file for this medication.</p> : (
        <div className={styles.dataTable}>
          <div className={`${styles.dataTableHead} ${styles.claimsGrid}`}>
            <span>Claim ID</span>
            <span>Fill Date</span>
            <span>Seq</span>
            <span>Status</span>
            <span>Amount</span>
          </div>
          {timeline.map(item => (item.kind === 'fill' ? (
            <FillRow key={`fill-${item.f.date}-${item.f.source}`} f={item.f} />
          ) : (
            <div key={item.rows[0].claimGroup} className={styles.claimGroup}>
              {item.rows.map(c => <ClaimRow key={`${c.claimId}-${c.claimSeq}-${c.txnType}`} c={c} onOpen={setSelectedId} />)}
              {/* The fill's story sits under its rows in a fading bar (as on
                  the CIS dose rows): grey when it ends on a counting claim,
                  red when nothing counts. */}
              {item.rows.length > 1 || item.rows[0].effect !== 'Counts' ? (() => {
                const settled = item.rows.some(c => c.counts);
                return (
                  <InfoBar
                    variant="inline"
                    tone={settled ? 'info' : 'error'}
                    icon={settled ? 'solar:history-linear' : 'solar:danger-triangle-linear'}
                    className={`${styles.storyBar} ${settled ? styles.storyBarQuiet : ''}`}
                  >
                    {claimStory(item.rows)}
                  </InfoBar>
                );
              })() : null}
            </div>
          )))}
        </div>
      )}
    </div>
  );
}

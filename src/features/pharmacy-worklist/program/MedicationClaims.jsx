import { useState } from 'react';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { PhoneLink } from '../../../components/PhoneLink/PhoneLink';
import { medLabel } from '../pharmacyWorklist.utils';
import styles from './MedicationClaims.module.css';

// Same status badges the HCC Claims tab uses.
const CLAIM_STATUS_BADGE = {
  Paid: 'status-completed',
  Pending: 'status-queued',
  Reversed: 'status-failed',
  Rejected: 'status-failed',
};
const money = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);
const total = (c) => (c.planPaid == null && c.copay == null ? null : (c.planPaid || 0) + (c.copay || 0));

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
// the claim, the drug dispensed, the pharmacy and the prescriber.
function ClaimDetail({ med, claim, onBack }) {
  const pharmacy = med.pharmacy?.name === claim.pharmacy ? med.pharmacy : { name: claim.pharmacy };
  const prescriber = med.prescriber;
  return (
    <div>
      <div className={styles.claimDetailHead}>
        <button type="button" className={styles.claimBackBtn} onClick={onBack} aria-label="Back to claims">
          <Icon name="solar:arrow-left-linear" size={18} color="var(--neutral-400)" />
        </button>
        <span className={styles.claimDetailTitle}>Claim Details for Fill: {claim.date}</span>
      </div>

      <Section title="Claim Information" aside={<Badge size="M" variant={CLAIM_STATUS_BADGE[claim.claimStatus] || 'toc-new'} label={claim.claimStatus || 'Paid'} />}>
        <ClaimField label="Claim Number">{claim.claimId}</ClaimField>
        <ClaimField label="Fill Date">{claim.date}</ClaimField>
        <ClaimField label="Status">{claim.claimStatus || 'Paid'}</ClaimField>
        <ClaimField label="Plan Paid">{money(claim.planPaid)}</ClaimField>
        <ClaimField label="Copay">{money(claim.copay)}</ClaimField>
        <ClaimField label="Total">{money(total(claim))}</ClaimField>
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

/**
 * Claims tab for one medication, laid out like the HCC Claims tab: a list
 * (claim ID, fill date, status, amount); a claim ID opens its detail in the
 * same panel with a back arrow. Claims are the refill rows without a Fold
 * `source` (those are fills confirmed by call or verification).
 */
export function MedicationClaims({ med }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const claims = (med.refills || []).filter(r => !r.source);
  const selected = selectedIdx != null ? claims[selectedIdx] : null;

  if (selected) return <ClaimDetail med={med} claim={selected} onBack={() => setSelectedIdx(null)} />;
  if (!claims.length) return <p className={styles.empty}>No claims on file for this medication.</p>;

  return (
    <div className={styles.dataTable}>
      <div className={`${styles.dataTableHead} ${styles.claimsGrid}`}>
        <span>Claim ID</span>
        <span>Fill Date</span>
        <span>Status</span>
        <span>Amount</span>
      </div>
      {claims.map((c, i) => (
        <div key={`${c.claimId || c.date}-${i}`} className={`${styles.dataTableRow} ${styles.claimsGrid}`}>
          <button type="button" className={styles.claimIdLink} onClick={() => setSelectedIdx(i)}>
            {c.claimId || 'Claim'}
          </button>
          <span className={styles.claimDate}>{c.date}</span>
          <Badge size="M" variant={CLAIM_STATUS_BADGE[c.claimStatus] || 'toc-new'} label={c.claimStatus || 'Paid'} />
          <span className={styles.claimAmount}>{money(total(c))}</span>
        </div>
      ))}
    </div>
  );
}

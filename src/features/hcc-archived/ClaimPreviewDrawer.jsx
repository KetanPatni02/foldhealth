import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../../components/Drawer/Drawer';
import { Avatar } from '../../components/Avatar/Avatar';
import { Icon } from '../../components/Icon/Icon';
import { Badge } from '../../components/Badge/Badge';
import { getIcdsForMember } from './data/icds';
import styles from './ClaimPreviewDrawer.module.css';

/**
 * Read-only preview of the claim that generated a DOS record on the HCC
 * worklist. Opens when the user clicks a claim-sourced DOS date in the
 * DOS column.
 *
 * Reads `hccClaimPreview = { open, member, dosDate }` from the store.
 * Composed from the existing Drawer primitive so width / inset / header
 * spacing stays consistent with the other right-side drawers.
 */
export function ClaimPreviewDrawer() {
  const { open, member, dosDate } = useAppStore(s => s.hccClaimPreview);
  const close = useAppStore(s => s.closeHccClaimPreview);

  // Build a representative claim object from the member/DOS so the drawer
  // has something to render. In production this would come from the claims
  // service.
  const claim = useMemo(() => buildMockClaim(member, dosDate), [member, dosDate]);

  if (!open || !member) return null;

  return (
    <Drawer
      title="Claim Preview"
      onClose={close}
      headerRight={(
        <span className={styles.claimIdChip} title="Claim ID">
          <Icon name="solar:hashtag-linear" size={12} color="var(--neutral-300)" />
          {claim.claimId}
        </span>
      )}
    >
      <div className={styles.body}>
        <SectionPatientHeader member={member} />

        <Section title="Service">
          <Field label="Date of Service" value={claim.dos} mono />
          <Field label="Place of Service" value={`${claim.posCode} · ${claim.posDesc}`} />
          <Field label="Visit Type" value={claim.visitType} />
          <Field label="Rendering Provider" value={claim.renderingProvider} />
          <Field label="Billing Provider TIN" value={claim.tin} mono />
        </Section>

        <Section title="Diagnoses">
          {claim.diagnoses.length === 0 && <p className={styles.empty}>No diagnoses on this claim.</p>}
          {claim.diagnoses.map((d, idx) => (
            <div key={d.code} className={styles.diagRow}>
              <span className={styles.diagIndex}>{String.fromCharCode(65 + idx)}</span>
              <span className={styles.diagCode}>{d.code}</span>
              <span className={styles.diagDesc}>{d.description}</span>
              {d.hcc && <span className={styles.hccChip}>{d.hcc}</span>}
            </div>
          ))}
        </Section>

        <Section title="Procedures">
          <table className={styles.proceduresTable}>
            <thead>
              <tr>
                <th>CPT</th>
                <th>Description</th>
                <th>Mod</th>
                <th className={styles.alignRight}>Units</th>
                <th className={styles.alignRight}>Billed</th>
                <th className={styles.alignRight}>Allowed</th>
              </tr>
            </thead>
            <tbody>
              {claim.procedures.map((p, i) => (
                <tr key={i}>
                  <td className={styles.mono}>{p.cpt}</td>
                  <td>{p.description}</td>
                  <td className={styles.mono}>{p.modifier || '—'}</td>
                  <td className={`${styles.mono} ${styles.alignRight}`}>{p.units}</td>
                  <td className={`${styles.mono} ${styles.alignRight}`}>${p.billed.toFixed(2)}</td>
                  <td className={`${styles.mono} ${styles.alignRight}`}>${p.allowed.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Financials">
          <div className={styles.financialsGrid}>
            <Field label="Total Billed" value={`$${claim.totals.billed.toFixed(2)}`} mono />
            <Field label="Total Allowed" value={`$${claim.totals.allowed.toFixed(2)}`} mono />
            <Field label="Paid" value={`$${claim.totals.paid.toFixed(2)}`} mono />
            <Field label="Patient Resp." value={`$${claim.totals.patientResp.toFixed(2)}`} mono />
          </div>
        </Section>

        <Section title="Status">
          <div className={styles.statusRow}>
            <Badge variant={claim.statusVariant} label={claim.status} />
            <span className={styles.statusMeta}>
              {claim.statusMeta}
            </span>
          </div>
        </Section>
      </div>
    </Drawer>
  );
}

// ── Small composition helpers (kept local — single-use UI) ─────────────

function SectionPatientHeader({ member }) {
  return (
    <div className={styles.patientHeader}>
      <Avatar variant="patient" initials={member.in} size={36} />
      <div>
        <div className={styles.patientName}>
          {member.name}{' '}
          <span className={styles.patientDemo}>({member.g} · {member.age})</span>
        </div>
        <div className={styles.patientMeta}>
          {member.memberId || member.id} · {(member.language || 'EN').toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={`${styles.fieldValue}${mono ? ` ${styles.mono}` : ''}`}>{value || '—'}</span>
    </div>
  );
}

// ── Mock claim shape — replace with a real fetch when claims service lands.
function buildMockClaim(member, dosDate) {
  if (!member) return { diagnoses: [], procedures: [], totals: {} };

  // Diagnoses — reuse the ICD fixture so codes look real for this patient.
  // (The fixture uses `desc` not `description` and `hcc` already includes
  //  the "HCC " prefix, so we forward both verbatim.)
  const allIcds = getIcdsForMember(member.name) || [];
  const diagnoses = allIcds.slice(0, 4).map(i => ({
    code: i.code,
    description: i.desc,
    hcc: i.hcc,
  }));

  // Procedures — fixed mock that covers a typical office encounter.
  const procedures = [
    { cpt: '99214', description: 'Office/outpatient visit, established patient', modifier: '25', units: 1, billed: 175.0, allowed: 109.0 },
    { cpt: '93000', description: 'Electrocardiogram, complete', modifier: '',   units: 1, billed: 65.0,  allowed: 22.5  },
    { cpt: 'G0438', description: 'Annual wellness visit',                       modifier: '',   units: 1, billed: 250.0, allowed: 173.0 },
  ];

  const billed  = procedures.reduce((s, p) => s + p.billed, 0);
  const allowed = procedures.reduce((s, p) => s + p.allowed, 0);
  const paid    = allowed * 0.8;
  const patientResp = allowed - paid;

  // Deterministic claim id — same DOS always shows the same number so the
  // chip doesn't churn between opens.
  const claimId = `CLM-${(member.id || 'X').slice(-4).toUpperCase()}-${(dosDate || '').replace(/\D/g, '').slice(0, 6) || '000000'}`;

  return {
    claimId,
    dos: dosDate || member.dos,
    posCode: member.pos || '11',
    posDesc: member.posDesc || 'Office',
    visitType: member.vt || 'Walk-in',
    renderingProvider: member.rp || '—',
    tin: member.tin || 'TIN-1003',
    diagnoses,
    procedures,
    totals: { billed, allowed, paid, patientResp },
    status: 'Paid',
    statusVariant: 'status-completed',
    statusMeta: 'Adjudicated by payer · Posted to ledger',
  };
}

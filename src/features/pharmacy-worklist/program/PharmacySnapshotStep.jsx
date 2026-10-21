import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { DashboardCard } from '../../../components/DashboardCard/DashboardCard';
import { Icon } from '../../../components/Icon/Icon';
import { PhoneLink } from '../../../components/PhoneLink/PhoneLink';
import {
  GAP_STATUS_TONE, OPEN_GAPS, enrichPharmacyMember, fillDueTone, pdcTone, pharmaciesUsed, prescribersOf,
} from '../pharmacyWorklist.utils';
import { MeasureCode, SubStatus } from '../PharmacyCells';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import styles from './PharmacySnapshotStep.module.css';

const TONE_CLASS = { error: styles.toneError };

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

const addressOf = (o) => [o.address1, o.city, o.state, o.zip].filter(Boolean).join(', ') || '—';

// Snapshot step of the Pharmacy program: the member's pharmacy gaps at a
// glance, plus who to call about them. Prescriber and pharmacy details live
// here rather than in steps of their own.
export function PharmacySnapshotStep({ member }) {
  const fromProfile = usePharmacyProgramMember();
  const row = member || fromProfile;
  const logActivity = useAppStore(s => s.logPharmacyDial);

  if (!row) {
    return (
      <div className={styles.empty}>
        <Icon name="solar:pill-linear" size={40} color="var(--neutral-200)" />
        <p>No MAD, MAH or MAC measures on file for this member.</p>
      </div>
    );
  }

  const m = enrichPharmacyMember(row);
  const prescribers = prescribersOf(row);
  const pharmacies = pharmaciesUsed(row);
  const dial = (who, number) => () => logActivity?.(row.id, who, number);

  return (
    <div className={styles.wrap}>
      <DashboardCard title="Pharmacy Gaps" count={`${m.progress.closed} of ${m.progress.total} closed · ${m.progress.label}`}>
        {m.gaps.map(g => {
          // Red only where someone has to act: an open gap. A closed gap's
          // low PDC or past fill date is history.
          const open = OPEN_GAPS.has(g.status.gap);
          const tone = (t) => (open ? TONE_CLASS[t] || '' : '');
          return (
            <div key={g.code} className={styles.gapRow}>
              <MeasureCode code={g.code} />
              <span className={styles.gapStatus}>
                <Badge size="S" tone={GAP_STATUS_TONE[g.status.gap]} label={g.status.gap} />
                <SubStatus label={g.status.label} />
              </span>
              <Field label="PDC"><span className={tone(pdcTone(g.pdc))}>{g.pdc == null ? 'Not sent' : `${g.pdc}%`}</span></Field>
              <Field label="Fail Date">{g.failDate || '—'}</Field>
              <Field label="Next Fill Due"><span className={tone(fillDueTone(g.nextFillDue))}>{g.nextFillDue || '—'}</span></Field>
              <Field label="Claim">{g.recon?.status || '—'}</Field>
            </div>
          );
        })}
      </DashboardCard>

      <DashboardCard title={prescribers.length === 1 ? 'Prescriber' : 'Prescribers'}>
        {prescribers.length === 0 && <div className={styles.row}><span className={styles.muted}>No prescriber on file.</span></div>}
        {prescribers.map(p => (
          <div key={p.name} className={styles.row}>
            <div className={styles.contactHead}>
              <span className={styles.contactName}>{p.name}</span>
              <span className={styles.muted}>{p.drugs.join(', ')}</span>
            </div>
            <div className={styles.contactGrid}>
              <Field label="Phone"><PhoneLink number={p.phone} label={p.name} onDial={dial(p.name, p.phone)} /></Field>
              <Field label="Fax">{p.fax || '—'}</Field>
              <Field label="Address">{addressOf(p)}</Field>
            </div>
          </div>
        ))}
      </DashboardCard>

      <DashboardCard title="Pharmacies" count="Where fills happened, most recent first">
        {pharmacies.length === 0 ? <div className={styles.row}><span className={styles.muted}>No fills on record.</span></div> : (
          <table className={styles.table}>
            <thead>
              <tr><th>Pharmacy</th><th>Phone</th><th>Fills</th><th>Last Fill</th></tr>
            </thead>
            <tbody>
              {pharmacies.map((p, i) => (
                <tr key={p.name}>
                  <td>
                    <span className={styles.contactName}>{p.name}</span>
                    {i === 0 && pharmacies.length > 1 && <span className={styles.muted}> · Last used</span>}
                    <span className={styles.address}>{addressOf(p)}</span>
                  </td>
                  <td><PhoneLink number={p.phone} label={p.name} onDial={dial(p.name, p.phone)} /></td>
                  <td>{p.fills}</td>
                  <td>{p.lastFill}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>
    </div>
  );
}

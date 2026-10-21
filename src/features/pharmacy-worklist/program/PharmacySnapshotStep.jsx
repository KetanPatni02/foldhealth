import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { Icon } from '../../../components/Icon/Icon';
import { PhoneLink } from '../../../components/PhoneLink/PhoneLink';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import {
  GAP_STATUS_TONE, MEASURE_NAMES, enrichPharmacyMember, fillDueTone, pdcTone, pharmaciesUsed, prescribersOf,
} from '../pharmacyWorklist.utils';
import { SubStatus } from '../PharmacyCells';
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
  const [lastUsed, ...others] = pharmacies;
  const dial = (who, number) => () => logActivity?.(row.id, who, number);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <span className={styles.cardTitle}>Pharmacy gaps</span>
          <span className={styles.muted}>{m.progress.closed} of {m.progress.total} closed · {m.progress.label}</span>
        </header>
        <div className={styles.gapList}>
          {m.gaps.map(g => (
            <div key={g.code} className={styles.gapRow}>
              <Tooltip label={MEASURE_NAMES[g.code]} placement="bottom">
                <span><Badge size="S" variant="compliance-na" label={g.code} /></span>
              </Tooltip>
              <span className={styles.gapStatus}>
                <Badge size="S" tone={GAP_STATUS_TONE[g.status.gap]} label={g.status.gap} />
                <SubStatus label={g.status.label} />
              </span>
              <Field label="PDC"><span className={TONE_CLASS[pdcTone(g.pdc)] || ''}>{g.pdc == null ? 'Not sent' : `${g.pdc}%`}</span></Field>
              <Field label="Fail date">{g.failDate || '—'}</Field>
              <Field label="Next fill due"><span className={TONE_CLASS[fillDueTone(g.nextFillDue)] || ''}>{g.nextFillDue || '—'}</span></Field>
              <Field label="Claim">{g.recon?.status || '—'}</Field>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <header className={styles.cardHead}>
          <span className={styles.cardTitle}>Prescriber{prescribers.length === 1 ? '' : 's'}</span>
        </header>
        {prescribers.length === 0 && <span className={styles.muted}>No prescriber on file.</span>}
        {prescribers.map(p => (
          <div key={p.name} className={styles.contact}>
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
      </section>

      <section className={styles.card}>
        <header className={styles.cardHead}>
          <span className={styles.cardTitle}>Pharmacy</span>
          <span className={styles.muted}>From the fill history. This is where fills happened, not a primary pharmacy on file.</span>
        </header>
        {!lastUsed && <span className={styles.muted}>No fills on record.</span>}
        {lastUsed && (
          <div className={styles.contact}>
            <div className={styles.contactHead}>
              <Badge size="S" tone="primary" label="Last pharmacy used" />
              <span className={styles.contactName}>{lastUsed.name}</span>
            </div>
            <div className={styles.contactGrid}>
              <Field label="Phone"><PhoneLink number={lastUsed.phone} label={lastUsed.name} onDial={dial(lastUsed.name, lastUsed.phone)} /></Field>
              <Field label="Last fill">{lastUsed.lastFill}</Field>
              <Field label="Address">{addressOf(lastUsed)}</Field>
            </div>
          </div>
        )}
        {pharmacies.length > 0 && (
          <div className={styles.subSection}>
            <span className={styles.fieldLabel}>All pharmacies used ({pharmacies.length})</span>
            <table className={styles.table}>
              <thead>
                <tr><th>Pharmacy</th><th>Phone</th><th>Fills</th><th>Last fill</th></tr>
              </thead>
              <tbody>
                {[lastUsed, ...others].map(p => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td><PhoneLink number={p.phone} label={p.name} onDial={dial(p.name, p.phone)} /></td>
                    <td>{p.fills}</td>
                    <td>{p.lastFill}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

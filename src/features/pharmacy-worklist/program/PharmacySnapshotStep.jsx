import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Badge } from '../../../components/Badge/Badge';
import { DashboardCard } from '../../../components/DashboardCard/DashboardCard';
import { Icon } from '../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../components/Icon/DownChevronIcon';
import { PhoneLink } from '../../../components/PhoneLink/PhoneLink';
import {
  GAP_STATUS_TONE, isActiveGap, enrichPharmacyMember, pharmaciesUsed, prescribersOf,
} from '../pharmacyWorklist.utils';
import { Dash, DueDate, FailDateValue, MeasureCode, NextFillDueValue, PdcValue, SubStatus } from '../PharmacyCells';
import { usePharmacyProgramMember } from './usePharmacyProgramMember';
import styles from './PharmacySnapshotStep.module.css';

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

// Days supply and quantity in one cell: "90 days • Qty 90".
const supplyLabel = (d) => [d.daysSupply != null && `${d.daysSupply} days`, d.qty != null && `Qty ${d.qty}`].filter(Boolean).join(' • ') || '—';

const addressOf = (o) => [o.address1, o.city, o.state, o.zip].filter(Boolean).join(', ') || '—';

// Snapshot step of the Pharmacy program: the member's pharmacy gaps at a
// glance, plus who to call about them. Prescriber and pharmacy details live
// here rather than in steps of their own.
export function PharmacySnapshotStep({ member }) {
  const fromProfile = usePharmacyProgramMember();
  const row = member || fromProfile;
  const logActivity = useAppStore(s => s.logPharmacyDial);
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (code) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });

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
      <DashboardCard title="Pharmacy Gaps" count={`${m.progress.closed} of ${m.progress.total} closed • ${m.progress.label}`}>
        {/* Column names once, not on every row; rows share its grid. */}
        <div className={`${styles.gapGrid} ${styles.gapHead}`} aria-hidden="true">
          <span>Gap</span><span>Status</span><span>PDC</span><span>Fail Date</span><span>Next Fill Due</span><span>Claim</span>
        </div>
        {m.gaps.map(g => {
          // Red only where someone has to act: an open gap. A closed gap's
          // low PDC or past fill date is history.
          const open = isActiveGap(g.status);
          const isOpen = expanded.has(g.code);
          const claimFlagged = g.recon?.status === 'Claim not matched';
          return (
            <div key={g.code} className={styles.gapItem}>
              <button type="button" className={`${styles.gapGrid} ${styles.gapRow}`} onClick={() => toggle(g.code)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} ${g.code} medications`}>
                <span className={styles.gapCode}>
                  <DownChevronIcon size={14} className={`${styles.chevron} ${isOpen ? '' : styles.chevronRight}`} />
                  <MeasureCode code={g.code} />
                </span>
                <span className={styles.gapStatus}>
                  <Badge size="S" tone={GAP_STATUS_TONE[g.status.gap]} label={g.status.gap} />
                  <SubStatus label={g.status.label} />
                </span>
                <PdcValue pdc={g.pdc} open={open} source={g.pdcSource} medications={g.medications} />
                <FailDateValue gap={g} />
                <NextFillDueValue gap={g} />
                {g.recon ? <span className={claimFlagged && open ? styles.toneError : styles.value}>{g.recon.status}</span> : <Dash />}
              </button>
              {isOpen && (
                <div className={styles.medPanel}>
                  <table className={styles.medTable}>
                    <thead>
                      <tr><th>Medication</th><th>Last Fill</th><th>Recent Fill</th><th>Next Fill</th><th>Supply</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {g.medications.map(d => (
                        <tr key={d.id}>
                          <td className={styles.medName}>{d.name} {d.strength} {d.unit}</td>
                          <td>{d.lastFill || '—'}</td>
                          <td>{d.recentFill || '—'}</td>
                          <td><DueDate date={d.nextFill} alert={open && d.status !== 'Discontinued'} /></td>
                          <td>{supplyLabel(d)}</td>
                          <td className={d.status === 'Discontinued' ? styles.muted : ''}>{d.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

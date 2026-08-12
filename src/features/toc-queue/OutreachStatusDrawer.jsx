import { useMemo } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { Badge } from '../../components/Badge/Badge';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import styles from './OutreachStatusDrawer.module.css';

const STATUS_BADGE = {
  'Not Started': { variant: 'pending',     icon: 'solar:hourglass-linear' },
  'In Progress': { variant: 'in-progress', icon: 'solar:refresh-linear' },
  'Attempted':   { variant: 'warning',     icon: 'solar:phone-calling-linear' },
  'Completed':   { variant: 'completed',   icon: 'solar:check-circle-linear' },
};

// Outreach Status drawer — placeholder shell. Renders patient context + the
// current outreach_status pill, then a stub body for the outreach history
// timeline that will replace it in a follow-up pass. Kept parallel to
// AssessmentDrawer so both feel like siblings.
export function OutreachStatusDrawer() {
  const patientId = useAppStore(s => s.outreachStatusDrawerPatientId);
  const close = useAppStore(s => s.closeOutreachStatusDrawer);
  const patients = useAppStore(s => s.patients);
  const patient = useMemo(
    () => patients.find(p => p.id === patientId) || null,
    [patients, patientId],
  );

  if (!patient) return null;

  const status = patient.outreachStatus;
  const cfg = status ? STATUS_BADGE[status] : null;

  return (
    <Drawer
      title="Outreach Status"
      onClose={close}
      banner={
        <PatientBanner
          initials={patient.initials}
          name={patient.name}
          gender={patient.gender}
          age={patient.age}
          memberId={patient.memberId}
        />
      }
    >
      <div className={styles.body}>
        <section className={styles.statusRow}>
          <span className={styles.statusLabel}>Current status</span>
          {cfg
            ? <Badge size="M" variant={cfg.variant} label={status} icon={cfg.icon} />
            : <span className={styles.statusEmpty}>Not set</span>}
        </section>

        <section className={styles.placeholder}>
          <Icon name="solar:phone-calling-linear" size={32} color="var(--neutral-200)" />
          <p className={styles.placeholderTitle}>Outreach history coming soon</p>
          <p className={styles.placeholderText}>
            The full outreach timeline — attempts, channels, call summaries,
            next scheduled contact, and agent handoffs — will render here.
            Wire the queries in the next pass.
          </p>
        </section>
      </div>
    </Drawer>
  );
}

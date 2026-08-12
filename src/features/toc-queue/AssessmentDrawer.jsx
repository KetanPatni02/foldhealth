import { useMemo } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { Badge } from '../../components/Badge/Badge';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import styles from './AssessmentDrawer.module.css';

// Same enum → Badge variant map QueueRow uses for its pill; keeping it local
// here (rather than exporting from QueueRow) avoids QueueRow becoming a
// grab-bag utility module.
const STATUS_BADGE = {
  'Not Started': { variant: 'pending',     icon: 'solar:hourglass-linear' },
  'In Progress': { variant: 'in-progress', icon: 'solar:refresh-linear' },
  'Completed':   { variant: 'completed',   icon: 'solar:check-circle-linear' },
  'Overdue':     { variant: 'error',       icon: 'solar:danger-triangle-linear' },
};

// Assessment drawer — placeholder shell. Renders patient context + the
// current assessment_status pill, then a stub body describing the sections
// the drawer will grow into. Real content lands in a follow-up pass; the
// contract with the row cell (patientId in the store, close via
// closeAssessmentDrawer) is what stays stable.
export function AssessmentDrawer() {
  const patientId = useAppStore(s => s.assessmentDrawerPatientId);
  const close = useAppStore(s => s.closeAssessmentDrawer);
  const patients = useAppStore(s => s.patients);
  const patient = useMemo(
    () => patients.find(p => p.id === patientId) || null,
    [patients, patientId],
  );

  if (!patient) return null;

  const status = patient.assessmentStatus;
  const cfg = status ? STATUS_BADGE[status] : null;

  return (
    <Drawer
      title="Assessment"
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
          <Icon name="solar:clipboard-list-linear" size={32} color="var(--neutral-200)" />
          <p className={styles.placeholderTitle}>Assessment details coming soon</p>
          <p className={styles.placeholderText}>
            The full post-discharge assessment — risk factors, care goals,
            medication reconciliation notes, and follow-up tasks — will render
            here. Wire the queries in the next pass.
          </p>
        </section>
      </div>
    </Drawer>
  );
}

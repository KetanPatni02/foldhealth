import { Icon } from '../Icon/Icon';
import { ActionButton } from '../ActionButton/ActionButton';
import { Avatar } from '../Avatar/Avatar';
import { PatientSearch } from './PatientSearch';
import { getInitials } from './scheduleDrawerConstants';
import styles from './ScheduleDrawer.module.css';

export function ScheduleDrawerPatientSection({
  selectedPatient,
  setSelectedPatient,
  patients,
  reasonForVisit,
  setReasonForVisit,
}) {
  if (!selectedPatient) {
    return (
      <div className={styles.section}>
        <label className={styles.sectionLabel}>Patient/Prospect <span className={styles.required}>*</span></label>
        <PatientSearch patients={patients} onSelect={setSelectedPatient} />
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <label className={styles.sectionLabel}>Patient Details</label>
      <div className={styles.patientCard}>
        <div className={styles.patientCardHeader}>
          <Avatar variant="patient" initials={getInitials(selectedPatient.name).toUpperCase()} />
          <div className={styles.patientCardInfo}>
            <div className={styles.patientCardName}>{selectedPatient.name}</div>
            <div className={styles.patientCardMeta}>
              {selectedPatient.gender?.[0] || 'M'} &bull; {selectedPatient.age || '62'}Y ({selectedPatient.dob || '03/29/1961'}) &bull;{' '}
              <span className={styles.rafScore}>RAF Score: {selectedPatient.laceScore || '3.5'}</span>{' '}
              <span className={styles.rafDelta}>+0.5 <Icon name="solar:arrow-up-linear" size={10} color="var(--status-success-bright)" /></span>
            </div>
          </div>
          <ActionButton icon="solar:close-linear" size="S" tooltip="Remove" onClick={() => setSelectedPatient(null)} />
        </div>

        <div className={styles.reasonField}>
          <label className={styles.reasonLabel}>Reason for Visit</label>
          <input
            className={styles.reasonInput}
            placeholder="Enter Reason for Visit"
            value={reasonForVisit}
            onChange={e => setReasonForVisit(e.target.value)}
          />
        </div>

        <div className={styles.patientInfoGrid}>
          <div className={styles.patientInfoRow}>
            <span className={styles.patientInfoLabel}>Patient Location</span>
            <span className={styles.patientInfoValue}>{selectedPatient.facility || 'New York'}</span>
          </div>
          <div className={styles.patientInfoRow}>
            <span className={styles.patientInfoLabel}>Last Appointment</span>
            <span className={styles.patientInfoValue}>
              07-26-2023 with Katherine Moss{' '}
              <button className={styles.viewDetailsLink}>View Details</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

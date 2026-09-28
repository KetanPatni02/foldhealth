import { useEffect } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { useAppStore } from '../../store/useAppStore';
import { formatDobDisplay, deriveDob } from '../../lib/patientDob';
import { patientSnapshotKey } from '../../lib/patientSnapshot';
import { PatientHoverCard } from './PatientHoverCard';
import { usePatientHoverCard } from './usePatientHoverCard';
import styles from './PatientHoverCard.module.css';

const GENDER = { M: 'Male', F: 'Female', O: 'Other' };

/**
 * Patient avatar for worklist rows: resting on it opens the PatientHoverCard
 * (banner after 800ms, then the snapshot). Every worklist uses this so the
 * card behaves the same everywhere.
 *
 * @param {object} props
 * @param {object} props.patient – { memberId, id, name, initials, gender ('M'|'F'|'Male'…), age ('69y 5m' | 69), dob }
 * Remaining props go to <Avatar> (e.g. locked, billed).
 */
export function PatientAvatarHover({ patient, ...avatarProps }) {
  const hover = usePatientHoverCard();
  const key = patientSnapshotKey(patient);
  const snapshot = useAppStore(s => s.patientSnapshots[key]);
  const fetchPatientSnapshot = useAppStore(s => s.fetchPatientSnapshot);
  useEffect(() => { if (hover.open) fetchPatientSnapshot(patient); }, [hover.open, fetchPatientSnapshot, patient]);

  const g = String(patient.gender || '');
  const years = parseInt(patient.age, 10);
  return (
    <>
      <span className={styles.avatarHover} {...hover.triggerProps}>
        <Avatar variant="patient" initials={patient.initials} {...avatarProps} />
      </span>
      {hover.open && (
        <PatientHoverCard
          anchorRect={hover.anchorRect}
          stage={hover.stage}
          cardProps={hover.cardProps}
          snapshot={snapshot}
          patient={{
            name: patient.name,
            initials: patient.initials,
            gender: GENDER[g.toUpperCase()] || g,
            age: Number.isFinite(years) ? `${years} Y` : '',
            dob: formatDobDisplay(patient.dob) || deriveDob(patient.age, patient.name),
          }}
        />
      )}
    </>
  );
}

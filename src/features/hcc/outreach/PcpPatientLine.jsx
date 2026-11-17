import { Avatar } from '../../../components/Avatar/Avatar';
import { speakerInitials } from '../../../components/CallTranscript/transcript';
import styles from './PcpOutreach.module.css';

/**
 * A patient in PCP Outreach: avatar, name with (gender•age) as in the
 * worklist's Member column, and the Member ID under it.
 */
export function PcpPatientLine({ p }) {
  const g = p?.member?.g;
  const age = p?.member?.age;
  return (
    <span className={styles.patientLine}>
      <Avatar variant="patient" size="S" initials={speakerInitials(p?.name)} />
      <span className={styles.patientInfo}>
        <span className={styles.patientName}>
          {p?.name}
          {(g || age) && <span className={styles.patientDemo}> ({[g, age].filter(Boolean).join('•')})</span>}
        </span>
        <span className={styles.patientMeta}>Member ID {p?.memberId || '-'}</span>
      </span>
    </span>
  );
}

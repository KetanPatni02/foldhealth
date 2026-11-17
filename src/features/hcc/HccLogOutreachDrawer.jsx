import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { HccOutreachTab } from './HccOutreachTab';
import styles from './HccWorklistRow.module.css';

/**
 * Log Outreach for one HCC member, outside the chart: the patient context
 * bar, then the chart's Outreach form (open) and the member's outreach
 * history. Opened from a worklist row's ⋯ menu and by the call widget, which
 * passes the call it placed (`callPrefill`, `liveCallEnd`).
 */
export function HccLogOutreachDrawer({ member, onClose, callPrefill = null, liveCallEnd = null }) {
  return (
    <Drawer
      title="Log Outreach"
      onClose={onClose}
      bodyClassName={styles.outreachDrawerBody}
      banner={(
        <PatientBanner
          initials={member.in}
          name={member.name}
          gender={member.g === 'M' ? 'Male' : member.g === 'F' ? 'Female' : member.g}
          age={member.age || ''}
          dob={member.dob}
          memberId={member.memberId || `#${member.id}`}
          raf={member.raf}
          rafUp={member.ru !== false}
          patientId={member.id}
        />
      )}
    >
      <HccOutreachTab member={member} defaultFormOpen callPrefill={callPrefill} liveCallEnd={liveCallEnd} />
    </Drawer>
  );
}

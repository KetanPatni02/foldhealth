import { useMemo } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { useAppStore } from '../../store/useAppStore';
import { OutreachTab } from '../patient/left-panel/tabs/outreach/OutreachTab/OutreachTab';
import { hasTocOutreachActivity } from '../toc/tocOutcome';
import styles from './OutreachStatusDrawer.module.css';

/**
 * TOC queue outreach drawer. Same PatientBanner + OutreachTab the patient
 * profile Outreach tab uses, framed as the Figma "Patient Outreach" panel.
 */
export function OutreachStatusDrawer() {
  const patientId = useAppStore(s => s.outreachStatusDrawerPatientId);
  const close = useAppStore(s => s.closeOutreachStatusDrawer);
  const patients = useAppStore(s => s.patients);
  const patient = useMemo(
    () => patients.find(p => p.id === patientId) || null,
    [patients, patientId],
  );

  if (!patient) return null;

  const showActivity = hasTocOutreachActivity(patient);

  return (
    <Drawer
      title="Patient Outreach"
      onClose={close}
      titleStyle={{ color: 'var(--neutral-500)' }}
      bodyClassName={styles.drawerBody}
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
      <OutreachTab
        patientId={patient.id}
        defaultLogFor="care-program"
        defaultPrograms={['TCM']}
        hideActivity={!showActivity}
        initialLogGroups={showActivity ? undefined : []}
      />
    </Drawer>
  );
}

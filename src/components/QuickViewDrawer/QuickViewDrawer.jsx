import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../Drawer/Drawer';
import { Icon } from '../Icon/Icon';
import { PatientP360Banner } from '../../features/patient/shell/PatientP360Banner/PatientP360Banner';
import { PatientProfileTabs } from '../../features/patient/left-panel/PatientProfileTabs/PatientProfileTabs';
import styles from './QuickViewDrawer.module.css';

export function QuickViewDrawer() {
  const patient = useAppStore(s => s.quickViewPatient);
  const closeQuickView = useAppStore(s => s.closeQuickView);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);

  if (!patient) return null;

  function handleViewFullProfile() {
    closeQuickView();
    navigateToPatient(patient.id);
  }

  const headerRight = (
    <>
      <button className={styles.profileLink} onClick={handleViewFullProfile}>
        View Full Profile
        <Icon name="solar:arrow-right-linear" size={16} />
      </button>
      <span className={styles.headerDivider} />
    </>
  );

  return (
    <Drawer
      title="Quick View"
      onClose={closeQuickView}
      headerRight={headerRight}
      noCloseDivider
      headerStyle={{ padding: '12px', borderBottom: '0.5px solid var(--neutral-150)' }}
      titleStyle={{ fontSize: 14 }}
      bodyClassName={styles.drawerBody}
    >
      <div className={styles.stickyTop}>
        <PatientP360Banner patient={patient} variant="drawer" />
      </div>

      <div className={styles.tabsPanel}>
        <PatientProfileTabs patientId={patient.id} patient={patient} variant="drawer" />
      </div>
    </Drawer>
  );
}

import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../Drawer/Drawer';
import { Icon } from '../Icon/Icon';
import { ActionButton } from '../ActionButton/ActionButton';
import { PatientBanner } from '../../features/patient/components/PatientBanner';
import { PatientProfileTabs } from '../../features/patient/components/PatientProfileTabs';
import styles from './QuickViewDrawer.module.css';

export function QuickViewDrawer() {
  const patient = useAppStore(s => s.quickViewPatient);
  const closeQuickView = useAppStore(s => s.closeQuickView);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);
  const showToast = useAppStore(s => s.showToast);

  if (!patient) return null;

  const noop = (label) => () => showToast(`${label} — coming soon`);

  function handleViewFullProfile() {
    closeQuickView();
    navigateToPatient(patient.id);
  }

  const title = (
    <>
      Quick View
      <ActionButton
        icon="solar:archive-up-minimlistic-linear"
        size="S"
        tooltip="Archive"
        onClick={noop('Archive')}
      />
    </>
  );

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
      title={title}
      onClose={closeQuickView}
      headerRight={headerRight}
      headerStyle={{ padding: '12px', borderBottom: '0.5px solid var(--neutral-150)' }}
      titleStyle={{ fontSize: 14 }}
      bodyClassName={styles.drawerBody}
    >
      <div className={styles.stickyTop}>
        <PatientBanner patient={patient} variant="drawer" />
      </div>

      <div className={styles.tabsPanel}>
        <PatientProfileTabs patientId={patient.id} />
      </div>
    </Drawer>
  );
}

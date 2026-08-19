import { useAppStore } from '../../store/useAppStore';
import { Drawer } from '../Drawer/Drawer';
import { Icon } from '../Icon/Icon';
import { PatientP360Banner } from '../../features/patient/shell/PatientP360Banner/PatientP360Banner';
import { PatientProfileTabs } from '../../features/patient/left-panel/PatientProfileTabs/PatientProfileTabs';
import styles from './QuickViewDrawer.module.css';

export function QuickViewDrawer() {
  const snapshot = useAppStore(s => s.quickViewPatient);
  const closeQuickView = useAppStore(s => s.closeQuickView);
  const navigateToPatient = useAppStore(s => s.navigateToPatient);

  // The snapshot is whatever the opening row passed at click time — it goes
  // stale the moment the Update Member drawer saves. Merge the live slice
  // row (matched by id, then by memberId) over it so the banner always
  // shows current name / dob / gender / age.
  const live = useAppStore(s => {
    const snap = s.quickViewPatient;
    if (!snap) return null;
    const matches = (m) => m && (m.id === snap.id || (snap.memberId != null && String(m.memberId) === String(snap.memberId)));
    return s.patients.find(matches)
      || (s.allPatients || []).find(matches)
      || s.hccMembers.find(matches)
      || (s.awvMembers || []).find(matches)
      || (s.ccmWorklistMembers || []).find(matches)
      || (s.snpWorklistMembers || []).find(matches)
      || null;
  });

  if (!snapshot) return null;
  const patient = live
    ? {
        ...snapshot,
        name: live.name ?? snapshot.name,
        initials: live.initials ?? live.in ?? snapshot.initials,
        gender: live.gender ?? live.g ?? snapshot.gender,
        age: live.age ?? snapshot.age,
        dob: live.dob ?? snapshot.dob,
        language: live.language ?? snapshot.language,
      }
    : snapshot;

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
      titleStyle={{ fontSize: 'var(--font-base)' }}
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

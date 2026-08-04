import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { PatientP360Banner } from './components/PatientP360Banner';
import { PatientProfileTabs } from './components/PatientProfileTabs';
import { ProfileTabBar } from './components/ProfileTabBar';
import { CareManagementView } from './components/CareManagementView';
import { CareProgramsTab } from './components/CareProgramsTab';
import { OverviewTab } from './components/OverviewTab';
import styles from './PatientDetailView.module.css';

function TabPlaceholder({ tabName }) {
  return (
    <div className={styles.placeholder}>
      <Icon name="solar:widget-2-linear" size={40} color="var(--neutral-150)" />
      <span className={styles.placeholderTitle}>{tabName}</span>
      <span className={styles.placeholderText}>This section is under development</span>
    </div>
  );
}

// Every worklist (HCC, AWV, CCM, SNP, HEDIS) keeps its own member slice
// with a compact row shape (id, in, g, memberId, …). The patient banner
// expects the fuller patients-table shape, so we normalize any worklist
// row into that shape before the profile view consumes it.
function worklistMemberToPatient(m) {
  if (!m) return null;
  // Field naming diverges across slices: HCC/AWV use short `in`/`g`,
  // CCM/SNP/HEDIS use full `initials`/`gender`. Read both so a slice with
  // either shape flows through to the banner.
  const rawG = m.g ?? m.gender;
  return {
    id: m.id,
    memberId: m.memberId,
    name: m.name,
    initials: m.in || m.initials || (m.name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
    gender: rawG === 'M' ? 'Male' : rawG === 'F' ? 'Female' : (rawG || ''),
    age: m.age,
    dob: m.dob,
    pcp: m.pcp,
    rp: m.rp,
    language: m.language || 'en',
  };
}

export function PatientDetailView() {
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  const patients = useAppStore(s => s.patients);
  const hccMembers = useAppStore(s => s.hccMembers);
  const awvMembers = useAppStore(s => s.awvMembers);
  const ccmWorklistMembers = useAppStore(s => s.ccmWorklistMembers);
  const snpWorklistMembers = useAppStore(s => s.snpWorklistMembers);
  const hedisMembers = useAppStore(s => s.hedisMembers);
  const navigateBackToWorklist = useAppStore(s => s.navigateBackToWorklist);
  // Active profile tab is stored on the store so callers (e.g. the CCM
  // worklist's "View billing" button) can deep-link into a specific tab.
  const activeTab = useAppStore(s => s.patientProfileTab);
  const setActiveTab = useAppStore(s => s.setPatientProfileTab);
  const [leftWidth, setLeftWidth] = useState(496);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const dragging = useRef(false);
  const bodyRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e) => {
      if (!dragging.current || !bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const newWidth = Math.max(300, Math.min(700, e.clientX - rect.left));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Fall back through every worklist slice when the id isn't in the main
  // patients list — those rows live in separate slices and shouldn't 404.
  const patient = patients.find(p => p.id === selectedPatientId)
    || worklistMemberToPatient(hccMembers.find(m => m.id === selectedPatientId))
    || worklistMemberToPatient(awvMembers?.find(m => m.id === selectedPatientId))
    || worklistMemberToPatient(ccmWorklistMembers?.find(m => m.id === selectedPatientId))
    || worklistMemberToPatient(snpWorklistMembers?.find(m => m.id === selectedPatientId))
    || worklistMemberToPatient(hedisMembers?.find(m => m.id === selectedPatientId));

  // The app assumes we're always inside a real patient's record — if the id
  // doesn't resolve to a patient (e.g. a stale hash from a deleted row, or a
  // worklist row wired to a placeholder id), bounce straight back to the
  // worklist instead of showing an orphan "Patient not found" screen.
  useEffect(() => {
    if (selectedPatientId && !patient) navigateBackToWorklist();
  }, [selectedPatientId, patient, navigateBackToWorklist]);

  if (!patient) return null;

  return (
    <div className={styles.wrapper}>
      <PatientP360Banner patient={patient} />
      <div className={styles.body} ref={bodyRef}>
        {!leftCollapsed && (
          <>
            <div style={{ width: leftWidth, minWidth: 300, maxWidth: 700, flexShrink: 0 }}>
              <PatientProfileTabs patientId={selectedPatientId} />
            </div>
            {/* Drag handle */}
            <div className={styles.dragHandle} onMouseDown={handleMouseDown}>
              <div className={styles.dragHandleLine} />
            </div>
          </>
        )}
        <div className={styles.rightPanel}>
          <ProfileTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            leftCollapsed={leftCollapsed}
            onToggleLeft={() => setLeftCollapsed(c => !c)}
          />
          <div className={styles.tabContent}>
            {activeTab === 'Overview' ? (
              <OverviewTab />
            ) : activeTab === 'Care Management' ? (
              <CareManagementView />
            ) : activeTab === 'Care Programs' ? (
              <CareProgramsTab />
            ) : (
              <TabPlaceholder tabName={activeTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

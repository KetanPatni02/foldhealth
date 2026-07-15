import { useState, useRef, useCallback } from 'react';
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

// HCC / AWV members live in a different store slice than the patients list.
// When the user opens a profile from the HCC worklist, we still want the
// banner to render — so we map the HCC row's fields to the shape the banner
// expects instead of falling back to "Patient not found".
function hccMemberToPatient(m) {
  if (!m) return null;
  return {
    id: m.id,
    memberId: m.memberId,
    name: m.name,
    initials: m.in || (m.name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
    gender: m.g === 'M' ? 'Male' : m.g === 'F' ? 'Female' : (m.g || ''),
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
  const [activeTab, setActiveTab] = useState('Overview');
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

  // Fall back to the HCC/AWV worklist when the id isn't in the main patients
  // list — those rows live in a separate slice and shouldn't 404.
  const patient = patients.find(p => p.id === selectedPatientId)
    || hccMemberToPatient(hccMembers.find(m => m.id === selectedPatientId));

  if (!patient) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.placeholder}>
          <Icon name="solar:user-cross-linear" size={40} color="var(--neutral-150)" />
          <span className={styles.placeholderTitle}>Patient not found</span>
        </div>
      </div>
    );
  }

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

import { useState, useRef, useEffect } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { StickyNote } from '../../../components/StickyNote/StickyNote';
import { StickyNoteAuditDrawer } from '../../../components/StickyNote/StickyNoteAuditDrawer';
import { useAppStore } from '../../../store/useAppStore';
import { CareGapSection } from './CareGapSection';
import { DiagnosisGapsTable } from './DiagnosisGapsTable';
import { AlertsTable } from './AlertsTable';
import { PAMIHxTab } from './PAMIHxTab';
import { VitalsLabsTab } from './VitalsLabsTab';
import { CARE_GAP_SECTIONS_EXTENDED, CARE_GAP_TABS } from '../data/careGapsMock';
import styles from './PatientProfileTabs.module.css';

export function PatientProfileTabs({ patientId }) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedGaps, setSelectedGaps] = useState([]);
  const [gapsCollapsed, setGapsCollapsed] = useState(false);
  const [diagnosisCollapsed, setDiagnosisCollapsed] = useState(false);
  const [alertsCollapsed, setAlertsCollapsed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const searchRef = useRef(null);

  const stickyNotes = useAppStore(s => s.stickyNotes);
  const fetchStickyNotes = useAppStore(s => s.fetchStickyNotes);
  const createStickyNote = useAppStore(s => s.createStickyNote);
  const updateStickyNote = useAppStore(s => s.updateStickyNote);
  const deleteStickyNote = useAppStore(s => s.deleteStickyNote);

  useEffect(() => { if (patientId) fetchStickyNotes(patientId); }, [patientId]);

  useEffect(() => { if (searching && searchRef.current) searchRef.current.focus(); }, [searching]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setSearching(false); setSearchQuery(''); }
  };

  const toggleGap = (id) => {
    setSelectedGaps(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const careGapSections = CARE_GAP_SECTIONS_EXTENDED.map(section => ({
    ...section,
    items: searchQuery
      ? section.items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : section.items,
  }));

return (
    <div className={styles.panel}>
      {/* Sticky tab bar OR search input */}
      {searching ? (
        <div className={styles.searchBar}>
          <input
            ref={searchRef}
            className={styles.searchInput}
            placeholder="Search gaps"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button className={styles.searchClose} onClick={() => { setSearching(false); setSearchQuery(''); }} aria-label="Close search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-300)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ) : (
        <div className={styles.tabRow}>
          {CARE_GAP_TABS.map((tab, i) => (
            <button key={tab} className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`} onClick={() => setActiveTab(i)}>
              {tab}
            </button>
          ))}
          <button className={styles.searchIcon} onClick={() => setSearching(true)} aria-label="Search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-300)" strokeWidth="1.5"><circle cx="11.5" cy="11.5" r="9.5" /><path strokeLinecap="round" d="M18.5 18.5L22 22" /></svg>
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className={styles.scrollContent}>
        {/* Sticky Note */}
        <StickyNote
          notes={stickyNotes}
          onSave={(id, text) => updateStickyNote(id, { text, author_name: 'You' }, patientId)}
          onCreate={(text) => createStickyNote({ patient_id: patientId, text, author_name: 'You', ehr_profile: 'Central Profile' })}
          onDelete={(id) => deleteStickyNote(id, patientId)}
          onAuditLog={() => setShowAuditDrawer(true)}
        />

        {/* Audit Log Drawer */}
        {showAuditDrawer && (
          <StickyNoteAuditDrawer
            patientId={patientId}
            note={stickyNotes[0]}
            profileOptions={['Central Profile', 'APC', 'JADE Health']}
            onClose={() => setShowAuditDrawer(false)}
          />
        )}

        {activeTab === 0 && (
          <div className={styles.gapsWrapper}>
            {/* Care Gaps header */}
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Care Gaps</span>
              <button className={styles.collapseToggle} onClick={() => setGapsCollapsed(v => !v)}>
                <Icon name={gapsCollapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'} size={12} color="var(--neutral-200)" />
              </button>
              {!gapsCollapsed && (
                <div className={styles.sectionActions}>
                  <span className={styles.viewBy}>View By: Action</span>
                  <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
                  <span className={styles.filterDivider} />
                  <ActionButton icon="custom:filter" size="S" tooltip="Filter" />
                </div>
              )}
            </div>

            <div className={`${styles.collapseOuter} ${gapsCollapsed ? styles.collapsedSection : ''}`}>
              <div className={styles.collapseInner}>
                <div className={styles.sections}>
                  {careGapSections.map(section => (
                    <CareGapSection key={section.title} section={section} selectedGaps={selectedGaps} onToggleGap={toggleGap} />
                  ))}
                </div>
              </div>
            </div>

            {/* Diagnosis Gaps header */}
            <div className={`${styles.sectionHeader} ${styles.diagnosisHeader}`}>
              <span className={styles.sectionTitle}>Diagnosis Gaps</span>
              <button className={styles.collapseToggle} onClick={() => setDiagnosisCollapsed(v => !v)}>
                <Icon name={diagnosisCollapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'} size={12} color="var(--neutral-200)" />
              </button>
              {!diagnosisCollapsed && (
                <div className={styles.sectionActions}>
                  <span className={styles.dosLabel}>DOS:</span>
                  <span className={styles.dosValue}>03/04/2025</span>
                  <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
                  <span className={styles.filterDivider} />
                  <ActionButton icon="custom:filter" size="S" tooltip="Filter" />
                </div>
              )}
            </div>

            <div className={`${styles.collapseOuter} ${diagnosisCollapsed ? styles.collapsedSection : ''}`}>
              <div className={styles.collapseInner}>
                <div className={styles.sections}>
                  <DiagnosisGapsTable />
                </div>
              </div>
            </div>

            {/* Alerts header */}
            <div className={`${styles.sectionHeader} ${styles.diagnosisHeader}`}>
              <span className={styles.sectionTitle}>Alerts</span>
              <button className={styles.collapseToggle} onClick={() => setAlertsCollapsed(v => !v)}>
                <Icon name={alertsCollapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'} size={12} color="var(--neutral-200)" />
              </button>
              {!alertsCollapsed && (
                <div className={styles.sectionActions}>
                  <ActionButton icon="custom:filter" size="S" tooltip="Filter" />
                </div>
              )}
            </div>

            <div className={`${styles.collapseOuter} ${alertsCollapsed ? styles.collapsedSection : ''}`}>
              <div className={styles.collapseInner}>
                <div className={styles.sections}>
                  <AlertsTable />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && <PAMIHxTab />}

        {activeTab === 2 && <VitalsLabsTab />}

        {activeTab > 2 && (
          <div className={styles.placeholder}>
            <Icon name="solar:document-text-linear" size={32} color="var(--neutral-150)" />
            <span>Coming soon</span>
          </div>
        )}
      </div>
    </div>
  );
}

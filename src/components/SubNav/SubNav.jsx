import { useEffect, useMemo } from 'react';
import { Icon } from '../Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import { HEDIS_MEMBERS } from '../../features/hedis-worklist/data/mock';
import styles from './SubNav.module.css';

// Define which lists map to which filter criteria
const SHARED_LISTS = [
  { label: 'SNP', filter: null },
  { label: 'Annual Visit', filter: null },
  { label: 'TOC', filter: null },  // default — shows all TOC patients
  { label: 'HCC', filter: null, view: 'hcc' },
  { label: 'HEDIS', filter: null, view: 'hedis' },
  { label: 'High Utilizers', filter: { readmission: 'Yes' } },
  { label: 'DM', filter: null },
];

export function SubNav({ collapsed }) {
  const activeSubnavList = useAppStore(s => s.activeSubnavList);
  const setActiveSubnavList = useAppStore(s => s.setActiveSubnavList);
  const setActiveFilters = useAppStore(s => s.setActiveFilters);
  const patients = useAppStore(s => s.patients);
  const hccMembers = useAppStore(s => s.hccMembers);
  const awvMembers = useAppStore(s => s.awvMembers || []);
  const fetchHccMembers = useAppStore(s => s.fetchHccMembers);
  const fetchAwvMembers = useAppStore(s => s.fetchAwvMembers);
  const clearSelected = useAppStore(s => s.clearSelected);
  const clearHccSelected = useAppStore(s => s.clearHccSelected);

  // Prefetch HCC and AWV members on mount so the count is available immediately
  useEffect(() => {
    fetchHccMembers();
    fetchAwvMembers();
  }, []);

  // Only TOC, HCC, and AWV show real counts; all others show 0
  const getCounts = useMemo(() => {
    const counts = {};
    for (const list of SHARED_LISTS) {
      if (list.view === 'hcc') counts[list.label] = hccMembers.length;
      else if (list.view === 'hedis') counts[list.label] = HEDIS_MEMBERS.length;
      else if (list.label === 'Annual Visit') counts[list.label] = awvMembers.length;
      else if (list.label === 'TOC') counts[list.label] = patients.length;
      else counts[list.label] = 0;
    }
    return counts;
  }, [patients, hccMembers, awvMembers]);

  const allPatientsCount = patients.length + hccMembers.length;

  const handleListClick = (list) => {
    setActiveSubnavList(list.label);
    // Clear selection from both worklists so selection doesn't bleed across lists
    clearSelected();
    clearHccSelected();
    // Apply the list's filter to the active filters
    if (list.filter) {
      setActiveFilters(list.filter);
    } else {
      setActiveFilters({});
    }
  };

  return (
    <aside className={[styles.subnav, collapsed ? styles.collapsed : ''].filter(Boolean).join(' ')}>
      <div className={styles.sectionLabel}>
        Worklists
        <button title="Add"><Icon name="solar:add-circle-linear" size={18} /></button>
      </div>
      <div className={styles.subLabel}>Shared Lists</div>
      {SHARED_LISTS.map(item => (
        <div
          key={item.label}
          className={[styles.item, activeSubnavList === item.label ? styles.active : ''].filter(Boolean).join(' ')}
          onClick={() => handleListClick(item)}
        >
          {item.label}
          <span className={styles.count}>{getCounts[item.label] || 0}</span>
        </div>
      ))}
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Patients</div>
      <div
        className={[styles.item, activeSubnavList === 'My Patients' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('My Patients'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        My Patients
        <span className={styles.count}>0</span>
      </div>
      <div
        className={[styles.item, activeSubnavList === 'All Patients' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('All Patients'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        All Patients
        <span className={styles.count}>{allPatientsCount || 0}</span>
      </div>
      <div
        className={[styles.item, activeSubnavList === 'Scheduling List' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('Scheduling List'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        Scheduling List
        <span className={styles.count}>{patients.length || 0}</span>
      </div>
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Population Groups</div>
      {[
        { label: 'All', value: 'pg:All' },
        { label: 'Static', value: 'pg:Static' },
        { label: 'Dynamic', value: 'pg:Dynamic' },
      ].map(item => (
        <div
          key={item.value}
          className={[styles.item, activeSubnavList === item.value ? styles.active : ''].filter(Boolean).join(' ')}
          onClick={() => { setActiveSubnavList(item.value); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
        >
          {item.label}
        </div>
      ))}
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Leads &amp; Contacts</div>

      {/* Archived Worklist — frozen snapshots of worklists, isolated from
          the live versions so upstream changes never alter them. */}
      <div className={styles.sectionLabel} style={{ marginTop: 8 }}>Archived Worklist</div>
      <div
        className={[styles.item, activeSubnavList === 'HCC (Archived)' ? styles.active : ''].filter(Boolean).join(' ')}
        onClick={() => { setActiveSubnavList('HCC (Archived)'); clearSelected(); clearHccSelected(); setActiveFilters({}); }}
      >
        HCC
        <span className={styles.count}>{hccMembers.length || 0}</span>
      </div>
    </aside>
  );
}

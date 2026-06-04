import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import { HEDIS_MEMBERS } from '../../features/hedis-worklist/data/mock';
import { FilterNameDialog } from '../../features/hcc/FilterNameDialog';
import styles from './SubNav.module.css';

// Define which lists map to which filter criteria
const SHARED_LISTS = [
  { label: 'SNP', filter: null },
  { label: 'AWV', filter: null },
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
  const fetchHccMembers = useAppStore(s => s.fetchHccMembers);
  const clearSelected = useAppStore(s => s.clearSelected);
  const clearHccSelected = useAppStore(s => s.clearHccSelected);
  // Saved filters per shared list — appears whenever the user is on a
  // shared list (HCC, TOC, SNP, AWV, HEDIS, High Utilizers, DM). The store
  // keys by list label and persists each list's saved views in localStorage.
  const savedFiltersByList = useAppStore(s => s.savedFiltersByList);
  const activeSavedIdByList = useAppStore(s => s.activeSavedIdByList);
  const applySavedFilter = useAppStore(s => s.applySavedFilter);
  const renameSavedFilter = useAppStore(s => s.renameSavedFilter);
  const deleteSavedFilter = useAppStore(s => s.deleteSavedFilter);
  const savedForActive = savedFiltersByList[activeSubnavList] || [];
  const activeSavedId = activeSavedIdByList[activeSubnavList] || null;
  const isSharedList = SHARED_LISTS.some(l => l.label === activeSubnavList);
  // Per-row dots menu + rename dialog
  const [filterMenu, setFilterMenu] = useState(null); // { id, rect } | null
  const [renameTarget, setRenameTarget] = useState(null);

  // Prefetch HCC members on mount so the count is available immediately
  useEffect(() => { fetchHccMembers(); }, []);

  // Only TOC and HCC show real counts; all others show 0
  const getCounts = useMemo(() => {
    const counts = {};
    for (const list of SHARED_LISTS) {
      if (list.view === 'hcc') counts[list.label] = hccMembers.length;
      else if (list.view === 'hedis') counts[list.label] = HEDIS_MEMBERS.length;
      else if (list.label === 'TOC') counts[list.label] = patients.length;
      else counts[list.label] = 0;
    }
    return counts;
  }, [patients, hccMembers]);

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
      {/* Saved Filters — appears on any shared list. Each list has its own
          saved views in the store (keyed by the list label). When the user
          saves a filter from a list's toolbar, it shows up here for that
          list and is persisted across reloads. */}
      {isSharedList && (
        <>
          <div className={styles.subLabel} style={{ marginTop: 8 }}>Saved Filters</div>
          {savedForActive.length === 0 ? (
            <div className={styles.item} style={{ color: 'var(--neutral-300)', cursor: 'default' }}>
              No saved filters yet
            </div>
          ) : savedForActive.map(sf => (
            <div
              key={sf.id}
              className={[styles.item, activeSavedId === sf.id ? styles.active : ''].filter(Boolean).join(' ')}
              onClick={() => applySavedFilter(activeSubnavList, sf.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sf.name}
              </span>
              <button
                type="button"
                aria-label={`Manage ${sf.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setFilterMenu({ id: sf.id, rect });
                }}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  padding: 2, display: 'inline-flex', borderRadius: 4,
                }}
              >
                <Icon name="solar:menu-dots-bold" size={14} color="var(--neutral-300)" />
              </button>
            </div>
          ))}
        </>
      )}
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
      <div className={styles.sectionLabel} style={{ marginTop: 4 }}>Leads &amp; Contacts</div>

      {filterMenu && createPortal(
        <>
          <div
            onClick={() => setFilterMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 70 }}
          />
          <div
            style={{
              position: 'fixed',
              top: filterMenu.rect.bottom + 4,
              left: Math.min(filterMenu.rect.right + 4, window.innerWidth - 170),
              zIndex: 71,
              background: 'var(--neutral-0)',
              border: '0.5px solid var(--neutral-150)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              padding: 4,
              minWidth: 150,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', border: 'none', background: 'transparent',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontWeight: 500, color: 'var(--neutral-500)',
              }}
              onClick={() => {
                const sf = savedForActive.find(x => x.id === filterMenu.id);
                setFilterMenu(null);
                if (sf) setRenameTarget(sf);
              }}
            >
              <Icon name="solar:pen-linear" size={14} color="var(--neutral-400)" />
              Edit Name
            </button>
            <button
              type="button"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', border: 'none', background: 'transparent',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontWeight: 500, color: 'var(--status-error)',
              }}
              onClick={() => { deleteSavedFilter(activeSubnavList, filterMenu.id); setFilterMenu(null); }}
            >
              <Icon name="solar:trash-bin-trash-linear" size={14} color="var(--status-error)" />
              Delete
            </button>
          </div>
        </>,
        document.body,
      )}

      <FilterNameDialog
        open={!!renameTarget}
        title="Rename Filter"
        submitLabel="Save"
        initialName={renameTarget?.name || ''}
        onSubmit={(name) => { renameSavedFilter(activeSubnavList, renameTarget.id, name); setRenameTarget(null); }}
        onCancel={() => setRenameTarget(null)}
      />
    </aside>
  );
}

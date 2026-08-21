import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useAppStore } from '../../../../store/useAppStore';
import { Icon } from '../../../../components/Icon/Icon';
import { Badge } from '../../../../components/Badge/Badge';
import { ActionButton } from '../../../../components/ActionButton/ActionButton';
import { SectionTitleBar } from '../../../../components/SectionTitleBar/SectionTitleBar';
import { WorklistShell } from '../../../../components/WorklistShell/WorklistShell';
import { ConfirmDialog } from '../../../../components/ConfirmDialog/ConfirmDialog';
import { useTableSort } from '../../../../components/HeaderCell/useTableSort';
import { EditLocationDrawer } from './EditLocationDrawer';
import panelStyles from '../AccountPanel.module.css';
import styles from './LocationRow.module.css';

const LOCATION_COLUMNS = [
  { key: 'name',    label: 'Name',         sortKey: 'name',        sticky: 'left', left: 0, width: 300 },
  { key: 'ehr',     label: 'EHR Instance', sortKey: 'ehrInstance', width: 200 },
  { key: 'address', label: 'Address',      sortKey: 'addressLine1', width: 320 },
  { key: 'zip',     label: 'Zip Code',     sortKey: 'zipCode',     width: 140 },
  { key: 'actions', label: 'Action',       sticky: 'right',        width: 120 },
];

// EHR badge tone map — keeps each EHR visually distinct in the table + the
// filter chip (Fold = primary purple, Elation = teal-adjacent, NEXTGEN = amber).
const EHR_TONE = {
  'Fold EHR':          'ai-care',
  'Elation Montrose':  'toc-engaged',
  'NEXTGEN':           'ai-social',
};

/**
 * Locations tab of Settings → Account. Owns the fetch + search + sort +
 * pagination, and hosts the New / Edit drawer.
 *
 * Renders inside the shared WorklistShell so the table reads identically to
 * every other worklist (sticky headers, hairline dividers, load-in animation,
 * sticky-right actions column).
 */
export function LocationsTab({ tabsForBar, activeTab, setActiveTab }) {
  const locations = useAppStore(s => s.practiceLocations);
  const loading   = useAppStore(s => s.practiceLocationsLoading);
  const fetched   = useAppStore(s => s.practiceLocationsFetched);
  const fetchLocations       = useAppStore(s => s.fetchPracticeLocations);
  const upsertLocation       = useAppStore(s => s.upsertPracticeLocation);
  const removeLocationStore  = useAppStore(s => s.removePracticeLocation);
  const showToast            = useAppStore(s => s.showToast);

  const [searchVal, setSearchVal] = useState('');
  const [editing, setEditing] = useState(null);   // location object being edited
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null); // location object flagged for delete

  // The store's fetched flag makes this a once-per-session query; the
  // upsert/remove mutations keep the local copy in sync afterwards.
  useEffect(() => {
    if (fetched) return;
    fetchLocations();
  }, [fetched, fetchLocations]);

  const filtered = useMemo(() => {
    if (!searchVal.trim()) return locations;
    const q = searchVal.toLowerCase();
    return locations.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.addressLine1 || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.state || '').toLowerCase().includes(q) ||
      (l.zipCode || '').toLowerCase().includes(q));
  }, [locations, searchVal]);

  const { sorted, sortKey, sortDir, requestSort } = useTableSort(filtered, 'name');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => { setPage(1); }, [searchVal, sortKey, sortDir]);

  const paginated = useMemo(
    () => sorted.slice((page - 1) * perPage, page * perPage),
    [sorted, page, perPage],
  );

  const handleSubmit = async (location) => {
    // Optimistic: update the local store immediately, then persist to
    // Supabase. On error we revert-by-refetch so the UI stays honest.
    upsertLocation(location);
    setEditing(null);
    setCreating(false);

    const row = {
      id:              location.id,
      name:            location.name,
      ehr_instance:    location.ehrInstance,
      address_line_1: location.addressLine1,
      address_line_2: location.addressLine2,
      city:            location.city,
      state:           location.state,
      zip_code:        location.zipCode,
      timezone:        location.timezone,
      google_map_link: location.googleMapLink,
      default_phone:   location.defaultPhone,
      business_hours:  location.businessHours,
      updated_at:      new Date().toISOString(),
    };
    const { error } = await supabase.from('practice_locations').upsert(row, { onConflict: 'id' });
    if (error) {
      showToast?.(`Save failed: ${error.message}`);
      fetchLocations();
    } else {
      showToast?.(`${location.name} saved`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    removeLocationStore(target.id);
    const { error } = await supabase
      .from('practice_locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', target.id);
    if (error) {
      showToast?.(`Delete failed: ${error.message}`);
      fetchLocations();
    } else {
      showToast?.(`${target.name} deleted`);
    }
  };

  const renderRow = (loc) => (
    <tr key={loc.id} className={styles.row} onClick={() => setEditing(loc)}>
      <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 0 }}>
        <span className={styles.nameCell}>{loc.name}</span>
      </td>
      <td className={styles.td}>
        {loc.ehrInstance ? (
          <Badge variant={EHR_TONE[loc.ehrInstance] || 'ai-neutral'} label={loc.ehrInstance} />
        ) : <span style={{ color: 'var(--neutral-200)' }}>—</span>}
      </td>
      <td className={styles.td}>
        <div className={styles.addressCell}>
          <span>{loc.addressLine1 || '—'}</span>
          {loc.addressLine2 && <span className={styles.addressLine2}>{loc.addressLine2}</span>}
        </div>
      </td>
      <td className={styles.td}>{loc.zipCode || '—'}</td>
      <td className={`${styles.td} ${styles.stickyRight}`} onClick={e => e.stopPropagation()}>
        <div className={styles.actionsCell}>
          <ActionButton icon="solar:pen-linear" size="L" tooltip="Edit" onClick={() => setEditing(loc)} />
          <ActionButton icon="solar:trash-bin-minimalistic-linear" size="L" tooltip="Delete" onClick={() => setDeleting(loc)} />
        </div>
      </td>
    </tr>
  );

  const header = (
    <SectionTitleBar
      tabs={tabsForBar}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={['search']}
      searchPlaceholder="Search locations…"
      searchValue={searchVal}
      onSearchChange={setSearchVal}
      primaryActionLabel="New Location"
      onPrimaryAction={() => setCreating(true)}
    />
  );

  return (
    <>
      <WorklistShell
        header={header}
        columns={LOCATION_COLUMNS}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        rows={paginated}
        renderRow={renderRow}
        loading={loading && !fetched}
        emptyState={
          <div className={panelStyles.emptyState}>
            <Icon name="solar:map-point-linear" size={40} color="var(--neutral-150)" />
            <p className={panelStyles.emptyTitle}>{searchVal ? 'No locations match' : 'No practice locations yet'}</p>
            <p className={panelStyles.emptyDesc}>
              {searchVal ? 'Try a different search term.' : 'Add your first practice location to start assigning users and appointments.'}
            </p>
          </div>
        }
        page={page}
        perPage={perPage}
        totalItems={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={(pp) => { setPerPage(pp); setPage(1); }}
        minTableWidth={1200}
      />

      {(editing || creating) && (
        <EditLocationDrawer
          location={editing}
          allLocations={locations}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSubmit={handleSubmit}
        />
      )}

      {deleting && (
        <ConfirmDialog
          variant="destructive"
          icon="solar:trash-bin-2-linear"
          title="Delete Location?"
          description={`Please confirm if you want to permanently delete "${deleting.name}" from the system.`}
          confirmLabel="Delete Location"
          onCancel={() => setDeleting(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

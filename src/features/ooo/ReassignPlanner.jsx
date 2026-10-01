import { useMemo, useState } from 'react';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { AssigneeChange } from '../../components/AssigneeChange/AssigneeChange';
import { AvatarGroup } from '../../components/AvatarGroup/AvatarGroup';
import { Badge } from '../../components/Badge/Badge';
import { BulkBar } from '../../components/BulkBar/BulkBar';
import { ConfirmDialog } from '../../components/ConfirmDialog/ConfirmDialog';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { Icon } from '../../components/Icon/Icon';
import { InfoBar } from '../../components/InfoBar/InfoBar';
import { Link } from '../../components/Link/Link';
import { MenuPopover } from '../../components/MenuPopover/MenuPopover';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { UserPickerPopover } from '../../components/UserPickerPopover/UserPickerPopover';
import { useAppStore } from '../../store/useAppStore';
import { initialsOf } from './oooUtils';
import { coveringProviders, groupByDepartment, planDetail } from './reassignUtils';
import { ApptRow, DeptGroup } from './ReassignParts';
import ooo from './ooo.module.css';
import styles from './reassign.module.css';

const checkState = (ids, selected) => {
  const n = ids.filter(id => selected.has(id)).length;
  return n === 0 ? false : n === ids.length ? true : 'indeterminate';
};
const pickerUser = (u) => ({ id: u.id, name: u.name, initials: u.initials, role: u.clinicalRoles?.[0] || u.role || '' });

/**
 * "Select Reassignment Providers" with real appointments (Figma Eventus
 * 16978:129171 and the frames around it). The away provider's appointments
 * in scope, by department:
 *   - departments someone else covers: pick a covering provider for the
 *     whole department or per appointment (only people who work there and
 *     aren't out themselves), or mark appointments to cancel;
 *   - departments nobody else covers, grouped under "No users available for
 *     reassignment": they can only be marked to cancel.
 * Filters (State, Department, Appointment Type), a flat list view, and bulk
 * select with Reassign / Cancel / Undo Cancellation. Nothing changes until
 * the drawer's Confirm runs the plan.
 *
 * @param {object}   props
 * @param {object[]} props.appointments – In scope (see scopeAppointments)
 * @param {string}   props.awayUser
 * @param {{ from, to }} props.timeWindow
 * @param {object}   props.plan        – appointment id → { action, to? }
 * @param {function} props.onPlan      – (updater: plan => plan) => void
 */
export function ReassignPlanner({ appointments, awayUser, timeWindow, plan, onPlan }) {
  const users = useAppStore(s => s.platformUsers);
  const oooRecords = useAppStore(s => s.oooRecords);
  const locations = useAppStore(s => s.practiceLocations);
  const showToast = useAppStore(s => s.showToast);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stateF, setStateF] = useState([]);
  const [deptF, setDeptF] = useState([]);
  const [typeF, setTypeF] = useState([]);
  const [view, setView] = useState('grouped');
  const [selected, setSelected] = useState(() => new Set());
  const [picker, setPicker] = useState(null);   // { rect, users, selected?, onPick, onUnassign? }
  const [menu, setMenu] = useState(null);       // { rect, items, onSelect }
  const [confirm, setConfirm] = useState(null); // { ids }
  const [noUsersOpen, setNoUsersOpen] = useState(false);

  const stateOf = useMemo(() => new Map((locations || []).map(l => [l.name, l.state || ''])), [locations]);
  const shown = useMemo(() => appointments.filter(a =>
    (!deptF.length || deptF.includes(a.location))
    && (!typeF.length || typeF.includes(a.appointment_type_name))
    && (!stateF.length || stateF.includes(stateOf.get(a.location)))), [appointments, deptF, typeF, stateF, stateOf]);

  // Who can cover each department, worked out once.
  const covering = useMemo(() => {
    const map = new Map();
    groupByDepartment(appointments).forEach(({ name }) => {
      map.set(name, coveringProviders(name, users, { awayUser, oooRecords, window: timeWindow }).map(pickerUser));
    });
    return map;
  }, [appointments, users, awayUser, oooRecords, timeWindow]);
  const groups = groupByDepartment(shown);
  const coveredGroups = groups.filter(g => covering.get(g.name)?.length);
  const uncoveredGroups = groups.filter(g => !covering.get(g.name)?.length);
  const deptOf = useMemo(() => new Map(appointments.map(a => [a.id, (a.location || '').trim() || 'No Department'])), [appointments]);

  // ── Plan edits ──
  const assign = (ids, to) => onPlan(p => { const n = { ...p }; ids.forEach(id => { n[id] = { action: 'reassign', to }; }); return n; });
  const clear = (ids) => onPlan(p => { const n = { ...p }; ids.forEach(id => { delete n[id]; }); return n; });
  const cancel = (ids) => onPlan(p => { const n = { ...p }; ids.forEach(id => { n[id] = { action: 'cancel' }; }); return n; });
  const allCancelled = (ids) => ids.length > 0 && ids.every(id => plan[id]?.action === 'cancel');
  const askCancel = (ids) => (ids.length > 1 ? setConfirm({ ids }) : cancel(ids));

  // ── Selection ──
  const toggle = (ids, on) => setSelected(s => { const n = new Set(s); ids.forEach(id => (on ? n.add(id) : n.delete(id))); return n; });
  const selectedIds = [...selected].filter(id => appointments.some(a => a.id === id));

  const openPicker = (e, ids, dept) => {
    const list = covering.get(dept) || [];
    const names = [...new Set(ids.map(id => plan[id]?.to).filter(Boolean))];
    setPicker({
      rect: e.currentTarget.getBoundingClientRect(),
      users: list,
      selected: names.length === 1 ? names[0] : undefined,
      onPick: (u) => assign(ids, u.name),
      onUnassign: names.length ? () => clear(ids) : undefined,
    });
  };
  const openMenu = (e, ids, canReassign) => {
    const cancelled = allCancelled(ids);
    setMenu({
      rect: e.currentTarget.getBoundingClientRect(),
      items: [
        cancelled
          ? { key: 'undo', label: 'Undo Cancellation', icon: 'solar:undo-left-linear' }
          : { key: 'cancel', label: ids.length > 1 ? 'Mark All to Cancel' : 'Mark to Cancel', icon: 'solar:close-circle-linear', danger: true },
        ...(canReassign && ids.some(id => plan[id]) ? [{ key: 'clear', label: 'Clear', icon: 'solar:eraser-linear' }] : []),
      ],
      onSelect: (key) => {
        if (key === 'cancel') askCancel(ids);
        else clear(ids);
      },
    });
  };

  // ── Controls ──
  const assigneeFor = (ids, dept) => {
    const names = [...new Set(ids.filter(id => plan[id]?.action === 'reassign').map(id => plan[id].to))];
    if (names.length > 1) {
      return (
        <button type="button" className={ooo.assigneePicker} onClick={(e) => openPicker(e, ids, dept)} aria-label={`Covering providers for ${dept}`}>
          <AvatarGroup people={names.map(n => ({ name: n, initials: initialsOf(n) }))} variant="staff" size="XS" max={3} />
        </button>
      );
    }
    return (
      <AssigneeChange
        avatarOnly
        size="S"
        unassigned={!names.length}
        name={names[0]}
        initials={names[0] ? initialsOf(names[0]) : undefined}
        ariaLabel={names[0] ? `Covering provider: ${names[0]}` : `Pick a covering provider for ${dept}`}
        onClick={(e) => openPicker(e, ids, dept)}
      />
    );
  };
  const cancelledTag = (ids) => (
    <span className={styles.cancelledTag}>
      <Badge tone="error" size="S" label="Cancelled" />
      <ActionButton icon="solar:undo-left-linear" size="S" tooltip="Undo Cancellation" tooltipLeft onClick={() => clear(ids)} />
    </span>
  );
  const markLink = (ids, label = 'Mark to Cancel') => (
    <Link
      className={styles.cancelLink}
      role="button"
      tabIndex={0}
      onClick={() => askCancel(ids)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); askCancel(ids); } }}
    >
      {label}
    </Link>
  );
  const box = (ids, label) => (
    <Checkbox checked={checkState(ids, selected)} onCheckedChange={(v) => toggle(ids, v === true)} aria-label={label} />
  );

  const row = (a, canReassign) => {
    const ids = [a.id];
    const trail = plan[a.id]?.action === 'cancel'
      ? cancelledTag(ids)
      : canReassign
        ? (
          <span className={styles.controls}>
            {assigneeFor(ids, deptOf.get(a.id))}
            <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More Options" tooltipLeft onClick={(e) => openMenu(e, ids, true)} />
          </span>
        )
        : markLink(ids);
    return <ApptRow key={a.id} appt={a} lead={box(ids, `Select ${a.patient_name || 'appointment'}`)} trail={trail} />;
  };

  const deptCard = (g, canReassign) => {
    const ids = g.appointments.map(a => a.id);
    const controls = allCancelled(ids)
      ? cancelledTag(ids)
      : canReassign
        ? (
          <span className={styles.controls}>
            {assigneeFor(ids, g.name)}
            <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More Options" tooltipLeft onClick={(e) => openMenu(e, ids, true)} />
          </span>
        )
        : markLink(ids);
    return (
      <DeptGroup
        key={g.name}
        title={g.name}
        count={ids.length}
        detail={planDetail(plan, g.appointments)}
        lead={box(ids, `Select ${g.name}`)}
        controls={controls}
        items={g.appointments}
        renderItem={(a) => row(a, canReassign)}
      />
    );
  };

  // Bulk: reassign to someone who covers every selected appointment's department.
  const bulkActions = (() => {
    if (!selectedIds.length) return [];
    if (allCancelled(selectedIds)) {
      return [{ label: 'Undo Cancellation', icon: 'solar:undo-left-linear', onClick: () => { clear(selectedIds); setSelected(new Set()); } }];
    }
    const depts = [...new Set(selectedIds.map(id => deptOf.get(id)))];
    const common = depts.reduce((acc, d) => {
      const names = new Set((covering.get(d) || []).map(u => u.name));
      return acc === null ? [...(covering.get(d) || [])] : acc.filter(u => names.has(u.name));
    }, null) || [];
    return [
      {
        label: 'Reassign',
        icon: 'solar:user-plus-rounded-linear',
        onClick: (ids, e) => {
          if (!common.length) { showToast?.('No one covers all the selected departments. Pick fewer departments.'); return; }
          setPicker({ rect: e.currentTarget.getBoundingClientRect(), users: common, onPick: (u) => { assign(ids, u.name); setSelected(new Set()); } });
        },
      },
      { label: 'Cancel', icon: 'solar:calendar-mark-linear', variant: 'destructive', onClick: (ids) => setConfirm({ ids, clearSelection: true }) },
    ];
  })();

  if (!appointments.length) {
    return (
      <div className={styles.planner}>
        <span className={styles.plannerTitle}>Select Reassignment Providers</span>
        <div className={ooo.providersEmpty}>
          <RingEmptyState size="S" icon="solar:calendar-linear" label="No upcoming appointments to reassign for these dates" />
        </div>
      </div>
    );
  }

  const confirmDepts = confirm ? new Set(confirm.ids.map(id => deptOf.get(id))).size : 0;
  const allShownIds = shown.map(a => a.id);
  const uncoveredIds = uncoveredGroups.flatMap(g => g.appointments.map(a => a.id));
  const filterCount = stateF.length + deptF.length + typeF.length;

  return (
    <div className={styles.planner}>
      <div className={styles.plannerHead}>
        <span className={styles.plannerTitle}>Select Reassignment Providers</span>
        <span className={styles.plannerTools}>
          <ActionButton icon="solar:filter-linear" size="L" tooltip="Filters" count={filterCount || undefined} active={filtersOpen} onClick={() => setFiltersOpen(o => !o)} />
          <span className={ooo.actionDivider} aria-hidden="true" />
          <span className={ooo.viewToggle} role="group" aria-label="View">
            <ActionButton icon="solar:sort-from-top-to-bottom-linear" size="L" tooltip="Group by department" className={view === 'grouped' ? ooo.viewToggleOn : undefined} aria-pressed={view === 'grouped'} onClick={() => setView('grouped')} />
            <ActionButton icon="solar:sort-vertical-linear" size="L" tooltip="List every appointment" tooltipLeft className={view === 'list' ? ooo.viewToggleOn : undefined} aria-pressed={view === 'list'} onClick={() => setView('list')} />
          </span>
        </span>
      </div>
      {filtersOpen && (
        <div className={styles.filterRow}>
          <FilterChip label="State" options={[...new Set(appointments.map(a => stateOf.get(a.location)).filter(Boolean))].sort()} selected={stateF} onChange={setStateF} />
          <FilterChip label="Department" options={groupByDepartment(appointments).map(g => g.name)} selected={deptF} onChange={setDeptF} searchable />
          <FilterChip label="Appointment Type" options={[...new Set(appointments.map(a => a.appointment_type_name).filter(Boolean))].sort()} selected={typeF} onChange={setTypeF} searchable />
        </div>
      )}
      <InfoBar tone="info" variant="inline">Appointments are cancelled with the original provider and rebooked on the covering provider&apos;s EHR calendar. Double-booking may occur if that slot is already taken.</InfoBar>

      {!shown.length ? (
        <span className={styles.empty}>No appointments match these filters.</span>
      ) : view === 'list' ? (
        <>
          <label className={styles.selectAll}>{box(allShownIds, 'Select all')}Select All</label>
          <div className={styles.listFlat}>
            {shown.map(a => row(a, !!covering.get(deptOf.get(a.id))?.length))}
          </div>
        </>
      ) : (
        <>
          <label className={styles.selectAll}>{box(allShownIds, 'Select all')}Select All</label>
          <div className={styles.list}>
            {coveredGroups.map(g => deptCard(g, true))}
            {uncoveredGroups.length > 0 && (
              <div className={styles.noUsers}>
                <div className={styles.noUsersHead}>
                  <button type="button" className={styles.noUsersToggle} onClick={() => setNoUsersOpen(o => !o)} aria-expanded={noUsersOpen}>
                    No users available for reassignment
                    <span className={styles.countBadge}>{uncoveredIds.length}</span>
                    <Icon name={noUsersOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'} size={12} color="var(--neutral-300)" />
                  </button>
                  {allCancelled(uncoveredIds) ? cancelledTag(uncoveredIds) : markLink(uncoveredIds, 'Mark to Cancel All')}
                </div>
                {noUsersOpen && (
                  <>
                    <label className={styles.selectAll}>{box(uncoveredIds, 'Select all without covering providers')}Select All</label>
                    {uncoveredGroups.map(g => deptCard(g, false))}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <BulkBar
        className={styles.bulkInDrawer}
        selectedIds={selectedIds}
        onClear={() => setSelected(new Set())}
        noun="Appointments"
        actions={bulkActions}
      />

      {picker && (
        <UserPickerPopover
          anchorRect={picker.rect}
          users={picker.users}
          selected={picker.selected}
          onSelect={picker.onPick}
          onUnassign={picker.onUnassign}
          onClose={() => setPicker(null)}
          emptyText="No one else works at this department."
        />
      )}
      {menu && (
        <MenuPopover
          anchorRect={menu.rect}
          items={menu.items}
          onSelect={(key) => { menu.onSelect(key); setMenu(null); }}
          onClose={() => setMenu(null)}
          align="right"
        />
      )}
      {confirm && (
        // Figma Eventus 16978:129404.
        <ConfirmDialog
          variant="destructive"
          title="Mark for Cancellation?"
          description={`You are about to mark ${confirm.ids.length} appointment${confirm.ids.length === 1 ? '' : 's'} assigned to ${awayUser} for ${confirmDepts} Department${confirmDepts === 1 ? '' : 's'} for cancellation.`}
          confirmLabel="Mark To Cancel"
          cancelLabel="Dismiss"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { cancel(confirm.ids); if (confirm.clearSelection) setSelected(new Set()); setConfirm(null); }}
        />
      )}
    </div>
  );
}

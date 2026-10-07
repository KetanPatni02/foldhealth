import { useMemo } from 'react';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { Select } from '../../components/Select/Select';
// Locations and statuses come from the ScheduleDrawer constants — the booking
// form is what writes these values, so sourcing the filter options from the
// same place keeps every chip option matchable against real rows.
import { APPOINTMENT_STATUSES } from '../../components/ScheduleDrawer/scheduleDrawerConstants';
import { useLocationOptions } from '../../components/ScheduleDrawer/useLocationOptions';
import { /* TIMEZONE_OPTIONS, */ VIEW_LABELS, VIEWS } from './calendarUtils';
import { OOO_ICON, peopleOptions } from '../ooo/oooUtils';
import { HolidayIcon } from '../../components/Icon/HolidayIcon';
import styles from './CalendarView.module.css';

const SCHEDULE_MENU = [
  { key: 'appointment', label: 'Appointment' },
  { key: 'block-time', label: 'Block Time' },
  { key: 'group-appointment', label: 'Group Appointment' },
  { key: 'ooo', label: 'New Out of Office Record' },
  { key: 'reassign', label: 'Reassign Appointments' },
];

export function CalendarToolbar({
  calendarTitle,
  currentView,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  users,
  filterUser,
  onFilterUserChange,
  filterLocation,
  onFilterLocationChange,
  apptTypesForFilter,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  // timezone, onTimezoneChange: the Timezone filter is parked (see below).
  onScheduleSelect,
  onOpenOoo,
  onOpenHolidays,
}) {
  // People by id; the chip speaks labels (a name, plus email when shared).
  const userOptions = useMemo(() => peopleOptions(users), [users]);
  const labelOf = useMemo(() => new Map(userOptions.map(o => [o.value, o.label])), [userOptions]);
  const keyOf = useMemo(() => new Map(userOptions.map(o => [o.label, o.value])), [userOptions]);
  const locationOptions = useLocationOptions();
  return (
    // Laid out like the legacy calendar bar: who / where / which view on
    // the left, the date and its arrows in the middle, then what's shown,
    // Schedule and the settings on the right.
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        {/* Users — multi-select FilterChip with an in-popover search box.
            `filterUser` holds people's ids; the chip shows their names, and
            two people with the same name are told apart by email. */}
        <FilterChip
          label="Users"
          options={userOptions.map(o => o.label)}
          selected={filterUser.map(k => labelOf.get(k) || k)}
          onChange={(labels) => onFilterUserChange(labels.map(l => keyOf.get(l) || l))}
          searchable
          // Week shows one user's calendar: pick one, and it always has one.
          singleSelect={currentView === 'week'}
          noClear={currentView === 'week'}
          noClearNeutral={false}
        />

        {/* Locations */}
        <FilterChip
          label="Location"
          options={locationOptions}
          selected={filterLocation}
          onChange={onFilterLocationChange}
        />

        <Select
          options={VIEWS.map(v => ({ value: v, label: VIEW_LABELS[v] }))}
          value={currentView}
          onChange={onViewChange}
          className={styles.viewSelect}
        />
      </div>

      <div className={styles.toolbarCenter}>
        <button className={styles.todayBtn} onClick={onToday}>Today</button>
        <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous" onClick={onPrev} />
        <h2 className={styles.monthTitle}>{calendarTitle}</h2>
        <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next" onClick={onNext} />
      </div>

      <div className={styles.toolbarRight}>
        {/* Appointment Types — pulled from DB with a fallback list. The
            per-type color dot the old Select rendered isn't shown inside
            the FilterChip popover options (strings only). */}
        <FilterChip
          label="Appointment Type"
          options={apptTypesForFilter.map(t => t.name)}
          selected={filterType}
          onChange={onFilterTypeChange}
          searchable
        />

        {/* Status */}
        <FilterChip
          label="Status"
          options={APPOINTMENT_STATUSES}
          selected={filterStatus}
          onChange={onFilterStatusChange}
        />

        {/* Timezone filter: parked for now (Day view doesn't follow it yet).
            Uncomment to bring it back.
        <FilterChip
          label="Timezone"
          options={TIMEZONE_OPTIONS.map(t => t.label)}
          selected={[TIMEZONE_OPTIONS.find(t => t.value === timezone)?.label].filter(Boolean)}
          onChange={(next) => {
            const picked = TIMEZONE_OPTIONS.find(t => t.label === next[0]);
            if (picked) onTimezoneChange(picked.value);
          }}
          singleSelect
        />
        */}

        <label className={styles.availabilityToggle}>
          <input type="checkbox" />
          <span>Availability</span>
        </label>
        {/* Figma Eventus 17596:117364: the whole button opens the menu. */}
        <Button
          variant="secondary"
          menuItems={SCHEDULE_MENU}
          onMenuSelect={onScheduleSelect}
          menuAriaLabel="Schedule"
          menuWidth={220}
        >
          Schedule
        </Button>
        <span className={styles.actionDivider} aria-hidden="true" />
        {/* Everyone's Out of Office records, and the holidays, in drawers. */}
        <ActionButton icon={OOO_ICON} size="L" tooltip="Out of Office Records" onClick={onOpenOoo} />
        <span className={styles.actionDivider} aria-hidden="true" />
        <ActionButton size="L" tooltip="Holidays" onClick={onOpenHolidays}><HolidayIcon size={20} color="var(--neutral-300)" /></ActionButton>
        <span className={styles.actionDivider} aria-hidden="true" />
        <ActionButton icon="solar:tuning-2-linear" size="L" tooltip="Settings" />
        <span className={styles.actionDivider} aria-hidden="true" />
        <ActionButton icon="solar:info-circle-linear" size="L" tooltip="Help" />
      </div>
    </div>
  );
}

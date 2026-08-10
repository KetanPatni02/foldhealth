import { ActionButton } from '../../components/ActionButton/ActionButton';
import { FilterChip } from '../../components/FilterChip/FilterChip';
import { LOCATIONS, STATUSES, TIMEZONE_OPTIONS, VIEW_LABELS, VIEWS } from './calendarUtils';
import styles from './CalendarView.module.css';

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
  timezone,
  onTimezoneChange,
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <h2 className={styles.monthTitle}>{calendarTitle}</h2>
        <div className={styles.viewTabs}>
          {VIEWS.map(v => (
            <button key={v} className={`${styles.viewTab} ${currentView === v ? styles.viewTabActive : ''}`} onClick={() => onViewChange(v)}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
        <button className={styles.todayBtn} onClick={onToday}>Today</button>
        <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous" onClick={onPrev} />
        <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next" onClick={onNext} />
      </div>
      <div className={styles.toolbarRight}>
        {/* Users — multi-select FilterChip with an in-popover search box.
            Options are user names; the appointments payload's
            `primary_user` is a name too, so no id ↔ name mapping is
            needed to filter. Trade-off vs. the old UserPickerDropdown:
            per-user avatars in the option list are gone (FilterChip
            options are strings). */}
        <FilterChip
          label="Users"
          options={users.map(u => u.name)}
          selected={filterUser}
          onChange={onFilterUserChange}
          searchable
        />

        {/* Locations */}
        <FilterChip
          label="Location"
          options={LOCATIONS}
          selected={filterLocation}
          onChange={onFilterLocationChange}
        />

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
          options={STATUSES}
          selected={filterStatus}
          onChange={onFilterStatusChange}
        />

        {/* Timezone — FilterChip singleSelect. Options are the human-
            readable labels ("IST (GMT+5:30)"); we map back to the IANA
            zone id (Asia/Kolkata) on change and forward. */}
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

        <label className={styles.availabilityToggle}>
          <input type="checkbox" />
          <span>Availability</span>
        </label>
        <ActionButton icon="solar:tuning-2-linear" size="L" tooltip="Settings" />
        <ActionButton icon="solar:info-circle-linear" size="L" tooltip="Help" />
      </div>
    </div>
  );
}

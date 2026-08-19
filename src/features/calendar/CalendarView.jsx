import { ScheduleDrawer } from '../../components/ScheduleDrawer/ScheduleDrawer';
import { CalendarContent } from './CalendarContent';
import { CalendarToolbar } from './CalendarToolbar';
import { useCalendarView } from './useCalendarView';
import styles from './CalendarView.module.css';

export function CalendarView() {
  const calendar = useCalendarView();

  return (
    <div className={styles.wrapper}>
      <CalendarToolbar
        calendarTitle={calendar.calendarTitle}
        currentView={calendar.currentView}
        onViewChange={calendar.handleViewChange}
        onToday={calendar.handleToday}
        onPrev={calendar.handlePrev}
        onNext={calendar.handleNext}
        users={calendar.users}
        filterUser={calendar.filterUser}
        onFilterUserChange={calendar.setFilterUser}
        filterLocation={calendar.filterLocation}
        onFilterLocationChange={calendar.setFilterLocation}
        apptTypesForFilter={calendar.apptTypesForFilter}
        filterType={calendar.filterType}
        onFilterTypeChange={calendar.setFilterType}
        filterStatus={calendar.filterStatus}
        onFilterStatusChange={calendar.setFilterStatus}
        timezone={calendar.timezone}
        onTimezoneChange={calendar.setTimezone}
      />

      <div className={styles.calendarWrap}>
        <CalendarContent
          onSlotClick={calendar.handleSlotClick}
          onEventClick={calendar.handleEventClick}
          onRangeUpdate={calendar.handleRangeUpdate}
          calendarRef={calendar.calendarRef}
          eventsPluginRef={calendar.eventsPluginRef}
          dbAppointments={calendar.filteredAppointments}
        />
      </div>

      {calendar.showSchedule && (
        <ScheduleDrawer
          selectedSlot={calendar.selectedSlot}
          existingAppointment={calendar.clickedAppointment}
          onClose={calendar.handleCloseDrawer}
          onSave={calendar.fetchAppointments}
          timezoneLabel={calendar.timezoneLabel}
        />
      )}
    </div>
  );
}

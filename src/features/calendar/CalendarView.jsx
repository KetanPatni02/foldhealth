import { useMemo, useState } from 'react';
import { ScheduleDrawer } from '../../components/ScheduleDrawer/ScheduleDrawer';
import { CalendarContent } from './CalendarContent';
import { CalendarToolbar } from './CalendarToolbar';
import { DayResourceView } from './DayResourceView';
import { useCalendarView } from './useCalendarView';
import { useAppStore } from '../../store/useAppStore';
import { CalendarOooLayer } from '../ooo/CalendarOooLayer';
import { OooAllRecordsDrawer } from '../ooo/OooRecordsDrawers';
import { recordsOnDate } from '../ooo/oooUtils';
import { useOooRecordActions } from '../ooo/useOooRecordActions';
import styles from './CalendarView.module.css';

export function CalendarView() {
  const calendar = useCalendarView();
  const oooRecords = useAppStore(s => s.oooRecords);
  // Out of Office: everyone's records, from a Month day's "Providers Out of
  // Office" link, with that day highlighted.
  const [oooAll, setOooAll] = useState(null); // { highlightDate? }
  const oooActions = useOooRecordActions();
  const showToast = useAppStore(s => s.showToast);
  const isDay = calendar.currentView === 'day';
  // Week and a one-user Month show that user's OOO time on the grid; Day
  // draws its own per-user columns.
  const focusUser = calendar.currentView === 'week'
    ? calendar.viewUsers[0] || null
    : calendar.filterUser.length === 1 ? calendar.filterUser[0] : null;
  const [dayProvider, setDayProvider] = useState(null);

  // Day columns: the picked users, else everyone with an appointment or an
  // OOO record that day, else the signed-in user.
  const dayUsers = useMemo(() => {
    if (!isDay) return [];
    if (calendar.filterUser.length) return calendar.filterUser;
    const [y, m, d] = calendar.selectedDate.split('-');
    const booked = calendar.filteredAppointments.filter(a => a.date === `${m}-${d}-${y}`).map(a => a.primary_user);
    const away = recordsOnDate(oooRecords, calendar.selectedDate).map(r => r.userName);
    const names = [...new Set([...booked, ...away].filter(Boolean))].sort();
    return names.length ? names : [calendar.meName].filter(Boolean);
  }, [isDay, calendar.filterUser, calendar.selectedDate, calendar.filteredAppointments, oooRecords, calendar.meName]);

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
        filterUser={calendar.currentView === 'week' ? calendar.viewUsers : calendar.filterUser}
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

      {isDay && (
        <DayResourceView
          date={calendar.selectedDate}
          users={dayUsers}
          appointments={calendar.filteredAppointments}
          oooRecords={oooRecords}
          timezoneLabel={calendar.timezoneLabel}
          onSlotClick={(slot, userName) => {
            setDayProvider(userName);
            calendar.setClickedAppointment(null);
            calendar.setSelectedSlot(slot);
            calendar.setShowSchedule(true);
          }}
          onEventClick={(appt) => {
            setDayProvider(null);
            calendar.setClickedAppointment(appt);
            calendar.setShowSchedule(true);
          }}
          onEditOoo={oooActions.openEdit}
          onBlocked={showToast}
        />
      )}
      {calendar.currentView === 'week' && calendar.viewUsers[0] && (
        <div className={styles.weekUserRow}><span aria-hidden="true" /><span>{calendar.viewUsers[0]}</span></div>
      )}
      {/* schedule-x stays mounted in Day view (it owns the date and the
          toolbar's navigation), just hidden behind the per-user columns. */}
      <div className={isDay ? `${styles.calendarWrap} ${styles.calendarHidden}` : styles.calendarWrap}>
        <CalendarContent
          onSlotClick={calendar.handleSlotClick}
          onEventClick={calendar.handleEventClick}
          onRangeUpdate={calendar.handleRangeUpdate}
          calendarRef={calendar.calendarRef}
          eventsPluginRef={calendar.eventsPluginRef}
          dbAppointments={calendar.filteredAppointments}
        />
        <CalendarOooLayer
          currentView={calendar.currentView}
          focusUser={focusUser}
          records={oooRecords}
          renderTick={`${calendar.renderTick}-${calendar.filteredAppointments.length}`}
          onOpenDay={(date) => setOooAll({ highlightDate: date })}
          onEdit={oooActions.openEdit}
        />
      </div>

      {oooAll && <OooAllRecordsDrawer highlightDate={oooAll.highlightDate} onClose={() => setOooAll(null)} />}
      {oooActions.elements}
      {calendar.showSchedule && (
        <ScheduleDrawer
          selectedSlot={calendar.selectedSlot}
          existingAppointment={calendar.clickedAppointment}
          initialProvider={dayProvider || undefined}
          onClose={() => { setDayProvider(null); calendar.handleCloseDrawer(); }}
          onSave={calendar.fetchAppointments}
          timezoneLabel={calendar.timezoneLabel}
          source="calendar"
        />
      )}
    </div>
  );
}

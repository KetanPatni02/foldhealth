import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FALLBACK_APPOINTMENT_TYPES } from '../../components/ScheduleDrawer/scheduleDrawerConstants';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import {
  appointmentMatchesStatuses,
  apptToEvent,
  BROWSER_TIMEZONE,
  getNowInTimezone,
  getTodayInTimezone,
  getTimezoneOffset,
  MONTH_NAMES,
} from './calendarUtils';
import styles from './CalendarView.module.css';

export function useCalendarView() {
  const [currentView, setCurrentView] = useState('week');
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const calendarRef = useRef(null);
  const eventsPluginRef = useRef(null);
  const [timezone, setTimezone] = useState(BROWSER_TIMEZONE);
  const timezoneLabel = useMemo(() => getTimezoneOffset(timezone), [timezone]);

  const [calendarTitle, setCalendarTitle] = useState(() => {
    const today = getTodayInTimezone(timezone);
    const [y, m] = today.split('-');
    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
  });

  const [filterUser, setFilterUser] = useState([]);
  const [filterLocation, setFilterLocation] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);

  const appointments = useAppStore(s => s.appointments);
  const appointmentTypes = useAppStore(s => s.appointmentTypes);
  const fetchAppointments = useAppStore(s => s.fetchAppointments);
  const fetchAppointmentTypes = useAppStore(s => s.fetchAppointmentTypes);
  const showToast = useAppStore(s => s.showToast);
  const pendingOpenAppointmentId = useAppStore(s => s.pendingOpenAppointmentId);
  const clearPendingOpenAppointmentId = useAppStore(s => s.clearPendingOpenAppointmentId);

  useEffect(() => {
    fetchAppointments();
    fetchAppointmentTypes();
  }, []);

  const apptTypesForFilter = appointmentTypes.length > 0 ? appointmentTypes : FALLBACK_APPOINTMENT_TYPES;

  const [users, setUsers] = useState([]);
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, status')
      .order('full_name')
      .then(({ data, error }) => {
        // postgrest resolves (never rejects) on failure — without this the
        // Users chip just renders empty with no signal that the query failed.
        if (error) { console.error('Failed to load users for the calendar filter', error); return; }
        if (data?.length) {
          setUsers(data.map(u => ({
            id: u.id,
            name: u.full_name?.trim() || u.email?.split('@')[0] || 'Unknown',
          })));
        }
      });
  }, []);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments || [];
    if (filterUser.length > 0) {
      const userSet = new Set(filterUser);
      filtered = filtered.filter(a => userSet.has(a.primary_user));
    }
    if (filterType.length > 0) {
      const typeSet = new Set(filterType);
      filtered = filtered.filter(a => typeSet.has(a.appointment_type_name));
    }
    if (filterLocation.length > 0) {
      const locationSet = new Set(filterLocation);
      filtered = filtered.filter(a => locationSet.has(a.location));
    }
    if (filterStatus.length > 0) {
      filtered = filtered.filter(a => appointmentMatchesStatuses(a, filterStatus));
    }
    return filtered;
  }, [appointments, filterUser, filterType, filterLocation, filterStatus]);

  const handleViewChange = (view) => {
    setCurrentView(view);
    const app = calendarRef.current;
    if (app?.$app?.calendarState) {
      const selectedDate = app.$app.datePickerState?.selectedDate?.value || new Date().toISOString().split('T')[0];
      app.$app.calendarState.setView(view, selectedDate);
    }
  };

  const updateTitle = useCallback(() => {
    const app = calendarRef.current;
    if (!app?.$app) return;
    const dateVal = app.$app.datePickerState?.selectedDate?.value;
    if (dateVal) {
      const m = typeof dateVal.month === 'number' ? dateVal.month - 1 : new Date().getMonth();
      const y = typeof dateVal.year === 'number' ? dateVal.year : new Date().getFullYear();
      setCalendarTitle(`${MONTH_NAMES[m]} ${y}`);
    }
  }, []);

  const applyPastOverlays = useCallback(() => {
    const today = getTodayInTimezone(timezone);
    document.querySelectorAll('.sx__week-grid__date').forEach(dateEl => {
      const dateStr = dateEl.getAttribute('data-date');
      dateEl.style.opacity = (dateStr && dateStr < today) ? '0.4' : '';
    });
    document.querySelectorAll('.sx__time-grid-day').forEach((dayCol, i) => {
      dayCol.querySelectorAll('[data-past-overlay]').forEach(el => el.remove());
      const dateEls = document.querySelectorAll('.sx__week-grid__date');
      const dateStr = dateEls[i]?.getAttribute('data-date');
      if (dateStr && dateStr < today) {
        const overlay = document.createElement('div');
        overlay.setAttribute('data-past-overlay', '1');
        overlay.className = styles.pastDayOverlay;
        dayCol.appendChild(overlay);
      }
    });
    document.querySelectorAll('.sx__month-grid-day').forEach(cell => {
      cell.querySelectorAll('[data-past-overlay]').forEach(el => el.remove());
      const dateStr = cell.getAttribute('data-date');
      if (dateStr && dateStr < today) {
        cell.style.opacity = '0.5';
      } else {
        cell.style.opacity = '';
      }
    });
  }, [timezone]);

  const applyTimeIndicator = useCallback(() => {
    const START_HOUR = 0, END_HOUR = 23, GRID_HEIGHT = 2000;
    const weekGridEl = document.querySelector('.sx__week-grid');
    if (!weekGridEl) return;
    weekGridEl.querySelectorAll('[data-time-indicator]').forEach(el => el.remove());
    const { hours, minutes } = getNowInTimezone(timezone);
    const totalMinutesFromStart = (hours - START_HOUR) * 60 + minutes;
    if (totalMinutesFromStart >= 0 && totalMinutesFromStart <= (END_HOUR - START_HOUR) * 60) {
      const topPx = (totalMinutesFromStart / ((END_HOUR - START_HOUR) * 60)) * GRID_HEIGHT;
      const line = document.createElement('div');
      line.setAttribute('data-time-indicator', '1');
      line.className = styles.currentTimeLine;
      line.style.top = `${topPx}px`;
      weekGridEl.appendChild(line);
    }
  }, [timezone]);

  // schedule-x calls onRangeUpdate synchronously from a signal effect, i.e.
  // before preact has committed the new grid, so the repaint has to wait a
  // turn. Deliberately setTimeout and not requestAnimationFrame: rAF never
  // fires while the tab is hidden, which would leave the title and the
  // past-day shading stale until the next navigation.
  const handleRangeUpdate = useCallback(() => {
    setTimeout(() => {
      updateTitle();
      applyPastOverlays();
      applyTimeIndicator();
    }, 0);
  }, [updateTitle, applyPastOverlays, applyTimeIndicator]);

  const handleToday = () => {
    const app = calendarRef.current;
    if (!app?.$app) return;
    const T = globalThis.Temporal;
    if (T) {
      app.$app.datePickerState.selectedDate.value = T.Now.plainDateISO(timezone);
    }
  };

  const navigateCalendar = useCallback((direction) => {
    const app = calendarRef.current;
    if (!app?.$app) return;
    const $app = app.$app;
    const currentViewConfig = $app.config.views.value.find(v => v.name === $app.calendarState.view.value);
    if (!currentViewConfig) return;
    const units = direction === 'forward' ? currentViewConfig.backwardForwardUnits : -currentViewConfig.backwardForwardUnits;
    $app.datePickerState.selectedDate.value = currentViewConfig.backwardForwardFn($app.datePickerState.selectedDate.value, units);
  }, []);

  const handlePrev = () => navigateCalendar('backward');
  const handleNext = () => navigateCalendar('forward');

  const clearSelection = useCallback(() => {
    const ep = eventsPluginRef.current;
    // Must check the event exists first. schedule-x's remove() does
    // splice(findIndex(...), 1) with no guard, so removing an id that isn't
    // there splices at -1 and silently deletes the LAST real appointment —
    // which is every drawer close that didn't start from a slot click.
    if (ep?.get('__selection__')) ep.remove('__selection__');
  }, []);

  const [clickedAppointment, setClickedAppointment] = useState(null);

  /* eslint-disable react-hooks/set-state-in-effect --
   * `pendingOpenAppointmentId` is a one-shot external signal from the store
   * (NotificationsPopover sets it); we consume it and clear the flag. Same
   * carve-out the pendingAddTask consumer uses in useTasksView.
   */
  useEffect(() => {
    if (pendingOpenAppointmentId == null) return;
    const appt = appointments.find(a => String(a.id) === String(pendingOpenAppointmentId));
    if (appt) {
      setClickedAppointment(appt);
      setShowSchedule(true);
    }
    clearPendingOpenAppointmentId();
  }, [pendingOpenAppointmentId, appointments, clearPendingOpenAppointmentId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSlotClick = useCallback((dateTime, e) => {
    // schedule-x stops propagation on event clicks, so this should never fire
    // for a click that landed on an appointment. Assert it from the DOM event
    // rather than the timing flag this used to keep.
    if (e?.target?.closest?.('.sx__event')) return;

    // schedule-x reports the raw click position (e.g. 3:13), not the slot.
    // Snap down to the 30-min slot the hover preview highlights so the
    // drawer and the dashed selection show the time the user clicked on.
    if (dateTime?.with && typeof dateTime.minute === 'number') {
      dateTime = dateTime.with({
        minute: dateTime.minute < 30 ? 0 : 30,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0,
      });
    }

    const T = globalThis.Temporal;
    if (T && dateTime?.epochMilliseconds) {
      const now = T.Now.zonedDateTimeISO(timezone);
      const minTime = now.add({ minutes: 15 });
      if (dateTime.epochMilliseconds < minTime.epochMilliseconds) {
        // Phrased against the slot, not the click: the time was snapped down,
        // so a click late in the current half-hour lands on a slot that has
        // already started. "Cannot book in the past" would misdescribe that.
        showToast('Appointments must start at least 15 minutes from now.');
        return;
      }
    } else if (typeof dateTime?.day === 'number') {
      // Month view hands over a whole day (a PlainDate, which has no
      // epochMilliseconds), so the check above skipped it entirely and past
      // days were bookable there. Compare dates instead.
      const clicked = `${dateTime.year}-${String(dateTime.month).padStart(2, '0')}-${String(dateTime.day).padStart(2, '0')}`;
      if (clicked < getTodayInTimezone(timezone)) {
        showToast('Cannot book in the past.');
        return;
      }
    }

    const ep = eventsPluginRef.current;
    // Only meaningful for a timed click. A month-view click is a whole day with
    // no time yet, so there is no interval to test for a clash.
    if (T && dateTime?.epochMilliseconds && dateTime.add) {
      const clickStart = dateTime.epochMilliseconds;
      const clickEnd = dateTime.add({ minutes: 30 }).epochMilliseconds;
      // Check against ALL appointments, not the calendar's event list — that
      // list only holds what the filter chips currently show, so filtering
      // would otherwise hide a conflict and let you double-book the slot.
      const hasOverlap = (appointments || []).some(a => {
        let ev;
        try { ev = apptToEvent(a, T, 'UTC'); } catch { return false; }
        if (!ev?.start?.epochMilliseconds || !ev.end?.epochMilliseconds) return false;
        return clickStart < ev.end.epochMilliseconds && clickEnd > ev.start.epochMilliseconds;
      });
      if (hasOverlap) {
        showToast('That slot overlaps an existing appointment.');
        return;
      }
    }

    setClickedAppointment(null);
    setSelectedSlot(dateTime);
    setShowSchedule(true);

    if (ep && T && dateTime?.add) {
      clearSelection();
      const end = dateTime.add({ minutes: 30 });
      ep.add({
        id: '__selection__',
        start: dateTime,
        end,
        title: 'New Appointment',
        calendarId: 'selection',
        _options: { additionalClasses: ['is-selection'] },
      });
    }
  }, [clearSelection, timezone, showToast, appointments]);

  const handleEventClick = useCallback((event) => {
    const appt = appointments.find(a => a.id === event.id);
    setClickedAppointment(appt || null);
    setSelectedSlot(event.start);
    setShowSchedule(true);
  }, [appointments]);

  const handleCloseDrawer = useCallback(() => {
    setShowSchedule(false);
    setClickedAppointment(null);
    clearSelection();
    // A status change refetches appointments, and the re-rendered events carry
    // their own is-cancelled class — no post-render class patching needed.
  }, [clearSelection]);

  const hoverRef = useRef(null);
  useEffect(() => {
    const START_HOUR = 0;
    const END_HOUR = 23;
    const GRID_HEIGHT = 2000;
    const TOTAL_HOURS = END_HOUR - START_HOUR;
    const PX_PER_HOUR = GRID_HEIGHT / TOTAL_HOURS;
    const PX_PER_30 = PX_PER_HOUR / 2;

    function formatTime(h, m) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    function getOrCreateOverlay() {
      if (hoverRef.current) return hoverRef.current;
      const el = document.createElement('div');
      el.className = styles.hoverPreview;
      hoverRef.current = el;
      return el;
    }

    function handleMove(e) {
      if (e.target.closest('.sx__event')) {
        const overlay = hoverRef.current;
        if (overlay) overlay.style.opacity = '0';
        return;
      }
      const col = e.currentTarget;
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const slotIndex = Math.floor(y / PX_PER_30);
      const snappedY = slotIndex * PX_PER_30;
      const totalMinutes = (START_HOUR * 60) + (slotIndex * 30);
      const startH = Math.floor(totalMinutes / 60);
      const startM = totalMinutes % 60;
      const endH = Math.floor((totalMinutes + 30) / 60);
      const endM = (totalMinutes + 30) % 60;

      if (startH >= END_HOUR) return;

      const overlay = getOrCreateOverlay();
      if (overlay.parentElement !== col) col.appendChild(overlay);
      overlay.style.top = `${snappedY}px`;
      overlay.style.height = `${PX_PER_30}px`;
      overlay.textContent = `${formatTime(startH, startM)} – ${formatTime(endH, endM)}`;
      overlay.style.opacity = '1';
    }

    function handleLeave() {
      const overlay = hoverRef.current;
      if (overlay) overlay.style.opacity = '0';
    }

    // Remember the exact nodes we subscribed to. Re-querying at cleanup time
    // can return a different set once schedule-x has re-rendered the grid,
    // which would leave the original listeners attached forever.
    let subscribedDays = [];
    let timer;
    let attempts = 0;

    // The grid is ready when the CURRENT view's DOM exists — the column
    // count check matters on view switches, when the previous view's
    // columns linger in the DOM for a frame or two.
    const gridReady = () => {
      // Wait for the CELLS, not just the wrapper — the wrapper mounts a beat
      // earlier, and decorating against zero cells would silently no-op with
      // no retry (month view would lose its past-day shading).
      if (currentView === 'month-grid') return document.querySelectorAll('.sx__month-grid-day').length > 0;
      return document.querySelectorAll('.sx__time-grid-day').length === (currentView === 'day' ? 1 : 7);
    };

    const setup = () => {
      if (!gridReady()) {
        // Poll instead of a fixed delay so the hover ghost, overlays and
        // initial scroll appear the moment schedule-x renders (the calendar
        // itself loads async), not 800ms later. Give up after ~6s.
        if (attempts++ < 120) timer = setTimeout(setup, 50);
        return;
      }
      subscribedDays = Array.from(document.querySelectorAll('.sx__time-grid-day'));
      subscribedDays.forEach(day => {
        day.addEventListener('mousemove', handleMove);
        day.addEventListener('mouseleave', handleLeave);
      });

      const weekGrid = document.querySelector('.sx__week-grid');
      document.querySelectorAll('[data-tz-label]').forEach(el => el.remove());
      if (weekGrid) {
        const tzEl = document.createElement('div');
        tzEl.setAttribute('data-tz-label', '1');
        tzEl.className = styles.timezoneLabel;
        tzEl.textContent = timezoneLabel;
        weekGrid.insertBefore(tzEl, weekGrid.firstChild);
      }

      applyPastOverlays();
      applyTimeIndicator();

      const { hours: nowH, minutes: nowM } = getNowInTimezone(timezone);
      const totalMin = (nowH - START_HOUR) * 60 + nowM;
      if (totalMin > 0) {
        const scrollTarget = (totalMin / ((END_HOUR - START_HOUR) * 60)) * GRID_HEIGHT - 200;
        const wrap = document.querySelector('[class*="calendarWrap"]');
        if (wrap) wrap.scrollTop = Math.max(0, scrollTarget);
      }
    };
    setup();

    return () => {
      clearTimeout(timer);
      subscribedDays.forEach(day => {
        day.removeEventListener('mousemove', handleMove);
        day.removeEventListener('mouseleave', handleLeave);
      });
      subscribedDays = [];
      if (hoverRef.current?.parentElement) {
        hoverRef.current.parentElement.removeChild(hoverRef.current);
      }
      hoverRef.current = null;
    };
  }, [currentView, timezone, timezoneLabel, applyPastOverlays, applyTimeIndicator]);

  // The now-line was drawn once and then froze. Redraw it each minute so it
  // tracks the clock, and repaint the past-day shading with it so a day that
  // rolls over while the tab is open dims without a refresh.
  useEffect(() => {
    const id = setInterval(() => {
      applyTimeIndicator();
      applyPastOverlays();
    }, 60_000);
    return () => clearInterval(id);
  }, [applyTimeIndicator, applyPastOverlays]);

  return {
    calendarTitle,
    currentView,
    showSchedule,
    selectedSlot,
    calendarRef,
    eventsPluginRef,
    timezone,
    timezoneLabel,
    filterUser,
    filterLocation,
    filterType,
    filterStatus,
    users,
    apptTypesForFilter,
    filteredAppointments,
    clickedAppointment,
    fetchAppointments,
    setFilterUser,
    setFilterLocation,
    setFilterType,
    setFilterStatus,
    setTimezone,
    handleViewChange,
    handleToday,
    handlePrev,
    handleNext,
    handleSlotClick,
    handleEventClick,
    handleRangeUpdate,
    handleCloseDrawer,
  };
}

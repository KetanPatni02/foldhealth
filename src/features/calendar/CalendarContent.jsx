import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_CALENDARS, apptToEvent } from './calendarUtils';
import styles from './CalendarView.module.css';

export function CalendarContent({ onSlotClick, onEventClick, calendarRef, eventsPluginRef, dbAppointments, appointmentTypes, timezone }) {
  const [calendarApp, setCalendarApp] = useState(null);
  const [SXCalendar, setSXCalendar] = useState(null);
  const [error, setError] = useState(null);
  const internalPluginRef = useRef(null);
  const resolvedTheme = useAppStore(s => s.resolvedTheme);

  // Use refs for callbacks so the calendar always calls the latest handlers
  const slotClickRef = useRef(onSlotClick);
  const eventClickRef = useRef(onEventClick);
  useEffect(() => {
    slotClickRef.current = onSlotClick;
    eventClickRef.current = onEventClick;
  });

  // Initialize calendar ONCE
  useEffect(() => {
    (async () => {
      try {
        const temporalMod = await import('temporal-polyfill');
        if (typeof globalThis.Temporal === 'undefined') {
          globalThis.Temporal = temporalMod.Temporal;
        }

        const calMod = await import('@schedule-x/calendar');
        const reactMod = await import('@schedule-x/react');
        const eventsMod = await import('@schedule-x/events-service');
        await import('@schedule-x/theme-default/dist/index.css');

        const eventsPlugin = eventsMod.createEventsServicePlugin();
        internalPluginRef.current = eventsPlugin;
        if (eventsPluginRef) eventsPluginRef.current = eventsPlugin;

        // Read current theme from the html data-theme attribute so init matches
        // whatever the rest of the app is showing right now.
        const initialDark = document.documentElement.getAttribute('data-theme') === 'dark';

        const app = calMod.createCalendar({
          views: [calMod.createViewWeek(), calMod.createViewDay(), calMod.createViewMonthGrid()],
          defaultView: 'week',
          events: [],
          calendars: DEFAULT_CALENDARS,
          isDark: initialDark,
          dayBoundaries: { start: '00:00', end: '23:00' },
          weekOptions: { gridHeight: 2000, nDays: 7 },
          locale: 'en-US',
          callbacks: {
            onClickDateTime: (dateTime) => { if (slotClickRef.current) slotClickRef.current(dateTime); },
            onClickDate: (date) => { if (slotClickRef.current) slotClickRef.current(date); },
            onEventClick: (event) => { if (eventClickRef.current && event.id !== '__selection__') eventClickRef.current(event); },
          },
        }, [eventsPlugin]);

        calendarRef.current = app;
        setSXCalendar(() => reactMod.ScheduleXCalendar);
        setCalendarApp(app);
      } catch (err) {
        console.error('Schedule-X init error:', err);
        setError(err.message);
      }
    })();
  }, []);

  // Sync schedule-x theme when the app theme flips (light/dark/system).
  useEffect(() => {
    if (!calendarApp) return;
    try {
      // schedule-x exposes a `setTheme('light' | 'dark')` on the calendar instance.
      if (typeof calendarApp.setTheme === 'function') {
        calendarApp.setTheme(resolvedTheme === 'dark' ? 'dark' : 'light');
      }
    } catch (err) {
      console.warn('Failed to set schedule-x theme:', err);
    }
  }, [resolvedTheme, calendarApp]);

  // Sync events dynamically when DB data changes (without recreating calendar)
  useEffect(() => {
    const ep = internalPluginRef.current;
    const T = globalThis.Temporal;
    if (!ep || !T) return;

    // Use UTC for event positioning — times are stored as wall-clock strings
    // and should always appear at the literal time position on the calendar
    const newEvents = (dbAppointments || []).flatMap(a => {
      const ev = apptToEvent(a, appointmentTypes, T, 'UTC');
      return ev ? [ev] : [];
    });

    // Replace all events (except __selection__) with fresh DB events
    try {
      const existing = ep.getAll();
      for (const e of existing) {
        if (e.id !== '__selection__') ep.remove(e.id);
      }
    } catch {}
    for (const e of newEvents) {
      try { ep.add(e); } catch {}
    }

    // Mark cancelled events in the DOM with a CSS class (retry to catch late renders)
    const cancelledIds = [];
    for (const a of (dbAppointments || [])) {
      if (a.status === 'Cancelled') cancelledIds.push(a.id);
    }
    const applyCancelledClass = () => {
      cancelledIds.forEach(id => {
        const el = document.querySelector(`[data-event-id="${id}"]`);
        if (el && !el.classList.contains('is-cancelled')) el.classList.add('is-cancelled');
      });
    };
    const t1 = setTimeout(applyCancelledClass, 100);
    const t2 = setTimeout(applyCancelledClass, 300);
    const t3 = setTimeout(applyCancelledClass, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [dbAppointments, appointmentTypes]);

  if (error) return <div style={{ padding: 32, color: 'var(--status-error)', fontFamily: 'Inter' }}>Calendar error: {error}</div>;
  if (!calendarApp || !SXCalendar) return <div style={{ padding: 32, color: 'var(--neutral-300)', textAlign: 'center', fontFamily: 'Inter' }}>Loading calendar...</div>;

  return <SXCalendar calendarApp={calendarApp} />;
}

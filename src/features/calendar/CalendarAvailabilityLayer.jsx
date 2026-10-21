import { useEffect } from 'react';
import { recordsOnDate } from '../ooo/oooUtils';
import { blockStatus, isoDay, zonedInstant } from '../settings/calendar/availability/availabilityUtils';
import { occursOn } from '../settings/calendar/availability/newViewUtils';
import styles from './CalendarAvailabilityLayer.module.css';

// Must match CalendarContent: dayBoundaries 00:00–23:00 on a 2000px grid.
const GRID_HEIGHT = 2000;
const GRID_HOURS = 23;
const DAY_MIN = GRID_HOURS * 60;

/**
 * The user's bookable windows on the viewer's day `date`, merged, in minutes
 * from that day's midnight. Each slot's hours are in its own timezone, so a
 * slot on the day before or after (in its zone) can land on this day too;
 * holidays and repeat rules go by the slot's own date.
 */
function windowsOn(segments, date, isHoliday) {
  const [y, m, d] = date.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d).getTime();
  const dayEnd = dayStart + DAY_MIN * 60000;
  const raw = [];
  [-1, 0, 1].forEach((shift) => {
    const slotDay = new Date(y, m - 1, d + shift);
    const iso = isoDay(slotDay);
    segments
      .filter(s => blockStatus(s) !== 'expired' && occursOn(s, slotDay) && !(isHoliday(iso) && s.skipHolidays))
      .forEach(s => (s.slots || []).filter(sl => sl.start && sl.end).forEach((sl) => {
        const a = Math.max(dayStart, zonedInstant(iso, sl.start, s.timezone));
        const b = Math.min(dayEnd, zonedInstant(iso, sl.end, s.timezone));
        if (b > a) raw.push([(a - dayStart) / 60000, (b - dayStart) / 60000]);
      }));
  });
  raw.sort((p, q) => p[0] - q[0]);
  const merged = [];
  raw.forEach(([a, b]) => {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  });
  return merged;
}

/**
 * "Show available slots" on the Week view: the time the user in view isn't
 * available (outside their availability segments, or a holiday a segment
 * skips) is shaded neutral and can't be clicked to book, so only the
 * bookable time stands out. Appointments stay on top. A user with no
 * segments of their own follows practice hours, so nothing is shaded.
 *
 * @param {{ id, name }} [props.focusUser]
 * @param {object[]} props.segments – everyone's availability segments
 * @param {object[]} [props.holidays] – holiday records at the user's locations
 * @param {string}   props.renderTick – changes whenever schedule-x redraws its grid
 */
// Stable default: a fresh [] per render would re-run the effect and redraw
// the shading on every render.
const NO_HOLIDAYS = [];

export function CalendarAvailabilityLayer({ focusUser, segments, holidays = NO_HOLIDAYS, renderTick }) {
  useEffect(() => {
    if (!focusUser) return undefined;
    const mine = (segments || []).filter(s => (s.userId && String(s.userId) === String(focusUser.id))
      || String(s.userName || '').toLowerCase() === String(focusUser.name || '').toLowerCase());
    if (!mine.length) return undefined;
    const hosts = [];
    // One abort removes every click blocker added below.
    const listeners = new AbortController();
    const block = (e) => e.stopPropagation();
    let attempts = 0;
    let timer;
    const draw = () => {
      const cells = [...document.querySelectorAll('.sx__time-grid-day')];
      if (!cells.length && attempts++ < 60) { timer = setTimeout(draw, 50); return; }
      const heads = [...document.querySelectorAll('.sx__week-grid__date')];
      cells.forEach((cell, i) => {
        const date = heads[i]?.getAttribute('data-date');
        if (!date) return;
        if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
        const open = windowsOn(mine, date, (iso) => recordsOnDate(holidays, iso).length > 0);
        // The gaps between the open windows are the unavailable time.
        let from = 0;
        const gaps = [];
        open.forEach(([a, b]) => { if (a > from) gaps.push([from, a]); from = Math.max(from, b); });
        if (from < DAY_MIN) gaps.push([from, DAY_MIN]);
        gaps.forEach(([a, b]) => {
          const host = document.createElement('div');
          host.setAttribute('data-unavailable', '');
          host.className = styles.unavailable;
          host.style.top = `${(a / DAY_MIN) * GRID_HEIGHT}px`;
          host.style.height = `${((b - a) / DAY_MIN) * GRID_HEIGHT}px`;
          host.title = 'Not available';
          // schedule-x listens on the cell itself; stop the click here so
          // unavailable time can't start a booking.
          host.addEventListener('click', block, { signal: listeners.signal });
          cell.appendChild(host);
          hosts.push(host);
        });
      });
    };
    timer = setTimeout(draw, 0);
    return () => {
      clearTimeout(timer);
      listeners.abort();
      hosts.forEach((h) => h.remove());
    };
  }, [focusUser, segments, holidays, renderTick]);
  return null;
}

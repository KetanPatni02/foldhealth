import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OooIcon } from '../../components/Icon/OooIcon';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { canEdit, daySpan, recordsFor, recordsOnDate } from './oooUtils';
import styles from './CalendarOooLayer.module.css';

// Must match CalendarContent: dayBoundaries 00:00–23:00 on a 2000px grid.
const GRID_HEIGHT = 2000;
const GRID_HOURS = 23;

/**
 * Out of Office on the Week view (Figma Eventus "Edit OOO Flow"), drawn
 * into schedule-x's grid through portals. Week shows one user: their OOO
 * time is a pink block over each day it touches. A day out for all of it
 * gets an "Out of Office" strip in its header; part of a day is labelled
 * along the top of its block. Existing appointments stay visible and
 * clickable on top. OOO time can't be booked: clicking it opens the record
 * to edit (a past one is read-only). Day and Month views draw their own
 * grids (DayResourceView, MonthCountView).
 *
 * @param {object}   props
 * @param {string}   [props.focusUser]  – The user in view
 * @param {object[]} props.records
 * @param {number}   props.renderTick   – Changes whenever schedule-x redraws its grid
 * @param {function} props.onEdit       – (record) => void
 */
export function CalendarOooLayer({ focusUser, records, renderTick, onEdit }) {
  const [targets, setTargets] = useState([]);
  // Latest handler for the native click listeners added below.
  const onEditRef = useRef(onEdit);
  useEffect(() => { onEditRef.current = onEdit; }, [onEdit]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer;
    const hosts = [];
    // Listeners added to the hosts, removed on each redraw and on unmount.
    const disposers = [];

    const collect = () => {
      if (cancelled) return;
      disposers.splice(0).forEach((off) => off());
      const cells = [...document.querySelectorAll('.sx__time-grid-day')];
      if (!cells.length && attempts++ < 60) { timer = setTimeout(collect, 50); return; }
      document.querySelectorAll('[data-ooo-host]').forEach(el => el.remove());
      document.querySelectorAll('[data-ooo-day]').forEach(el => el.removeAttribute('data-ooo-day'));
      const heads = [...document.querySelectorAll('.sx__week-grid__date')];
      const next = [];
      cells.forEach((cell, i) => {
        const date = heads[i]?.getAttribute('data-date');
        if (!date || !focusUser) return;
        const mine = recordsFor(recordsOnDate(records, date), focusUser);
        if (!mine.length) return;
        if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
        // A day out for all of it gets an "Out of Office" strip at the foot
        // of its header (so the label can't collide with an appointment);
        // part of a day is labelled on its block instead.
        const isFullDay = (r) => { const sp = daySpan(r, date); return !!sp && sp.start <= 0 && sp.end >= 1; };
        if (mine.some(isFullDay)) {
          heads[i].setAttribute('data-ooo-day', '1');
          const strip = document.createElement('span');
          strip.setAttribute('data-ooo-host', 'strip');
          strip.className = styles.stripHost;
          heads[i].appendChild(strip);
          hosts.push(strip);
          next.push({ host: strip, kind: 'strip', date });
        }
        mine.forEach((record) => {
          const span = daySpan(record, date);
          if (!span) return;
          const host = document.createElement('div');
          host.setAttribute('data-ooo-host', 'block');
          host.className = styles.blockHost;
          // A past record is read-only: no lift, no pointer.
          if (!canEdit(record)) host.classList.add(styles.blockHostPast);
          const px = (f) => Math.min(GRID_HEIGHT, f * 24 * (GRID_HEIGHT / GRID_HOURS));
          host.style.top = `${px(span.start)}px`;
          host.style.height = `${Math.max(24, px(span.end) - px(span.start))}px`;
          host.style.bottom = 'auto';
          // OOO time can't be booked: a click on it opens the record to
          // edit instead. Native and stopped here, since schedule-x listens
          // on the grid cell itself, before React's root listener would run.
          // (The "new appointment" hover preview skips OOO time itself, see
          // useCalendarView, so the tooltip can follow the pointer here.)
          const onClick = (e) => {
            e.stopPropagation();
            if (canEdit(record)) onEditRef.current(record);
          };
          host.addEventListener('click', onClick);
          disposers.push(() => host.removeEventListener('click', onClick));
          // Reachable by keyboard like the Day view's blocks: Enter or Space opens it.
          if (canEdit(record)) {
            host.setAttribute('role', 'button');
            host.tabIndex = 0;
            host.setAttribute('aria-label', `Edit ${focusUser}'s Out of Office record`);
            const onKey = (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              onEditRef.current(record);
            };
            host.addEventListener('keydown', onKey);
            disposers.push(() => host.removeEventListener('keydown', onKey));
          }
          cell.appendChild(host);
          hosts.push(host);
          // A part-day block is labelled along its top; an editable one
          // also gets a hover tooltip.
          if (!isFullDay(record)) next.push({ host, kind: 'blockLabel', date, record });
          if (canEdit(record)) next.push({ host, kind: 'blockTip', date, record });
        });
      });
      if (cancelled) return;
      setTargets(next);
    };
    // After schedule-x has committed its grid (see handleRangeUpdate).
    timer = setTimeout(collect, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      disposers.forEach((off) => off());
      hosts.forEach(h => h.remove());
    };
  }, [focusUser, records, renderTick]);

  return targets.map((t) => createPortal(
    t.kind === 'blockTip' ? (
      <Tooltip label="Edit Out of Office Record" followCursor>
        <span className={styles.blockTipArea} aria-hidden="true" />
      </Tooltip>
    ) : (
      <span className={styles.oooStrip}>
        <OooIcon size={12} color="var(--neutral-0)" arrowColor="var(--accent-magenta)" />
        Out of Office
      </span>
    ),
    t.host,
    `${t.kind}-${t.date}-${t.record?.id || ''}`,
  ));
}

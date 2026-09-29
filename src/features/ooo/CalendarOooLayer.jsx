import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { OooIcon } from '../../components/Icon/OooIcon';
import { canEdit, daySpan, formatDate, recordsOnDate } from './oooUtils';
import styles from './CalendarOooLayer.module.css';

// Must match CalendarContent: dayBoundaries 00:00–23:00 on a 2000px grid.
const GRID_HEIGHT = 2000;
const GRID_HOURS = 23;

/**
 * Out of Office on the calendar (Figma Eventus "Edit OOO Flow"), drawn into
 * schedule-x's grid through portals:
 *   - one user in view (the Users filter has exactly one user): their OOO
 *     time as dashed purple blocks in Day / Week (17363:111021, 17557:110750)
 *     and on each day in Month (17365:117557);
 *   - otherwise, Month shows "N Providers Out of Office" on each day, which
 *     opens everyone's records with that day highlighted (17363:113548).
 * Week shows one user; an OOO day's header gets an "Out of Office" strip,
 * and existing appointments stay visible and clickable
 * on top of the OOO area. OOO time can't be booked: clicking it opens the
 * record to edit. (Day view draws its own per-user columns.)
 *
 * @param {object}   props
 * @param {string}   props.currentView  – 'week' | 'day' | 'month-grid'
 * @param {string}   [props.focusUser]  – The one user in view, if any
 * @param {object[]} props.records
 * @param {number}   props.renderTick   – Changes whenever schedule-x redraws its grid
 * @param {function} props.onOpenDay    – (isoDate) => void
 * @param {function} props.onEdit       – (record) => void
 */
export function CalendarOooLayer({ currentView, focusUser, records, renderTick, onOpenDay, onEdit }) {
  const [targets, setTargets] = useState([]);
  // Latest handler for the native click listeners added below.
  const onEditRef = useRef(onEdit);
  useEffect(() => { onEditRef.current = onEdit; }, [onEdit]);

  useEffect(() => {
    let attempts = 0;
    let timer;
    const hosts = [];
    const collect = () => {
      const isMonth = currentView === 'month-grid';
      const cells = isMonth
        ? [...document.querySelectorAll('.sx__month-grid-day')]
        : [...document.querySelectorAll('.sx__time-grid-day')];
      if (!cells.length && attempts++ < 60) { timer = setTimeout(collect, 50); return; }
      document.querySelectorAll('[data-ooo-host]').forEach(el => el.remove());
      document.querySelectorAll('[data-ooo-day]').forEach(el => el.removeAttribute('data-ooo-day'));
      const dates = isMonth ? null : [...document.querySelectorAll('.sx__week-grid__date')].map(el => el.getAttribute('data-date'));
      const next = [];
      cells.forEach((cell, i) => {
        const date = isMonth ? cell.getAttribute('data-date') : dates[i];
        if (!date) return;
        const on = recordsOnDate(records, date);
        const mine = focusUser ? on.filter(r => r.userName === focusUser) : [];
        if (isMonth && !focusUser) {
          const count = new Set(on.map(r => r.userName)).size;
          if (!count) return;
          const host = document.createElement('div');
          host.setAttribute('data-ooo-host', 'count');
          cell.appendChild(host);
          hosts.push(host);
          next.push({ host, kind: 'count', date, count });
          return;
        }
        if (!mine.length) return;
        if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
        // Week: the day's header gets an "Out of Office" strip at its foot,
        // so the label can't collide with an appointment in the grid.
        const headEl = !isMonth && document.querySelectorAll('.sx__week-grid__date')[i];
        if (headEl) {
          headEl.setAttribute('data-ooo-day', '1');
          const strip = document.createElement('span');
          strip.setAttribute('data-ooo-host', 'strip');
          strip.className = styles.stripHost;
          headEl.appendChild(strip);
          hosts.push(strip);
          next.push({ host: strip, kind: 'strip', date });
        }
        mine.forEach((record) => {
          const host = document.createElement('div');
          host.setAttribute('data-ooo-host', 'block');
          host.className = isMonth ? `${styles.blockHost} ${styles.blockHostMonth}` : styles.blockHost;
          if (!isMonth) {
            const span = daySpan(record, date);
            if (!span) return;
            const px = (f) => Math.min(GRID_HEIGHT, f * 24 * (GRID_HEIGHT / GRID_HOURS));
            host.style.top = `${px(span.start)}px`;
            host.style.height = `${Math.max(24, px(span.end) - px(span.start))}px`;
            host.style.bottom = 'auto';
          }
          // OOO time can't be booked: a click on it opens the record to
          // edit instead. Native and stopped here, since schedule-x listens
          // on the grid cell itself, before React's root listener would run.
          // No hover "new appointment" preview over OOO time.
          host.addEventListener('mousemove', (e) => e.stopPropagation());
          host.addEventListener('click', (e) => {
            e.stopPropagation();
            // A past record is read-only, but its time still can't be booked.
            if (canEdit(record)) onEditRef.current(record);
          });
          cell.appendChild(host);
          hosts.push(host);
          // Month (Figma Eventus 17590:117225) labels the block itself; Week
          // labels the day header instead, so its blocks stay empty.
          if (isMonth) next.push({ host, kind: 'monthBlock', date, record });
        });
      });
      setTargets(next);
    };
    // After schedule-x has committed its grid (see handleRangeUpdate).
    timer = setTimeout(collect, 0);
    return () => {
      clearTimeout(timer);
      hosts.forEach(h => h.remove());
    };
  }, [currentView, focusUser, records, renderTick]);

  return targets.map((t) => createPortal(
    t.kind === 'monthBlock' ? (
      <span className={styles.monthLabel}>
        <span className={styles.monthTitle}>
          <OooIcon size={16} color="var(--accent-magenta)" />
          Out of Office
          <Icon name="solar:pen-linear" size={14} color="var(--neutral-300)" />
        </span>
        <span className={styles.monthSub}>{formatDate(t.record.startAt)} - {formatDate(t.record.endAt)}</span>
        {t.record.reason && <span className={styles.monthSub}>Reason: {t.record.reason}</span>}
      </span>
    ) : t.kind === 'strip' ? (
      <span className={styles.oooStrip}>
        <OooIcon size={12} color="var(--neutral-0)" arrowColor="var(--accent-magenta)" />
        Out of Office
      </span>
    ) : (
      <button
        type="button"
        className={styles.countLink}
        onClick={(e) => { e.stopPropagation(); onOpenDay(t.date); }}
      >
        <OooIcon size={14} color="var(--accent-magenta)" />
        {t.count} Provider{t.count === 1 ? '' : 's'} Out of Office
      </button>
    ),
    t.host,
    `${t.kind}-${t.date}-${t.record?.id || ''}`,
  ));
}

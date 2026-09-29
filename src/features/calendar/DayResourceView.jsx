import { useEffect, useMemo, useRef } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { OooIcon } from '../../components/Icon/OooIcon';
import { canEdit, daySpan, recordsFor, recordsOnDate } from '../ooo/oooUtils';
import styles from './DayResourceView.module.css';

const HOUR_PX = 80;
const SLOT_MIN = 30;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const SLOTS = Array.from({ length: (24 * 60) / SLOT_MIN }, (_, i) => i);

// "8:30 am" → minutes from midnight.
function toMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(t || '').trim());
  if (!m) return null;
  return ((Number(m[1]) % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0)) * 60 + Number(m[2]);
}
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const isoToAppt = (iso) => { const [y, m, d] = iso.split('-'); return `${m}-${d}-${y}`; };

/**
 * Calendar Day view with a column per user (Figma Eventus 17365:119644, and
 * the legacy multi-provider day view). A user who is out of office that day
 * gets a magenta-outlined area
 * over their OOO time; their existing appointments still show on top and
 * open as usual, but the empty time can't be booked (clicking it opens the
 * record to edit).
 *
 * @param {object}   props
 * @param {string}   props.date          – ISO date shown ("2026-09-29")
 * @param {string[]} props.users         – User names, one column each
 * @param {object[]} props.appointments  – Already filtered by the toolbar
 * @param {object[]} props.oooRecords
 * @param {string}   [props.timezoneLabel]
 * @param {function} props.onSlotClick   – ({ year, month, day, hour, minute }, userName) => void
 * @param {function} props.onEventClick  – (appointment) => void
 * @param {function} props.onEditOoo     – (record) => void
 * @param {function} props.onBlocked     – (message) => void, for a slot that can't be booked
 */
export function DayResourceView({ date, users, appointments, oooRecords, timezoneLabel, onSlotClick, onEventClick, onEditOoo, onBlocked }) {
  const scrollRef = useRef(null);
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = date === todayIso;
  const isPastDay = date < todayIso;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Open near the current time, as the week view does.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, ((isToday ? nowMin : 8 * 60) / 60) * HOUR_PX - 160);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const onDay = useMemo(() => recordsOnDate(oooRecords, date), [oooRecords, date]);
  const columns = useMemo(() => users.map((name) => {
    const ooo = recordsFor(onDay, name)
      .map(r => ({ record: r, span: daySpan(r, date) }))
      .filter(x => x.span);
    const appts = (appointments || [])
      .filter(a => a.primary_user === name && a.date === isoToAppt(date))
      .map(a => {
        const start = toMinutes(a.time_start);
        const end = toMinutes(a.time_end) ?? (start != null ? start + 30 : null);
        return start == null ? null : { appt: a, start, end: Math.max(end, start + 15) };
      })
      .filter(Boolean);
    return { name, ooo, appts };
  }), [users, onDay, appointments, date]);

  const clickSlot = (col, slot) => {
    const minute = slot * SLOT_MIN;
    const inOoo = col.ooo.find(({ span }) => minute >= span.start * 1440 && minute < span.end * 1440);
    if (inOoo) {
      // A past record is read-only; its time still can't be booked.
      if (canEdit(inOoo.record)) onEditOoo(inOoo.record);
      return;
    }
    if (isPastDay || (isToday && minute < nowMin + 15)) {
      onBlocked('Appointments must start at least 15 minutes from now.');
      return;
    }
    if (col.appts.some(x => minute < x.end && minute + SLOT_MIN > x.start)) {
      onBlocked('That slot overlaps an existing appointment.');
      return;
    }
    const [year, month, day] = date.split('-').map(Number);
    onSlotClick({ year, month, day, hour: Math.floor(minute / 60), minute: minute % 60 }, col.name);
  };

  const top = (min) => (min / 60) * HOUR_PX;

  return (
    <div className={styles.wrap} ref={scrollRef}>
      <div className={styles.grid} style={{ '--cols': Math.max(1, columns.length) }}>
        {/* User header row */}
        <div className={`${styles.corner} ${styles.sticky}`}>{timezoneLabel}</div>
        {/* The user's name, with an "Out of Office" strip under it when
            they're out that day. */}
        {columns.map(col => (
          <div key={col.name} className={`${styles.colHead} ${styles.sticky}`}>
            <span className={styles.colName}>{col.name}</span>
            {col.ooo.length > 0 && (
              <span className={styles.oooStrip}>
                <OooIcon size={12} color="var(--neutral-0)" arrowColor="var(--accent-magenta)" />
                Out of Office
              </span>
            )}
          </div>
        ))}

        {/* Time labels */}
        <div className={styles.times} style={{ height: 24 * HOUR_PX }}>
          {HOURS.map(h => (
            <span key={h} className={styles.timeLabel} style={{ top: h * HOUR_PX }}>{h ? hourLabel(h) : ''}</span>
          ))}
        </div>

        {columns.map(col => (
          <div key={col.name} className={styles.col} style={{ height: 24 * HOUR_PX }}>
            {SLOTS.map(slot => (
              <button
                key={slot}
                type="button"
                className={[styles.slot, slot % 2 ? styles.slotHalf : ''].filter(Boolean).join(' ')}
                style={{ top: slot * (HOUR_PX / 2), height: HOUR_PX / 2 }}
                aria-label={`${col.name}, ${hourLabel(Math.floor(slot / 2))}${slot % 2 ? ' 30' : ''}`}
                onClick={() => clickSlot(col, slot)}
              />
            ))}
            {(isPastDay || isToday) && (
              <span className={styles.past} style={{ height: isPastDay ? '100%' : top(nowMin) }} aria-hidden="true" />
            )}
            {/* Figma Eventus 17587:116989: the OOO time as an outlined
                area; its label lives in the header so it can't collide
                with an appointment. */}
            {col.ooo.map(({ record, span }) => (
              <div key={record.id} className={styles.oooBlock} style={{ top: top(span.start * 1440), height: top((span.end - span.start) * 1440) }} />
            ))}
            {/* Calendar slot (Figma Eventus 17581:116489): a tinted card
                with a 4px left bar, the patient with visit-mode and repeat
                icons, then the reason and type • status. */}
            {col.appts.map(({ appt, start, end }) => (
              <button
                key={appt.id}
                type="button"
                className={[styles.event, styles[`event_${appt.calendar_id}`] || '', appt.status === 'Cancelled' ? styles.eventCancelled : ''].filter(Boolean).join(' ')}
                style={{ top: top(start) + 2, height: Math.max(24, top(end - start) - 4) }}
                onClick={() => onEventClick(appt)}
              >
                <span className={styles.eventHead}>
                  <Icon name={/virtual|video|tele/i.test(appt.mode || '') ? 'solar:videocamera-linear' : 'solar:walking-linear'} size={14} color="var(--neutral-400)" />
                  <span className={styles.eventTitle}>{appt.patient_name || 'Appointment'}</span>
                  {appt.recurring && <Icon name="solar:refresh-linear" size={14} color="var(--neutral-300)" />}
                </span>
                {appt.reason_for_visit && <span className={styles.eventSub}>{appt.reason_for_visit}</span>}
                <span className={styles.eventSub}>{[appt.appointment_type_name, appt.status].filter(Boolean).join(' • ')}</span>
              </button>
            ))}
            {isToday && <span className={styles.nowLine} style={{ top: top(nowMin) }} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}

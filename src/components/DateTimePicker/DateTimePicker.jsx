import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import { ActionButton } from '../ActionButton/ActionButton';
import { parsePickerValue } from './parsePickerValue';
import styles from './DateTimePicker.module.css';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n) => String(n).padStart(2, '0');

const toDate = (mmddyyyy) => {
  const [mm, dd, yyyy] = mmddyyyy.split('/');
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
};

/**
 * Date + time in one popover: a month calendar beside scrolling hour and
 * minute columns, with Reset and Save. The value is a string,
 * "MM/DD/YYYY, HH:MM" (24-hour); Save calls `onChange` with it.
 *
 * @param {object}   props
 * @param {string}   [props.value]       – "MM/DD/YYYY, HH:MM", or '' when unset
 * @param {function} props.onChange      – (value) => void
 * @param {string}   [props.label]       – Field label above the trigger
 * @param {boolean}  [props.required]    – Red dot after the label
 * @param {string}   [props.placeholder='MM/DD/YYYY, HH:MM']
 * @param {string}   [props.errorText]   – Red border and message below
 * @param {Date}     [props.minDate]     – Days before this can't be picked
 * @param {boolean}  [props.fullWidth]   – Fill the container instead of 200px
 * @param {string}   [props.className]   – Extra class on the trigger box
 */
export function DateTimePicker({ value, onChange, label, required = false, placeholder = 'MM/DD/YYYY, HH:MM', errorText, minDate, fullWidth = false, className }) {
  const id = useId();
  const parsed = parsePickerValue(value);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null); // the trigger's box, measured on open
  const [viewDate, setViewDate] = useState(() => (parsed.date ? toDate(parsed.date) : new Date()));
  const [selectedDate, setSelectedDate] = useState(parsed.date);
  const [pickerHour, setPickerHour] = useState(parsed.hour);
  const [pickerMinute, setPickerMinute] = useState(parsed.minute);
  const triggerRef = useRef(null);
  const hourColRef = useRef(null);
  const minColRef = useRef(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  const minDay = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime() : null;

  const scrollToTime = (h, m) => {
    setTimeout(() => {
      hourColRef.current?.querySelector(`[data-h="${h}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      minColRef.current?.querySelector(`[data-m="${m}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
  };

  const handleReset = () => {
    const p = parsePickerValue(value);
    setSelectedDate(p.date);
    setPickerHour(p.hour);
    setPickerMinute(p.minute);
    if (p.date) setViewDate(toDate(p.date));
    scrollToTime(p.hour, p.minute);
  };

  const handleOk = () => {
    if (!selectedDate) return;
    onChange(`${selectedDate}, ${pad(pickerHour)}:${pad(pickerMinute)}`);
    setOpen(false);
  };

  const box = (
    <div
      ref={triggerRef}
      className={[styles.dateInputWrap, fullWidth ? styles.fullWidth : '', errorText ? styles.hasError : '', className || ''].filter(Boolean).join(' ')}
    >
      <button
        id={id}
        className={styles.datePickerTrigger}
        onClick={() => { setRect(triggerRef.current?.getBoundingClientRect() || null); setOpen(v => !v); }}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={errorText ? true : undefined}
      >
        <span className={value ? styles.datePickerText : styles.datePickerPlaceholder}>
          {value || placeholder}
        </span>
        <Icon name="solar:calendar-linear" size={14} color="var(--neutral-300)" />
      </button>

      {open && createPortal(
        <div className={styles.backdrop} onClick={() => setOpen(false)}>
          <div
            className={styles.dateTimeDropdown}
            role="dialog"
            aria-label={label || 'Pick a date and time'}
            style={{ top: rect ? rect.bottom + 4 : 0, right: rect ? window.innerWidth - rect.right : 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.dtPickerBody}>
              <div className={styles.calendarSection}>
                <div className={styles.calendarHeader}>
                  <ActionButton icon="solar:alt-arrow-left-linear" size="S" tooltip="Previous month"
                    onClick={() => setViewDate(new Date(year, month - 1, 1))} />
                  <span className={styles.calendarTitle}>{MONTH_NAMES[month]} {year}</span>
                  <ActionButton icon="solar:alt-arrow-right-linear" size="S" tooltip="Next month"
                    onClick={() => setViewDate(new Date(year, month + 1, 1))} />
                </div>
                <div className={styles.calendarGrid}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className={styles.calendarDayLabel}>{d}</div>
                  ))}
                  {days.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const key = `${pad(month + 1)}/${pad(d)}/${year}`;
                    const disabled = minDay != null && new Date(year, month, d).getTime() < minDay;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabled}
                        className={`${styles.calendarDay} ${selectedDate === key ? styles.calendarDaySelected : ''}`}
                        onClick={() => setSelectedDate(key)}
                      >{d}</button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.timeColumnsSection}>
                <div className={styles.timeColsRow}>
                  <div className={styles.timeColWrap}>
                    <span className={styles.timeColLabel}>Hr</span>
                    <div className={styles.timeCol} ref={hourColRef}>
                      {HOURS.map(h => (
                        <button key={h} type="button" data-h={h}
                          className={`${styles.timeColItem} ${pickerHour === h ? styles.timeColItemSelected : ''}`}
                          onClick={() => setPickerHour(h)}>
                          {pad(h)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.timeColWrap}>
                    <span className={styles.timeColLabel}>Min</span>
                    <div className={styles.timeCol} ref={minColRef}>
                      {MINUTES.map(m => (
                        <button key={m} type="button" data-m={m}
                          className={`${styles.timeColItem} ${pickerMinute === m ? styles.timeColItemSelected : ''}`}
                          onClick={() => setPickerMinute(m)}>
                          {pad(m)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.pickerFooter}>
              <button type="button" className={styles.nowBtn} onClick={handleReset}>Reset</button>
              <button type="button"
                className={`${styles.okBtn} ${!selectedDate ? styles.okBtnDisabled : ''}`}
                onClick={handleOk} disabled={!selectedDate}>Save</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );

  if (!label && !errorText) return box;
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">•</span>}
        </label>
      )}
      {box}
      {errorText && <span className={styles.errorText}>{errorText}</span>}
    </div>
  );
}

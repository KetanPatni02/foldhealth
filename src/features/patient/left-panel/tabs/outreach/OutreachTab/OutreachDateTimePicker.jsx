import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { MONTH_NAMES, parsePickerValue } from './OutreachTab.utils';
import styles from './OutreachTab.module.css';

// Bespoke rather than the shared DatePicker: DatePicker is a plain
// `<input type="date">` with no time-of-day support, and this widget needs
// date + hour/minute selection in one popover — a full swap would drop
// time selection entirely rather than reuse an equivalent primitive.
export function OutreachDateTimePicker({ value, onChange, className }) {
  const parsed = parsePickerValue(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (parsed.date) {
      const [mm, dd, yyyy] = parsed.date.split('/');
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    }
    return new Date();
  });
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

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = Array.from({ length: 60 }, (_, i) => i);

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
    if (p.date) {
      const [mm, dd, yyyy] = p.date.split('/');
      setViewDate(new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
    }
    scrollToTime(p.hour, p.minute);
  };

  const handleOk = () => {
    if (!selectedDate) return;
    const hStr = String(pickerHour).padStart(2, '0');
    const mStr = String(pickerMinute).padStart(2, '0');
    onChange(`${selectedDate}, ${hStr}:${mStr}`);
    setOpen(false);
  };

  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <div ref={triggerRef} className={`${styles.dateInputWrap}${className ? ` ${className}` : ''}`}>
      <button
        className={styles.datePickerTrigger}
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className={value ? styles.datePickerText : styles.datePickerPlaceholder}>
          {value || 'MM/DD/YYYY, HH:MM'}
        </span>
        <Icon name="solar:calendar-linear" size={14} color="var(--neutral-300)" />
      </button>

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div
            className={styles.dateTimeDropdown}
            style={{ top: rect ? rect.bottom + 4 : 0, right: rect ? window.innerWidth - rect.right : 0 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.dtPickerBody}>
              <div className={styles.calendarSection}>
                <div className={styles.calendarHeader}>
                  <ActionButton icon="solar:alt-arrow-left-linear" size="S"
                    onClick={() => setViewDate(new Date(year, month - 1, 1))} />
                  <span className={styles.calendarTitle}>{MONTH_NAMES[month]} {year}</span>
                  <ActionButton icon="solar:alt-arrow-right-linear" size="S"
                    onClick={() => setViewDate(new Date(year, month + 1, 1))} />
                </div>
                <div className={styles.calendarGrid}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className={styles.calendarDayLabel}>{d}</div>
                  ))}
                  {days.map((d, i) => d ? (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.calendarDay} ${
                        selectedDate === `${String(month + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`
                          ? styles.calendarDaySelected : ''
                      }`}
                      onClick={() => setSelectedDate(`${String(month + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}/${year}`)}
                    >{d}</button>
                  ) : <div key={i} />)}
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
                          {String(h).padStart(2, '0')}
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
                          {String(m).padStart(2, '0')}
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
        document.body
      )}
    </div>
  );
}

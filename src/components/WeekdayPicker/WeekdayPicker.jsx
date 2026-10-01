import styles from './WeekdayPicker.module.css';

// 0 = Sunday … 6 = Saturday, as Date#getDay.
const DAYS = [
  { day: 0, short: 'S', label: 'Sunday' },
  { day: 1, short: 'M', label: 'Monday' },
  { day: 2, short: 'T', label: 'Tuesday' },
  { day: 3, short: 'W', label: 'Wednesday' },
  { day: 4, short: 'T', label: 'Thursday' },
  { day: 5, short: 'F', label: 'Friday' },
  { day: 6, short: 'S', label: 'Saturday' },
];

/**
 * A row of day toggles (S M T W T F S): picked days fill in primary, the
 * rest stay grey. For schedules that repeat on chosen weekdays.
 *
 * @param {object}   props
 * @param {number[]} props.value     – Picked days, 0 (Sunday) to 6 (Saturday)
 * @param {function} props.onChange  – (days: number[]) => void, sorted
 * @param {string}   [props.label]   – Field label above the row
 * @param {string}   [props.errorText]
 * @param {boolean}  [props.disabled]
 */
export function WeekdayPicker({ value = [], onChange, label, errorText, disabled = false }) {
  const picked = new Set(value);
  const toggle = (day) => {
    const next = new Set(picked);
    if (next.has(day)) next.delete(day); else next.add(day);
    onChange([...next].sort((a, b) => a - b));
  };
  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.row} role="group" aria-label={label || 'Days'}>
        {DAYS.map(d => (
          <button
            key={d.day}
            type="button"
            className={picked.has(d.day) ? `${styles.day} ${styles.dayOn}` : styles.day}
            aria-pressed={picked.has(d.day)}
            aria-label={d.label}
            disabled={disabled}
            onClick={() => toggle(d.day)}
          >
            {d.short}
          </button>
        ))}
      </div>
      {errorText && <span className={styles.error}>{errorText}</span>}
    </div>
  );
}

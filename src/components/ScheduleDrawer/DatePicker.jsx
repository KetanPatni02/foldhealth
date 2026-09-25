import { useState, useRef } from 'react';
import { Icon } from '../Icon/Icon';
import { DatePickerPopover } from '../DatePicker/DatePickerPopover';
import styles from './ScheduleDrawer.module.css';

// Appointments store the date as MM-DD-YYYY; the shared calendar speaks ISO.
function toIso(value) {
  const s = String(value || '');
  let m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[1]}-${m[2]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromIso(iso) {
  const [y, mo, d] = String(iso || '').split('-');
  return y && mo && d ? `${mo}-${d}-${y}` : '';
}

/**
 * Date field for the schedule drawer. Uses the shared Fold calendar
 * (components/DatePicker/DatePickerPopover) so it matches every other date
 * picker in the app. `onSelect` still receives MM-DD-YYYY.
 */
export function DatePicker({ value, onSelect }) {
  const [anchorRect, setAnchorRect] = useState(null);
  const btnRef = useRef(null);
  const toggle = () => setAnchorRect(anchorRect ? null : btnRef.current?.getBoundingClientRect() || null);

  return (
    <div style={{ position: 'relative' }}>
      {value ? (
        <button ref={btnRef} type="button" className={styles.detailValue} onClick={toggle} style={{ cursor: 'pointer' }}>
          <Icon name="solar:calendar-linear" size={16} color="var(--neutral-300)" /> {value}
        </button>
      ) : (
        <button ref={btnRef} type="button" className={styles.detailValuePlaceholder} onClick={toggle}>
          <Icon name="solar:calendar-linear" size={16} color="var(--neutral-200)" /> Select Date
        </button>
      )}
      <DatePickerPopover
        open={!!anchorRect}
        anchorRect={anchorRect}
        value={toIso(value)}
        // Appointments can only be booked from today onward.
        min={todayIso()}
        onChange={(iso) => { const next = fromIso(iso); if (next) onSelect(next); }}
        onClose={() => setAnchorRect(null)}
      />
    </div>
  );
}

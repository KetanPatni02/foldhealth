import { Input } from '../../../../../../components/Input/Input';
import { Icon } from '../../../../../../components/Icon/Icon';
import styles from './OutreachTab.module.css';

/**
 * Call duration as [00 ⇅ min] : [00 ⇅ sec], the same number field with a
 * stepper and unit pill as the Care Plan due-date offset. The arrows step the
 * whole time, so 00:59 + 1 sec is 01:00 (0 to 99:59). Values are two-digit
 * strings ('05').
 */
export function DurationField({ min, sec, onMinChange, onSecChange }) {
  const step = (deltaSec) => {
    const total = Math.min(99 * 60 + 59, Math.max(0, (Number(min) || 0) * 60 + (Number(sec) || 0) + deltaSec));
    onMinChange(String(Math.floor(total / 60)).padStart(2, '0'));
    onSecChange(String(total % 60).padStart(2, '0'));
  };
  const part = (value, setValue, max, unit, by) => (
    <Input
      value={value}
      inputMode="numeric"
      aria-label={`Duration ${unit}`}
      wrapperClassName={styles.durationInput}
      onChange={e => setValue(String(Math.min(max, Number(e.target.value.replace(/\D/g, '').slice(-2)) || 0)).padStart(2, '0'))}
      trailingTextSegment
      trailingText={(
        <span className={styles.durationTrailing}>
          <span className={styles.durationSpinner}>
            <button type="button" className={styles.durationSpinnerBtn} aria-label={`Increase ${unit}`} onClick={() => step(by)}>
              <Icon name="solar:alt-arrow-up-linear" size={10} color="var(--neutral-300)" />
            </button>
            <button type="button" className={styles.durationSpinnerBtn} aria-label={`Decrease ${unit}`} onClick={() => step(-by)}>
              <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
            </button>
          </span>
          <span className={styles.durationUnitPill}>{unit}</span>
        </span>
      )}
    />
  );
  return (
    <div className={styles.durationRow}>
      {part(min, onMinChange, 99, 'min', 60)}
      <span className={styles.durationColon} aria-hidden="true">:</span>
      {part(sec, onSecChange, 59, 'sec', 1)}
    </div>
  );
}

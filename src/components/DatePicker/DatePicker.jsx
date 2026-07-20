import { forwardRef, useId } from 'react';
import styles from './DatePicker.module.css';

/**
 * Lightweight date picker — native `<input type="date">` styled to match
 * the rest of the form chrome. Browsers handle the calendar UI; we just
 * theme the trigger field and pipe value/onSelect.
 *
 * Forwards the underlying `<input>` ref so callers can imperatively open
 * the OS calendar via `ref.current?.showPicker()`. The `hidden` prop hides
 * the field visually while keeping it in the DOM so `showPicker()` still
 * works — used for dropdown-triggered custom-date affordances.
 */
export const DatePicker = forwardRef(function DatePicker({
  value = '',
  onSelect,
  hasError = false,
  id,
  disabled = false,
  placeholder,
  min,
  max,
  hidden = false,
}, ref) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <input
      ref={ref}
      id={fieldId}
      type="date"
      value={value || ''}
      onChange={(e) => onSelect?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      min={min}
      max={max}
      className={`${hidden ? styles.hidden : styles.input} ${hasError ? styles.error : ''}`}
      aria-invalid={hasError || undefined}
    />
  );
});

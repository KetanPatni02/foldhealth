import { useId } from 'react';
import styles from './DatePicker.module.css';

/**
 * Lightweight date picker — native `<input type="date">` styled to match
 * the rest of the form chrome. Browsers handle the calendar UI; we just
 * theme the trigger field and pipe value/onSelect.
 *
 * @param {object}             props
 * @param {string}             [props.value]    – ISO date string (YYYY-MM-DD)
 * @param {(v: string)=>void}  props.onSelect   – Called with the new value
 * @param {boolean}            [props.hasError] – Highlights the field in error color
 * @param {string}             [props.id]
 * @param {boolean}            [props.disabled]
 * @param {string}             [props.placeholder]
 */
export function DatePicker({ value = '', onSelect, hasError = false, id, disabled = false, placeholder }) {
  const autoId = useId();
  const fieldId = id || autoId;

  return (
    <input
      id={fieldId}
      type="date"
      value={value || ''}
      onChange={(e) => onSelect?.(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`${styles.input} ${hasError ? styles.error : ''}`}
      aria-invalid={hasError || undefined}
    />
  );
}

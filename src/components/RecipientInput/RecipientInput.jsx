import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { isEmailAddress } from './isEmailAddress';
import styles from './RecipientInput.module.css';


/**
 * Fold Health RecipientInput: email recipients as chips. Type an address
 * and press Enter, comma, Tab or Space (or leave the field) to add it;
 * Backspace in an empty field removes the last one; pasting a list adds
 * them all. An address that doesn't look valid shows in the error colour.
 *
 * @param {object}   props
 * @param {string}   props.label
 * @param {boolean}  [props.required]
 * @param {string[]} props.value       – The addresses
 * @param {(next: string[]) => void} props.onChange
 * @param {string}   [props.placeholder='Search or enter recipient']
 * @param {React.ReactNode} [props.labelEnd] – Beside the label, right (e.g. Cc / Bcc)
 */
export function RecipientInput({ label, required, value, onChange, placeholder = 'Search or enter recipient', labelEnd }) {
  const [draft, setDraft] = useState('');
  const add = (text) => {
    const parts = String(text).split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange([...value, ...parts.filter(p => !value.includes(p))]);
    setDraft('');
  };
  const remove = (addr) => onChange(value.filter(v => v !== addr));
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <span className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true" />}
        </span>
        {labelEnd}
      </div>
      <div className={styles.box}>
        {value.map(addr => (
          <span key={addr} className={[styles.chip, isEmailAddress(addr) ? '' : styles.invalid].filter(Boolean).join(' ')}>
            <span className={styles.chipText}>{addr}</span>
            <button type="button" className={styles.chipRemove} onClick={() => remove(addr)} aria-label={`Remove ${addr}`}>
              <Icon name="solar:close-circle-linear" size={14} color="currentColor" />
            </button>
          </span>
        ))}
        <input
          className={styles.input}
          type="email"
          aria-label={label}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]\s*$/.test(v)) add(v); else setDraft(v);
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') && draft.trim()) {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (/[\s,;]/.test(text.trim())) { e.preventDefault(); add(text); }
          }}
        />
      </div>
    </div>
  );
}

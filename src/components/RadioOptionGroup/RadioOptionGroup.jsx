import { RadioButton } from '../RadioButton/RadioButton';
import styles from './RadioOptionGroup.module.css';

/**
 * A labelled group of radios, each with an optional hint line beneath it.
 *
 * @param {string}   props.label     Group label, also the radiogroup's name.
 * @param {Array<{value: string, label: string, hint?: string}>} props.options
 * @param {string}   props.value     Selected option value.
 * @param {function} props.onChange  Called with the picked value.
 * @param {string}   [props.name]    Shared HTML name for the radios.
 */
export function RadioOptionGroup({ label, options, value, onChange, name }) {
  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.group} role="radiogroup" aria-label={label}>
        {options.map(o => (
          <div key={o.value} className={styles.option}>
            <RadioButton
              name={name}
              value={o.value}
              label={o.label}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.hint && <p className={styles.hint}>{o.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

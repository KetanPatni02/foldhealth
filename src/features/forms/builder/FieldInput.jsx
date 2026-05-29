/**
 * Renders a single form field as its actual input, using the shared Fold
 * component primitives (Input, Textarea, Select, DatePicker, RadioButton,
 * Checkbox). Used both on the builder canvas (interactive=false → inert) and
 * in the live Preview tab (interactive=true → wired to answers).
 */
import { Input } from '../../../components/Input/Input';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Select } from '../../../components/Select/Select';
import { DatePicker } from '../../../components/DatePicker/DatePicker';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { Checkbox } from '../../../components/ui/checkbox';
import styles from './FormBuilder.module.css';

export function FieldInput({ field, value, onChange, interactive = false, idPrefix = 'f' }) {
  const disabled = !interactive;
  const set = (v) => interactive && onChange?.(v);
  const id = `${idPrefix}-${field.linkId}`;
  const opts = field.options || [];

  switch (field.type) {
    case 'text':
      return (
        <Textarea
          className={styles.ctl}
          rows={3}
          placeholder={field.placeholder || 'Type your answer'}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => set(e.target.value)}
        />
      );

    case 'integer':
    case 'decimal': {
      const input = (
        <Input
          className={styles.ctl}
          type="number"
          step={field.type === 'decimal' ? '0.01' : '1'}
          placeholder={field.placeholder || '0'}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
      return field.control === 'currency' ? (
        <div className={styles.fiInputWrap}>
          <span className={styles.fiPrefix}>$</span>
          <Input
            className={styles.fiCurrencyInput}
            type="number"
            step="0.01"
            placeholder={field.placeholder || '0.00'}
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      ) : input;
    }

    case 'date':
      return <DatePicker value={value ?? ''} onSelect={set} disabled={disabled} id={id} />;

    case 'boolean':
      return (
        <label className={styles.fiCheckRow}>
          <Checkbox checked={!!value} disabled={disabled} onCheckedChange={(c) => set(!!c)} />
          <span>{field.consentLabel || field.text}</span>
        </label>
      );

    case 'display':
      return field.control === 'image'
        ? <div className={styles.fiImage}>Image</div>
        : <p className={styles.fiParagraph}>{field.text}</p>;

    case 'choice': {
      if (field.control === 'dropdown') {
        return (
          <Select
            className={styles.ctl}
            placeholder="Select an option"
            value={value ?? ''}
            disabled={disabled}
            options={opts.map((o) => ({ value: o.value, label: o.value }))}
            onChange={set}
          />
        );
      }
      const multi = field.control === 'checkbox';
      const arr = Array.isArray(value) ? value : [];
      return (
        <div className={styles.fiOptions}>
          {opts.map((o, i) => {
            const checked = multi ? arr.includes(o.value) : value === o.value;
            if (multi) {
              return (
                <label key={i} className={styles.fiOptionRow}>
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => set(checked ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                  />
                  <span>{o.value}</span>
                </label>
              );
            }
            return (
              <RadioButton
                key={i}
                name={id}
                value={o.value}
                label={o.value}
                checked={checked}
                disabled={disabled}
                onChange={() => set(o.value)}
              />
            );
          })}
        </div>
      );
    }

    case 'string':
    default:
      return (
        <Input
          className={styles.ctl}
          type={field.control === 'email' ? 'email' : field.control === 'tel' ? 'tel' : 'text'}
          placeholder={field.placeholder || 'Type your answer'}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => set(e.target.value)}
        />
      );
  }
}

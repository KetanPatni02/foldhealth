import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Select } from '../../../components/Select/Select';
import { Input } from '../../../components/Input/Input';
import { Collapse } from '../../../components/Collapse/Collapse';
import { VERIFICATION_METHODS, INVALID_ATTEMPT_POLICIES } from './sendTo';
import styles from './VerifyIdCard.module.css';

const num = (v, min = 1) => Math.max(min, Number(v) || min);

/**
 * "Verify ID to access links in this mail" (Figma 2900:34239): when ticked,
 * recipients confirm who they are before the email's links open. Settings
 * sit as label | field rows.
 *
 * @param {object}   props.value    – DEFAULT_ID_VERIFICATION's shape
 * @param {function} props.onChange – (next) => void
 */
export function VerifyIdCard({ value: v, onChange }) {
  const set = (patch) => onChange({ ...v, ...patch });
  const row = (label, control) => (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.rowControl}>{control}</div>
    </div>
  );
  return (
    <div className={styles.card}>
      <label className={styles.check}>
        <Checkbox checked={v.on} onCheckedChange={(c) => set({ on: c === true })} />
        Verify ID to access links in this mail
      </label>
      <Collapse open={v.on}>
        <div className={styles.rows}>
          {row('Verification Methods', (
            <Select
              multiple
              checkboxes
              badges
              options={VERIFICATION_METHODS.map(m => ({ value: m.value, label: m.label }))}
              value={v.methods}
              onChange={(methods) => set({ methods, minimum: Math.min(v.minimum, Math.max(1, methods.length)) })}
              placeholder="Select methods"
            />
          ))}
          {row('Minimum Methods to verify for access', (
            <Select
              options={Array.from({ length: Math.max(1, v.methods.length) }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
              value={String(Math.min(v.minimum, Math.max(1, v.methods.length)))}
              onChange={(m) => set({ minimum: Number(m) })}
            />
          ))}
          {row('Action after Failed Attempts', (
            <Select
              options={INVALID_ATTEMPT_POLICIES.map(p => ({ value: p, label: p }))}
              value={v.action}
              onChange={(action) => set({ action })}
            />
          ))}
          {row('Invalid Attempts per window', (
            <Input type="number" min={1} value={String(v.attemptsPerWindow)} onChange={(e) => set({ attemptsPerWindow: num(e.target.value) })} />
          ))}
          {row('Attempt window', (
            <Input type="number" min={1} trailingText="Minutes" value={String(v.windowMinutes)} onChange={(e) => set({ windowMinutes: num(e.target.value) })} />
          ))}
          {row('Lock Duration (Minutes)', (
            <Input type="number" min={1} trailingText="Minutes" value={String(v.lockMinutes)} onChange={(e) => set({ lockMinutes: num(e.target.value) })} />
          ))}
        </div>
      </Collapse>
    </div>
  );
}

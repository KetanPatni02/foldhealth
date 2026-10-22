import { useMemo, useState } from 'react';
import { Drawer } from '../../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../../components/Button/Button';
import { Input } from '../../../../../../components/Input/Input';
import { DatePicker } from '../../../../../../components/DatePicker/DatePicker';
import { toast } from '../../../../../../components/Toast/sonnerToast';
import { useAppStore } from '../../../../../../store/useAppStore';
import { todayIso, isFutureDate } from '../../../../../../lib/clinicalDates';
import { VITALS, formatVitalWithUnit } from '../vitalsConfig';
import styles from './RecordVitalsDrawer.module.css';

const mdy = (iso) => { const [y, m, d] = iso.split('-'); return `${m}-${d}-${y}`; };

// Arrow keys / stepper nudge by 1 (0.1 for decimals already typed).
const step = (v, dir) => {
  const n = Number(v);
  if (v === '' || Number.isNaN(n)) return dir > 0 ? '1' : '0';
  const inc = String(v).includes('.') ? 0.1 : 1;
  return String(Math.max(0, Math.round((n + dir * inc) * 10) / 10));
};

/**
 * Record New Vitals (Figma 67:131374): one card per vital with its last
 * reading on top. Only vitals with a value are saved; a two-part vital
 * (Blood Pressure, Height) needs its first number.
 *
 * history – { [vital_key]: readings newest first } from vitalsHistory()
 */
export function RecordVitalsDrawer({ patientId, history = {}, onClose }) {
  const recordPatientVitals = useAppStore(s => s.recordPatientVitals);
  const [on, setOn] = useState(todayIso());
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const set = (key, i, v) => setValues(s => {
    const pair = [...(s[key] || ['', ''])];
    pair[i] = v;
    return { ...s, [key]: pair };
  });

  const readings = useMemo(() => VITALS
    .filter(v => (values[v.key]?.[0] ?? '') !== '')
    .map(v => ({
      vital_key: v.key,
      value: values[v.key][0],
      value2: v.parts === 2 ? (values[v.key][1] || (v.key === 'ht' ? '0' : null)) : null,
      recorded_on: on,
    })), [values, on]);

  // A BP needs both numbers; Height can leave inches empty (counts as 0).
  const incompleteBp = readings.some(r => r.vital_key === 'bp' && !r.value2);
  const canRecord = readings.length > 0 && !!on && !isFutureDate(on) && !incompleteBp && !saving;

  const record = async () => {
    setSaving(true);
    const { error } = await recordPatientVitals(patientId, readings);
    setSaving(false);
    if (error) { toast.error('Vitals could not be recorded'); return; }
    toast.success(readings.length === 1 ? 'Vital recorded' : `${readings.length} vitals recorded`);
    setClosing(true);
  };

  return (
    <Drawer
      title="Record New Vitals"
      onClose={onClose}
      dismissed={closing}
      primaryAction={<Button variant="primary" size="L" disabled={!canRecord} onClick={record}>Record</Button>}
    >
      <div className={styles.body}>
        <div className={styles.onRow}>
          <span className={styles.onLabel}>On</span>
          <div className={styles.date}>
            <DatePicker value={on} onSelect={setOn} max={todayIso()} aria-label="Recorded on" />
          </div>
        </div>

        {VITALS.map(v => {
          const last = history[v.key]?.[0];
          const pair = values[v.key] || ['', ''];
          return (
            <div key={v.key} className={styles.card}>
              {last && (
                <div className={styles.cardHead}>
                  Last Recorded: {formatVitalWithUnit(v.key, last.value, last.value2)} • {mdy(last.recorded_on)}
                </div>
              )}
              <div className={styles.cardRow}>
                <span className={styles.name}>{v.name}</span>
                {Array.from({ length: v.parts }).map((_, i) => (
                  <span key={i} className={styles.part}>
                    {i === 1 && v.sep && <span className={styles.unit}>{v.sep}</span>}
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="value"
                      aria-label={v.parts === 2 ? `${v.name} ${v.units[i] || (i ? 'second' : 'first')}` : v.name}
                      value={pair[i]}
                      onChange={(e) => set(v.key, i, e.target.value)}
                      onStepUp={() => set(v.key, i, step(pair[i], 1))}
                      onStepDown={() => set(v.key, i, step(pair[i], -1))}
                      wrapperClassName={styles.num}
                    />
                    {v.units[i] && <span className={styles.unit}>{v.units[i]}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

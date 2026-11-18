import { useState } from 'react';
import { Dialog, DialogContent } from '../../../components/Dialog/Dialog';
import { Input } from '../../../components/Input/Input';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { Button } from '../../../components/Button/Button';
import { todayIso } from '../useCareGapReminderForm';
import { MMR_DISEASES, markError } from './cisRules';
import { isoToMdy } from './useCisTracker';
import styles from './CisMarkDialog.module.css';

/**
 * Marks a CIS-CMB10 vaccine Immune (Hep A, Hep B, MMR, VZV) or a dose
 * Contraindicated (that dose only). Both need a date (not in the future) and free text; MMR
 * Immune also needs all three diseases ticked.
 *
 * @param {object}   props
 * @param {'immune'|'contraindicated'} props.kind
 * @param {object}   props.antigen  – evaluateCis() antigen
 * @param {number}   [props.doseNumber] – Contraindicated: the one dose it applies to
 * @param {function} props.onSubmit – ({ kind, date, details, diseases }) => void
 * @param {function} props.onCancel
 */
export function CisMarkDialog({ kind, antigen, doseNumber, onSubmit, onCancel }) {
  const [date, setDate] = useState(todayIso());
  const [details, setDetails] = useState('');
  const [diseases, setDiseases] = useState([]);
  const immune = kind === 'immune';
  const isMmr = immune && antigen.key === 'mmr';
  const mark = { kind, antigenKey: antigen.key, date: date ? isoToMdy(date) : '', details: details.trim(), diseases };
  const error = markError(mark);
  const toggle = (d, on) => setDiseases(list => (on ? [...list, d] : list.filter(x => x !== d)));
  const submit = () => {
    if (error) return;
    onSubmit({ kind, date: mark.date, details: mark.details, diseases: isMmr ? diseases : [] });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className={styles.content}>
        <div className={styles.body}>
          <h3 className={styles.title}>{immune ? `Mark ${antigen.label} Immune` : `Mark ${antigen.label} Dose ${doseNumber} Contraindicated`}</h3>
          <p className={styles.description}>
            {immune
              ? 'Counts toward HEDIS when dated on or before the 2nd birthday. Open doses are closed. You can undo this later.'
              : `Applies to dose ${doseNumber} only. It won't be chased or counted. You can undo this later.`}
          </p>
          <Input label="Date" required type="date" max={todayIso()} value={date} onChange={e => setDate(e.target.value)} />
          {isMmr && (
            <fieldset className={styles.diseases}>
              <legend className={styles.label}>Immune to <span className={styles.required} aria-hidden="true" /></legend>
              {MMR_DISEASES.map(d => (
                <label key={d} className={styles.disease}>
                  <Checkbox checked={diseases.includes(d)} onCheckedChange={(on) => toggle(d, on === true)} />
                  {d}
                </label>
              ))}
            </fieldset>
          )}
          <Textarea
            title={immune ? 'Details' : 'Contraindication'}
            mandatory
            rows={3}
            value={details}
            onValueChange={setDetails}
            placeholder={immune ? 'History of illness or positive blood test' : 'e.g. Anaphylaxis after dose 1'}
          />
          <div className={styles.footer}>
            <Button variant="outline" fullWidth onClick={onCancel}>Cancel</Button>
            <Button fullWidth disabled={!!error} onClick={submit}>{immune ? 'Mark Immune' : 'Mark Contraindicated'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

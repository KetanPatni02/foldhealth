import { useEffect, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/Button/Button';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { Switch } from '../../../components/Switch/Switch';
import { Checkbox } from '../../../components/Checkbox/Checkbox';
import { RECIPIENTS, PROGRAMS, recipientLabel } from './outreachModel';
import styles from './OutreachOutcomesSettings.module.css';

const CATEGORY_OPTIONS = ['Successful', 'Unsuccessful'].map(c => ({ value: c, label: c }));

/**
 * Settings > Organization: the Patient Outreach outcome list (per tenant and
 * care program). Outcomes are added or deactivated, never deleted; a
 * deactivated outcome can't be picked for new entries but still reads on
 * old ones. Note has no outcomes.
 */
export function OutreachOutcomesSettings() {
  const outcomes = useAppStore(s => s.outreachOutcomes);
  const fetchOutreachOutcomes = useAppStore(s => s.fetchOutreachOutcomes);
  const addOutreachOutcome = useAppStore(s => s.addOutreachOutcome);
  const setOutreachOutcomeActive = useAppStore(s => s.setOutreachOutcomeActive);
  useEffect(() => { fetchOutreachOutcomes(); }, [fetchOutreachOutcomes]);

  const [program, setProgram] = useState('RA');
  const shown = outcomes.filter(o => (o.program || 'RA') === program);
  const [category, setCategory] = useState('Successful');
  const [label, setLabel] = useState('');
  const [recipients, setRecipients] = useState(['pcp']);

  const duplicate = shown.some(o => o.category === category && o.label.toLowerCase() === label.trim().toLowerCase());
  const canAdd = label.trim() && recipients.length > 0 && !duplicate;
  const toggleRecipient = (key, on) => setRecipients(r => (on ? [...new Set([...r, key])] : r.filter(k => k !== key)));

  return (
    <div className={styles.wrap}>
      <span className={styles.title}>Patient Outreach outcomes</span>
      <p className={styles.hint}>
        Outcomes offered for Successful and Unsuccessful outreach, by care program and recipient. Turn one off to stop it being picked; entries that used it keep it.
      </p>
      <div className={styles.category}>
        <Select label="Care program" options={PROGRAMS.map(p => ({ value: p, label: p }))} value={program} onValueChange={setProgram} />
      </div>
      {shown.length === 0 && (
        <p className={styles.hint}>{program} uses the launch list until you add its own outcomes.</p>
      )}
      <table className={styles.table}>
        <thead>
          <tr><th>Category</th><th>Outcome</th><th>Recipients</th><th>Active</th></tr>
        </thead>
        <tbody>
          {shown.map(o => (
            <tr key={o.id} className={o.active === false ? styles.inactive : undefined}>
              <td>{o.category}</td>
              <td>{o.label}</td>
              <td>{o.recipients.map(recipientLabel).join(', ')}</td>
              <td>
                <Switch
                  checked={o.active !== false}
                  onChange={(on) => setOutreachOutcomeActive(o.id, on)}
                  ariaLabel={`${o.label} active`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.addRow}>
        <div className={styles.category}>
          <Select label="Category" options={CATEGORY_OPTIONS} value={category} onValueChange={setCategory} />
        </div>
        <div className={styles.label}>
          <Input label="New outcome" placeholder="e.g. Patient Declined" value={label} onChange={e => setLabel(e.target.value)} />
        </div>
        <div className={styles.recipients}>
          {RECIPIENTS.map(r => (
            <label key={r.key} className={styles.check}>
              <Checkbox checked={recipients.includes(r.key)} onCheckedChange={(on) => toggleRecipient(r.key, !!on)} />
              {r.label}
            </label>
          ))}
        </div>
        <Button
          variant="outline"
          disabled={!canAdd}
          onClick={() => { addOutreachOutcome({ program, category, label, recipients }); setLabel(''); }}
        >
          Add Outcome
        </Button>
      </div>
      {duplicate && label.trim() && <span className={styles.error}>That outcome already exists for {category}.</span>}
    </div>
  );
}

import { useState } from 'react';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Button } from '../../../../../../../../components/Button/Button';
import { Checkbox } from '../../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { MED_RECON_MOCK } from '../../../../../../data/medReconMock';
import styles from './MedicationReconciliation.module.css';

export function MedicationReconciliation() {
  const data = MED_RECON_MOCK;
  const [checks, setChecks] = useState(() => {
    const seed = {};
    data.checklist.forEach(c => { seed[c.id] = c.checked; });
    return seed;
  });

  return (
    <div className={styles.container}>
      {/* Active Medications */}
      <div className={styles.medHeader}>
        <div className={styles.medHeaderLeft}>
          <Checkbox aria-label="Select all medications" />
          <span className={styles.medHeaderTitle}>Active Medications</span>
        </div>
        <Button variant="tertiary" size="S" trailingIcon="solar:alt-arrow-down-linear">Add New</Button>
      </div>

      {/* Discharge updates callout */}
      <div className={styles.discharge}>
        <button type="button" className={styles.dischargeLink}>
          <Icon name="solar:magic-stick-3-linear" size={16} color="var(--primary-300)" />
          New Medication Updates from Discharge Report
          {data.dischargeUpdates > 0 && <span className={styles.dischargeBadge}>{data.dischargeUpdates}</span>}
        </button>
        <span className={styles.dischargeDivider} />
        <button type="button" className={styles.viewAll}>View All</button>
      </div>

      {/* Medications table */}
      <div className={styles.table}>
        <div className={styles.headRow}>
          <span className={styles.checkCell} />
          <span className={styles.nameCell}>Medication Name</span>
          <span className={styles.dateCell}>Start Date</span>
          <span className={styles.dateCell}>Stop Date</span>
          <span className={styles.sigCell}>Sig</span>
        </div>
        {data.medications.map(m => (
          <div key={m.id} className={styles.row}>
            <span className={styles.checkCell} onClick={e => e.stopPropagation()}>
              <Checkbox aria-label={`Select ${m.name}`} />
            </span>
            <span className={styles.nameCell}>{m.name}</span>
            <span className={styles.dateCell}>{m.start}</span>
            <span className={styles.dateCell}>{m.stop}</span>
            <span className={styles.sigCell}>{m.sig}</span>
          </div>
        ))}
      </div>

      {/* Medication Checklist */}
      <div className={styles.checklist}>
        <div className={styles.checklistTitle}>Medication Checklist</div>
        {data.checklist.map(c => (
          <label key={c.id} className={styles.checkItem}>
            <Checkbox
              checked={!!checks[c.id]}
              onCheckedChange={v => setChecks(prev => ({ ...prev, [c.id]: v === true }))}
            />
            <span className={`${styles.checkLabel} ${checks[c.id] ? styles.checkLabelDone : ''}`}>{c.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

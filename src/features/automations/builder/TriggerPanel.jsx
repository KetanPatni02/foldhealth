import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Select } from '../../../components/Select/Select';
import { Alert } from '../../../components/Alert/Alert';
import { CARE_PROGRAM_CATALOG } from '../../patient/data/careProgramCatalog';
import { TRIGGER_GROUPS, TRIGGERS, nodeDef } from '../lib/catalog';
import { EditPanel } from './EditPanel';
import styles from './AutomationBuilder.module.css';

const PROGRAM_OPTIONS = CARE_PROGRAM_CATALOG.map(p => ({ value: p.code, label: `${p.name} (${p.code})` }));

/** "Run automation, when": pick the event that starts the automation. */
export function TriggerPanel({ graph, current, onSave, onClose }) {
  const [type, setType] = useState(current?.type || null);
  const [programCodes, setProgramCodes] = useState(current?.config?.programCodes || []);
  // Steps that only work after a specific trigger (care plan actions).
  const stranded = (graph?.nodes || []).filter(n => {
    const t = nodeDef(n.type)?.triggers;
    return t && type && !t.includes(type);
  });

  return (
    <EditPanel
      title="Run automation, when"
      onSave={() => onSave(type, type === 'careProgramEnrolled' ? { programCodes } : {})}
      saveDisabled={!type}
      onClose={onClose}
    >
      {stranded.length > 0 && (
        <Alert tone="warning">
          {stranded.length} care plan step{stranded.length === 1 ? '' : 's'} only run when a patient is enrolled in a care program.
        </Alert>
      )}
      {TRIGGER_GROUPS.map(group => (
        <div key={group} className={styles.panelSection}>
          <span className={styles.panelSectionTitle}>{group}</span>
          <div className={styles.triggerList}>
            {TRIGGERS.filter(t => t.group === group).map(t => (
              <button
                key={t.type}
                type="button"
                className={`${styles.triggerOption} ${type === t.type ? styles.triggerOptionActive : ''}`}
                onClick={() => setType(t.type)}
                aria-pressed={type === t.type}
              >
                <Icon name={t.icon} size={18} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          {group === 'Care program' && type === 'careProgramEnrolled' && (
            <Select
              label="Programs"
              options={PROGRAM_OPTIONS}
              value={programCodes}
              onChange={v => setProgramCodes(v || [])}
              multiple
              checkboxes
              badges
              placeholder="Any care program"
            />
          )}
        </div>
      ))}
    </EditPanel>
  );
}

import { useMemo, useState } from 'react';
import { Input } from '../../../../../components/Input/Input';
import { Textarea } from '../../../../../components/Textarea/Textarea';
import { Button } from '../../../../../components/Button/Button';
import { Badge } from '../../../../../components/Badge/Badge';
import { CloseButton } from '../../../../../components/CloseButton/CloseButton';
import { CarePlanSections, ChronicConditionSelect } from '../../shared';
import {
  goalPayloadFromTemplateEntry,
  interventionPayloadFromTemplateEntry,
} from '../../../../patient/right-panel/tabs/care-programs/care-plan/lib/carePlanTemplateApply';
import { useAppStore } from '../../../../../store/useAppStore';
import styles from './CarePlanTemplateView.module.css';

const NAME_MAX = 25;

/**
 * A Care Plan Library template, full-pane like New Care Plan: identity on the
 * left, the plan itself on the right rendered with the same GBI tables the
 * patient care plan uses — a template is the plan a patient will get, so it
 * should read identically before it is applied.
 *
 * `mode` is 'view' (read-only) or 'edit' (name/description editable + Save).
 */
export function CarePlanTemplateView({ template, mode = 'view', onClose, onSave }) {
  const libraryGoals = useAppStore(s => s.carePlanGoals);
  const isEdit = mode === 'edit';

  const [name, setName] = useState(template.name || '');
  const [description, setDescription] = useState(template.description || '');
  const [conditions, setConditions] = useState(template.conditions || []);

  const goalRows = useMemo(() => (template.goals || []).map((entry, i) => ({
    ...goalPayloadFromTemplateEntry(entry, libraryGoals),
    id: entry.id || `goal-${i}`,
    currentValue: 'No Data',
    trend: '—',
    progress: '0%',
  })), [template.goals, libraryGoals]);

  const interventionRows = useMemo(() => (template.interventions || []).map((entry, i) => ({
    ...interventionPayloadFromTemplateEntry(entry),
    id: entry.id || `intv-${i}`,
  })), [template.interventions]);

  const barrierRows = useMemo(() => (template.barriers || []).map((entry, i) => ({
    id: entry.id || `barrier-${i}`,
    title: entry.title,
    subtitle: entry.description || '',
    status: 'Not Started',
  })), [template.barriers]);

  return (
    <div className={styles.view}>
      <div className={styles.formPane}>
        <div className={styles.formHeader}>
          <span className={styles.formTitle}>{isEdit ? 'Edit Care Plan' : template.name}</span>
        </div>
        <div className={styles.formBody}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Care Plan Name</span>
            {isEdit ? (
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter Care Plan Name"
                maxLength={NAME_MAX}
                characterLimit={NAME_MAX}
              />
            ) : (
              <span className={styles.fieldValue}>{template.name}</span>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Description</span>
            {isEdit ? (
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe the Plan objective"
                rows={4}
              />
            ) : (
              <span className={styles.fieldValue}>{template.description || '—'}</span>
            )}
          </div>

          <div className={styles.field}>
            {isEdit ? (
              <ChronicConditionSelect
                label="Conditions"
                value={conditions}
                onChange={setConditions}
              />
            ) : (
              <>
                <span className={styles.fieldLabel}>Conditions</span>
                <div className={styles.conditions}>
                  {(template.conditions || []).length
                    ? template.conditions.map(c => <Badge key={c} tone="grey" size="S" label={c} />)
                    : <span className={styles.fieldValue}>—</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.planPane}>
        <div className={styles.toolbar}>
          {isEdit && (
            <>
              <Button
                variant="primary"
                size="L"
                disabled={!name.trim()}
                onClick={() => onSave?.({
                  name: name.trim(),
                  description,
                  conditions,
                  goals: template.goals || [],
                  interventions: template.interventions || [],
                  barriers: template.barriers || [],
                })}
              >
                Save
              </Button>
              <span className={styles.toolbarDivider} />
            </>
          )}
          <CloseButton onClick={onClose} label="Close care plan template" />
        </div>

        <div className={styles.planBody}>
          <CarePlanSections
            goalRows={goalRows}
            interventionRows={interventionRows}
            barrierRows={barrierRows}
          />
        </div>
      </div>
    </div>
  );
}

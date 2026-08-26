import { useState } from 'react';
import { Input } from '../../../components/Input/Input';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Button } from '../../../components/Button/Button';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { CloseButton } from '../../../components/CloseButton/CloseButton';
import { RingEmptyState } from '../../../components/RingEmptyState/RingEmptyState';
import { AIIcon } from '../../../components/Icon/AIIcon';
import { AddIconMinimalist } from '../../../components/Icon/AddIconMinimalist';
import { Badge } from '../../../components/Badge/Badge';
import { PriorityIcon } from '../../../components/PriorityIcon/PriorityIcon';
import { AddGoalsDrawer } from './AddGoalsDrawer';
import styles from './CarePlanCreateView.module.css';

const NAME_MAX = 25;

const TEMPLATE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'chronic', label: 'For Chronic Conditions' },
];

/**
 * New Care Plan — full-pane template creation (Figma Care-Plan-Creation
 * 14108:294857). Left column holds the plan's identity (name, description,
 * template type); the right column is where goals accrue, empty until the
 * first one is added.
 */
export function CarePlanCreateView({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState('general');
  const [goals, setGoals] = useState([]);
  const [addGoalsOpen, setAddGoalsOpen] = useState(false);

  // Picked goals merge in by id, so re-opening the picker can't duplicate rows.
  const addGoals = (picked) => {
    setGoals(prev => {
      const seen = new Set(prev.map(g => g.id));
      return [...prev, ...picked.filter(g => !seen.has(g.id))];
    });
    setAddGoalsOpen(false);
  };

  const canSave = name.trim().length > 0;

  return (
    <div className={styles.view}>
      <div className={styles.formPane}>
        <div className={styles.formHeader}>
          <span className={styles.formTitle}>New Care Plan</span>
        </div>

        <div className={styles.formBody}>
          <div className={styles.field}>
            <div className={styles.fieldLabelRow}>
              <span className={styles.fieldLabel}>
                Care Plan Name <span className={styles.mandatoryDot} aria-hidden="true" />
              </span>
              <button type="button" className={styles.aiLink}>
                <AIIcon size={14} />
                <span className={styles.aiLinkText}>Write with AI</span>
              </button>
            </div>
            <Input
              value={name}
              onChange={e => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder="Enter Care Plan Name"
              characterLimit={NAME_MAX}
              aria-label="Care Plan Name"
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Description</span>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Briefly describe the Plan objective"
              rows={3}
              aria-label="Description"
            />
          </div>

          <span className={styles.sectionTitle}>Template Type</span>
          <div className={styles.radioGroup} role="radiogroup" aria-label="Template Type">
            {TEMPLATE_TYPES.map(t => (
              <RadioButton
                key={t.value}
                name="templateType"
                value={t.value}
                label={t.label}
                checked={templateType === t.value}
                onChange={() => setTemplateType(t.value)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.goalsPane}>
        <div className={styles.toolbar}>
          <Button variant="tertiary" size="L">Save as Draft</Button>
          <Button
            variant="secondary"
            size="L"
            disabled={!canSave}
            onClick={() => onSave?.({ name: name.trim(), description: description.trim(), templateType, goals })}
          >
            Save as Template
          </Button>
          <span className={styles.toolbarDivider} />
          <CloseButton onClick={onClose} />
        </div>

        <div className={styles.goalsBody}>
          {goals.length === 0 ? (
            <div className={styles.goalsEmpty}>
              <RingEmptyState icon="solar:heart-pulse-linear" label="No Goals Added" iconSize={31} />
              <div className={styles.goalsEmptyActions}>
                <Button
                  variant="tertiary"
                  size="L"
                  leadingIconElement={<AddIconMinimalist size={16} />}
                  onClick={() => setAddGoalsOpen(true)}
                >
                  Add New
                </Button>
                <Button variant="secondary" size="L">Use Template</Button>
              </div>
            </div>
          ) : (
            <div className={styles.goalList}>
              {goals.map(g => (
                <div key={g.id} className={styles.goalCard}>
                  <span className={styles.goalText}>
                    <span className={styles.goalTitle}>{g.title}</span>
                    {g.detail && <span className={styles.goalDetail}>{g.detail}</span>}
                  </span>
                  <span className={styles.goalMeta}>
                    <Badge tone="grey" size="S" label={g.category} />
                    <PriorityIcon priority={g.priority} size={16} />
                  </span>
                </div>
              ))}
              <div className={styles.goalListActions}>
                <Button
                  variant="tertiary"
                  size="L"
                  leadingIconElement={<AddIconMinimalist size={16} />}
                  onClick={() => setAddGoalsOpen(true)}
                >
                  Add New
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {addGoalsOpen && (
        <AddGoalsDrawer onClose={() => setAddGoalsOpen(false)} onAdd={addGoals} />
      )}
    </div>
  );
}

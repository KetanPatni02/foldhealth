import { useRef, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { DownChevronIcon } from '../../../components/Icon/DownChevronIcon';
import { VITAL_OPTIONS } from './vitalOptions';
import styles from './InterventionDrawer.module.css';

const CREATION_TIMINGS = ['day', 'week', 'immediate'];

const CREATION_TRIGGERS = ['Program Start Date', 'Discharge Date', 'Care Plan Signed'];

const DUE_UNITS = ['day', 'week'];

const PRIORITIES = ['High', 'Medium', 'Low'];

const asOptions = (list) => list.map(v => ({ value: v, label: v }));

/**
 * Measure Vital — the vital-capture intervention from the Interventions "+"
 * menu. Same shape as Send Patient Education, with a vital picker and a note.
 */
export function MeasureVitalDrawer({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [vital, setVital] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState('Low');
  const [memberTaskTitle, setMemberTaskTitle] = useState('');
  const [creationTiming, setCreationTiming] = useState('immediate');
  const [creationTrigger, setCreationTrigger] = useState('Care Plan Signed');
  const [dueOffset, setDueOffset] = useState('7');
  const [dueUnit, setDueUnit] = useState('day');
  const [durationType, setDurationType] = useState('calendar');
  const [dueUnitOpen, setDueUnitOpen] = useState(false);
  const dueUnitRef = useRef(null);

  const canSave = title.trim().length > 0 && vital.length > 0;

  const headerRight = (
    <>
      <Button
        variant="primary"
        size="L"
        disabled={!canSave}
        onClick={() => onSave?.({
          title: title.trim(),
          vital,
          note: note.trim(),
          priority,
          memberTaskTitle: memberTaskTitle.trim(),
          creationTiming,
          creationTrigger,
          dueOffset,
          dueUnit,
          durationType,
        })}
      >
        Save
      </Button>
      <span className={styles.headerDivider} />
    </>
  );

  return (
    <Drawer title="Measure Vital" onClose={onClose} headerRight={headerRight} noCloseDivider>
      <div className={styles.body}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Title <span className={styles.mandatoryStar} aria-hidden="true">*</span>
          </span>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter The Task Title"
            aria-label="Title"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Vital <span className={styles.mandatoryStar} aria-hidden="true">*</span>
          </span>
          <Select
            options={asOptions(VITAL_OPTIONS)}
            value={vital}
            onChange={setVital}
            placeholder="Search Vital"
            searchable
            searchPlaceholder="Search Vital"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Note</span>
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Enter the note"
            aria-label="Note"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Priority <span className={styles.mandatoryStar} aria-hidden="true">*</span>
          </span>
          <Select options={asOptions(PRIORITIES)} value={priority} onChange={setPriority} />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Member Task Title</span>
          <Input
            value={memberTaskTitle}
            onChange={e => setMemberTaskTitle(e.target.value)}
            placeholder="Enter Task Title"
            aria-label="Member Task Title"
          />
        </div>

        <div className={styles.dateSection}>
          <span className={styles.sectionTitle}>
            Set Task Dates <span className={styles.mandatoryStar} aria-hidden="true">*</span>
          </span>
          <div className={styles.dateGroup}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Creation Date</span>
              <div className={styles.inlineRow}>
                <Select
                  options={asOptions(CREATION_TIMINGS)}
                  value={creationTiming}
                  onChange={setCreationTiming}
                  className={styles.timingSelect}
                />
                <span className={styles.inlineText}>After</span>
                <Select
                  options={asOptions(CREATION_TRIGGERS)}
                  value={creationTrigger}
                  onChange={setCreationTrigger}
                  className={styles.triggerSelect}
                />
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Due Date</span>
          <div className={styles.inlineRow}>
            <Input
              value={dueOffset}
              onChange={e => setDueOffset(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              aria-label="Due date offset"
              wrapperClassName={styles.offsetInput}
              trailingTextSegment
              trailingText={(
                <button
                  ref={dueUnitRef}
                  type="button"
                  className={styles.unitTrigger}
                  aria-haspopup="menu"
                  aria-expanded={dueUnitOpen}
                  onClick={() => setDueUnitOpen(v => !v)}
                >
                  {dueUnit}
                  <DownChevronIcon size={14} color="var(--neutral-300)" />
                </button>
              )}
            />
            {dueUnitOpen && (
              <MenuPopover
                anchorRef={dueUnitRef}
                align="right"
                width={140}
                ariaLabel="Due date unit"
                items={DUE_UNITS.map(u => ({ key: u, label: u }))}
                onSelect={setDueUnit}
                onClose={() => setDueUnitOpen(false)}
              />
            )}
            <span className={styles.inlineText}>After Task Creation Date</span>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Duration Type</span>
          <div className={styles.radioRow} role="radiogroup" aria-label="Duration Type">
            <RadioButton
              checked={durationType === 'business'}
              onChange={() => setDurationType('business')}
              label="Business Days"
            />
            <RadioButton
              checked={durationType === 'calendar'}
              onChange={() => setDurationType('calendar')}
              label="Calendar Days"
            />
          </div>
        </div>
          </div>
        </div>

      </div>
    </Drawer>
  );
}

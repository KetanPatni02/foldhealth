import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../components/Button/Button';
import { Input } from '../../../../../components/Input/Input';
import { Select } from '../../../../../components/Select/Select';
import { RadioButton } from '../../../../../components/RadioButton/RadioButton';
import { MenuPopover } from '../../../../../components/MenuPopover/MenuPopover';
import { DownChevronIcon } from '../../../../../components/Icon/DownChevronIcon';
import { PriorityIcon } from '../../../../../components/PriorityIcon/PriorityIcon';
import { useAppStore } from '../../../../../store/useAppStore';
import styles from '../shared/InterventionDrawer.module.css';

const CREATION_TIMINGS = ['day', 'week', 'immediate'];

const CREATION_TRIGGERS = ['Program Start Date', 'Discharge Date', 'Care Plan Signed'];

const DUE_UNITS = ['day', 'week'];

const PRIORITIES = ['High', 'Medium', 'Low'];

const TITLE_MAX = 150;

const asOptions = (list) => list.map(v => ({ value: v, label: v }));

/**
 * Send Form — the intervention created from the Interventions "+" menu.
 * Laid out like Create New Goals (stacked label-over-field) rather than the
 * label-beside-field grey cards in the source design.
 */
export function SendFormDrawer({ onClose, onSave, intervention }) {
  const [title, setTitle] = useState(intervention?.title ?? '');
  const [priority, setPriority] = useState(intervention?.priority ?? 'Medium');
  const [form, setForm] = useState(intervention?.form ?? '');
  const [memberTaskTitle, setMemberTaskTitle] = useState(intervention?.memberTaskTitle ?? '');
  const [creationTiming, setCreationTiming] = useState(intervention?.creationTiming ?? 'immediate');
  const [creationTrigger, setCreationTrigger] = useState(intervention?.creationTrigger ?? 'Care Plan Signed');
  const [dueOffset, setDueOffset] = useState(intervention?.dueOffset ?? '7');
  const [dueUnit, setDueUnit] = useState(intervention?.dueUnit ?? 'day');
  const [durationType, setDurationType] = useState(intervention?.durationType ?? 'calendar');
  const [dueUnitOpen, setDueUnitOpen] = useState(false);
  const dueUnitRef = useRef(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const priorityRef = useRef(null);

  // Forms come from Settings → Content → Forms. Search is remote so the
  // picker isn't limited to the first page.
  const contentForms = useAppStore(s => s.contentForms);
  const contentFormsLoading = useAppStore(s => s.contentFormsLoading);
  const fetchContentForms = useAppStore(s => s.fetchContentForms);
  const [formQuery, setFormQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContentForms?.({ page: 1, perPage: 50, search: formQuery.trim() });
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchContentForms, formQuery]);

  const formOptions = useMemo(
    () => (contentForms || []).map(f => ({ value: f.id, label: f.name })),
    [contentForms],
  );

  // `form` is a forms.id (bigint), not a string — don't read .length off it.
  const canSave = title.trim().length > 0 && String(form ?? '').length > 0;

  const headerRight = (
    <>
      <Button
        variant="primary"
        size="L"
        disabled={!canSave}
        onClick={() => onSave?.({
          title: title.trim(),
          priority,
          form,
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
    <Drawer title={intervention ? 'Edit Intervention - Send Form' : 'Send Form'} onClose={onClose} headerRight={headerRight} noCloseDivider>
      <div className={styles.body}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            Title<span className={styles.mandatoryDot} aria-hidden="true" />
          </span>
          <div className={styles.titleField}>
            <button
              ref={priorityRef}
              type="button"
              className={styles.priorityTrigger}
              aria-label={`Priority: ${priority}`}
              aria-haspopup="menu"
              aria-expanded={priorityOpen}
              onClick={() => setPriorityOpen(v => !v)}
            >
              <PriorityIcon priority={priority.toLowerCase()} size={16} />
              <DownChevronIcon size={10} color="var(--neutral-300)" />
            </button>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter The Task Title"
              aria-label="Title"
              maxLength={TITLE_MAX}
              characterLimit={TITLE_MAX}
              className={styles.titleInput}
              wrapperClassName={styles.titleInputWrap}
            />
          </div>
          {priorityOpen && (
            <MenuPopover
              anchorRef={priorityRef}
              align="left"
              width={140}
              ariaLabel="Intervention priority"
              items={PRIORITIES.map(p => ({
                key: p,
                label: p,
                iconElement: <PriorityIcon priority={p.toLowerCase()} size={16} />,
              }))}
              onSelect={setPriority}
              onClose={() => setPriorityOpen(false)}
            />
          )}
        </div>

        <div className={styles.field}>
          <Select
            label="Forms"
            required
            options={formOptions}
            value={form}
            onChange={setForm}
            placeholder="Search Form"
            searchable
            searchPlaceholder="Search Form"
            query={formQuery}
            onQueryChange={setFormQuery}
            searchLoading={contentFormsLoading}
            emptyText={contentFormsLoading ? 'Loading forms…' : 'No forms found'}
          />
        </div>

        <div className={styles.field}>
          <Input
            label="Member Task Title"
            value={memberTaskTitle}
            onChange={e => setMemberTaskTitle(e.target.value)}
            placeholder="Enter Task Title"
            maxLength={TITLE_MAX}
            characterLimit={TITLE_MAX}
          />
        </div>

        <div className={styles.dateSection}>
          <span className={styles.sectionTitle}>
            Set Task Dates<span className={styles.mandatoryDot} aria-hidden="true" />
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../../../components/Drawer/Drawer';
import { Button } from '../../../../../components/Button/Button';
import { Input } from '../../../../../components/Input/Input';
import { Textarea } from '../../../../../components/Textarea/Textarea';
import { Select } from '../../../../../components/Select/Select';
import { RadioButton } from '../../../../../components/RadioButton/RadioButton';
import { Switch } from '../../../../../components/Switch/Switch';
import { MenuPopover } from '../../../../../components/MenuPopover/MenuPopover';
import { DownChevronIcon } from '../../../../../components/Icon/DownChevronIcon';
import { Badge } from '../../../../../components/Badge/Badge';
import { PriorityIcon } from '../../../../../components/PriorityIcon/PriorityIcon';
import { VITAL_OPTIONS } from '../../lib/vitalOptions';
import { useAppStore } from '../../../../../store/useAppStore';
import { InterventionKindToggle } from '../shared/InterventionKindToggle';
import { KIND_LABELS } from '../shared/interventionKinds';
import { ActionButton } from '../../../../../components/ActionButton/ActionButton';
import { Icon } from '../../../../../components/Icon/Icon';
import { ActivityLog } from '../../../../../components/ActivityLog/ActivityLog';
import { AssigneeChange } from '../../../../../components/AssigneeChange/AssigneeChange';

const initialsOf = (name) => (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
import { LinkGoalToBarrierDrawer } from '../../../../patient/right-panel/tabs/care-programs/care-plan/drawers/BarrierDetailDrawer/LinkGoalToBarrierDrawer';
import styles from '../shared/InterventionDrawer.module.css';

const CREATION_TIMINGS = ['day', 'week', 'immediate'];
const CREATION_TRIGGERS = ['Program Start Date', 'Discharge Date', 'Care Plan Signed'];
const DUE_UNITS = ['day', 'week'];
// Capitalised in the repeat row, per Figma 12211:293048.
const REPEAT_UNITS = ['Days', 'Weeks'];
const PRIORITIES = ['High', 'Medium', 'Low'];
const TITLE_MAX = 150;

const asOptions = (list) => list.map(v => ({ value: v, label: v }));

const isTask = (kind) => kind === 'patient-task' || kind === 'internal-task';

/**
 * One drawer for every intervention kind. The kind decides which entity field
 * sits under the title — a form, an education item, a vital, or a plain
 * description — while title/priority, member task title and the task-date
 * block are common to all. Keeping it as a single component means switching
 * kind swaps the fields in place instead of tearing the drawer down.
 */
export function InterventionDrawer({
  onClose,
  onSave,
  intervention,
  kind = 'internal-task',
  onKindChange,
  title: titleOverride,
  // Optional Care Plan bindings — mirror the Barrier Detail Drawer:
  //   • linkToGoalsAllowed: show a Linked Goals section with a picker
  //     modelled on LinkGoalToBarrierDrawer. Hide entirely when the
  //     drawer is opened from a goal-scoped surface (that goal is the
  //     link).
  //   • availableGoals / linkedGoalIds: the plan's full goal list and
  //     the ids currently linked to this intervention.
  //   • activityEntries: pre-mapped audit rows in the shared
  //     ActivityLog entry shape. Rendered below the form when provided.
  linkToGoalsAllowed = false,
  availableGoals = [],
  linkedGoalIds: linkedGoalIdsProp,
  activityEntries,
  // Patient name — surfaces as the read-only "Member" row. Interventions
  // authored on a plan always target that plan's patient, so it can't be
  // edited here; the Assigned To row is the mutable owner instead.
  memberName,
}) {
  const [linkedGoalIds, setLinkedGoalIds] = useState(() => (
    Array.isArray(linkedGoalIdsProp) && linkedGoalIdsProp.length > 0
      ? [...linkedGoalIdsProp]
      : (Array.isArray(intervention?.goalIds) ? [...intervention.goalIds] : [])
  ));
  const [linkGoalPickerOpen, setLinkGoalPickerOpen] = useState(false);
  const linkedGoals = useMemo(
    () => linkedGoalIds
      .map(id => availableGoals.find(g => g.id === id))
      .filter(Boolean),
    [linkedGoalIds, availableGoals],
  );
  const goalsForPicker = useMemo(
    () => availableGoals.filter(g => !linkedGoalIds.includes(g.id)),
    [availableGoals, linkedGoalIds],
  );
  const handleLinkGoals = (ids) => setLinkedGoalIds(prev => Array.from(new Set([...prev, ...ids])));
  const handleUnlinkGoal = (id) => setLinkedGoalIds(prev => prev.filter(x => x !== id));

  const [title, setTitle] = useState(intervention?.title ?? '');
  const [priority, setPriority] = useState(intervention?.priority ?? 'Medium');
  const [form, setForm] = useState(intervention?.form ?? '');
  const [content, setContent] = useState(intervention?.content ?? '');
  const [vital, setVital] = useState(intervention?.vital ?? '');
  const [note, setNote] = useState(intervention?.note ?? '');
  const [description, setDescription] = useState(intervention?.description ?? '');
  const [assignedTo, setAssignedTo] = useState(intervention?.assignedTo ?? '');
  const [member, setMember] = useState(intervention?.member ?? '');
  const [creationTiming, setCreationTiming] = useState(intervention?.creationTiming ?? 'immediate');
  const [creationCount, setCreationCount] = useState(intervention?.creationCount ?? '1');
  const [creationTrigger, setCreationTrigger] = useState(intervention?.creationTrigger ?? 'Care Plan Signed');
  const [dueOffset, setDueOffset] = useState(intervention?.dueOffset ?? '7');
  const [dueUnit, setDueUnit] = useState(intervention?.dueUnit ?? 'day');
  const [durationType, setDurationType] = useState(intervention?.durationType ?? 'calendar');
  const [repeat, setRepeat] = useState(intervention?.repeat ?? false);
  const [repeatCount, setRepeatCount] = useState(intervention?.repeatCount ?? '1');
  const [repeatEvery, setRepeatEvery] = useState(intervention?.repeatEvery ?? '1');
  const [repeatEveryUnit, setRepeatEveryUnit] = useState(intervention?.repeatEveryUnit ?? 'Days');
  const [repeatEnds, setRepeatEnds] = useState(intervention?.repeatEnds ?? '8');
  const [repeatEndsUnit, setRepeatEndsUnit] = useState(intervention?.repeatEndsUnit ?? 'Days');
  const [repeatEveryUnitOpen, setRepeatEveryUnitOpen] = useState(false);
  const [repeatEndsUnitOpen, setRepeatEndsUnitOpen] = useState(false);
  const repeatEveryUnitRef = useRef(null);
  const repeatEndsUnitRef = useRef(null);
  const [dueUnitOpen, setDueUnitOpen] = useState(false);
  const dueUnitRef = useRef(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const priorityRef = useRef(null);
  const [creationTimingOpen, setCreationTimingOpen] = useState(false);
  const creationTimingRef = useRef(null);
  const [creationTriggerOpen, setCreationTriggerOpen] = useState(false);
  const creationTriggerRef = useRef(null);

  // Assignee + member options mirror the AddTaskDrawer's dropdowns so the
  // Send Form / Send Content / etc. drawer stays consistent with task
  // inline editing.
  const platformUsers = useAppStore(s => s.platformUsers) || [];
  const patients = useAppStore(s => s.patients) || [];
  // AssigneeChange's picker takes `{id, name, initials, role?}` rows. Combine
  // platform users + patients so an intervention can be assigned to either
  // an internal user or the member themselves (Figma 8521:289961).
  const assigneeUsers = useMemo(() => ([
    ...platformUsers.map(u => ({
      id: u.id || `user:${u.name}`,
      name: u.name,
      initials: u.initials || initialsOf(u.name),
      role: u.role || 'User',
    })),
    ...patients.map(p => ({
      id: p.id || `member:${p.name}`,
      name: p.name,
      initials: p.initials || initialsOf(p.name),
      role: 'Member',
      avatarVariant: 'patient',
    })),
  ]), [platformUsers, patients]);
  // Forms and education content both come from Settings → Content. Search is
  // remote so a picker isn't limited to the first page.
  const contentForms = useAppStore(s => s.contentForms);
  const contentEmails = useAppStore(s => s.contentEmails);
  const contentFormsLoading = useAppStore(s => s.contentFormsLoading);
  const contentEmailsLoading = useAppStore(s => s.contentEmailsLoading);
  const fetchContentForms = useAppStore(s => s.fetchContentForms);
  const fetchContentEmails = useAppStore(s => s.fetchContentEmails);
  const [contentQuery, setContentQuery] = useState('');

  const needsForms = kind === 'send-form';
  const needsContent = kind === 'patient-education';

  useEffect(() => {
    if (!needsForms && !needsContent) return undefined;
    const term = contentQuery.trim();
    const timer = setTimeout(() => {
      if (needsForms || needsContent) fetchContentForms?.({ page: 1, perPage: 50, search: term });
      if (needsContent) fetchContentEmails?.({ page: 1, perPage: 50, search: term });
    }, 300);
    return () => clearTimeout(timer);
  }, [needsForms, needsContent, contentQuery, fetchContentForms, fetchContentEmails]);

  const formOptions = useMemo(
    () => (contentForms || []).map(f => ({ value: f.id, label: f.name })),
    [contentForms],
  );

  // Education material is anything authored in Content: emails and forms in
  // one picker, prefixed because the two id spaces overlap.
  const contentOptions = useMemo(() => {
    const emails = (contentEmails || []).map(e => ({ value: `email:${e.id}`, label: e.name }));
    const forms = (contentForms || []).map(f => ({ value: `form:${f.id}`, label: f.name }));
    return [
      ...(emails.length ? [{ type: 'header', value: 'header:emails', label: 'Emails' }, ...emails] : []),
      ...(forms.length ? [{ type: 'header', value: 'header:forms', label: 'Forms' }, ...forms] : []),
    ];
  }, [contentEmails, contentForms]);

  const entityFilled = needsForms ? String(form ?? '').length > 0
    : needsContent ? String(content ?? '').length > 0
      : kind === 'measure-vital' ? String(vital ?? '').length > 0
        : true;
  const canSave = title.trim().length > 0 && entityFilled;

  const headerRight = (
    <>
      <Button
        variant="primary"
        size="L"
        disabled={!canSave}
        onClick={() => onSave?.({
          kind,
          title: title.trim(),
          priority,
          form,
          content,
          vital,
          note: note.trim(),
          description: description.trim(),
          creationTiming,
          creationCount,
          creationTrigger,
          dueOffset,
          dueUnit,
          durationType,
          repeat,
          repeatCount,
          repeatEvery,
          repeatEveryUnit,
          repeatEnds,
          repeatEndsUnit,
          goalIds: linkedGoalIds,
          assignedTo,
          member,
        })}
      >
        Add
      </Button>
      <span className={styles.headerDivider} />
    </>
  );

  const unitField = (value, onValueChange, unit, onUnitSelect, open, setOpen, ref, label) => (
    <div className={styles.repeatField}>
      <Input
        value={value}
        onChange={e => onValueChange(e.target.value.replace(/\D/g, ''))}
        inputMode="numeric"
        aria-label={label}
        wrapperClassName={styles.offsetInput}
        trailingTextSegment
        trailingText={(
          <span className={styles.offsetTrailing}>
            <span className={styles.spinner}>
              <button
                type="button"
                className={styles.spinnerBtn}
                aria-label={`Increment ${label.toLowerCase()}`}
                onClick={() => onValueChange(String((Number(value) || 0) + 1))}
              >
                <Icon name="solar:alt-arrow-up-linear" size={10} color="var(--neutral-300)" />
              </button>
              <button
                type="button"
                className={styles.spinnerBtn}
                aria-label={`Decrement ${label.toLowerCase()}`}
                onClick={() => onValueChange(String(Math.max(1, (Number(value) || 0) - 1)))}
              >
                <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
              </button>
            </span>
            <button
              ref={ref}
              type="button"
              className={styles.unitTrigger}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen(v => !v)}
            >
              {unit}
              <DownChevronIcon size={14} color="var(--neutral-300)" />
            </button>
          </span>
        )}
      />
      {open && (
        <MenuPopover
          anchorRef={ref}
          align="right"
          width={140}
          ariaLabel={`${label} unit`}
          items={REPEAT_UNITS.map(u => ({ key: u, label: u }))}
          onSelect={onUnitSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );

  const heading = titleOverride
    || (intervention ? `Edit Intervention - ${KIND_LABELS[kind]}` : KIND_LABELS[kind]);

  return (
    <Drawer title={heading} onClose={onClose} headerRight={headerRight} noCloseDivider>
      <div className={styles.body}>
        <InterventionKindToggle kind={kind} onKindChange={onKindChange} />

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

        {needsForms && (
          <div className={styles.field}>
            <Select
              label="Select Form"
              required
              options={formOptions}
              value={form}
              onChange={setForm}
              placeholder="Search Form"
              searchable
              searchPlaceholder="Search Form"
              query={contentQuery}
              onQueryChange={setContentQuery}
              searchLoading={contentFormsLoading}
              emptyText={contentFormsLoading ? 'Loading forms…' : 'No forms found'}
            />
          </div>
        )}

        {needsContent && (
          <div className={styles.field}>
            <Select
              label="Member Education"
              required
              options={contentOptions}
              value={content}
              onChange={setContent}
              placeholder="Search Content"
              searchable
              searchPlaceholder="Search Content"
              query={contentQuery}
              onQueryChange={setContentQuery}
              searchLoading={contentEmailsLoading || contentFormsLoading}
              emptyText={contentEmailsLoading || contentFormsLoading ? 'Loading content…' : 'No content found'}
            />
          </div>
        )}

        {kind === 'measure-vital' && (
          <>
            <div className={styles.field}>
              <Select
                label="Vital"
                required
                options={asOptions(VITAL_OPTIONS)}
                value={vital}
                onChange={setVital}
                placeholder="Search Vital"
                searchable
                searchPlaceholder="Search Vital"
              />
            </div>
            <div className={styles.field}>
              <Input
                label="Note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Enter the note"
              />
            </div>
          </>
        )}

        {isTask(kind) && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Description</span>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What should the task cover?"
              rows={3}
            />
          </div>
        )}


        {/* Assignee / Member — mirrors the AddTaskDrawer inline detail
            rows so the fields read the same wherever an intervention
            surfaces as a task. Borderless DetailDropdown values keep
            the row visually calm — no double borders / boxes. */}
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>
            Assigned To<span className={styles.mandatoryDot} aria-hidden="true" />
          </span>
          <AssigneeChange
            name={assignedTo}
            initials={initialsOf(assignedTo)}
            unassigned={!assignedTo}
            unassignedLabel="Select assignee"
            size="S"
            showRole={false}
            users={assigneeUsers}
            onSelect={(u) => setAssignedTo(u?.name || '')}
            pickerTitle="Assign to"
          />
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>
            Member<span className={styles.mandatoryDot} aria-hidden="true" />
          </span>
          <AssigneeChange
            name={memberName}
            initials={initialsOf(memberName)}
            unassigned={!memberName}
            unassignedLabel="—"
            size="S"
            showRole={false}
            avatarVariant="patient"
            disabled
          />
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>
            Creation Date<span className={styles.mandatoryDot} aria-hidden="true" />
          </span>
          <div className={styles.inlineRow}>
            {creationTiming === 'immediate' ? (
              <button
                ref={creationTimingRef}
                type="button"
                className={styles.badgeTrigger}
                aria-haspopup="menu"
                aria-expanded={creationTimingOpen}
                onClick={() => setCreationTimingOpen(v => !v)}
              >
                <Badge tone="white" size="M" label="immediate" chevron />
              </button>
            ) : (
              <Input
                value={creationCount}
                onChange={e => setCreationCount(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                aria-label="Creation count"
                wrapperClassName={styles.offsetInput}
                trailingTextSegment
                trailingText={(
                  <span className={styles.offsetTrailing}>
                    <span className={styles.spinner}>
                      <button
                        type="button"
                        className={styles.spinnerBtn}
                        aria-label="Increment"
                        onClick={() => setCreationCount(String((Number(creationCount) || 0) + 1))}
                      >
                        <Icon name="solar:alt-arrow-up-linear" size={10} color="var(--neutral-300)" />
                      </button>
                      <button
                        type="button"
                        className={styles.spinnerBtn}
                        aria-label="Decrement"
                        onClick={() => setCreationCount(String(Math.max(1, (Number(creationCount) || 0) - 1)))}
                      >
                        <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
                      </button>
                    </span>
                    <button
                      ref={creationTimingRef}
                      type="button"
                      className={styles.unitTrigger}
                      aria-haspopup="menu"
                      aria-expanded={creationTimingOpen}
                      onClick={() => setCreationTimingOpen(v => !v)}
                    >
                      {creationTiming}
                      <DownChevronIcon size={14} color="var(--neutral-300)" />
                    </button>
                  </span>
                )}
              />
            )}
            {creationTimingOpen && (
              <MenuPopover
                anchorRef={creationTimingRef}
                align="left"
                width={160}
                ariaLabel="Creation timing"
                items={CREATION_TIMINGS.map(t => ({ key: t, label: t }))}
                onSelect={(t) => {
                  setCreationTiming(t);
                  if (t !== 'immediate' && !creationCount) setCreationCount('1');
                }}
                onClose={() => setCreationTimingOpen(false)}
              />
            )}
            <span className={styles.inlineText}>After</span>
            <button
              ref={creationTriggerRef}
              type="button"
              className={styles.badgeTrigger}
              aria-haspopup="menu"
              aria-expanded={creationTriggerOpen}
              onClick={() => setCreationTriggerOpen(v => !v)}
            >
              <Badge tone="white" size="M" label={creationTrigger} chevron />
            </button>
            {creationTriggerOpen && (
              <MenuPopover
                anchorRef={creationTriggerRef}
                align="left"
                width={220}
                ariaLabel="Creation trigger"
                items={CREATION_TRIGGERS.map(t => ({ key: t, label: t }))}
                onSelect={setCreationTrigger}
                onClose={() => setCreationTriggerOpen(false)}
              />
            )}
          </div>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>
            Due Date<span className={styles.mandatoryDot} aria-hidden="true" />
          </span>
          <div className={styles.inlineRow}>
            <Input
              value={dueOffset}
              onChange={e => setDueOffset(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              aria-label="Due date offset"
              wrapperClassName={styles.offsetInput}
              trailingTextSegment
              trailingText={(
                <span className={styles.offsetTrailing}>
                  <span className={styles.spinner}>
                    <button
                      type="button"
                      className={styles.spinnerBtn}
                      aria-label="Increment"
                      onClick={() => setDueOffset(String((Number(dueOffset) || 0) + 1))}
                    >
                      <Icon name="solar:alt-arrow-up-linear" size={10} color="var(--neutral-300)" />
                    </button>
                    <button
                      type="button"
                      className={styles.spinnerBtn}
                      aria-label="Decrement"
                      onClick={() => setDueOffset(String(Math.max(0, (Number(dueOffset) || 0) - 1)))}
                    >
                      <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
                    </button>
                  </span>
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
                </span>
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

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>
            Duration Type<span className={styles.mandatoryDot} aria-hidden="true" />
          </span>
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

        {/* Repeat toggle — simple Switch with "Repeat" label, positioned
            directly under Duration Type (Figma 8521:289961). When on, the
            count / every / ends fields expand inline below. */}
        <div className={styles.repeatBlock}>
          <Switch checked={repeat} onChange={setRepeat} label="Repeat" size="S" />
          {repeat && (
            <div className={styles.repeatRow}>
              <Input
                value={repeatCount}
                onChange={e => setRepeatCount(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                aria-label="Repeat count"
                wrapperClassName={styles.offsetInput}
                trailingTextSegment
                trailingText={(
                  <span className={styles.offsetTrailing}>
                    <span className={styles.spinner}>
                      <button
                        type="button"
                        className={styles.spinnerBtn}
                        aria-label="Increment repeat count"
                        onClick={() => setRepeatCount(String((Number(repeatCount) || 0) + 1))}
                      >
                        <Icon name="solar:alt-arrow-up-linear" size={10} color="var(--neutral-300)" />
                      </button>
                      <button
                        type="button"
                        className={styles.spinnerBtn}
                        aria-label="Decrement repeat count"
                        onClick={() => setRepeatCount(String(Math.max(1, (Number(repeatCount) || 0) - 1)))}
                      >
                        <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--neutral-300)" />
                      </button>
                    </span>
                    <span className={styles.unitStatic}>
                      {Number(repeatCount) === 1 ? 'time' : 'times'}
                    </span>
                  </span>
                )}
              />
              <span className={styles.inlineText}>after</span>
              {unitField(
                repeatEvery, setRepeatEvery, repeatEveryUnit, setRepeatEveryUnit,
                repeatEveryUnitOpen, setRepeatEveryUnitOpen, repeatEveryUnitRef, 'Repeat every',
              )}
              <span className={styles.inlineText}>Ends in</span>
              {unitField(
                repeatEnds, setRepeatEnds, repeatEndsUnit, setRepeatEndsUnit,
                repeatEndsUnitOpen, setRepeatEndsUnitOpen, repeatEndsUnitRef, 'Ends in',
              )}
            </div>
          )}
        </div>

            {/* Linked Goals — only when the drawer is opened from the
                Care Plan add flow (Figma 2632:94480). Uses the same
                picker as the Barrier Detail Drawer. */}
            {linkToGoalsAllowed && (
              <div className={styles.field}>
                <div className={styles.linkedHead}>
                  <span className={styles.fieldLabel}>Linked Goals</span>
                  <ActionButton
                    icon="solar:add-linear"
                    size="S"
                    tooltip="Link goal"
                    onClick={() => setLinkGoalPickerOpen(true)}
                    disabled={goalsForPicker.length === 0}
                  />
                </div>
                {linkedGoals.length === 0 ? (
                  <div className={styles.linkedEmpty}>Not linked to any goals in this plan version yet.</div>
                ) : (
                  <ul className={styles.linkedList}>
                    {linkedGoals.map(g => (
                      <li key={g.id} className={styles.linkedRow}>
                        <Icon name="solar:flag-linear" size={16} color="var(--neutral-400)" />
                        <span className={styles.linkedTitle}>{g.title}</span>
                        <ActionButton
                          icon="solar:link-broken-minimalistic-linear"
                          size="S"
                          tooltip="Unlink"
                          onClick={() => handleUnlinkGoal(g.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Activity Log — pre-mapped audit rows in the shared
                ActivityLog primitive, same shape the Barrier Detail
                Drawer uses. Silent when no history yet. */}
            {Array.isArray(activityEntries) && activityEntries.length > 0 && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Activity Log</span>
                <ActivityLog entries={activityEntries} />
              </div>
            )}
      </div>
      {linkGoalPickerOpen && (
        <LinkGoalToBarrierDrawer
          goals={goalsForPicker}
          title="Link Goal to Intervention"
          onClose={() => setLinkGoalPickerOpen(false)}
          onLink={handleLinkGoals}
        />
      )}
    </Drawer>
  );
}

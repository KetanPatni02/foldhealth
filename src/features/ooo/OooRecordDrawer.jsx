import { useMemo, useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { DateTimePicker } from '../../components/DateTimePicker/DateTimePicker';
import { Select } from '../../components/Select/Select';
import { Switch } from '../../components/Switch/Switch';
import { Checkbox } from '../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Icon } from '../../components/Icon/Icon';
import { Textarea } from '../../components/Textarea/Textarea';
import { InfoBar } from '../../components/InfoBar/InfoBar';
import { useAppStore } from '../../store/useAppStore';
import { capFirst, DEFAULT_AUTO_REPLY, fromPickerValue, rangeChange, toPickerValue, validateOoo } from './oooUtils';
import { toast } from '../../components/Toast/sonnerToast';
// import { Link } from '../../components/Link/Link';
// import { AddIconMinimalist } from '../../components/Icon/AddIconMinimalist';
// import { OnCallScheduleDrawer } from './OnCallScheduleDrawer';
import styles from './ooo.module.css';

// A picked date-time's local day, "YYYY-MM-DD" ('' when unset).
// function isoDay(v) {
//   const d = v ? new Date(v) : null;
//   if (!d || Number.isNaN(d.getTime())) return '';
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// }

/**
 * Opens and closes its content smoothly (height and fade) instead of
 * popping it in; closed, it takes no room, including the form's gap.
 */
function Reveal({ open, children }) {
  return (
    <div className={open ? `${styles.reveal} ${styles.revealOpen}` : styles.reveal} aria-hidden={!open || undefined} inert={!open}>
      <div className={styles.revealInner}>{children}</div>
    </div>
  );
}

/**
 * New / Edit Out of Office Record (Figma Eventus 17400:134395, 17400:136675).
 *
 * Save stores the record; a new record, or an edit that adds dates, then
 * hands off to the Reassign Appointments drawer (see useOooRecordActions).
 * Edit, depending on how the dates change:
 *   - no new dates: Save, enabled once something changes;
 *   - dates removed: a "You have updated the Out of Office schedule" card offers to move
 *     the removed dates' reassigned appointments back (17401:138229);
 *   - dates added: a note that they can be reassigned after saving.
 *
 * @param {object}   props
 * @param {object}   [props.record]  – The record being edited; omit to create one
 * @param {object}   [props.user]    – { name, email, role } the new record is for; omit to pick one
 * @param {object[]} [props.users]   – Who can be picked when `user` is omitted
 * @param {function} props.onClose
 * @param {function} [props.onSaved] – (record, { reassign }) => void; `reassign` when
 *   there are newly out-of-office dates whose appointments need moving
 */
export function OooRecordDrawer({ record, user, users = [], onClose, onSaved }) {
  const saveOooRecord = useAppStore(s => s.saveOooRecord);
  const oooRecords = useAppStore(s => s.oooRecords);
  const meName = useAppStore(s => s.currentUserProfile?.name);
  const isEdit = !!record;
  // A record that has started: from a previous day, its start is fixed;
  // from earlier today, it can still move, but reassignments already in
  // the past stay where they are.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const origStart = isEdit ? new Date(record.startAt).getTime() : NaN;
  const started = isEdit && origStart <= now.getTime();
  const startLocked = started && origStart < todayStart;
  const startedToday = started && !startLocked;
  const isMine = !!meName && String(record?.userName || user?.name || '').trim().toLowerCase() === meName.trim().toLowerCase();

  const [values, setValues] = useState(() => ({
    userName: record?.userName || user?.name || '',
    userEmail: record?.userEmail || user?.email || '',
    userRole: record?.userRole || user?.role || '',
    userId: record?.userId || user?.id || null,
    startAt: record?.startAt || null,
    endAt: record?.endAt || null,
    reason: record?.reason || '',
    autoReply: !!record?.autoReply,
    autoReplyMessage: record?.autoReplyMessage || DEFAULT_AUTO_REPLY,
  }));
  const [restore, setRestore] = useState(true);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  // const [onCallOpen, setOnCallOpen] = useState(false); // on call schedule, parked
  const set = (patch) => setValues(v => ({ ...v, ...patch }));

  const errors = validateOoo(values, { original: record, existing: oooRecords });
  const hasErrors = Object.keys(errors).length > 0 || !values.userName;
  const change = rangeChange(record, values);
  // Dates compare as moments: the picker writes "…00.000Z" where the
  // database returns "…+00:00" for the same time.
  const sameTime = (a, b) => (!a && !b) || (!!a && !!b && new Date(a).getTime() === new Date(b).getTime());
  const dirty = !isEdit || !sameTime(values.startAt, record.startAt) || !sameTime(values.endAt, record.endAt)
    || ['reason', 'autoReply', 'autoReplyMessage']
      .some(k => (values[k] || '') !== (record[k] || '') && !(k === 'autoReplyMessage' && !values.autoReply && !record.autoReply));
  // A new record, or new dates on an edit, go on to reassignment.
  const needsReassign = !isEdit || change.extended;

  const providerLabel = values.userName ? `${values.userName}${values.userEmail ? ` (${values.userEmail})` : ''}` : '';
  const pickable = useMemo(() => users.map(u => ({ value: u.name, label: u.email ? `${u.name} (${u.email})` : u.name })), [users]);

  const save = async () => {
    setTouched(true);
    if (hasErrors) return;
    setSaving(true);
    try {
      const saved = await saveOooRecord({
        ...record,
        ...values,
        reason: capFirst(values.reason.trim()),
        autoReplyMessage: values.autoReply ? values.autoReplyMessage.trim() : '',
      });
      if (!saved) return;
      // When Reassign Appointments opens next, the toast says why.
      toast.success(needsReassign ? 'Out of Office record saved. Reassign appointments next.' : 'Out of Office Record Saved Successfully');
      onSaved?.(saved, { reassign: needsReassign });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit Out of Office Record' : 'New Out of Office Record';

  const headerRight = (
    <>
      <Button variant="primary" size="L" disabled={(isEdit && !dirty) || saving || (touched && hasErrors)} onClick={save}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <span className={styles.headerDivider} aria-hidden="true" />
    </>
  );

  const err = (k) => (touched ? errors[k] : undefined);
  // An overlap shows as soon as both dates are set, not only after Save.
  const overlapError = values.startAt && values.endAt ? errors.overlap : undefined;
  const today = new Date();

  return (
    <Drawer
      title={title}
      width={640}
      onClose={onClose}
      headerRight={headerRight}
      noCloseDivider
    >
      <div className={styles.form}>
        {!isEdit && (
          <InfoBar tone="info" variant="inline">Mark users OOO by selecting date range below. Appointments will be reassigned after saving.</InfoBar>
        )}
        {isEdit && change.extended && (
          <InfoBar tone="warning" variant="inline">Appointments on the newly added dates can be reassigned once you save.</InfoBar>
        )}

        {user || isEdit ? (
          <Input label="Provider" required value={providerLabel} disabled readOnly />
        ) : (
          <Select
            label="Provider"
            required
            portal
            searchable
            placeholder="Select a provider"
            options={pickable}
            value={values.userName || undefined}
            errorText={touched && !values.userName ? 'Pick a provider.' : undefined}
            onChange={(name) => {
              const u = users.find(x => x.name === name);
              set({ userName: name, userEmail: u?.email || '', userRole: u?.role || '', userId: u?.id || null });
            }}
          />
        )}


        <div className={styles.dateRow}>
          <DateTimePicker
            label="Start Date & Time"
            required
            fullWidth
            placeholder="Select Start Date & Time"
            hour12
            autoCommit
            minDate={today}
            value={toPickerValue(values.startAt)}
            onChange={(v) => set({ startAt: fromPickerValue(v) })}
            errorText={err('startAt')}
            invalid={!!overlapError}
            disabled={startLocked}
            helperText={startLocked ? 'Started on a previous day, so the start can\'t be changed.' : undefined}
          />
          <DateTimePicker
            label="End Date & Time"
            required
            fullWidth
            placeholder="Select End Date & Time"
            hour12
            autoCommit
            // Not before the start, and for a record under way, not before today.
            minDate={values.startAt && (!started || new Date(values.startAt) > today) ? new Date(values.startAt) : today}
            value={toPickerValue(values.endAt)}
            onChange={(v) => set({ endAt: fromPickerValue(v) })}
            errorText={err('endAt')}
            invalid={!!overlapError}
          />
        </div>
        {/* Overlapping another record: both dates are marked, and the
            reason is said once, across the row. */}
        {overlapError && <span className={styles.rowError} role="alert">{overlapError}</span>}

        {/* Figma Eventus 17620:122123: what changed, whether to move the
            removed dates' appointments back, and (under way) that only the
            ones still ahead can move. Slides open as the dates are cut back. */}
        {isEdit && (
          <Reveal open={change.reduced}>
            <div className={styles.changedCard}>
              <div className={styles.changedBody}>
                <span className={styles.changedTitle}>You have updated the Out of Office schedule:</span>
                <label className={styles.changedCheck}>
                  <Checkbox checked={restore} onCheckedChange={(v) => setRestore(v === true)} aria-label="Restore reassigned appointments from the removed dates" />
                  <span>Move reassigned appointments on removed dates back to {isMine ? 'your' : 'this provider\'s'} calendar</span>
                </label>
              </div>
              {startedToday && (
                <div className={styles.changedNote}>
                  <Icon name="solar:info-circle-linear" size={16} color="var(--status-warning)" />
                  Only upcoming appointments will be restored as out of office period has started.
                </div>
              )}
            </div>
          </Reveal>
        )}

        <Input
          label="Reason for Out of Office"
          value={values.reason}
          placeholder="e.g. Personal, Annual Leave"
          maxLength={120}
          // Sentence case: the first letter is always a capital.
          onChange={(e) => set({ reason: capFirst(e.target.value) })}
        />

        {/* Figma 17436:107708: off, or on with the message to send. */}
        <div className={styles.autoReplyCard}>
          <div className={styles.autoReplyHead}>
            <span className={styles.optionText}>
              <span className={styles.optionTitle}>Enable Auto Reply For Chats</span>
              <span className={styles.optionSub}>Reply automatically when you are away from the work.</span>
            </span>
            <Switch checked={values.autoReply} onChange={(on) => set({ autoReply: on })} ariaLabel="Enable auto reply for chats" />
          </div>
          {values.autoReply && (
            <label className={styles.autoReplyField}>
              <span className={styles.fieldLabel}>Set Auto Reply Message</span>
              <Textarea
                rows={3}
                value={values.autoReplyMessage}
                maxLength={500}
                onChange={(e) => set({ autoReplyMessage: e.target.value })}
                aria-label="Auto reply message"
              />
              {err('autoReplyMessage') && <span className={styles.fieldError}>{err('autoReplyMessage')}</span>}
            </label>
          )}
        </div>

        {/* On call schedule: parked for now (the drawer is built,
            OnCallScheduleDrawer.jsx). Restore this link and the drawer below
            to bring it back.
        <span>
          <Link
            className={styles.newRecordLink}
            role="button"
            tabIndex={0}
            onClick={() => setOnCallOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOnCallOpen(true); } }}
          >
            <AddIconMinimalist size={12} color="currentColor" />
            On Call Schedule
          </Link>
        </span>
        */}
      </div>
      {/* {onCallOpen && (
        <OnCallScheduleDrawer
          preset={{ phoneTreeType: 'Out of Office', fromDate: isoDay(values.startAt), toDate: isoDay(values.endAt) }}
          oooRecordId={record?.id}
          excludeUser={values.userName}
          onClose={() => setOnCallOpen(false)}
        />
      )} */}
    </Drawer>
  );
}

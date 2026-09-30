import { useMemo, useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { DateTimePicker } from '../../components/DateTimePicker/DateTimePicker';
import { Select } from '../../components/Select/Select';
import { Switch } from '../../components/Switch/Switch';
import { Textarea } from '../../components/Textarea/Textarea';
import { InfoBar } from '../../components/InfoBar/InfoBar';
import { useAppStore } from '../../store/useAppStore';
import { OooReassignFooter, OooReassignStep } from './OooReassignStep';
import { DEFAULT_AUTO_REPLY, fromPickerValue, rangeChange, toPickerValue, validateOoo } from './oooUtils';
import { toast } from '../../components/Toast/sonnerToast';
import styles from './ooo.module.css';

/**
 * New / Edit Out of Office Record (Figma Eventus 17400:134395, 17400:136675).
 *
 * New: details, then Next to the reassignment step, where Save creates it.
 * Edit, depending on how the dates change:
 *   - no new dates: Save, enabled once something changes;
 *   - dates removed: a "schedule has changed" card offers to restore the
 *     appointments of the dates no longer out of office (17401:138229);
 *   - dates added: a note that they're reassigned next, and Next (17465:116009);
 *   - both: the card and Next (17465:116148).
 *
 * @param {object}   props
 * @param {object}   [props.record]  – The record being edited; omit to create one
 * @param {object}   [props.user]    – { name, email, role } the new record is for; omit to pick one
 * @param {object[]} [props.users]   – Who can be picked when `user` is omitted
 * @param {function} props.onClose
 * @param {function} [props.onSaved] – (record) => void
 */
export function OooRecordDrawer({ record, user, users = [], onClose, onSaved }) {
  const saveOooRecord = useAppStore(s => s.saveOooRecord);
  const oooRecords = useAppStore(s => s.oooRecords);
  const isEdit = !!record;

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
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setValues(v => ({ ...v, ...patch }));

  const errors = validateOoo(values, { original: record, existing: oooRecords });
  const hasErrors = Object.keys(errors).length > 0 || !values.userName;
  const change = rangeChange(record, values);
  const dirty = !isEdit || ['startAt', 'endAt', 'reason', 'autoReply', 'autoReplyMessage']
    .some(k => (values[k] || '') !== (record[k] || '') && !(k === 'autoReplyMessage' && !values.autoReply && !record.autoReply));
  // A new record, or new dates on an edit, go through reassignment first.
  const needsReassign = !isEdit || change.extended;

  const providerLabel = values.userName ? `${values.userName}${values.userEmail ? ` (${values.userEmail})` : ''}` : '';
  const pickable = useMemo(() => users.map(u => ({ value: u.name, label: u.email ? `${u.name} (${u.email})` : u.name })), [users]);

  const save = async () => {
    setTouched(true);
    if (hasErrors) return;
    setSaving(true);
    const saved = await saveOooRecord({
      ...record,
      ...values,
      reason: values.reason.trim(),
      autoReplyMessage: values.autoReply ? values.autoReplyMessage.trim() : '',
    });
    setSaving(false);
    if (!saved) return;
    toast.success('Out of Office Record Saved Successfully');
    onSaved?.(saved);
    onClose();
  };

  const title = isEdit ? 'Edit Out of Office Record' : 'New Out of Office Record';

  // One drawer for both steps: the header actions and footer change, and
  // the body slides in from the side it's heading to.
  const [direction, setDirection] = useState('forward');
  const goTo = (n) => { setDirection(n > step ? 'forward' : 'back'); setStep(n); };
  const next = () => {
    setTouched(true);
    if (!hasErrors) goTo(2);
  };

  const headerRight = step === 2 ? (
    <>
      <Button variant="secondary" size="L" onClick={() => goTo(1)}>Previous</Button>
      <Button variant="primary" size="L" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
      <span className={styles.headerDivider} aria-hidden="true" />
    </>
  ) : (
    <>
      {needsReassign ? (
        <Button variant="primary" size="L" disabled={touched && hasErrors} onClick={next}>Next</Button>
      ) : (
        <Button variant="primary" size="L" disabled={!dirty || saving || (touched && hasErrors)} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      )}
      <span className={styles.headerDivider} aria-hidden="true" />
    </>
  );

  const err = (k) => (touched ? errors[k] : undefined);
  const today = new Date();

  return (
    <Drawer
      title={title}
      width={640}
      onClose={onClose}
      headerRight={headerRight}
      noCloseDivider
      footer={step === 2 ? <OooReassignFooter /> : undefined}
    >
      <div key={step} className={direction === 'forward' ? styles.stepInForward : styles.stepInBack}>
      {step === 2 ? (
        <OooReassignStep providerName={values.userName} startAt={values.startAt} endAt={values.endAt} />
      ) : (
      <div className={styles.form}>
        {!isEdit && (
          <InfoBar tone="info">Mark users OOO by selecting date range below. Appointments will be reassigned in next step.</InfoBar>
        )}
        {isEdit && change.extended && (
          <InfoBar tone="warning">Appointments for newly added dates will be reassigned in the next step.</InfoBar>
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
            minDate={today}
            value={toPickerValue(values.startAt)}
            onChange={(v) => set({ startAt: fromPickerValue(v) })}
            errorText={err('startAt')}
          />
          <DateTimePicker
            label="End Date & Time"
            required
            fullWidth
            placeholder="Select End Date & Time"
            minDate={values.startAt ? new Date(values.startAt) : today}
            value={toPickerValue(values.endAt)}
            onChange={(v) => set({ endAt: fromPickerValue(v) })}
            errorText={err('endAt')}
          />
        </div>

        {isEdit && change.reduced && (
          <div className={styles.changedCard}>
            <div className={styles.changedHead}>
              <span className={styles.changedTitle}>The Out-of-office schedule has changed.</span>
              <span className={styles.changedSub}>Update appointment settings for the affected days below:</span>
            </div>
            <div className={styles.optionCard}>
              <Switch checked={restore} onChange={setRestore} ariaLabel="Restore calendar appointments for previously out-of-office dates" />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>Restore calendar appointments for previously out-of-office dates.</span>
                <span className={styles.optionSub}>Reassigned appointments from previously OOO dates will return to this user&apos;s calendar.</span>
              </span>
            </div>
          </div>
        )}

        <Input
          label="Reason for Out of Office"
          value={values.reason}
          placeholder="e.g. Personal, Annual Leave"
          maxLength={120}
          onChange={(e) => set({ reason: e.target.value })}
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
      </div>
      )}
      </div>
    </Drawer>
  );
}

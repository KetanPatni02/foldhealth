import { useRef, useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Icon } from '../../../components/Icon/Icon';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { DateTimePicker } from '../../../components/DateTimePicker/DateTimePicker';
import { AddContactDialog } from '../../patient/left-panel/tabs/outreach/OutreachTab/AddContactDialog';
import {
  RECIPIENTS, MODES, CATEGORIES, outcomesFor, validateOutreach, parseFormDatetime, formatFormDatetime,
} from './outreachModel';
import styles from './PatientOutreach.module.css';

const SNOOZE_OPTIONS = [
  { days: 1, label: '1 Day' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
];
const snoozeDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};
const toOptions = (list) => list.map(v => ({ value: v, label: v }));

/**
 * Log Outreach form for one patient (HCC Patient Outreach). Each opening is
 * a new, blank entry; the parent mounts it fresh.
 *
 * @param {object}   props.contacts      – { pcp: string[], member: string[] } recipient contacts
 * @param {string[]} props.ourLines      – our side of a call (provider contacts / practice line)
 * @param {object[]} props.outcomeList   – configured outcomes for the entry's care program
 * @param {'pcp'|'member'} [props.defaultRecipient] – the org's Outreach To default
 * @param {object}   [props.correcting]  – entry being corrected: the form logs a Note linked to it
 * @param {(entry: object) => void} props.onSave – the new entry (no id / patient fields)
 * @param {function} props.onCancel
 * @param {function} [props.onSchedule] – Schedule Follow-up
 */
export function PatientOutreachForm({ contacts, ourLines, outcomeList, defaultRecipient = 'pcp', correcting = null, onSave, onCancel, onSchedule }) {
  const startRecipient = correcting?.recipientType || defaultRecipient;
  const [recipientType, setRecipientType] = useState(startRecipient);
  const [added, setAdded] = useState({ pcp: [], member: [] });
  const recipientOptions = [...(contacts[recipientType] || []), ...added[recipientType]];
  const [receivedBy, setReceivedBy] = useState(correcting?.receivedBy || contacts[startRecipient]?.[0] || '');
  const [mode, setMode] = useState(correcting?.mode || 'Call');
  const [datetime, setDatetime] = useState(formatFormDatetime());
  const [direction, setDirection] = useState('outgoing');
  const [ourLine, setOurLine] = useState(ourLines[0] || '');
  const [durMin, setDurMin] = useState('00');
  const [durSec, setDurSec] = useState('00');
  const [transcript, setTranscript] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [category, setCategory] = useState(correcting ? 'Note' : '');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [snoozeUntil, setSnoozeUntil] = useState(null);
  const [error, setError] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [cannedOpen, setCannedOpen] = useState(false);
  const snoozeRef = useRef(null);
  const notesRef = useRef(null);

  const outcomeOptions = outcomesFor(category, recipientType, outcomeList);
  // Shown on the picker after Save finds a future date.
  const future = !!error && /future/.test(error);

  const changeRecipient = (type) => {
    setRecipientType(type);
    setReceivedBy([...(contacts[type] || []), ...added[type]][0] || '');
    // Outcomes are filtered by recipient.
    if (!outcomesFor(category, type, outcomeList).includes(outcome)) setOutcome('');
  };
  const changeCategory = (c) => {
    setCategory(c);
    if (!outcomesFor(c, recipientType, outcomeList).includes(outcome)) setOutcome('');
  };
  const stepDuration = (deltaSec) => {
    const total = Math.min(99 * 60 + 59, Math.max(0, (Number(durMin) || 0) * 60 + (Number(durSec) || 0) + deltaSec));
    setDurMin(String(Math.floor(total / 60)).padStart(2, '0'));
    setDurSec(String(total % 60).padStart(2, '0'));
  };
  const onNotesInput = (text) => {
    // Canned messages (deferred): typing "/" at the start of a word opens the picker.
    if (text.length > notes.length && /(^|\s)\/$/.test(text)) setCannedOpen(true);
    setNotes(text);
  };

  const save = () => {
    const form = { receivedBy, mode, datetime, category, outcome, emailTo, emailSubject, emailBody, notes, transcript };
    const missing = validateOutreach(form);
    if (missing) { setError(missing); return; }
    const at = parseFormDatetime(datetime);
    onSave({
      recipientType,
      receivedBy,
      mode,
      direction: mode === 'Call' ? direction : null,
      callVia: mode === 'Call' ? (direction === 'outgoing' ? ourLine : receivedBy) : null,
      calledTo: mode === 'Call' ? (direction === 'outgoing' ? receivedBy : ourLine) : null,
      durationSec: mode === 'Call' ? (Number(durMin) || 0) * 60 + (Number(durSec) || 0) : null,
      transcript: mode === 'Call' ? transcript.trim() : '',
      emailTo: mode === 'Email' ? emailTo.trim() : '',
      emailSubject: mode === 'Email' ? emailSubject.trim() : '',
      emailBody: mode === 'Email' ? emailBody.trim() : '',
      notes: notes.trim(),
      category,
      outcome: category === 'Note' ? null : outcome,
      loggedAt: at.toISOString(),
      snoozeUntil,
      correctsId: correcting?.id ?? null,
    });
  };

  return (
    <div className={styles.formCard}>
      {correcting && (
        <div className={styles.correctionBanner}>
          <Icon name="solar:pen-new-square-linear" size={14} color="var(--primary-300)" />
          Correction Note for the {new Date(correcting.loggedAt).toLocaleDateString('en-US')} outreach. Saved outreach can't be edited.
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.rowLabel}>Outreach To</span>
        {RECIPIENTS.map(r => (
          <RadioButton key={r.key} checked={recipientType === r.key} onChange={() => changeRecipient(r.key)} label={r.label} disabled={!!correcting} />
        ))}
      </div>

      <div className={styles.grid}>
        <Select label="Received By" searchable placeholder="Select contact" options={toOptions(recipientOptions)} value={receivedBy} onValueChange={setReceivedBy} disabled={!!correcting} />
        <Select label="Mode" placeholder="Select mode" options={toOptions(MODES)} value={mode} onValueChange={setMode} disabled={!!correcting} />
        <DateTimePicker label="Date & Time" required fullWidth value={datetime} onChange={setDatetime} errorText={future ? 'Can’t be in the future' : undefined} />
      </div>

      {mode === 'Call' && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Call Details</span>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Direction</span>
            <RadioButton checked={direction === 'outgoing'} onChange={() => setDirection('outgoing')} label="Outgoing" />
            <RadioButton checked={direction === 'incoming'} onChange={() => setDirection('incoming')} label="Incoming" />
          </div>
          <div className={styles.grid}>
            {/* Our line is Call Via on an outgoing call and Called To on an incoming one. */}
            <Select label={direction === 'outgoing' ? 'Call Via Number' : 'Called To Number'} options={toOptions(ourLines)} value={ourLine} onValueChange={setOurLine} />
            <div className={styles.field}>
              <span className={styles.fieldLabel}>{direction === 'outgoing' ? 'Called To Number' : 'Call Via Number'}</span>
              <span className={styles.readonlyValue} title="Set by Received By">{receivedBy || '-'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Duration</span>
              <div className={styles.duration}>
                <Input type="number" className={styles.durationInput} value={durMin} min={0} max={99} aria-label="Minutes"
                  onChange={e => setDurMin(e.target.value.padStart(2, '0').slice(-2))}
                  onStepUp={() => stepDuration(60)} onStepDown={() => stepDuration(-60)} />
                <span className={styles.unit}>Min</span>
                <Input type="number" className={styles.durationInput} value={durSec} min={0} max={59} aria-label="Seconds"
                  onChange={e => setDurSec(e.target.value.padStart(2, '0').slice(-2))}
                  onStepUp={() => stepDuration(1)} onStepDown={() => stepDuration(-1)} />
                <span className={styles.unit}>Sec</span>
              </div>
            </div>
          </div>
          <Textarea title="Call Transcript" placeholder="Paste the call transcript (optional)" value={transcript} onValueChange={setTranscript} />
        </div>
      )}

      {mode === 'Email' && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Email</span>
          <div className={styles.grid}>
            <Input label="To" required type="email" placeholder="name@practice.com" value={emailTo} onChange={e => setEmailTo(e.target.value)} />
            <Input label="Subject" required placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
          </div>
          <Textarea title="Body" placeholder="Email text. Refer to patients by Member ID." value={emailBody} onValueChange={setEmailBody} />
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Category</span>
          {CATEGORIES.map(c => (
            <RadioButton key={c} checked={category === c} onChange={() => changeCategory(c)} label={c} disabled={!!correcting && c !== 'Note'} />
          ))}
        </div>
        {category && category !== 'Note' && (
          <Select label="Outcome" required placeholder="Select outcome" options={toOptions(outcomeOptions)} value={outcome} onValueChange={setOutcome} />
        )}
        {category === 'Note' && (
          <span className={styles.hint}>A Note is an internal update, not a contact attempt: it has no outcome and isn't counted.</span>
        )}
      </div>

      <div className={styles.notesWrap}>
        <Textarea
          ref={notesRef}
          title="Notes"
          placeholder="Write notes, or type / for canned messages"
          value={notes}
          onValueChange={onNotesInput}
        />
        {cannedOpen && (
          <MenuPopover
            anchorRef={notesRef}
            items={[{ key: 'soon', icon: 'solar:chat-square-like-linear', label: 'Canned messages are coming soon', disabled: true }]}
            onSelect={() => setCannedOpen(false)}
            onClose={() => setCannedOpen(false)}
            width={280}
            ariaLabel="Canned messages"
          />
        )}
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Actions</span>
        <span className={styles.divider} />
        <ActionButton size="sm" icon="solar:user-plus-linear" tooltip="Add Contact" onClick={() => setContactOpen(true)} />
        <ActionButton size="sm" icon="solar:calendar-add-linear" tooltip="Schedule Follow-up" onClick={onSchedule} />
        <span ref={snoozeRef}>
          <ActionButton size="sm" icon="solar:alarm-sleep-linear" tooltip="Snooze"
            iconColor={snoozeUntil ? 'var(--primary-300)' : undefined} onClick={() => setSnoozeOpen(true)} />
        </span>
        {snoozeUntil && (
          <button type="button" className={styles.snoozeChip} onClick={() => setSnoozeUntil(null)} title="Remove snooze">
            Snoozed until {snoozeUntil}
            <Icon name="solar:close-circle-linear" size={12} color="currentColor" />
          </button>
        )}
        {snoozeOpen && (
          <MenuPopover
            anchorRef={snoozeRef}
            items={SNOOZE_OPTIONS.map(o => ({ key: String(o.days), label: o.label }))}
            onSelect={(key) => { setSnoozeUntil(snoozeDate(Number(key))); setSnoozeOpen(false); }}
            onClose={() => setSnoozeOpen(false)}
            width={180}
            ariaLabel="Snooze outreach"
          />
        )}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <Icon name="solar:danger-circle-linear" size={14} color="currentColor" />
          {error}
        </div>
      )}

      <div className={styles.footer}>
        <Button onClick={save}>{correcting ? 'Save Correction' : 'Save'}</Button>
        <Button variant="ghost" onClick={onCancel}>Discard</Button>
      </div>

      {contactOpen && (
        <AddContactDialog
          open
          onCancel={() => setContactOpen(false)}
          onSubmit={(name, phone) => {
            const label = phone ? `${name} (${phone})` : name;
            setAdded(a => ({ ...a, [recipientType]: a[recipientType].includes(label) ? a[recipientType] : [...a[recipientType], label] }));
            setReceivedBy(label);
            setContactOpen(false);
          }}
        />
      )}
    </div>
  );
}

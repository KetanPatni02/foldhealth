import { useMemo, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Select } from '../../../components/Select/Select';
import { Input } from '../../../components/Input/Input';
import { Textarea } from '../../../components/Textarea/Textarea';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { InfoBar } from '../../../components/InfoBar/InfoBar';
import { Icon } from '../../../components/Icon/Icon';
import { Link } from '../../../components/Link/Link';
import { toast } from '../../../components/Toast/sonnerToast';
import { findOrCreateConversation, addMessage, updateConversation } from './commsRepo';
import { sendSms } from './commsSend';
import { useBrowserCall } from './call/useBrowserCall';
import { useCommsPeople } from './useCommsPeople';
import { formatPhone, toE164, DIAL_COUNTRIES, isDialable } from './commsUtils';
import styles from './CommsDrawers.module.css';

const PHI_NOTICE = 'Do not send PHI via email or text without verifying and obtaining consent.';
const SMS_LIMIT = 500;

const patientOption = (p, contact) => ({
  value: String(p.id),
  label: contact ? `${p.name} (${contact})` : p.name,
});

// ── New Chat (Figma 1:30607) ─────────────────────────────────────────────
export function NewChatDrawer({ initialType = 'patient', onClose, onCreated, onInternalChat }) {
  const { patients, staff, me } = useCommsPeople();
  const [type, setType] = useState(initialType);
  const [patientId, setPatientId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [subject, setSubject] = useState('');
  const [members, setMembers] = useState([]);
  const [staffId, setStaffId] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const patient = patients.find(p => String(p.id) === patientId);
  const staffOptions = staff.filter(s => s.id !== me?.id).map(s => ({ value: s.id, label: s.name }));

  const start = async () => {
    setTouched(true);
    if (type === 'internal') {
      const person = staff.find(s => s.id === staffId);
      if (!person) return;
      onInternalChat(person);
      return;
    }
    if (!patient || !groupName.trim()) return;
    setSaving(true);
    try {
      const conv = await findOrCreateConversation('chat', patient, {
        group_name: groupName.trim(),
        subject: subject.trim() || null,
        members: staff.filter(s => members.includes(s.id)).map(s => ({ id: s.id, name: s.name })),
        created_by: me?.id || null,
        created_by_name: me?.name || null,
      });
      if (conv.group_name !== groupName.trim() || (subject.trim() && conv.subject !== subject.trim())) {
        await updateConversation(conv.id, { group_name: groupName.trim(), subject: subject.trim() || conv.subject });
      }
      onCreated(conv);
    } catch {
      toast.error('Could not start the chat.');
      setSaving(false);
    }
  };

  return (
    <Drawer
      title="New Chat"
      onClose={onClose}
      primaryAction={<Button variant="primary" size="L" onClick={start} disabled={saving}>Start Chat</Button>}
    >
      <div className={styles.form}>
        <Select
          label="Type"
          options={[{ value: 'patient', label: 'Chat with Patient' }, { value: 'internal', label: 'Internal Chat' }]}
          value={type}
          onChange={setType}
        />
        {type === 'internal' ? (
          <Select
            label="Internal User"
            required
            searchable
            options={staffOptions}
            value={staffId}
            onChange={setStaffId}
            placeholder="Select user"
            errorText={touched && !staffId ? 'Choose who to chat with.' : undefined}
          />
        ) : (<>
          <Select
            label="Patient"
            required
            showInfo
            infoText="The patient reads and answers this chat on their patient page."
            searchable
            options={patients.map(p => patientOption(p))}
            value={patientId}
            onChange={(v) => {
              setPatientId(v);
              const p = patients.find(x => String(x.id) === v);
              if (p && !groupName) setGroupName(`Care for ${p.name}`);
            }}
            placeholder="Select Patient"
            errorText={touched && !patientId ? 'Choose a patient.' : undefined}
          />
          <Input
            label="Group Name"
            required
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder="Enter Group Name"
            maxLength={100}
            errorText={touched && patientId && !groupName.trim() ? 'Give the chat a name.' : undefined}
          />
          <Input label="Subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter Subject of Conversation" maxLength={150} />
          <Select
            label="Internal Users"
            multiple
            checkboxes
            badges
            searchable
            searchPlaceholder="Search users…"
            disabled={!patient}
            options={staffOptions}
            value={members}
            onChange={setMembers}
            placeholder="Select user"
          />
          <Input label="Family Members" disabled placeholder="Search Patient Family Member" />
        </>)}
      </div>
    </Drawer>
  );
}

// ── New SMS (Figma 1:33551, 1:33797) ─────────────────────────────────────
export function NewSmsDrawer({ onClose, onSent, initialPatient }) {
  const { patients, me, line } = useCommsPeople();
  const [to, setTo] = useState(initialPatient ? String(initialPatient.id) : '');
  const [query, setQuery] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);

  const typedNumber = toE164(query);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = patients
      .filter(p => p.phone && (!q || `${p.name} ${p.phone}`.toLowerCase().includes(q)))
      .slice(0, 50)
      .map(p => patientOption(p, formatPhone(p.phone)));
    if (typedNumber.replace(/\D/g, '').length >= 10) list.unshift({ value: `num:${typedNumber}`, label: `Send to ${formatPhone(typedNumber)}` });
    if (to && !list.some(o => o.value === to)) {
      const p = patients.find(x => String(x.id) === to);
      if (p) list.unshift(patientOption(p, formatPhone(p.phone)));
      else if (to.startsWith('num:')) list.unshift({ value: to, label: formatPhone(to.slice(4)) });
    }
    return list;
  }, [patients, query, typedNumber, to]);

  const recipient = to.startsWith('num:')
    ? { id: null, name: formatPhone(to.slice(4)), phone: to.slice(4) }
    : patients.find(p => String(p.id) === to);

  const send = async () => {
    setTouched(true);
    if (!recipient || !body.trim()) return;
    setSending(true);
    const phone = toE164(recipient.phone);
    try {
      const conv = await findOrCreateConversation('sms', { ...recipient, phone }, { patient_phone: phone });
      const msg = await sendSms({ conversation: conv, sender: { id: me?.id, name: me?.name }, to: phone, body: body.trim() });
      if (msg?.status === 'failed') toast.error(`SMS not sent: ${msg.failure_reason}`);
      else toast.success('SMS sent');
      onSent(conv);
    } catch {
      toast.error('Could not send the SMS.');
      setSending(false);
    }
  };

  return (
    <Drawer
      title="New SMS"
      onClose={onClose}
      primaryAction={<Button variant="primary" size="L" onClick={send} disabled={sending || !recipient || !body.trim()}>Send</Button>}
    >
      <div className={styles.form}>
        <InfoBar>{PHI_NOTICE}</InfoBar>
        <Select label="Send Via" required options={[{ ...line, label: `${line.label} (Default)` }]} value="default" onChange={() => {}} />
        <Select
          label="Member"
          required
          showInfo
          infoText="Search a patient, or type a phone number."
          searchable
          query={query}
          onQueryChange={setQuery}
          options={options}
          value={to}
          onChange={setTo}
          placeholder="Search Member or Type Number"
          searchPlaceholder="Search Member or Type Number"
          emptyText="No patients with a phone number match"
          errorText={touched && !recipient ? 'Choose who to text.' : undefined}
        />
        <div className={styles.field}>
          <span className={styles.label}>Message <span className={styles.req} aria-hidden="true" /></span>
          <Textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, SMS_LIMIT))}
            placeholder="Type message here"
            rows={6}
          />
          <div className={styles.counter}>{body.length}/{SMS_LIMIT}</div>
        </div>
      </div>
    </Drawer>
  );
}

// ── Voice Call (Figma 1:32975, 1:33177) ──────────────────────────────────
const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', ''],
];

export function VoiceCallDrawer({ onClose, initialMode = 'members', initialNumber = '', initialPatient }) {
  const { patients, me, line } = useCommsPeople();
  const startCall = useBrowserCall(s => s.start);
  const [mode, setMode] = useState(initialMode);
  const [patientId, setPatientId] = useState(initialPatient ? String(initialPatient.id) : '');
  const [number, setNumber] = useState(initialNumber);
  const [country, setCountry] = useState('US');
  const dialCode = DIAL_COUNTRIES.find(c => c.iso === country)?.code || '1';
  const [padOpen, setPadOpen] = useState(true);
  const sender = { id: me?.id || null, name: me?.name || 'Care team' };

  const callMember = async () => {
    const patient = patients.find(p => String(p.id) === patientId);
    if (!patient) return;
    try {
      const chat = await findOrCreateConversation('chat', patient, { group_name: `Care for ${patient.name}` });
      startCall({ chat, patient, sender });
      onClose();
    } catch {
      toast.error('Could not start the call.');
    }
  };

  // A phone number can't be reached from the browser for free, so the call
  // goes out on the user's own phone (tel:) and is logged here.
  const callNumber = async () => {
    if (!isDialable(number, dialCode)) return;
    const e164 = toE164(number, dialCode);
    const patient = patients.find(p => toE164(p.phone) === e164) || { id: null, name: formatPhone(e164), phone: e164 };
    window.location.href = `tel:${e164}`;
    try {
      const conv = await findOrCreateConversation('call', patient, { patient_phone: e164 });
      await addMessage({
        conversation_id: conv.id, kind: 'call', direction: 'out', sender_id: sender.id, sender_name: sender.name,
        body: 'Called from phone', status: 'sent', meta: { outcome: 'phone', via: 'phone', number: e164 },
      });
    } catch { /* the dialer already opened; logging is best effort */ }
    onClose();
  };

  return (
    <Drawer title="Voice Call" onClose={onClose}>
      <div className={styles.form}>
        <Select label="Call Via Line" required options={[{ value: 'default', label: `${line.label} • Browser (Default)` }]} value="default" onChange={() => {}} />
        <div className={styles.field}>
          <span className={styles.label}>To <span className={styles.req} aria-hidden="true" /></span>
          <div className={styles.radios}>
            <RadioButton name="callTo" checked={mode === 'members'} onChange={() => setMode('members')} label="Members" />
            <RadioButton name="callTo" checked={mode === 'dial'} onChange={() => setMode('dial')} label="Dial a number" />
          </div>
        </div>

        {mode === 'members' ? (
          <div className={styles.memberRow}>
            <Select
              label="Member"
              required
              showInfo
              infoText="Rings the patient's page in their browser. They need it open to answer."
              searchable
              options={patients.map(p => patientOption(p, p.phone ? formatPhone(p.phone) : ''))}
              value={patientId}
              onChange={setPatientId}
              placeholder="Search Member"
              wrapperClassName={styles.grow}
            />
            <Button variant="primary" size="L" iconOnly leadingIcon="solar:phone-calling-linear" aria-label="Call" disabled={!patientId} onClick={callMember} />
          </div>
        ) : (
          <div className={styles.dial}>
            <div className={styles.dialInputRow}>
              <Select
                options={DIAL_COUNTRIES.map(c => ({ value: c.iso, label: `${c.flag} +${c.code} ${c.iso}` }))}
                value={country}
                onChange={setCountry}
                searchable
                searchPlaceholder="Search country or code"
                wrapperClassName={styles.country}
                aria-label="Country code"
              />
              <Input
                value={number}
                onChange={e => setNumber(e.target.value.replace(/[^\d+*#\s()-]/g, ''))}
                placeholder="Enter Number Here"
                wrapperClassName={styles.grow}
                onKeyDown={e => { if (e.key === 'Enter') callNumber(); }}
              />
              {number && (
                <button type="button" className={styles.backspace} aria-label="Delete last digit" onClick={() => setNumber(n => n.slice(0, -1))}>
                  <Icon name="solar:backspace-linear" size={16} />
                </button>
              )}
            </div>
            {padOpen && (
              <div className={styles.pad}>
                {KEYS.map(([k, sub]) => (
                  <button type="button" key={k} className={styles.key} onClick={() => setNumber(n => n + k)}>
                    <span>{k}</span>
                    {sub && <span className={styles.keySub}>{sub}</span>}
                  </button>
                ))}
              </div>
            )}
            <Button variant="primary" size="L" leadingIcon="solar:phone-calling-linear" className={styles.callBtn} disabled={!isDialable(number, dialCode)} onClick={callNumber}>
              Call
            </Button>
            <span className={styles.dialHint}>Opens your phone to place the call, and logs it here.</span>
            <Link variant="secondary" onClick={() => setPadOpen(v => !v)}>{padOpen ? 'Close Dialpad' : 'Open Dialpad'}</Link>
          </div>
        )}
      </div>
    </Drawer>
  );
}

import { useEffect, useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { Input } from '../../../components/Input/Input';
import { CommsListPanel } from './CommsListPanel';
import { CommsThread } from './CommsThread';
import { PatientEmailThread } from './PatientEmailThread';
import { CommsPanelEmpty } from './CommsEmptyState';
import { pollInboundSms } from './commsSend';
import { patientFor, isMissedCall } from './commsUtils';
import styles from './Comms.module.css';

const SMS_POLL_MS = 15000;

// Which conversations each Comms view lists.
const VIEWS = {
  all:      { channel: 'all', pick: () => true },
  chat:     { channel: 'chat', pick: c => c.channel === 'chat' },
  sms:      { channel: 'sms', pick: c => c.channel === 'sms' },
  calls:    { channel: 'call', pick: c => c.channel === 'call' },
  missed:   { channel: 'call', title: 'Missed Calls', pick: isMissedCall },
  starred:  { channel: 'all', title: 'Starred', pick: c => c.pinned },
  archived: { channel: 'all', title: 'Archived', pick: () => true, archived: true },
};

/**
 * Comms for patient conversations: the list for a view (Chat, SMS, Calls,
 * All, Missed Calls, Starred, Archived) and the open thread. While SMS is in
 * view, replies the gateway phone received are pulled in.
 */
export function CommsWorkspace({
  view, conversations, loading, patients, me, selectedId, onSelect, onCreateType, onCompose, onDial, navCollapsed, onToggleNav,
}) {
  const v = VIEWS[view];
  const list = conversations.filter(v.pick);
  // Only open a conversation that belongs to this view: switching from Chat
  // to SMS must not leave the chat thread showing beside the SMS list.
  const selected = list.find(c => c.id === selectedId && !!c.archived === !!v.archived) || null;
  const smsInView = view === 'sms' || view === 'all';

  useEffect(() => {
    if (!smsInView) return undefined;
    let stopped = false;
    let timer = null;
    const tick = async () => {
      const { connected } = await pollInboundSms(patients);
      if (!stopped && connected) timer = setTimeout(tick, SMS_POLL_MS);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); };
    // Patients only match numbers to names; a new list needn't restart polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smsInView]);

  return (
    <>
      <CommsListPanel
        channel={v.channel}
        viewKey={view}
        title={v.title}
        showArchived={!!v.archived}
        conversations={list}
        loading={loading}
        selectedId={selectedId}
        onSelect={c => onSelect(c.id)}
        navCollapsed={navCollapsed}
        onToggleNav={onToggleNav}
        footer={view === 'calls' || view === 'missed' ? <DialFooter onDial={onDial} /> : null}
      />
      {selected ? (
        selected.channel === 'email' ? (
          <PatientEmailThread key={selected.id} conversation={selected} patient={patientFor(selected, patients)} me={me} onCompose={onCompose} />
        ) : (
          <CommsThread key={selected.id} conversation={selected} patient={patientFor(selected, patients)} me={me} />
        )
      ) : (
        <CommsPanelEmpty
          viewKey={view}
          hasConversations={list.some(c => !!c.archived === !!v.archived)}
          onCreate={onCreateType}
        />
      )}
    </>
  );
}

// Calls (Figma 1:33250): "Dial a Number" under the list.
function DialFooter({ onDial }) {
  const [number, setNumber] = useState('');
  return (
    <div className={styles.dialFooter}>
      <div className={styles.dialTitle}>Dial a Number</div>
      <div className={styles.dialVia}>Via <strong>your phone</strong> • logged here</div>
      <div className={styles.dialRow}>
        <Input
          value={number}
          onChange={e => setNumber(e.target.value)}
          placeholder="Enter Number Here"
          wrapperClassName={styles.grow}
          onKeyDown={e => { if (e.key === 'Enter') onDial(number); }}
        />
        <Button variant="secondary" size="L" iconOnly leadingIcon="solar:keyboard-linear" aria-label="Open dial pad" onClick={() => onDial(number)} />
      </div>
    </div>
  );
}

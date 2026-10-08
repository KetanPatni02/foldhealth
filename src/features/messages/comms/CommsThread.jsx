import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Avatar } from '../../../components/Avatar/Avatar';
import { StickyNote } from '../../../components/StickyNote/StickyNote';
import { MessageComposer } from '../../../components/MessageComposer/MessageComposer';
import { MessageStatus } from '../../../components/MessageStatus/MessageStatus';
import { ChatBubble, MissedCallMarker } from '../../../components/ChatBubble/ChatBubble';
import { Link } from '../../../components/Link/Link';
import { toast } from '../../../components/Toast/sonnerToast';
import { supabase } from '../../../lib/supabase';
import listStyles from '../MessagesView.module.css';
import { useCommsMessages } from './useComms';
import { addMessage, updateConversation, markConversationRead, findOrCreateConversation } from './commsRepo';
import { sendSms, retrySend } from './commsSend';
import { useBrowserCall } from './call/useBrowserCall';
import { formatDuration } from './call/rtc';
import {
  initialsOf, patientMeta, callLook, fullStamp, dayLabel, patientLink, openInNewTab, formatPhone,
} from './commsUtils';
import styles from './Comms.module.css';

const timeOnly = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * One patient conversation on Chat, SMS or Calls: header, sticky note, the
 * messages and calls, and the type box. `conversation.channel` decides how
 * a message is sent (chat: saved and shown on the patient's page; SMS: sent
 * through the gateway phone; Calls: internal notes only).
 */
export function CommsThread({ conversation, patient, me }) {
  const { messages, loading } = useCommsMessages(conversation.id);
  const [draft, setDraft] = useState('');
  const [internal, setInternal] = useState(false);
  const [archiveOnSend, setArchiveOnSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState([]);
  const scrollRef = useRef(null);
  const fileInputId = useId();
  const startCall = useBrowserCall(s => s.start);
  const callStatus = useBrowserCall(s => s.status);
  const channel = conversation.channel;
  const sender = { id: me?.id || null, name: me?.name || 'Care team' };

  useEffect(() => { markConversationRead(conversation); }, [conversation, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  // Files picked but not sent: they upload right away and wait in the type
  // box until Send.
  const send = async () => {
    const body = draft.trim();
    const files = pending.filter(f => f.url);
    if (!body && !files.length) return;
    setSending(true);
    setDraft('');
    setPending([]);
    try {
      if (channel === 'sms' && !internal) {
        if (!conversation.patient_phone) throw new Error('This patient has no phone number on file.');
        await sendSms({ conversation, sender, to: conversation.patient_phone, body });
      } else {
        // One message per file; the text rides with the last one.
        const items = files.length ? files : [null];
        for (let i = 0; i < items.length; i++) {
          const f = items[i];
          await addMessage({
            conversation_id: conversation.id,
            kind: 'message',
            direction: 'out',
            internal: internal || channel === 'call',
            sender_id: sender.id,
            sender_name: sender.name,
            body: i === items.length - 1 ? body : '',
            status: 'sent',
            ...(f ? { meta: { attachment: { url: f.url, name: f.name, size: f.size, type: f.type.startsWith('image/') ? 'image' : 'file' } } } : {}),
          });
        }
      }
      files.forEach(f => URL.revokeObjectURL(f.previewUrl));
      if (archiveOnSend) await updateConversation(conversation.id, { archived: true });
    } catch (err) {
      setDraft(body);
      setPending(files);
      toast.error(err.message || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  const attach = async (file) => {
    if (!file) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previewUrl = URL.createObjectURL(file);
    setPending(p => [...p, { id, name: file.name, size: file.size, type: file.type, previewUrl, uploading: true }]);
    const path = `comms/${conversation.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
    const { error } = await supabase.storage.from('chat-media').upload(path, file, { upsert: true });
    if (error) {
      URL.revokeObjectURL(previewUrl);
      setPending(p => p.filter(f => f.id !== id));
      toast.error(`Could not upload ${file.name}.`);
      return;
    }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(path);
    setPending(p => p.map(f => (f.id === id ? { ...f, url: data.publicUrl, uploading: false } : f)));
  };

  const removePending = (id) => setPending((p) => {
    const f = p.find(x => x.id === id);
    if (f) URL.revokeObjectURL(f.previewUrl);
    return p.filter(x => x.id !== id);
  });

  const call = async () => {
    try {
      const chat = channel === 'chat' ? conversation : await findOrCreateConversation('chat', {
        id: conversation.patient_id, name: conversation.patient_name, email: conversation.patient_email, phone: conversation.patient_phone,
      });
      startCall({ chat, patient: { id: conversation.patient_id, name: conversation.patient_name, email: conversation.patient_email, phone: conversation.patient_phone }, sender });
    } catch {
      toast.error('Could not start the call.');
    }
  };

  // Chat and SMS type box tools. Attachment (any file) and Media (images and
  // video) attach in Chat; the others are placeholders for now.
  const pickFiles = (accept) => {
    const input = document.getElementById(fileInputId);
    if (!input) return;
    input.accept = accept;
    input.click();
  };
  const tools = channel === 'call' ? [] : [
    {
      key: 'attach', icon: 'solar:paperclip-linear', tooltip: 'Attachment',
      onClick: channel === 'chat' ? () => pickFiles('image/*,video/*,.pdf,.doc,.docx,.txt') : undefined,
    },
    { key: 'form', icon: 'solar:document-text-linear', tooltip: 'Send form' },
    { key: 'article', icon: 'solar:notebook-minimalistic-linear', tooltip: 'Send article' },
    { key: 'appointment', icon: 'solar:calendar-mark-linear', tooltip: 'Appointment link' },
    {
      key: 'media', icon: 'solar:gallery-wide-linear', tooltip: 'Media',
      onClick: channel === 'chat' ? () => pickFiles('image/*,video/*') : undefined,
    },
    { key: 'scheduled', icon: 'solar:clock-circle-linear', tooltip: 'Scheduled' },
    { key: 'expand', icon: 'solar:full-screen-linear', tooltip: 'Expand reply' },
  ];

  return (
    <div className={listStyles.chatPanel}>
      <div className={listStyles.chatHeader}>
        <Avatar variant="patient" size={40} initials={initialsOf(conversation.patient_name)} />
        <div className={listStyles.chatHeaderInfo}>
          <div className={listStyles.chatHeaderName}>
            {conversation.patient_name}
            <Icon name="solar:alt-arrow-right-linear" size={12} color="var(--neutral-300)" />
          </div>
          <div className={listStyles.chatHeaderMeta}>
            {patientMeta(conversation, patient)}
            {channel === 'sms' && conversation.patient_phone && ` • ${formatPhone(conversation.patient_phone)}`}
            {channel === 'chat' && conversation.group_name && <span className={styles.metaAccent}> • {conversation.group_name}</span>}
          </div>
        </div>
        <div className={listStyles.chatHeaderActions}>
          {channel === 'chat' && conversation.patient_token && (
            <>
              <ActionButton
                icon="solar:square-top-up-linear"
                size="S"
                tooltip="Open patient view"
                onClick={() => openInNewTab(patientLink(conversation.patient_token))}
              />
              <div className={listStyles.divider} />
            </>
          )}
          <ActionButton
            icon="solar:phone-calling-linear"
            size="S"
            tooltip="Call in browser"
            state={callStatus === 'idle' || callStatus === 'ended' ? 'active' : 'disabled'}
            onClick={call}
          />
          <div className={listStyles.divider} />
          <ActionButton
            icon={conversation.pinned ? 'solar:pin-bold' : 'solar:pin-linear'}
            size="S"
            tooltip={conversation.pinned ? 'Unpin' : 'Pin'}
            onClick={() => updateConversation(conversation.id, { pinned: !conversation.pinned })}
          />
          <div className={listStyles.divider} />
          <ActionButton
            icon="solar:archive-linear"
            size="S"
            tooltip={conversation.archived ? 'Unarchive' : 'Archive'}
            onClick={() => updateConversation(conversation.id, { archived: !conversation.archived })}
          />
        </div>
      </div>

      <div className={styles.stickyBar}>
        <StickyNote
          notes={conversation.sticky_note ? [{ id: 'note', text: conversation.sticky_note, author_name: '' }] : []}
          onCreate={text => updateConversation(conversation.id, { sticky_note: text })}
          onSave={(_, text) => updateConversation(conversation.id, { sticky_note: text })}
          onDelete={() => updateConversation(conversation.id, { sticky_note: null })}
        />
      </div>

      <div ref={scrollRef} className={styles.thread}>
        {loading ? (
          <div className={styles.threadEmpty}>Loading…</div>
        ) : messages.length === 0 ? (
          <div className={styles.threadEmpty}>
            {channel === 'call' ? 'No calls yet.' : 'No messages yet. Say hello!'}
            {channel === 'chat' && conversation.patient_token && (
              <span className={styles.threadEmptyHint}>
                {conversation.patient_name} reads and answers on their{' '}
                <Link onClick={() => openInNewTab(patientLink(conversation.patient_token))}>patient page</Link>.
              </span>
            )}
          </div>
        ) : messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          return (
            <Fragment key={m.id}>
              {newDay && <div className={styles.daySep}><span>{dayLabel(m.created_at)}</span></div>}
              <ThreadItem message={m} prev={newDay ? null : prev} conversation={conversation} />
            </Fragment>
          );
        })}
      </div>

      <MessageComposer
        value={draft}
        onChange={setDraft}
        onSend={send}
        internal={internal}
        onInternalChange={channel === 'call' ? undefined : setInternal}
        internalOnly={channel === 'call'}
        placeholder={channel === 'call' ? 'Add a note about these calls • only staff can see it' : undefined}
        tools={tools}
        archiveOnSend={archiveOnSend}
        onArchiveOnSendChange={setArchiveOnSend}
        sending={sending}
        attachments={pending}
        onRemoveAttachment={removePending}
        maxLength={channel === 'sms' && !internal ? 500 : undefined}
      />
      <input
        id={fileInputId}
        type="file"
        hidden
        multiple
        accept="image/*,video/*"
        onChange={e => { [...(e.target.files || [])].forEach(attach); e.target.value = ''; }}
      />
    </div>
  );
}

function ThreadItem({ message: m, prev, conversation }) {
  const own = m.direction === 'out';
  const sameSender = prev && prev.direction === m.direction && prev.sender_name === m.sender_name
    && prev.kind === m.kind && !!prev.internal === !!m.internal
    && new Date(m.created_at) - new Date(prev.created_at) < 5 * 60000;
  const name = m.sender_name || (own ? 'Care team' : conversation.patient_name);
  const copyText = m.body ? [{ key: 'copy', icon: 'solar:copy-linear', label: 'Copy text' }] : [];
  const onMenu = (key) => { if (key === 'copy') navigator.clipboard?.writeText(m.body); };

  if (m.kind === 'call') {
    // An unanswered call from the patient reads as a marker across the thread.
    if (!own && m.meta?.outcome === 'missed') {
      return <MissedCallMarker from={m.sender_name || conversation.patient_name} time={timeOnly(m.created_at)} />;
    }
    const look = callLook(m);
    const via = m.meta?.via === 'browser' ? 'Browser' : formatPhone(m.meta?.number || conversation.patient_phone);
    return (
      <ChatBubble
        side={own ? 'right' : 'left'}
        name={name}
        initials={initialsOf(name)}
        call={{
          label: [look.label, via].filter(Boolean).join(' • '),
          duration: m.meta?.duration ? formatDuration(m.meta.duration) : undefined,
          direction: own ? 'out' : 'in',
        }}
        time={fullStamp(m.created_at)}
      />
    );
  }

  const attachment = m.meta?.attachment;
  return (
    <ChatBubble
      side={m.internal ? 'internal' : own ? 'right' : 'left'}
      name={name}
      initials={initialsOf(name)}
      text={m.body}
      attachment={attachment}
      compact={sameSender && !m.internal}
      time={timeOnly(m.created_at)}
      status={own && !m.internal ? <MessageStatus status={statusOf(m)} onResend={() => retrySend(m)} /> : null}
      menuItems={copyText}
      onMenuSelect={onMenu}
      footer={m.status === 'failed' && m.failure_reason ? <div className={styles.failedRow}>{m.failure_reason}</div> : null}
    />
  );
}

// Message state → Fold-Pixel MessageStatus.
function statusOf(m) {
  if (m.status === 'queued') return 'delay';
  if (m.status === 'failed') return 'failed';
  if (m.read_at || m.status === 'read') return 'read';
  if (m.status === 'delivered') return 'received';
  return 'sent';
}

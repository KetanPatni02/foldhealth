import { useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Select } from '../../../components/Select/Select';
import { Input } from '../../../components/Input/Input';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Switch } from '../../../components/Switch/Switch';
import { InfoBar } from '../../../components/InfoBar/InfoBar';
import { Icon } from '../../../components/Icon/Icon';
import { Link } from '../../../components/Link/Link';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { RecipientInput } from '../../../components/RecipientInput/RecipientInput';
import { isEmailAddress } from '../../../components/RecipientInput/isEmailAddress';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { toast } from '../../../components/Toast/sonnerToast';
import { applyMergeTags, buildRecipientContext } from '../../email-builder/mergeTags';
import { findOrCreateConversation, addMessage, updateMessage, deleteMessage, updateConversation } from './commsRepo';
import { sendEmail } from './commsSend';
import { useCommsPeople } from './useCommsPeople';
import { EmailCanvas } from './EmailCanvas';
import { TemplatePickerDrawer } from './TemplatePickerDrawer';
import {
  DEFAULT_TEMPLATE_ID, DEFAULT_SUBJECT, defaultEmailHtml, defaultBodyText, textToHtml,
} from './defaultEmailTemplate';
import styles from './ComposeEmail.module.css';

const PHI_NOTICE = 'Do not send PHI via email or text without verifying and obtaining consent.';
const FROM_ADDRESS = 'noreply@designedbyalok.com';

const htmlToText = (html) => {
  const d = new DOMParser().parseFromString(html || '', 'text/html');
  d.querySelectorAll('style,script').forEach(n => n.remove());
  return (d.body?.innerText || d.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

/**
 * Compose Email (Figma 1:24088). Starts on the Fold Care template, which
 * can be edited in place or changed for any Content → Emails template.
 * Sends for real through Resend. Closing with something typed asks to save
 * a draft or discard (1:28117).
 *
 * `initial`: { patient, to, cc, bcc, subject, bodyText, draft, conversation }
 */
export function ComposeEmailDrawer({ initial = {}, onClose, onSent }) {
  const { patients, me } = useCommsPeople();
  const sender = useMemo(() => ({ name: me?.name || 'Care team', email: me?.email || '' }), [me]);
  const firstName = (initial.patient?.name || '').split(/\s+/)[0];

  const [to, setTo] = useState(initial.to || (initial.patient?.email ? [initial.patient.email] : []));
  const [cc, setCc] = useState(initial.cc || []);
  const [bcc, setBcc] = useState(initial.bcc || []);
  const [showCc, setShowCc] = useState(!!initial.cc?.length);
  const [showBcc, setShowBcc] = useState(!!initial.bcc?.length);
  const [subject, setSubject] = useState(initial.subject ?? DEFAULT_SUBJECT);
  const [useTemplate, setUseTemplate] = useState(initial.useTemplate ?? true);
  const [template, setTemplate] = useState(() => ({
    id: initial.draft?.meta?.templateId || DEFAULT_TEMPLATE_ID,
    name: 'Fold Care',
    html: initial.draft?.html || defaultEmailHtml({
      bodyHtml: textToHtml(initial.bodyText || defaultBodyText(firstName)),
      sender,
    }),
  }));
  const [plain, setPlain] = useState(initial.bodyText || '');
  const [editing, setEditing] = useState(false);
  const [archiveOnSend, setArchiveOnSend] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const canvasRef = useRef(null);

  const touch = (fn) => (v) => { setDirty(true); fn(v); };

  // The patient the email is to: the one given, else whoever owns the address.
  const patient = initial.patient
    || patients.find(p => p.email && to.some(a => a.toLowerCase() === p.email.toLowerCase()))
    || null;

  const badTo = to.filter(a => !isEmailAddress(a));
  const toError = touched && (!to.length ? 'Add at least one recipient.' : badTo.length ? `Check ${badTo[0]}.` : null);
  const subjectError = touched && !subject.trim() ? 'Add a subject.' : null;

  const currentHtml = () => {
    const html = useTemplate ? (canvasRef.current?.getHtml() || template.html) : `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A485F">${textToHtml(plain)}</body></html>`;
    return applyMergeTags(html, buildRecipientContext(patient || { name: to[0] || '' }, { providerName: sender.name, clinicName: 'Fold Health' }));
  };

  const conversationFor = () => {
    if (initial.conversation) return initial.conversation;
    const who = patient || { id: null, name: to[0], email: to[0] };
    return findOrCreateConversation('email', who, { patient_email: to[0], subject: subject.trim() });
  };

  const send = async () => {
    setTouched(true);
    if (!to.length || badTo.length || !subject.trim()) return;
    if (!useTemplate && !plain.trim()) { toast.error('Write a message first.'); return; }
    setBusy(true);
    try {
      const conversation = await conversationFor();
      const html = currentHtml();
      const result = await sendEmail({
        conversation,
        sender: { id: me?.id, name: sender.name },
        from: FROM_ADDRESS,
        to, cc, bcc,
        subject: subject.trim(),
        html,
        body: htmlToText(html),
      });
      if (initial.draft) await deleteMessage(initial.draft.id);
      if (archiveOnSend) await updateConversation(conversation.id, { archived: true });
      if (result?.status === 'failed') toast.error(`Email not sent: ${result.failure_reason}`);
      else toast.success('Email sent');
      onSent?.(conversation);
      setDismissed(true);
    } catch {
      toast.error('Could not send the email.');
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      const conversation = await conversationFor();
      const html = useTemplate ? (canvasRef.current?.getHtml() || template.html) : null;
      const fields = {
        subject: subject.trim(),
        to_addr: to.join(', '),
        cc: cc.join(', ') || null,
        bcc: bcc.join(', ') || null,
        html,
        body: useTemplate ? htmlToText(html) : plain,
        meta: { templateId: template.id, useTemplate },
      };
      if (initial.draft) await updateMessage(initial.draft.id, fields);
      else {
        await addMessage({
          conversation_id: conversation.id, kind: 'email', direction: 'out', status: 'draft',
          sender_id: me?.id || null, sender_name: sender.name, from_addr: FROM_ADDRESS, ...fields,
        });
      }
      toast.success('Saved to Drafts');
      setConfirmDiscard(false);
      setDismissed(true);
    } catch {
      toast.error('Could not save the draft.');
      setBusy(false);
    }
  };

  const discard = async () => {
    if (initial.draft) await deleteMessage(initial.draft.id);
    setConfirmDiscard(false);
    setDismissed(true);
  };

  return (
    <>
      <Drawer
        title="Compose Email"
        width={1240}
        onClose={onClose}
        dismissed={dismissed}
        beforeClose={() => {
          if (!dirty || dismissed) return true;
          setConfirmDiscard(true);
          return false;
        }}
        primaryAction={(
          <Button variant="primary" size="L" leadingIcon="solar:plain-2-linear" onClick={send} disabled={busy}>
            {busy ? 'Sending…' : 'Send'}
          </Button>
        )}
        bodyClassName={styles.composeBody}
      >
        <div className={styles.composeLeft}>
          <Select
            label="From"
            required
            options={[{ value: 'default', label: `Default (${sender.email || FROM_ADDRESS})` }]}
            value="default"
            onChange={() => {}}
          />
          <div className={styles.recipient}>
            <RecipientInput
              label="To"
              required
              value={to}
              onChange={touch(setTo)}
              placeholder="Search or enter recipient"
              labelEnd={(
                <span className={styles.ccLinks}>
                  {!showCc && <Link variant="secondary" onClick={() => setShowCc(true)}>Cc</Link>}
                  {!showCc && !showBcc && <span className={styles.ccDivider} />}
                  {!showBcc && <Link variant="secondary" onClick={() => setShowBcc(true)}>Bcc</Link>}
                </span>
              )}
            />
            {toError && <span className={styles.error}>{toError}</span>}
          </div>
          {showCc && <RecipientInput label="Cc" value={cc} onChange={touch(setCc)} />}
          {showBcc && <RecipientInput label="Bcc" value={bcc} onChange={touch(setBcc)} />}
          <Input
            label="Subject"
            required
            value={subject}
            onChange={e => { setDirty(true); setSubject(e.target.value); }}
            maxLength={200}
            errorText={subjectError || undefined}
          />
          <Switch checked={useTemplate} onChange={touch(setUseTemplate)} label="Email Template" />
          <InfoBar tone="warning">{PHI_NOTICE}</InfoBar>
          <label className={styles.archive}>
            <Checkbox checked={archiveOnSend} onCheckedChange={v => setArchiveOnSend(v === true)} />
            Archive on send
          </label>
        </div>

        <div className={styles.composeRight}>
          {useTemplate ? (<>
            <div className={styles.previewBar}>
              <span className={styles.previewTitle}>Template Preview</span>
              <span className={styles.previewLinks}>
                <Link onClick={() => { setDirty(true); setEditing(v => !v); }}>
                  <Icon name={editing ? 'solar:check-circle-linear' : 'solar:pen-linear'} size={14} />
                  {editing ? 'Done' : 'Edit'}
                </Link>
                <Link onClick={() => setPickerOpen(true)}>
                  <Icon name="solar:transfer-horizontal-linear" size={14} />
                  Change Template
                </Link>
              </span>
            </div>
            <EmailCanvas ref={canvasRef} html={template.html} editing={editing} />
          </>) : (
            <Textarea
              value={plain}
              onChange={e => { setDirty(true); setPlain(e.target.value); }}
              placeholder="Type your email here"
              rows={18}
            />
          )}
        </div>
      </Drawer>

      {pickerOpen && (
        <TemplatePickerDrawer
          recipient={buildRecipientContext(patient || { name: to[0] || '' }, { providerName: sender.name, clinicName: 'Fold Health' })}
          sender={sender}
          currentId={template.id}
          onClose={() => setPickerOpen(false)}
          onPick={(t) => {
            setTemplate({ id: t.id, name: t.name, html: t.html });
            if (t.subject) setSubject(t.subject);
            setEditing(t.id === 'scratch');
            setDirty(true);
            setPickerOpen(false);
          }}
        />
      )}

      {confirmDiscard && (
        <ConfirmDialog
          align="start"
          icon={false}
          title="Discard Email?"
          description="Discarding will permanently delete the email."
          cancelLabel="Save as Draft"
          confirmLabel="Discard"
          loading={busy}
          onCancel={saveDraft}
          onConfirm={discard}
          onClose={() => setConfirmDiscard(false)}
        />
      )}
    </>
  );
}

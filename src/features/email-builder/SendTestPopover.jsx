import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { renderEmailHtml } from './patchEmailHtml';
import styles from './EmailBuilder.module.css';

// Shared lookup tables for sender name / send-from selection. Kept in sync
// with the CampaignBuilder's options; if these grow they should live in a
// shared data module.
const SENDER_LABELS = {
  'stanford-care': 'Stanford Care Center',
  'fold-health':   'Fold Health Team',
  'dr-patel':      'Dr. Patel',
  'dr-singh':      'Dr. Singh',
};

/**
 * SendTestPopover — pop-over launched by the "Test Mail" button in both
 * the EmailBuilder and CampaignBuilder. Renders the current email template
 * to HTML, posts it to `/api/send-test-email`, and surfaces Resend's actual
 * error message verbatim so failures are diagnosable.
 *
 * Resolution:
 *  - Subject:  campaign.subjectLine || `[Test] ${campaignName}`
 *  - From:     campaign.senderName + campaign.sendFrom (looked up to a
 *              human label); falls back to the RESEND_FROM env default.
 *  - Document: useAppStore.emailDocument when EmailBuilder is open, else
 *              the saved campaign.emailTemplate.
 */
const RECENT_EMAILS_KEY = 'fold:testEmailRecents';
const MAX_RECENTS = 5;

function getRecentEmails() {
  try { return JSON.parse(localStorage.getItem(RECENT_EMAILS_KEY)) || []; }
  catch { return []; }
}

function addRecentEmail(addr) {
  const list = getRecentEmails().filter(e => e !== addr);
  list.unshift(addr);
  localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
}

export function SendTestPopover({ onClose, campaignId }) {
  const inputRef = useRef(null);
  const popoverRef = useRef(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [recents, setRecents] = useState(getRecentEmails);

  // Read everything the popover needs from the store in one go.
  const liveDoc = useAppStore(s => s.emailDocument);
  const campaignName = useAppStore(s => s.editingCampaignName);
  const campaigns = useAppStore(s => s.campaigns);
  const campaign = campaigns.find(c => c.id === campaignId);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSend = async () => {
    if (!email || !email.includes('@')) return;
    setStatus('sending');
    setErrorMsg('');

    // Prefer the live editing document if EmailBuilder is open; otherwise
    // fall back to the saved template on the campaign row.
    const doc = liveDoc || campaign?.emailTemplate;
    if (!doc) {
      setStatus('error');
      setErrorMsg('No email template found for this campaign yet — edit one first.');
      return;
    }
    const html = renderEmailHtml(doc);
    if (!html || html.includes('Could not render')) {
      setStatus('error');
      setErrorMsg('Failed to render email template');
      return;
    }

    const subject = campaign?.subjectLine
      ? `[Test] ${campaign.subjectLine}`
      : `[Test] ${campaignName || campaign?.name || 'Email Template'}`;
    const fromName  = campaign?.senderName ? (SENDER_LABELS[campaign.senderName] || campaign.senderName) : undefined;
    const fromEmail = campaign?.sendFrom || undefined;

    try {
      const res = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject, html, fromName, fromEmail }),
      });
      const text = await res.text();
      let payload = null;
      try { payload = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
      if (!res.ok || payload?.error) {
        setStatus('error');
        const err = payload?.error;
        setErrorMsg(
          (typeof err === 'string' ? err : err?.message)
            || text
            || `Send failed (${res.status})`
        );
        return;
      }
      setStatus('ok');
      addRecentEmail(email);
      setRecents(getRecentEmails());
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Network error');
    }
  };

  return (
    <div ref={popoverRef} className={styles.testEmailPopover}>
      <div className={styles.testEmailLabel}>Send test email</div>
      <input
        ref={inputRef}
        type="email"
        className={styles.testEmailInput}
        placeholder="name@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSend(); if (e.key === 'Escape') onClose(); }}
      />
      {status === 'ok' && (
        <div className={`${styles.testEmailStatus} ${styles.testEmailStatusOk}`}>
          <Icon name="solar:check-circle-linear" size={14} /> Sent successfully
        </div>
      )}
      {status === 'error' && (
        <div className={`${styles.testEmailStatus} ${styles.testEmailStatusErr}`}>
          <Icon name="solar:close-circle-linear" size={14} /> {errorMsg}
        </div>
      )}
      <div className={styles.testEmailActions}>
        <Button variant="primary" size="S" onClick={handleSend} disabled={status === 'sending' || !email}>
          {status === 'sending' ? 'Sending…' : 'Send'}
        </Button>
        <Button variant="secondary" size="S" onClick={onClose}>Cancel</Button>
      </div>
      {recents.length > 0 && (
        <>
          <div className={styles.testEmailDivider} />
          <div className={styles.testEmailRecentsLabel}>
            <Icon name="solar:history-linear" size={12} color="currentColor" />
            Recent
          </div>
          <div className={styles.testEmailRecents}>
            {recents.map(addr => (
              <button
                key={addr}
                className={styles.testEmailRecentChip}
                onClick={() => setEmail(addr)}
                title={addr}
              >
                <Icon name="solar:letter-linear" size={12} color="currentColor" />
                {addr}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

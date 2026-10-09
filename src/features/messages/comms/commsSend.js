// Sending on the real channels. Each send is saved first as `queued`, then
// marked `sent` or `failed` (with the reason) once the provider answers, so a
// failure stays visible in the thread and can be retried.
//
// Email goes out through Resend (/api/send-test-email). SMS goes out through
// the textbee Android gateway (/api/comms-sms), which also hands back the
// replies that pollInboundSms() files into threads.

import {
  addMessage, updateMessage, listConversations, createConversation,
} from './commsRepo';
import { apiFetch } from '../../../lib/apiFetch';

async function postJson(url, body) {
  let res;
  try {
    res = await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new Error('Network connectivity issues prevented sending.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `The server returned ${res.status}.`);
  }
  return json;
}

const splitAddrs = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\s,;]+/)).filter(Boolean);

async function deliverEmail(message) {
  const json = await postJson('/api/send-test-email', {
    to: splitAddrs(message.to_addr),
    cc: splitAddrs(message.cc),
    bcc: splitAddrs(message.bcc),
    subject: message.subject,
    html: message.html || `<div style="white-space:pre-wrap">${escapeHtml(message.body)}</div>`,
    fromName: message.sender_name || undefined,
  });
  return json?.data?.id || null;
}

async function deliverSms(message) {
  const json = await postJson('/api/comms-sms', { to: message.to_addr, message: message.body });
  return json?.id || null;
}

async function settle(message, deliver) {
  try {
    const providerId = await deliver(message);
    return await updateMessage(message.id, { status: 'sent', failure_reason: null, ...(providerId ? { provider_id: providerId } : {}) });
  } catch (err) {
    return updateMessage(message.id, { status: 'failed', failure_reason: err.message });
  }
}

export async function sendEmail({ conversation, sender, from, to, cc, bcc, subject, html, body, meta }) {
  const message = await addMessage({
    conversation_id: conversation.id,
    kind: 'email',
    direction: 'out',
    sender_id: sender?.id || null,
    sender_name: sender?.name || '',
    from_addr: from || null,
    to_addr: splitAddrs(to).join(', '),
    cc: splitAddrs(cc).join(', ') || null,
    bcc: splitAddrs(bcc).join(', ') || null,
    subject,
    html,
    body,
    status: 'queued',
    ...(meta ? { meta } : {}),
  });
  return settle(message, deliverEmail);
}

export async function sendSms({ conversation, sender, to, body, meta }) {
  const message = await addMessage({
    conversation_id: conversation.id,
    kind: 'message',
    direction: 'out',
    sender_id: sender?.id || null,
    sender_name: sender?.name || '',
    to_addr: to,
    body,
    status: 'queued',
    ...(meta ? { meta } : {}),
  });
  return settle(message, deliverSms);
}

/** Try a failed email or SMS again. */
export async function retrySend(message) {
  await updateMessage(message.id, { status: 'queued', failure_reason: null });
  return settle(message, message.kind === 'email' ? deliverEmail : deliverSms);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);

/**
 * Pull texts the gateway phone received and file each into its patient's SMS
 * thread (matched on the last ten digits; an unknown number opens a new
 * thread). Already-filed texts are skipped by their provider id.
 * Resolves to { connected } so the caller can stop polling a missing gateway.
 */
export async function pollInboundSms(patients = []) {
  let res;
  try { res = await apiFetch('/api/comms-sms'); } catch { return { connected: false }; }
  if (!res.ok) return { connected: false };
  const { messages = [] } = await res.json().catch(() => ({}));
  if (!messages.length) return { connected: true };
  const convs = (await listConversations()).filter(c => c.channel === 'sms');
  for (const m of messages) {
    let conv = convs.find(c => digits(c.patient_phone) && digits(c.patient_phone) === digits(m.from));
    if (!conv) {
      const patient = patients.find(p => digits(p.phone) && digits(p.phone) === digits(m.from));
      conv = await createConversation({
        channel: 'sms',
        patient_id: patient ? String(patient.id) : null,
        patient_name: patient?.name || m.from,
        patient_email: patient?.email || null,
        patient_phone: m.from,
      });
      convs.push(conv);
    }
    await addMessage({
      conversation_id: conv.id,
      kind: 'message',
      direction: 'in',
      sender_name: conv.patient_name,
      from_addr: m.from,
      body: m.body,
      status: 'delivered',
      provider_id: m.id,
      created_at: m.receivedAt || new Date().toISOString(),
    });
  }
  return { connected: true };
}

// Patient comms data: conversations and their messages, on any channel.
//
// Reads and writes Supabase (patient_conversations / patient_messages) with
// realtime. If those tables don't exist yet (migration not run), it keeps the
// same data in localStorage instead and syncs open tabs through the `storage`
// event, so a staff tab and the patient's page still talk to each other on
// one machine. Nothing is seeded: every conversation is a real one.

import { supabase } from '../../../lib/supabase';
import { EDUCATION_LIBRARY } from './educationLibrary';

// v2: v1 held seeded sample conversations; only real ones are kept now.
const LOCAL_KEY = 'fold-comms-v2';
const emitter = new EventTarget();

let modePromise = null;
/** 'remote' when the Supabase tables answer, otherwise 'local'. */
export function commsMode() {
  if (!modePromise) {
    modePromise = supabase.from('patient_conversations').select('id').limit(1)
      .then(({ error }) => (error ? 'local' : 'remote'))
      .catch(() => 'local');
  }
  return modePromise;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const now = () => new Date().toISOString();

export const newPatientToken = () => uid().replace(/-/g, '').slice(0, 20);

const CONV_DEFAULTS = {
  patient_id: null, patient_name: '', patient_email: null, patient_phone: null, group_name: null,
  subject: null, patient_token: null, assigned_to: null, sticky_note: null, members: [], starred: false, archived: false, pinned: false,
  unread_count: 0, last_preview: '', created_by: null, created_by_name: null,
};
const MSG_DEFAULTS = {
  kind: 'message', direction: 'out', internal: false, sender_id: null, sender_name: '', body: '', html: null,
  subject: null, from_addr: null, to_addr: null, cc: null, bcc: null, status: 'sent', failure_reason: null,
  provider_id: null, meta: {}, read_at: null,
};

// ── Local backend ─────────────────────────────────────────────────────────
function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage blocked: start empty */ }
  return { conversations: [], messages: [] };
}

try { localStorage.removeItem('fold-comms-v1'); } catch { /* storage blocked */ }

// Own writes are announced in this tab right away; realtime echoes of them
// (remote mode) carry the same id, so listeners upsert by id.
function emit(change) {
  emitter.dispatchEvent(new CustomEvent('change', { detail: change }));
}

function writeLocal(db, change) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); } catch { /* quota or blocked */ }
  if (change) emit(change);
}

if (typeof window !== 'undefined') {
  // Another tab wrote: tell this tab's listeners to reload.
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_KEY) emitter.dispatchEvent(new CustomEvent('change', { detail: { table: '*', type: 'reload' } }));
  });
}

// ── Public API ────────────────────────────────────────────────────────────
export async function listConversations() {
  if (await commsMode() === 'local') {
    return [...readLocal().conversations].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  }
  const { data, error } = await supabase.from('patient_conversations').select('*').order('last_message_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listMessages(conversationId) {
  if (await commsMode() === 'local') {
    return readLocal().messages.filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  const { data, error } = await supabase.from('patient_messages').select('*')
    .eq('conversation_id', conversationId).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Messages across several conversations (e.g. every email thread). */
export async function listMessagesFor(conversationIds) {
  if (!conversationIds.length) return [];
  if (await commsMode() === 'local') {
    const ids = new Set(conversationIds);
    return readLocal().messages.filter(m => ids.has(m.conversation_id));
  }
  const { data, error } = await supabase.from('patient_messages').select('*').in('conversation_id', conversationIds);
  if (error) throw error;
  return data || [];
}

export async function createConversation(fields) {
  const row = { ...CONV_DEFAULTS, id: uid(), created_at: now(), last_message_at: now(), ...fields };
  if (await commsMode() === 'local') {
    const db = readLocal();
    db.conversations.push(row);
    writeLocal(db, { table: 'patient_conversations', type: 'INSERT', row });
    return row;
  }
  const { data, error } = await supabase.from('patient_conversations').insert(row).select().single();
  if (error) throw error;
  emit({ table: 'patient_conversations', type: 'INSERT', row: data });
  return data;
}

export async function updateConversation(id, patch) {
  if (await commsMode() === 'local') {
    const db = readLocal();
    const i = db.conversations.findIndex(c => c.id === id);
    if (i < 0) return null;
    db.conversations[i] = { ...db.conversations[i], ...patch };
    writeLocal(db, { table: 'patient_conversations', type: 'UPDATE', row: db.conversations[i] });
    return db.conversations[i];
  }
  const { data, error } = await supabase.from('patient_conversations').update(patch).eq('id', id).select().single();
  if (error) throw error;
  emit({ table: 'patient_conversations', type: 'UPDATE', row: data });
  return data;
}

/** Find the patient's conversation on a channel, or open one. */
export async function findOrCreateConversation(channel, patient, extra = {}) {
  const all = await listConversations();
  const key = patient.id != null ? String(patient.id) : null;
  const found = all.find(c => c.channel === channel && (
    (key && c.patient_id === key) || (!key && c.patient_name === patient.name)
  ));
  if (found) return found;
  return createConversation({
    channel,
    patient_id: key,
    patient_name: patient.name || '',
    patient_email: patient.email || null,
    patient_phone: patient.phone || null,
    ...(channel === 'chat' ? { patient_token: newPatientToken() } : {}),
    ...extra,
  });
}

function previewOf(m) {
  if (m.kind === 'call') return m.body || 'Call';
  if (m.kind === 'email') return m.subject || m.body || '';
  return (m.body || (m.meta?.attachment ? 'Sent an attachment' : '')).replace(/\s+/g, ' ').slice(0, 140);
}

/**
 * Add a message, and bring its conversation's preview, time and unread
 * count along. Drafts and internal notes don't move the preview.
 */
export async function addMessage(fields) {
  const row = { ...MSG_DEFAULTS, id: uid(), created_at: now(), ...fields };
  let saved;
  if (await commsMode() === 'local') {
    const db = readLocal();
    if (row.provider_id && db.messages.some(m => m.provider_id === row.provider_id)) return null;
    db.messages.push(row);
    writeLocal(db, { table: 'patient_messages', type: 'INSERT', row });
    saved = row;
  } else {
    const { data, error } = await supabase.from('patient_messages').insert(row).select().single();
    if (error) {
      if (error.code === '23505') return null; // this provider message is already in
      throw error;
    }
    saved = data;
    emit({ table: 'patient_messages', type: 'INSERT', row: data });
  }
  if (saved.status !== 'draft' && !saved.internal) {
    const convs = await listConversations();
    const c = convs.find(x => x.id === saved.conversation_id);
    await updateConversation(saved.conversation_id, {
      last_preview: previewOf(saved),
      last_message_at: saved.created_at,
      archived: false,
      ...(saved.direction === 'in' ? { unread_count: (c?.unread_count || 0) + 1 } : {}),
    });
  }
  return saved;
}

export async function updateMessage(id, patch) {
  if (await commsMode() === 'local') {
    const db = readLocal();
    const i = db.messages.findIndex(m => m.id === id);
    if (i < 0) return null;
    db.messages[i] = { ...db.messages[i], ...patch };
    writeLocal(db, { table: 'patient_messages', type: 'UPDATE', row: db.messages[i] });
    return db.messages[i];
  }
  const { data, error } = await supabase.from('patient_messages').update(patch).eq('id', id).select().single();
  if (error) throw error;
  emit({ table: 'patient_messages', type: 'UPDATE', row: data });
  return data;
}

export async function deleteMessage(id) {
  if (await commsMode() === 'local') {
    const db = readLocal();
    const row = db.messages.find(m => m.id === id);
    db.messages = db.messages.filter(m => m.id !== id);
    writeLocal(db, { table: 'patient_messages', type: 'DELETE', row });
    return;
  }
  await supabase.from('patient_messages').delete().eq('id', id);
  emit({ table: 'patient_messages', type: 'DELETE', row: { id } });
}

/** Mark a conversation's inbound messages read, from the staff side. */
export async function markConversationRead(conversation) {
  if (!conversation?.unread_count) return;
  await updateConversation(conversation.id, { unread_count: 0 });
  const msgs = await listMessages(conversation.id);
  const stamp = now();
  await Promise.all(msgs.filter(m => m.direction === 'in' && !m.read_at).map(m => updateMessage(m.id, { read_at: stamp })));
}

/**
 * Listen for any change to conversations or messages. The callback gets
 * { table, type, row }; type 'reload' means "re-read everything".
 */
export function subscribeComms(onChange, name = 'comms') {
  const local = (e) => onChange(e.detail);
  emitter.addEventListener('change', local);
  let channel = null;
  let closed = false;
  commsMode().then((mode) => {
    if (mode !== 'remote' || closed) return;
    channel = supabase.channel(`${name}-${uid()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_conversations' },
        p => onChange({ table: 'patient_conversations', type: p.eventType, row: p.new?.id ? p.new : p.old }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_messages' },
        p => onChange({ table: 'patient_messages', type: p.eventType, row: p.new?.id ? p.new : p.old }))
      .subscribe();
  });
  return () => {
    closed = true;
    emitter.removeEventListener('change', local);
    channel?.unsubscribe();
  };
}

// ── Patient page (/#/p/<token>, signed out) ───────────────────────────────
// The tables are staff-only, so the patient page never reads them directly:
// it goes through the comms_patient_* functions, which only touch the chat
// conversation with that token (supabase/patient_conversations_migration.sql).

/** { conversation, messages } for a patient link, or null if it's not active. */
export async function getPatientThread(token) {
  if (await commsMode() === 'local') {
    const conversation = readLocal().conversations.find(c => c.channel === 'chat' && c.patient_token === token);
    return conversation ? { conversation, messages: await listMessages(conversation.id) } : null;
  }
  const { data, error } = await supabase.rpc('comms_patient_thread', { p_token: token });
  if (error) throw error;
  return data || null;
}

/** The patient answers in their chat. Resolves to the saved message. */
export async function sendAsPatient(token, body) {
  if (await commsMode() === 'local') {
    const conversation = readLocal().conversations.find(c => c.channel === 'chat' && c.patient_token === token);
    if (!conversation) throw new Error('This link is no longer active.');
    return addMessage({
      conversation_id: conversation.id, kind: 'message', direction: 'in',
      sender_name: conversation.patient_name, body, status: 'delivered',
    });
  }
  const { data, error } = await supabase.rpc('comms_patient_send', { p_token: token, p_body: body });
  if (error) throw error;
  return data;
}

/** The patient has seen what the team sent. */
export async function markReadAsPatient(token) {
  if (await commsMode() === 'local') {
    const thread = await getPatientThread(token);
    const stamp = now();
    await Promise.all((thread?.messages || [])
      .filter(m => m.direction === 'out' && m.kind === 'message' && !m.internal && !m.read_at)
      .map(m => updateMessage(m.id, { read_at: stamp, status: 'read' })));
    return;
  }
  const { error } = await supabase.rpc('comms_patient_mark_read', { p_token: token });
  if (error) throw error;
}

/** Changes made in this browser (own writes, other tabs in local mode). */
export function subscribeLocalComms(onChange) {
  const local = (e) => onChange(e.detail);
  emitter.addEventListener('change', local);
  return () => emitter.removeEventListener('change', local);
}

/** Education content for Send Education: the table, else the built-in list. */
export async function listEducationContent() {
  try {
    const { data, error } = await supabase.from('patient_education_content').select('*').order('title');
    if (!error && data?.length) return data;
  } catch { /* fall back below */ }
  return EDUCATION_LIBRARY.map(c => ({ ...c, source: 'MedlinePlus' }));
}

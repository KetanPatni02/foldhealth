import { useEffect, useState } from 'react';
import { listConversations, listMessages, listMessagesFor, subscribeComms, commsMode } from './commsRepo';

const upsert = (list, row) => {
  const i = list.findIndex(x => x.id === row.id);
  if (i < 0) return [...list, row];
  const next = [...list];
  next[i] = { ...next[i], ...row };
  return next;
};

/** Every patient conversation, kept live. */
export function useCommsConversations() {
  const [state, setState] = useState({ conversations: [], loading: true, mode: null });

  useEffect(() => {
    let alive = true;
    const load = () => Promise.all([listConversations(), commsMode()])
      .then(([conversations, mode]) => { if (alive) setState({ conversations, loading: false, mode }); })
      .catch(() => { if (alive) setState(s => ({ ...s, loading: false })); });
    load();
    const off = subscribeComms((change) => {
      if (change.type === 'reload') return load();
      if (change.table !== 'patient_conversations' || !change.row) return;
      setState(s => ({
        ...s,
        conversations: (change.type === 'DELETE'
          ? s.conversations.filter(c => c.id !== change.row.id)
          : upsert(s.conversations, change.row))
          .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)),
      }));
    }, 'comms-convs');
    return () => { alive = false; off(); };
  }, []);

  return state;
}

/** One conversation's messages, oldest first, kept live. */
export function useCommsMessages(conversationId) {
  const [state, setState] = useState({ id: null, messages: [], loading: true });

  useEffect(() => {
    if (!conversationId) return undefined;
    let alive = true;
    const load = () => listMessages(conversationId)
      .then(messages => { if (alive) setState({ id: conversationId, messages, loading: false }); })
      .catch(() => { if (alive) setState({ id: conversationId, messages: [], loading: false }); });
    load();
    const off = subscribeComms((change) => {
      if (change.type === 'reload') return load();
      if (change.table !== 'patient_messages' || !change.row) return;
      if (change.type === 'DELETE') {
        setState(s => ({ ...s, messages: s.messages.filter(m => m.id !== change.row.id) }));
        return;
      }
      if (change.row.conversation_id !== conversationId) return;
      setState(s => ({
        ...s,
        messages: upsert(s.messages, change.row).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      }));
    }, `comms-msgs-${conversationId}`);
    return () => { alive = false; off(); };
  }, [conversationId]);

  // A different conversation was picked: show loading until its rows arrive.
  return state.id === conversationId ? state : { messages: [], loading: true };
}

/** Every message in the given conversations, kept live (for folder views). */
export function useCommsMessagesFor(conversationIds) {
  const key = conversationIds.join(',');
  const [state, setState] = useState({ key: null, messages: [] });

  useEffect(() => {
    let alive = true;
    const ids = key ? key.split(',') : [];
    const load = () => listMessagesFor(ids)
      .then(messages => { if (alive) setState({ key, messages }); })
      .catch(() => { if (alive) setState({ key, messages: [] }); });
    load();
    const off = subscribeComms((change) => {
      if (change.type === 'reload') return load();
      if (change.table !== 'patient_messages' || !change.row) return;
      if (change.type === 'DELETE') {
        setState(s => ({ ...s, messages: s.messages.filter(m => m.id !== change.row.id) }));
        return;
      }
      if (!ids.includes(change.row.conversation_id)) return;
      setState(s => ({ ...s, messages: upsert(s.messages, change.row) }));
    }, 'comms-folder');
    return () => { alive = false; off(); };
  }, [key]);

  return state.key === key ? state.messages : [];
}

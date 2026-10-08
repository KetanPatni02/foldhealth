// The staff side of a browser call. One call at a time, held in a small
// store so the in-call card stays up while the user moves around the app.
// When the call ends it is logged to the patient's Calls thread.

import { create } from 'zustand';
import { addMessage, findOrCreateConversation } from '../commsRepo';
import { openSignal, getMic, createPeer, stopStream, RING_TIMEOUT_MS } from './rtc';

let live = null; // { signal, peer, stream, timer, callId }

const IDLE = {
  status: 'idle', // idle | ringing | connecting | live | ended
  patientName: '',
  startedAt: null,
  connectedAt: null,
  muted: false,
  endReason: null,
  error: null,
  duration: 0,
};

export const useBrowserCall = create((set, get) => ({
  ...IDLE,

  /**
   * Ring a patient's page. `chat` is their chat conversation (it carries the
   * token their page listens on); the call is logged on their Calls thread.
   */
  start: async ({ chat, patient, sender }) => {
    if (get().status !== 'idle' && get().status !== 'ended') return;
    const callId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    set({ ...IDLE, status: 'ringing', patientName: patient.name, startedAt: Date.now(), meta: { chat, patient, sender, callId } });

    let stream;
    try {
      stream = await getMic();
    } catch (err) {
      set({ status: 'ended', endReason: 'failed', error: err.message });
      return;
    }

    const signal = openSignal(chat.patient_token, async (event, payload) => {
      if (payload.callId !== callId || !live) return;
      if (event === 'accept') {
        clearTimeout(live.timer);
        set({ status: 'connecting' });
        const peer = createPeer({
          stream, signal, callId,
          onState: (state) => {
            if (state === 'connected') set({ status: 'live', connectedAt: get().connectedAt || Date.now() });
            if (state === 'failed') get().finish('failed', 'The connection to the patient dropped.');
          },
        });
        live.peer = peer;
        const offer = await peer.pc.createOffer();
        await peer.pc.setLocalDescription(offer);
        signal.send('offer', { callId, sdp: offer });
      } else if (event === 'answer') {
        await live.peer?.setRemote(payload.sdp);
      } else if (event === 'ice') {
        live.peer?.addIce(payload.candidate);
      } else if (event === 'decline') {
        get().finish('declined');
      } else if (event === 'hangup') {
        get().finish('completed');
      }
    });

    live = { signal, stream, callId, peer: null, timer: null };
    await signal.ready;
    signal.send('ring', { callId, from: sender?.name || 'Your care team' });
    live.timer = setTimeout(() => {
      signal.send('cancel', { callId });
      get().finish('missed');
    }, RING_TIMEOUT_MS);
  },

  hangup: () => {
    const { status } = get();
    if (!live) return;
    live.signal.send(status === 'ringing' ? 'cancel' : 'hangup', { callId: live.callId });
    get().finish(status === 'ringing' ? 'cancelled' : 'completed');
  },

  toggleMute: () => {
    const muted = !get().muted;
    live?.stream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    set({ muted });
  },

  dismiss: () => set({ ...IDLE }),

  /** Tear down and log the call. */
  finish: async (outcome, error) => {
    if (!live) return;
    const { meta, connectedAt } = get();
    const session = live;
    live = null;
    clearTimeout(session.timer);
    session.peer?.close();
    stopStream(session.stream);
    // Let the last signal leave before the channel closes.
    setTimeout(() => session.signal.close(), 500);
    const duration = connectedAt ? Math.round((Date.now() - connectedAt) / 1000) : 0;
    const resolved = outcome === 'completed' && !connectedAt ? 'cancelled' : outcome;
    set({ status: 'ended', endReason: resolved, error: error || null, duration });
    if (!meta) return;
    try {
      const callConv = await findOrCreateConversation('call', meta.patient);
      await addMessage({
        conversation_id: callConv.id,
        kind: 'call',
        direction: 'out',
        sender_id: meta.sender?.id || null,
        sender_name: meta.sender?.name || '',
        body: resolved === 'completed' ? 'Outgoing Call' : CALL_LABEL[resolved] || 'Outgoing Call',
        status: 'sent',
        meta: { outcome: resolved, duration, via: 'browser', callId: meta.callId },
      });
    } catch { /* the call itself already happened; a missing log is not worth an error */ }
  },
}));

export const CALL_LABEL = {
  completed: 'Outgoing Call',
  missed: 'No Answer',
  declined: 'Call Declined',
  cancelled: 'Call Cancelled',
  failed: 'Call Failed',
};

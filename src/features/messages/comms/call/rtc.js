// Browser-to-browser voice for Comms calls. Staff ring the patient's page
// (/#/p/<token>); both sides talk peer to peer over WebRTC. Signalling (ring,
// accept, offer/answer, ICE candidates, hang up) rides a Supabase Realtime
// broadcast channel named after the patient's token, so no call server or
// phone number is involved.
//
// Flow: staff `ring` → patient `accept` → staff `offer` → patient `answer`,
// with `ice` both ways; either side may `hangup`; patient may `decline`;
// staff `cancel` a ring that wasn't answered.
//
// Only public STUN is configured. That connects most home and office
// networks; a few strict corporate NATs would need a TURN relay.

import { supabase } from '../../../../lib/supabase';

export const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export const RING_TIMEOUT_MS = 30000;

/** Join the signalling channel for a patient token. Resolves once subscribed. */
export function openSignal(token, onEvent) {
  const channel = supabase.channel(`pcall-${token}`, { config: { broadcast: { self: false, ack: false } } });
  ['ring', 'accept', 'decline', 'offer', 'answer', 'ice', 'hangup', 'cancel'].forEach((event) => {
    channel.on('broadcast', { event }, ({ payload }) => onEvent(event, payload || {}));
  });
  const ready = new Promise((resolve) => {
    channel.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); });
  });
  return {
    ready,
    send: (event, payload) => channel.send({ type: 'broadcast', event, payload }),
    close: () => supabase.removeChannel(channel),
  };
}

export async function getMic() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use a microphone.');
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch {
    throw new Error('Microphone access was blocked. Allow it in the browser to make calls.');
  }
}

/** A peer connection wired to send ICE over `signal` and play the far end. */
export function createPeer({ stream, signal, callId, onState }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  stream.getTracks().forEach(t => pc.addTrack(t, stream));
  const audio = new Audio();
  audio.autoplay = true;
  pc.ontrack = (e) => {
    audio.srcObject = e.streams[0];
    audio.play().catch(() => {});
  };
  pc.onicecandidate = (e) => {
    if (e.candidate) signal.send('ice', { callId, candidate: e.candidate.toJSON() });
  };
  pc.onconnectionstatechange = () => onState?.(pc.connectionState);
  // Candidates can beat the offer/answer they belong to; hold them until the
  // far end's description is set.
  const pending = [];
  return {
    pc,
    addIce: (candidate) => {
      if (pc.remoteDescription) pc.addIceCandidate(candidate).catch(() => {});
      else pending.push(candidate);
    },
    setRemote: async (sdp) => {
      await pc.setRemoteDescription(sdp);
      pending.splice(0).forEach(c => pc.addIceCandidate(c).catch(() => {}));
    },
    close: () => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      audio.srcObject = null;
    },
  };
}

export const stopStream = (stream) => stream?.getTracks().forEach(t => t.stop());

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h) return `${h}h ${m % 60}m`;
  return m ? `${m}m ${s % 60}s` : `${s}s`;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { openSignal, getMic, createPeer, stopStream } from '../messages/comms/call/rtc';

/**
 * The patient side of a browser call: listens on the patient's token for
 * a ring from their care team, and answers (or declines) it.
 * state: idle | incoming | connecting | live | ended
 */
export function usePatientCallee(token) {
  const [state, setState] = useState({ status: 'idle', from: '', connectedAt: null, muted: false, error: null });
  const session = useRef({ signal: null, peer: null, stream: null, callId: null });

  const teardown = useCallback(() => {
    const s = session.current;
    s.peer?.close();
    stopStream(s.stream);
    session.current = { ...s, peer: null, stream: null, callId: null, earlyIce: [] };
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const signal = openSignal(token, async (event, payload) => {
      const s = session.current;
      if (event === 'ring') {
        if (s.callId) return; // already on a call
        session.current = { ...s, callId: payload.callId };
        setState({ status: 'incoming', from: payload.from || 'Your care team', connectedAt: null, muted: false, error: null });
        return;
      }
      if (payload.callId !== s.callId) return;
      if (event === 'ice' && !s.peer) {
        // Arrived ahead of the offer: keep it for the peer.
        (session.current.earlyIce ||= []).push(payload.candidate);
        return;
      }
      if (event === 'offer') {
        const peer = createPeer({
          stream: s.stream, signal, callId: s.callId,
          onState: (st) => {
            if (st === 'connected') setState(x => ({ ...x, status: 'live', connectedAt: x.connectedAt || Date.now() }));
            if (st === 'failed') { teardown(); setState(x => ({ ...x, status: 'ended', error: 'The call dropped.' })); }
          },
        });
        session.current.peer = peer;
        (session.current.earlyIce || []).splice(0).forEach(c => peer.addIce(c));
        await peer.setRemote(payload.sdp);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        signal.send('answer', { callId: s.callId, sdp: answer });
      } else if (event === 'ice') {
        s.peer?.addIce(payload.candidate);
      } else if (event === 'cancel' || event === 'hangup') {
        teardown();
        setState(x => ({ ...x, status: event === 'cancel' ? 'idle' : 'ended' }));
      }
    });
    session.current.signal = signal;
    return () => { teardown(); signal.close(); };
  }, [token, teardown]);

  const accept = async () => {
    const s = session.current;
    setState(x => ({ ...x, status: 'connecting' }));
    try {
      session.current.stream = await getMic();
      s.signal.send('accept', { callId: s.callId });
    } catch (err) {
      s.signal.send('decline', { callId: s.callId });
      teardown();
      setState(x => ({ ...x, status: 'ended', error: err.message }));
    }
  };

  const decline = () => {
    const s = session.current;
    s.signal?.send('decline', { callId: s.callId });
    teardown();
    setState(x => ({ ...x, status: 'idle' }));
  };

  const hangup = () => {
    const s = session.current;
    s.signal?.send('hangup', { callId: s.callId });
    teardown();
    setState(x => ({ ...x, status: 'ended' }));
  };

  const toggleMute = () => {
    const muted = !state.muted;
    session.current.stream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    setState(x => ({ ...x, muted }));
  };

  const dismiss = () => setState(x => ({ ...x, status: 'idle', error: null }));

  return { ...state, accept, decline, hangup, toggleMute, dismiss };
}

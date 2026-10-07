import { useEffect, useRef } from 'react';

/**
 * Inactivity reminder for the CCM timer: after a stretch with no activity
 * while the timer runs, the timer asks whether the user is still working on
 * the patient (Continue / Pause Timer / Don't remind me again). It never
 * changes the timer on its own.
 *
 * The threshold is meant to be set per customer account. In this prototype
 * it's 30 minutes for every patient, except one demo patient with a short
 * threshold so the reminder can be shown live: Victor Hargrove (Fold ID
 * 10042), enrolled in CCM, at 30 seconds.
 */
export const DEFAULT_INACTIVITY_SECONDS = 30 * 60;

// The live-demo patient: a 30-second threshold, and the timer starts
// floating bottom-right where the reminder has room.
export const INACTIVITY_DEMO_PATIENT_ID = '10042';
const DEMO_INACTIVITY_SECONDS = 30;

export const isInactivityDemoPatient = (patientId) => String(patientId) === INACTIVITY_DEMO_PATIENT_ID;

export const inactivitySecondsFor = (patientId) => {
  if (patientId == null) return null;
  return isInactivityDemoPatient(patientId) ? DEMO_INACTIVITY_SECONDS : DEFAULT_INACTIVITY_SECONDS;
};

/** "30 seconds", "1 minute", "10 minutes". */
export function formatIdleDuration(seconds) {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  const m = Math.round(seconds / 60);
  return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
}

// What counts as activity: mouse movement and clicks, keys, scrolling, touch.
const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];

/**
 * Calls `onIdle` once `seconds` pass with no activity, while `enabled`.
 * Compares timestamps on a 1s check rather than counting down, so a
 * throttled background tab still measures real time. `resetKey` restarts the
 * count (e.g. after Continue).
 */
export function useInactivity({ enabled, seconds, onIdle, resetKey }) {
  const lastActivity = useRef(0); // set when listening starts
  const idleCb = useRef(onIdle);
  useEffect(() => { idleCb.current = onIdle; });

  useEffect(() => {
    if (!enabled || !seconds) return undefined;
    lastActivity.current = Date.now();
    const mark = () => { lastActivity.current = Date.now(); };
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, mark, { capture: true, passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current >= seconds * 1000) idleCb.current?.();
    }, 1000);
    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, mark, { capture: true }));
    };
  }, [enabled, seconds, resetKey]);
}

// One audio context for the page, made on first use.
let audioCtx = null;

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'];
let armed = false;

/**
 * Safari only lets audio start during a click or keypress, and the alert
 * plays later, on its own. So on the user's first interaction the audio
 * context is created and started (with a silent blip, which older iOS
 * needs), and the alert reuses it afterwards. Chrome, Edge and Firefox need
 * none of this, but it does no harm there. Safe to call more than once.
 */
export function armAlertAudio() {
  if (armed || typeof window === 'undefined') return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  armed = true;
  const unlock = () => {
    try {
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const blip = audioCtx.createBufferSource();
      blip.buffer = audioCtx.createBuffer(1, 1, 22050);
      blip.connect(audioCtx.destination);
      blip.start(0);
    } catch {
      // Stays silent; the reminder still shows.
    }
    UNLOCK_EVENTS.forEach(ev => window.removeEventListener(ev, unlock, true));
  };
  UNLOCK_EVENTS.forEach(ev => window.addEventListener(ev, unlock, true));
}

/**
 * A short alert for when the reminder first appears: three quick, bright
 * notes (high, higher, high), urgent enough to pull attention back without
 * being harsh. Synthesised with the Web Audio API, so no sound file ships.
 * Browsers only let a page make sound after the user has interacted with
 * it (Safari: started during that interaction, see armAlertAudio); if it
 * isn't allowed yet, this stays silent.
 */
export function playAlertChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    const now = audioCtx.currentTime;
    // [frequency Hz, start offset s]: A5, C#6, A5.
    [[880, 0], [1108.73, 0.14], [880, 0.28]].forEach(([freq, offset]) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      // Triangle is brighter than a sine, so it cuts through; short notes
      // with a fast decay read as an alert rather than a chime.
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {
    // Sound is a nicety; the reminder still shows without it.
  }
}

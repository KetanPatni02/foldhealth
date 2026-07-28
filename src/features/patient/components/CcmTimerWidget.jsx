import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { useAppStore } from '../../../store/useAppStore';
import { CCM_ACTIVITY_TYPES, secondsToTime } from '../data/ccmBillingMock';
import styles from './CcmTimerWidget.module.css';

// Persistent floating timer for the CCM program. State machine:
//   idle     — 00:00, only Start visible
//   running  — ticks every 500ms, Pause + Stop visible
//   paused   — frozen, Resume + Stop visible
//   stopped  — small form to classify the session, Save persists it
const START_POS = { right: 16, bottom: 16 };
const DRAG_GHOST_CLASS = 'ccm-timer-dragging';

function activityId() {
  // Not using crypto/uuid to keep the file dependency-free — a stamped
  // random slug is enough for row uniqueness.
  return `act-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function CcmTimerWidget({ program }) {
  const patientId = useAppStore(s => s.selectedPatientId);
  const periods = useAppStore(s => s.ccmBillingPeriodsByPatient[patientId]);
  const addCcmBillableActivity = useAppStore(s => s.addCcmBillableActivity);
  const currentPeriod = periods && periods[0];

  const [phase, setPhase] = useState('idle'); // idle | running | paused | classifying
  const [elapsed, setElapsed] = useState(0);
  const [activityType, setActivityType] = useState(CCM_ACTIVITY_TYPES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState(START_POS);

  const startedAtRef = useRef(null);
  const accumulatedRef = useRef(0);
  const rafRef = useRef(null);

  // Tick using performance.now → avoids drift a setInterval would accumulate.
  const tick = useCallback(() => {
    if (startedAtRef.current == null) return;
    const now = performance.now();
    setElapsed(Math.floor((accumulatedRef.current + (now - startedAtRef.current)) / 1000));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const start = () => {
    startedAtRef.current = performance.now();
    setPhase('running');
    rafRef.current = requestAnimationFrame(tick);
  };
  const pause = () => {
    if (startedAtRef.current != null) {
      accumulatedRef.current += performance.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    setPhase('paused');
  };
  const resume = () => {
    startedAtRef.current = performance.now();
    setPhase('running');
    rafRef.current = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (startedAtRef.current != null) {
      accumulatedRef.current += performance.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    setPhase('classifying');
  };
  const reset = () => {
    accumulatedRef.current = 0;
    startedAtRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
    setDescription('');
    setActivityType(CCM_ACTIVITY_TYPES[0]);
    setPhase('idle');
  };

  const persist = async () => {
    if (!currentPeriod || elapsed <= 0) { reset(); return; }
    setSaving(true);
    await addCcmBillableActivity({
      id: activityId(),
      periodId: currentPeriod.id,
      patientId,
      activityType,
      description: description.trim(),
      durationSeconds: elapsed,
      loggedBy: 'You',
      loggedByInitials: 'Y',
      occurredAt: new Date().toISOString(),
      isUnlogged: false,
    });
    setSaving(false);
    reset();
  };

  // ── Drag ─────────────────────────────────────────────────────────────
  const dragOriginRef = useRef(null);
  const onDragPointerDown = (e) => {
    if (phase === 'classifying') return; // Don't drag while editing the form.
    e.preventDefault();
    const handle = e.currentTarget;
    const { pointerId } = e;
    try { handle.setPointerCapture(pointerId); } catch { /* ignore */ }
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPos = pos;
    dragOriginRef.current = { startClientX, startClientY, startPos };
    document.body.classList.add(DRAG_GHOST_CLASS);

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      const nextRight = Math.max(8, startPos.right - dx);
      const nextBottom = Math.max(8, startPos.bottom - dy);
      setPos({ right: nextRight, bottom: nextBottom });
    };
    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      try { handle.releasePointerCapture(pointerId); } catch { /* ignore */ }
      document.body.classList.remove(DRAG_GHOST_CLASS);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  // Only render the widget once the CCM program has an active billing
  // period — otherwise there's nothing to attach the entry to.
  if (!currentPeriod) return null;

  return (
    <div
      className={`${styles.widget} ${phase === 'classifying' ? styles.widgetForm : ''}`}
      style={{ right: pos.right, bottom: pos.bottom }}
    >
      <button
        type="button"
        className={styles.dragHandle}
        onPointerDown={onDragPointerDown}
        aria-label="Drag timer"
      >
        <Icon name="solar:menu-dots-linear" size={14} color="var(--neutral-300)" />
      </button>

      {phase !== 'classifying' ? (
        <>
          <span className={styles.dot} data-phase={phase} aria-hidden="true" />
          <span className={styles.time}>{secondsToTime(elapsed)}</span>
          {phase === 'idle' && (
            <Button variant="primary" size="S" leadingIcon="solar:play-linear" onClick={start}>
              Start
            </Button>
          )}
          {phase === 'running' && (
            <>
              <Button variant="tertiary" size="S" leadingIcon="solar:pause-linear" onClick={pause}>
                Pause
              </Button>
              <Button variant="ghost" size="S" leadingIcon="solar:stop-linear" onClick={stop}>
                Stop
              </Button>
            </>
          )}
          {phase === 'paused' && (
            <>
              <Button variant="primary" size="S" leadingIcon="solar:play-linear" onClick={resume}>
                Resume
              </Button>
              <Button variant="ghost" size="S" leadingIcon="solar:stop-linear" onClick={stop}>
                Stop
              </Button>
            </>
          )}
        </>
      ) : (
        <div className={styles.form}>
          <div className={styles.formHead}>
            <span className={styles.formTitle}>Log {secondsToTime(elapsed)} mins</span>
            <ActionButton icon="solar:close-linear" size="S" tooltip="Discard" onClick={reset} />
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Activity</span>
            <Select
              options={CCM_ACTIVITY_TYPES.map(t => ({ value: t, label: t }))}
              value={activityType}
              onChange={setActivityType}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Notes</span>
            <Textarea
              placeholder="What did you work on?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </label>
          <div className={styles.formActions}>
            <Button variant="ghost" size="S" onClick={reset} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="S" onClick={persist} disabled={saving || elapsed === 0}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

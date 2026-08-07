import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { useAppStore } from '../../../store/useAppStore';
import { CCM_ACTIVITY_TYPES, secondsToTime } from '../data/ccmBillingMock';
import styles from './CcmTimerWidget.module.css';

// Time Tracker Control workflow (Time Tracker Control standalone.html):
//   idle     → grey chip, Start + Log
//   running  → green chip + pulse dot, Pause + Log (disabled)
//   paused   → green chip, Resume + Reset + Log
//   logged   → brief confirmation after save, then auto-restart
//   classifying → log form (app extension — opened via Log)
//
// Timer auto-starts when a patient profile opens.
const START_POS = { right: 16, bottom: 16 };
const DRAG_GHOST_CLASS = 'ccm-timer-dragging';
const LOGGED_FEEDBACK_MS = 1600;

function activityId() {
  return `act-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function CcmTimerWidget() {
  const patientId = useAppStore(s => s.selectedPatientId);
  const periods = useAppStore(s => s.ccmBillingPeriodsByPatient[patientId]);
  const fetchCcmBilling = useAppStore(s => s.fetchCcmBilling);
  const addCcmBillableActivity = useAppStore(s => s.addCcmBillableActivity);
  const currentPeriod = periods && periods[0];

  const [mode, setMode] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [activityType, setActivityType] = useState(CCM_ACTIVITY_TYPES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState(START_POS);

  const startedAtRef = useRef(null);
  const accumulatedRef = useRef(0);
  const rafRef = useRef(null);
  const loggedTimeoutRef = useRef(null);
  const autoStartedForRef = useRef(null);

  const isIdle = mode === 'idle';
  const isRunning = mode === 'running';
  const isPaused = mode === 'paused';
  const isLogged = mode === 'logged';
  const isClassifying = mode === 'classifying';
  const chipIdle = isIdle;
  const chipActive = !isIdle && !isClassifying;
  const canLog = (isIdle || isPaused) && !isClassifying;
  const logDisabled = isRunning || isLogged || isClassifying;

  useEffect(() => {
    if (!patientId) return;
    if (periods == null) fetchCcmBilling(patientId);
  }, [patientId, periods, fetchCcmBilling]);

  const tick = useCallback(() => {
    if (startedAtRef.current == null) return;
    const now = performance.now();
    setElapsed(Math.floor((accumulatedRef.current + (now - startedAtRef.current)) / 1000));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTick = useCallback(() => {
    if (startedAtRef.current != null) {
      accumulatedRef.current += performance.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
  }, []);

  const startTick = useCallback(() => {
    startedAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const restartTimer = useCallback(() => {
    stopTick();
    accumulatedRef.current = 0;
    setElapsed(0);
    setDescription('');
    setActivityType(CCM_ACTIVITY_TYPES[0]);
    startTick();
    setMode('running');
  }, [startTick, stopTick]);

  // Auto-start whenever the patient profile (or billing period) opens.
  useEffect(() => {
    if (!patientId || !currentPeriod) return;
    const key = `${patientId}:${currentPeriod.id}`;
    if (autoStartedForRef.current === key) return;
    autoStartedForRef.current = key;
    restartTimer();
  }, [patientId, currentPeriod, restartTimer]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(loggedTimeoutRef.current);
  }, []);

  const onPrimary = () => {
    if (isIdle || isPaused) {
      startTick();
      setMode('running');
      return;
    }
    if (isRunning) {
      stopTick();
      setMode('paused');
    }
  };

  const onReset = () => {
    restartTimer();
  };

  const onLog = () => {
    if (logDisabled) return;
    stopTick();
    setMode('classifying');
  };

  const discardClassifying = () => {
    if (elapsed > 0) {
      setMode('paused');
    } else {
      restartTimer();
    }
  };

  const persist = async () => {
    if (!currentPeriod || elapsed <= 0) {
      restartTimer();
      return;
    }
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
    stopTick();
    setMode('logged');
    clearTimeout(loggedTimeoutRef.current);
    loggedTimeoutRef.current = setTimeout(() => {
      restartTimer();
    }, LOGGED_FEEDBACK_MS);
  };

  // ── Drag ─────────────────────────────────────────────────────────────
  const onDragPointerDown = (e) => {
    if (isClassifying) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const { pointerId } = e;
    try { handle.setPointerCapture(pointerId); } catch { /* ignore */ }
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startPos = pos;
    document.body.classList.add(DRAG_GHOST_CLASS);

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      setPos({
        right: Math.max(8, startPos.right - dx),
        bottom: Math.max(8, startPos.bottom - dy),
      });
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

  if (!currentPeriod) return null;

  return (
    <div className={styles.wrap} style={{ right: pos.right, bottom: pos.bottom }}>
      {isClassifying && (
        <div className={styles.formPanel}>
          <div className={styles.formHead}>
            <span className={styles.formTitle}>Log {secondsToTime(elapsed)}</span>
            <ActionButton icon="solar:close-linear" size="S" tooltip="Discard" onClick={discardClassifying} />
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
            <Button variant="ghost" size="S" onClick={discardClassifying} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="S" onClick={persist} disabled={saving || elapsed === 0}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <div className={styles.control}>
        <button
          type="button"
          className={styles.dragHandle}
          onPointerDown={onDragPointerDown}
          aria-label="Drag timer"
          title="Drag to reorder"
        >
          <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" aria-hidden="true">
            <circle cx="2" cy="2" r="1.3" />
            <circle cx="6" cy="2" r="1.3" />
            <circle cx="2" cy="7" r="1.3" />
            <circle cx="6" cy="7" r="1.3" />
            <circle cx="2" cy="12" r="1.3" />
            <circle cx="6" cy="12" r="1.3" />
          </svg>
        </button>

        <div className={styles.chipWrap}>
          {chipIdle && (
            <div className={styles.chipIdle}>
              <span className={`${styles.chipTime} ${styles.chipTimeIdle}`}>{secondsToTime(elapsed)}</span>
            </div>
          )}
          {chipActive && (
            <div className={styles.chipActive}>
              {isRunning && <span className={styles.chipDot} aria-hidden="true" />}
              <span className={`${styles.chipTime} ${styles.chipTimeActive}`}>{secondsToTime(elapsed)}</span>
            </div>
          )}
        </div>

        {!isLogged && !isClassifying && (
          <button type="button" className={styles.segmentBtn} onClick={onPrimary}>
            {isIdle && (
              <>
                <Icon name="solar:play-circle-linear" size={17} color="var(--primary-300)" />
                <span className={`${styles.segmentLabel} ${styles.segmentStart}`}>Start</span>
              </>
            )}
            {isRunning && (
              <>
                <Icon name="solar:pause-circle-linear" size={16} color="var(--neutral-400)" />
                <span className={`${styles.segmentLabel} ${styles.segmentPause}`}>Pause</span>
              </>
            )}
            {isPaused && (
              <>
                <Icon name="solar:play-linear" size={15} color="var(--status-success)" />
                <span className={`${styles.segmentLabel} ${styles.segmentResume}`}>Resume</span>
              </>
            )}
          </button>
        )}

        {isPaused && !isClassifying && (
          <button type="button" className={styles.resetBtn} onClick={onReset} title="Reset timer" aria-label="Reset timer">
            <Icon name="solar:restart-linear" size={16} color="currentColor" />
          </button>
        )}

        {isLogged && (
          <div className={styles.loggedBadge}>
            <Icon name="solar:check-circle-linear" size={16} color="var(--status-success)" />
            <span className={styles.loggedLabel}>Logged</span>
          </div>
        )}

        {canLog ? (
          <button type="button" className={styles.logBtn} onClick={onLog}>
            <Icon name="solar:add-circle-linear" size={16} color="var(--neutral-0)" />
            <span className={styles.logBtnLabel}>Log</span>
          </button>
        ) : (
          <div className={styles.logBtnDisabled} aria-disabled="true">
            <Icon name="solar:add-circle-linear" size={16} color="var(--neutral-200)" />
            <span className={styles.logBtnLabel}>Log</span>
          </div>
        )}
      </div>
    </div>
  );
}

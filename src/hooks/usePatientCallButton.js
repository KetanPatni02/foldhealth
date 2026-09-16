import { useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { worklistMemberCallId } from '../lib/patientCall';

export function resolveCallTargetId(target) {
  if (!target) return null;
  if (typeof target === 'string' || typeof target === 'number') return String(target);
  return worklistMemberCallId(target);
}

/**
 * Returns a ref for the call trigger and `openCall` to show CallPopover.
 * `callTarget` may be a patient id or a worklist row ({ id, patientId }).
 */
export function usePatientCallButton(callTarget) {
  const callBtnRef = useRef(null);
  const openCallPopover = useAppStore((s) => s.openCallPopover);
  const openCall = useCallback((e) => {
    e?.stopPropagation?.();
    const id = resolveCallTargetId(callTarget);
    if (id) openCallPopover(id, callBtnRef);
  }, [callTarget, openCallPopover]);
  return { callBtnRef, openCall };
}

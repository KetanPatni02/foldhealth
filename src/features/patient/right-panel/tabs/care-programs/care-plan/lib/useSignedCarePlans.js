import { useMemo } from 'react';
import { useAppStore } from '../../../../../../../store/useAppStore';
import { mergeSignedWithLive } from './carePlanDraft';

/**
 * Every signed plan in the store, keyed like patientCarePlans, each showing the
 * progress made on it since it was signed. What surfaces outside the care plan
 * editor read; a plan that was never signed has no entry.
 */
export function useSignedCarePlans() {
  const signed = useAppStore(s => s.patientSignedCarePlans);
  const live = useAppStore(s => s.patientCarePlans);
  return useMemo(() => {
    const out = {};
    for (const [key, slice] of Object.entries(signed || {})) out[key] = mergeSignedWithLive(slice, live?.[key]);
    return out;
  }, [signed, live]);
}

/** One signed plan, as useSignedCarePlans sees it. */
export function useSignedCarePlan(key) {
  const signed = useAppStore(s => (key ? s.patientSignedCarePlans[key] : null));
  const live = useAppStore(s => (key ? s.patientCarePlans[key] : null));
  return useMemo(() => mergeSignedWithLive(signed, live), [signed, live]);
}

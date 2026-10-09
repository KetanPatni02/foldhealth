import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../../../../../../store/useAppStore';
import { carePlanUnsignedChanges, isFullSnapshot } from './carePlanDraft';
import { carePlanHasChangesSinceSign, isCarePlanSigned } from './carePlanSignState';

/**
 * Where a plan's draft stands against its latest signed version:
 * `signed`, `latestVersion`, the `changes` not yet signed, `hasUnsignedChanges`,
 * and whether the draft can be discarded (the signed version holds a full
 * snapshot). A version signed before full snapshots cannot show barrier or
 * template changes, so for those the edit timestamps still decide whether
 * anything is unsigned.
 */
export function useCarePlanDraftState(patientId, programId) {
  const key = patientId && programId ? `${patientId}::${programId}` : null;
  const slice = useAppStore(s => (key ? s.patientCarePlans[key] : null));
  const versions = useAppStore(s => (key ? s.patientCarePlanVersions[key] : undefined));
  const templates = useAppStore(s => s.carePlanTemplates);
  const fetchCarePlanVersions = useAppStore(s => s.fetchCarePlanVersions);

  useEffect(() => {
    if (key && versions === undefined) fetchCarePlanVersions(patientId, programId);
  }, [key, versions, patientId, programId, fetchCarePlanVersions]);

  return useMemo(() => {
    const signed = isCarePlanSigned(slice?.plan);
    const latestVersion = versions?.[0] || null;
    if (!signed || !latestVersion) {
      return { signed, latestVersion, changes: [], partial: false, hasUnsignedChanges: false, canDiscard: false };
    }
    const templateName = id => (templates || []).find(t => String(t.id) === String(id))?.name || '';
    const { changes, partial } = carePlanUnsignedChanges(slice, latestVersion, { templateName });
    return {
      signed,
      latestVersion,
      changes,
      partial,
      hasUnsignedChanges: changes.length > 0 || (partial && carePlanHasChangesSinceSign(slice)),
      canDiscard: changes.length > 0 && isFullSnapshot(latestVersion.snapshot),
    };
  }, [slice, versions, templates]);
}

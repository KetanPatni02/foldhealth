import { useEffect } from 'react';
import { useAppStore } from '../../../../../../../store/useAppStore';

/** Load plan data, library, template reconciliation, and share-request cleanup. */
export function useCarePlanViewFetchEffects({
  patientId,
  program,
  live,
  libraryGoals,
  fetchPatientCarePlan,
  fetchCarePlanLinks,
  refreshCarePlanDuplicates,
  fetchCarePlanLibrary,
  syncAppliedCarePlanTemplates,
  repairCarePlanGoalLinks,
  clearCarePlanShareRequest,
}) {
  useEffect(() => {
    if (patientId && program?.id) {
      fetchPatientCarePlan(patientId, program.id);
      fetchCarePlanLinks(patientId, program.id);
      refreshCarePlanDuplicates(patientId, program);
    }
  }, [patientId, program?.id, fetchPatientCarePlan, fetchCarePlanLinks, refreshCarePlanDuplicates]); // eslint-disable-line react-hooks/exhaustive-deps -- program object is stable by id

  useEffect(() => { fetchCarePlanLibrary?.(); }, [fetchCarePlanLibrary]);

  // The Comprehensive view can seed a partial copy of the plan before the full
  // fetch lands; reconciling against that copy races the fetch and leaves the
  // rows it inserts in the list twice.
  const fullyLoaded = useAppStore(s => !!(patientId && program?.id && s.patientCarePlanLoadedFor[`${patientId}::${program.id}`]));

  useEffect(() => {
    if (!patientId || !program?.id || !fullyLoaded || !live?.plan || !libraryGoals?.length) return;
    // Once signed, the plan is what was signed: re-applying templates here
    // would bring back items a clinician removed and show them as unsigned
    // changes nobody made.
    if (live.plan.signedAt) return;
    (async () => {
      await syncAppliedCarePlanTemplates(patientId, program);
      await repairCarePlanGoalLinks(patientId, program);
    })();
  }, [patientId, program?.id, fullyLoaded, live?.plan?.id, libraryGoals?.length]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per plan, guarded in the store

  useEffect(() => () => clearCarePlanShareRequest(), [clearCarePlanShareRequest]);
}

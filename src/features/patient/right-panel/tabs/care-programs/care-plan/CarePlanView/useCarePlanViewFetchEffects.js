import { useEffect } from 'react';

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

  useEffect(() => {
    if (!patientId || !program?.id || !live?.plan || !libraryGoals?.length) return;
    (async () => {
      await syncAppliedCarePlanTemplates(patientId, program);
      await repairCarePlanGoalLinks(patientId, program);
    })();
  }, [patientId, program?.id, live?.plan?.id, libraryGoals?.length]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per plan, guarded in the store

  useEffect(() => () => clearCarePlanShareRequest(), [clearCarePlanShareRequest]);
}

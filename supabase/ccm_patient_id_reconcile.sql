-- Reconcile ccm_worklist_members.patient_id with the patients table.
--
-- Background: the CCM worklist seed shipped one row (Annette Brave) with a
-- patient_id pointing at 'hcc-42', which is an HCC-worklist row id, not a
-- patients-table row. Clicking "View Full Profile" from CCM's quick view
-- therefore opened the wrong person (Devon Alexander — hcc-42's actual
-- occupant). All other CCM rows already have patient_id = NULL, which the
-- app now resolves through the ccmWorklistMembers store slice
-- (see src/features/patient/PatientDetailView.jsx).
--
-- Fix: null out any ccm patient_id that doesn't reference a real patients
-- row. Idempotent — safe to re-run.

UPDATE ccm_worklist_members
   SET patient_id = NULL
 WHERE patient_id IS NOT NULL
   AND patient_id NOT IN (SELECT id FROM patients);

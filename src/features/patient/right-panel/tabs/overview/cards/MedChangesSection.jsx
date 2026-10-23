import { useEffect, useMemo } from 'react';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { Badge } from '../../../../../../components/Badge/Badge';
import { useAppStore } from '../../../../../../store/useAppStore';
import { CappedRows } from './CappedRows';
import { medChangesSince, programContext } from './medChanges';
import styles from './overviewCards.module.css';

const EMPTY = [];
const fmt = d => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

/**
 * Medications added or stopped since the current program began (the program
 * the user last worked in, else the earliest open one), from the patient's
 * medication records. Renders nothing without a program start date.
 */
export function MedChangesSection({ patientId }) {
  const programs = useAppStore(s => s.careProgramsByPatient[patientId]) || EMPTY;
  const fetchCareProgramsForPatient = useAppStore(s => s.fetchCareProgramsForPatient);
  const meds = useAppStore(s => s.patientMedications[patientId]) || EMPTY;
  const fetchPatientMedications = useAppStore(s => s.fetchPatientMedications);
  const lastKey = useAppStore(s => s.panelLayouts['care-program-context']?.key || null);

  useEffect(() => {
    if (!patientId) return;
    fetchCareProgramsForPatient(patientId);
    fetchPatientMedications(patientId);
  }, [patientId, fetchCareProgramsForPatient, fetchPatientMedications]);

  const program = useMemo(() => programContext(programs, lastKey), [programs, lastKey]);
  const changes = useMemo(() => (program ? medChangesSince(meds, program.startDate) : EMPTY), [meds, program]);
  if (!program) return null;

  return (
    <div className={styles.medChanges}>
      <h4 className={styles.sectionLabel}>Since {program.code} start · {program.startDate}</h4>
      {changes.length === 0 ? (
        <p className={styles.empty}>No medication changes since {program.code} started.</p>
      ) : (
        <CappedRows
          items={changes}
          render={c => (
            <PanelSectionItem
              key={`${c.med.id}-${c.kind}`}
              inset
              title={c.med.name}
              meta={[fmt(c.date), c.reason]}
              trailing={(
                <span className={styles.statusSlotWide}>
                  <Badge tone={c.kind === 'Added' ? 'success' : 'grey'} size="S" label={c.kind} />
                </span>
              )}
            />
          )}
        />
      )}
    </div>
  );
}

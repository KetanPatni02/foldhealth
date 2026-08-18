import { useMemo } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Button } from '../../components/Button/Button';
import { useAppStore } from '../../store/useAppStore';
import { AssessmentFormView } from '../patient/right-panel/tabs/care-programs/program-detail/steps/AssessmentFormView/AssessmentFormView';
import { INSTRUMENTS, instantiateInstrument } from '../forms/builder/validatedInstruments';
import styles from './AssessmentDrawer.module.css';

const PHQ9_FORM_NAME = 'PHQ-9';
const PHQ9_TITLE = 'PHQ-9 (Patient Health Questionnaire-9)';

// Built once — instantiateInstrument mints unique linkIds, so a stable
// fallback keeps AssessmentFormView's answers keyed to the same fields
// across remounts of the drawer.
const PHQ9_FALLBACK = (() => {
  const inst = INSTRUMENTS.find(i => i.key === 'phq9');
  if (!inst) return null;
  const { field, score, criticalTriggers } = instantiateInstrument(inst);
  return {
    name: PHQ9_TITLE,
    schema: { items: [field] },
    scoring: { scores: [score], criticalTriggers },
  };
})();

/**
 * TOC queue assessment drawer. Same PatientBanner + AssessmentFormView the
 * Care Programs program window uses, framed with the Figma "Patient
 * Assessment" header (title, sent/filled meta, print + resend).
 */
export function AssessmentDrawer() {
  const patientId = useAppStore(s => s.assessmentDrawerPatientId);
  const close = useAppStore(s => s.closeAssessmentDrawer);
  const patients = useAppStore(s => s.patients);
  const showToast = useAppStore(s => s.showToast);
  const patient = useMemo(
    () => patients.find(p => p.id === patientId) || null,
    [patients, patientId],
  );

  if (!patient) return null;

  return (
    <Drawer
      title="Patient Assessment"
      onClose={close}
      titleStyle={{ color: 'var(--neutral-500)' }}
      bodyClassName={styles.drawerBody}
      banner={
        <PatientBanner
          initials={patient.initials}
          name={patient.name}
          gender={patient.gender}
          age={patient.age}
          memberId={patient.memberId}
        />
      }
    >
      <div className={styles.formHeader}>
        <div className={styles.formHeaderText}>
          <span className={styles.formTitle}>{PHQ9_TITLE}</span>
          <span className={styles.formMeta}>
            Sent by: Robert Fox on 07/11/26 • Filled by: TOC Agent on 08/11/26
          </span>
        </div>
        <div className={styles.formActions}>
          <ActionButton
            icon="solar:printer-linear"
            size="L"
            tooltip="Print"
            tooltipBelow
            onClick={() => window.print()}
          />
          <span className={styles.actionDivider} />
          <Button
            variant="alt"
            size="L"
            onClick={() => showToast('Resend — coming soon')}
          >
            Resend
          </Button>
        </div>
      </div>

      <AssessmentFormView
        formName={PHQ9_FORM_NAME}
        fallbackForm={PHQ9_FALLBACK}
      />
    </Drawer>
  );
}

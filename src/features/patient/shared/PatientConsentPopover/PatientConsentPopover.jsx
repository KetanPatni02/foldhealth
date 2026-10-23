import { useMemo } from 'react';
import { ConsentPopover } from '../../../../components/ConsentPopover/ConsentPopover';
import { useAppStore } from '../../../../store/useAppStore';
import { usePatientConsent } from '../../hooks/usePatientConsent';
import { consentHistory, consentSections } from '../../data/consentDisplay';

/** ConsentPopover for one patient, backed by patient_consents. */
export function PatientConsentPopover({ patientId, pos, onClose }) {
  const openConsentCapture = useAppStore(s => s.openConsentCapture);
  const { consents, programs, loaded } = usePatientConsent(patientId);

  const sections = useMemo(() => consentSections(consents, programs).map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      actionLabel: item.state === 'given' ? 'Update' : 'Capture',
      onAction: () => { onClose(); openConsentCapture(patientId, { scopeType: item.scopeType, scope: item.scope }); },
    })),
  })), [consents, programs, onClose, openConsentCapture, patientId]);

  return (
    <ConsentPopover
      pos={pos}
      onClose={onClose}
      loading={!loaded}
      sections={sections}
      history={consentHistory(consents)}
      onCapture={() => { onClose(); openConsentCapture(patientId); }}
    />
  );
}

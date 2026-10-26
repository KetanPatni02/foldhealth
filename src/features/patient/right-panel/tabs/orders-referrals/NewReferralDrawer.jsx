import { useState } from 'react';
import { Drawer } from '../../../../../components/Drawer/Drawer';
import { Input } from '../../../../../components/Input/Input';
import { Select } from '../../../../../components/Select/Select';
import { Textarea } from '../../../../../components/Textarea/Textarea';
import { UploadDropField } from '../../../../../components/UploadDropField/UploadDropField';
import { MEDICAL_SPECIALTIES } from '../../../../../data/medicalSpecialties';
import { useAppStore } from '../../../../../store/useAppStore';
import { DraftSubmitActions, PriorityField } from './OrderFormParts';
import { runSave } from './ordersViews';
import styles from './OrderForms.module.css';

const SPECIALTY_OPTIONS = MEDICAL_SPECIALTIES.map(s => ({ value: s, label: s }));

/** New Order > Referral: saves to patient_referrals as Draft or Signed & Referred. */
export function NewReferralDrawer({ patientId, onClose }) {
  const createPatientReferral = useAppStore(s => s.createPatientReferral);
  const actorName = useAppStore(s => s.currentActorName());
  const [values, setValues] = useState({ referredTo: '', specialty: '', referredBy: actorName, reason: '', priority: 'Routine', file: null });
  const [saving, setSaving] = useState(false);
  const set = key => value => setValues(v => ({ ...v, [key]: value }));

  const draftReason = values.referredTo.trim() ? undefined : 'Enter who the patient is referred to';
  const submitReason = draftReason
    || (!values.specialty && 'Pick a specialty')
    || (!values.reason.trim() && 'Enter the reason for referral')
    || undefined;
  const save = status => runSave(setSaving, () => createPatientReferral(patientId, {
    ...values,
    referredTo: values.referredTo.trim(),
    referredBy: values.referredBy.trim(),
    reason: values.reason.trim(),
    status,
  }), onClose);

  return (
    <Drawer
      title="New Referral"
      onClose={onClose}
      noCloseDivider
      headerRight={(
        <DraftSubmitActions
          submitLabel="Refer"
          saving={saving}
          draftReason={draftReason}
          submitReason={submitReason}
          onDraft={() => save('Draft')}
          onSubmit={() => save('Signed & Referred')}
        />
      )}
    >
      <div className={styles.form}>
        <div className={styles.row}>
          <Input label="Referred To" required placeholder="Provider name" value={values.referredTo} onChange={e => set('referredTo')(e.target.value)} autoFocus />
          <Select label="Specialty" required searchable options={SPECIALTY_OPTIONS} value={values.specialty} onChange={set('specialty')} placeholder="Select specialty" />
        </div>
        <Input label="Referred By" value={values.referredBy} onChange={e => set('referredBy')(e.target.value)} />
        <Textarea title="Reason for Referral" mandatory rows={3} value={values.reason} onChange={set('reason')} placeholder="Enter reason" />
        <PriorityField name="referral-priority" value={values.priority} onChange={set('priority')} />
        <div className={styles.field}>
          <span className={styles.label}>Attachment</span>
          <UploadDropField onChange={set('file')} />
        </div>
      </div>
    </Drawer>
  );
}

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { RadioOptionGroup } from '@/components/RadioOptionGroup/RadioOptionGroup';
import { DatePicker } from '@/components/DatePicker/DatePicker';
import { useAppStore } from '../../../../../../../store/useAppStore';
import { carePlanKey, templateItems } from '../../../../../../../store/lib/carePlanStoreLib';
import {
  INSTANCE_STATUS, TEMPLATE_RENEWALS, formatInstanceDate, instanceOutcome, renewalOf, templateEndsOn,
} from '../lib/templateRenewal';

/**
 * Adding a template that is already on the plan. Says what each choice will
 * do to this patient's run of it, with the template's own setting picked.
 */
export function ApplyAgainDialog({ template, patientId, program, onClose, onDone }) {
  const slice = useAppStore(s => s.patientCarePlans[carePlanKey(patientId, program.id)]);
  const libraryGoals = useAppStore(s => s.carePlanGoals);
  const renewPatientCarePlanTemplate = useAppStore(s => s.renewPatientCarePlanTemplate);
  const [mode, setMode] = useState(renewalOf(template));
  const [busy, setBusy] = useState(false);

  const run = (slice?.templateInstances || [])
    .find(i => String(i.templateId) === String(template.id) && i.status === 'active');
  // Suggested from the template's longest goal duration; the user can change it.
  const suggestedEnd = templateEndsOn(template, libraryGoals || []);
  const [endsOn, setEndsOn] = useState(suggestedEnd || '');
  const outcome = instanceOutcome(templateItems(template, slice, libraryGoals || []));
  const isDefault = key => (key === renewalOf(template) ? ' (template setting)' : '');

  const extendHint = `${run?.startedAt ? `Keeps the start date (${formatInstanceDate(run.startedAt)})` : 'Keeps the start date'} and moves the end date.`;
  const reinstateHint = `Closes the current run as ${INSTANCE_STATUS[outcome.status].label} `
    + `(${outcome.done} of ${outcome.total} goals and interventions met) and starts a new one today. `
    + 'Its goals, interventions and barriers move to Previous runs.';
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const confirm = async () => {
    setBusy(true);
    const ok = await renewPatientCarePlanTemplate(patientId, program, template.id, mode, endsOn || null);
    setBusy(false);
    if (ok) onDone?.();
    onClose();
  };

  return (
    <ConfirmDialog
      variant="primary"
      align="start"
      icon={TEMPLATE_RENEWALS[mode].icon}
      iconColor="var(--primary-300)"
      title={`Apply "${template.name}" again?`}
      description="It's already on this care plan. Choose what happens to the current run."
      confirmLabel={TEMPLATE_RENEWALS[mode].label}
      loading={busy}
      onCancel={onClose}
      onConfirm={confirm}
    >
      <RadioOptionGroup
        name="apply-again"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'extend', label: `Extend${isDefault('extend')}`, hint: extendHint },
          { value: 'reinstate', label: `Reinstate${isDefault('reinstate')}`, hint: reinstateHint },
        ]}
      />
      <DatePicker
        label={mode === 'extend' ? 'New end date' : 'New run ends'}
        value={endsOn}
        min={todayIso}
        onSelect={setEndsOn}
        helperText={suggestedEnd
          ? `Suggested ${formatInstanceDate(suggestedEnd)}, from the template's longest goal duration.`
          : 'Optional. The template\'s goals have no duration to suggest one from.'}
      />
    </ConfirmDialog>
  );
}

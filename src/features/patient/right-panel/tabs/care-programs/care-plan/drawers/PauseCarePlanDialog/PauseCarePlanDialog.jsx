import { useState } from 'react';
import { ReasonDialog } from '../../../../../../../../components/ReasonDialog/ReasonDialog';
import { DatePicker } from '../../../../../../../../components/DatePicker/DatePicker';
import { Switch } from '../../../../../../../../components/Switch/Switch';
import { PAUSE_REASONS, isoDay, pauseFormProblem, pauseReasonFromLabel } from '../../lib/carePlanPause';
import styles from './PauseCarePlanDialog.module.css';

// "Other" comes from ReasonDialog's free-text choice, so it isn't listed.
const STANDARD_REASONS = PAUSE_REASONS.filter(r => r.value !== 'other').map(r => r.label);

/**
 * Pause a care plan: why (Hospitalized / Traveling / Patient request, or
 * Other in free text), from when, the planned resume date, and whether it
 * resumes on its own then. Submits { reason, note, pausedOn, resumeOn,
 * autoResume } for pauseCarePlan.
 */
export function PauseCarePlanDialog({ onCancel, onSubmit }) {
  const [pausedOn, setPausedOn] = useState(() => isoDay(new Date()));
  const [resumeOn, setResumeOn] = useState('');
  const [autoResume, setAutoResume] = useState(false);
  const problem = pauseFormProblem({ pausedOn, resumeOn, autoResume });

  return (
    <ReasonDialog
      title="Pause Care Plan"
      description="While paused: no cadence, no overdue flags and no automated outreach. Every pause and resume is recorded in the plan's history."
      standardReasons={STANDARD_REASONS}
      confirmLabel="Pause Plan"
      confirmVariant="primary"
      confirmDisabled={!!problem}
      notesPlaceholder="Anything the care team should know about this pause…"
      onCancel={onCancel}
      onSubmit={({ code, freeText }) => onSubmit?.({
        reason: code ? pauseReasonFromLabel(code) : 'other',
        note: freeText,
        pausedOn,
        resumeOn: resumeOn || null,
        autoResume,
      })}
    >
      <div className={styles.dates}>
        <DatePicker label="Pause start date" required value={pausedOn} onSelect={setPausedOn} />
        <DatePicker
          label="Planned resume date"
          value={resumeOn}
          min={pausedOn || undefined}
          onSelect={setResumeOn}
          hasError={!!problem && !!resumeOn}
          helperText={problem && resumeOn ? problem : undefined}
        />
      </div>
      <div className={styles.autoResume}>
        <Switch checked={autoResume} onChange={setAutoResume} label="Auto-resume on the planned resume date" />
        <span className={styles.hint}>
          {autoResume && !resumeOn
            ? 'Set a planned resume date to auto-resume.'
            : 'The plan resumes the first time it’s opened on or after that date.'}
        </span>
      </div>
    </ReasonDialog>
  );
}

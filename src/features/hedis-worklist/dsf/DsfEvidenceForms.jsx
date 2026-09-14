// DSF-A (PHQ-2) and DSF-B (PHQ-9) evidence forms — bespoke measure
// components rendered by the same three CareGapDetail dispatch sites
// that already wire EED / CBP / templated gaps. They plug into the
// existing consolidated Clinical Note engine (`useClinicalNotePanel`)
// via `v.updateGap(code, patch)` and `v.gapState[code]` — no new drawer
// state to plumb through.
//
// Scoring, item text, and interpretation cutoffs are read from the
// shared validated-instruments module through ./dsfScoring so the
// clinical content stays in one source of truth. Verbatim care-plan
// bullets come from ./dsfCarePlans.
import { useEffect, useMemo } from 'react';
// (No side effects here — derived flags like carePlanAcknowledged are
// computed on the read side inside isMandatoryComplete instead of being
// mirrored into the payload.)
import { Alert } from '../../../components/Alert/Alert';
import { Badge } from '../../../components/Badge/Badge';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { CheckboxTick } from '../../../components/CheckboxTick/CheckboxTick';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { getItems, getResponseScale, isPhq2Positive, phq9Branch, totalScore } from './dsfScoring';
import { DSF_CARE_PLANS } from './dsfCarePlans';
import styles from './DsfEvidenceForms.module.css';

// Sample provider roster — production wires this through the tenant's
// staff directory. Sample names include Dr. Dennis per the story.
const DSF_PROVIDERS = [
  { value: 'dr-dennis',   label: 'Dr. Dennis' },
  { value: 'dr-becerra',  label: 'Dr. Becerra' },
  { value: 'dr-yu',       label: 'Dr. Helen Yu' },
  { value: 'np-priya',    label: 'Priya Shah, NP' },
  { value: 'np-lee',      label: 'Jordan Lee, NP' },
];

const LOCATION_OPTIONS = [
  { value: 'telehealth', label: 'Telehealth visit' },
  { value: 'home',       label: 'Home' },
];

// ── Shared primitives ────────────────────────────────────────────────

function FieldStack({ children }) {
  return <div className={styles.fieldStack}>{children}</div>;
}
function FieldLabel({ children, required }) {
  return (
    <div className={styles.fieldLabel}>
      {children}
      {required && <span className={styles.required}>•</span>}
    </div>
  );
}
function FieldError({ children }) {
  return <div className={styles.fieldError}>{children}</div>;
}

// Likert item scored 0..3, one row per instrument item. The parent
// owns state; this component just reads/writes an array of numbers.
function LikertMatrix({ scoreKey, values, onChange, locked }) {
  const items = getItems(scoreKey);
  const scale = getResponseScale(scoreKey);
  const setAt = (idx, val) => {
    if (locked) return;
    const next = Array.isArray(values) ? [...values] : items.map(() => null);
    next[idx] = val;
    onChange(next);
  };
  return (
    <div className={[styles.matrix, locked ? styles.matrixLocked : ''].filter(Boolean).join(' ')}>
      <div className={styles.matrixHeader}>
        <span>Question</span>
        {scale.map(opt => (
          <span key={opt.score} className={styles.matrixCell}>{opt.score}</span>
        ))}
      </div>
      {items.map((item, idx) => (
        <div key={item.code} className={styles.matrixRow}>
          <span className={styles.matrixQuestion}>{item.text}</span>
          {scale.map(opt => (
            <span key={opt.score} className={styles.matrixCell}>
              <RadioButton
                checked={values?.[idx] === opt.score}
                onChange={() => setAt(idx, opt.score)}
                ariaLabel={`${item.text} - ${opt.value}`}
                disabled={locked}
              />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// The Care Plan outcome panel — reused for every DSF branch so the
// bulleted text + "All components of care plan completed" + Outreach
// notes shape is identical everywhere.
function CarePlanOutcomePanel({ title, bullets, allCompleted, onAllCompletedChange, outreachNotes, onOutreachNotesChange }) {
  return (
    <div className={styles.carePlanPanel}>
      <div className={styles.carePlanTitle}>{title}</div>
      <ul className={styles.carePlanBullets}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <div className={styles.carePlanFooter}>
        <button
          type="button"
          role="checkbox"
          aria-checked={!!allCompleted}
          className={styles.carePlanCheckboxRow}
          onClick={() => onAllCompletedChange(!allCompleted)}
        >
          <CheckboxTick checked={!!allCompleted} size={16} />
          <span className={styles.carePlanCheckboxLabel}>
            All components of care plan completed
          </span>
        </button>
        <Textarea
          value={outreachNotes || ''}
          onChange={(e) => onOutreachNotesChange(e.target.value)}
          placeholder="Optional notes from the encounter..."
          rows={3}
        />
      </div>
    </div>
  );
}

// ── DSF-A (PHQ-2) ───────────────────────────────────────────────────

export function DsfaEvidenceForm({ v, data, submitted, onOpenPhq9Gap }) {
  const onUpdate = (patch) => v.updateGap('DSF-A', patch);
  const err = (field) => submitted && !data[field];
  const phq2Values = useMemo(() => {
    const items = getItems('phq2');
    const stored = data.phq2 || {};
    return items.map((_, i) => stored[`item${i + 1}`] ?? null);
  }, [data.phq2]);
  const isHome = data.location === 'home';
  // Consent lives on the note-level shared DOS card (v.audioOnly /
  // v.audioVideo). We surface a hint in this form when Location is
  // Telehealth and neither box is ticked, but the checkboxes themselves
  // are NOT re-rendered here (the shared DOS card owns them).
  const consentSatisfied = isHome || !!v.audioOnly || !!v.audioVideo;
  const bothPhq2Answered = phq2Values.every(v2 => v2 !== null && v2 !== undefined);
  const phq2Total = data.phq2?.totalScore ?? totalScore(phq2Values);
  const positive = isPhq2Positive(phq2Total);

  // Auto-open the DSF-B gap the moment PHQ-2 lands Positive with both
  // items answered. The store's openNativeGap is idempotent (skips the
  // second call for the same code), so it's safe to run on every render
  // that meets the condition — the toast fires only on the first create.
  // Persists a lightweight timestamp on the note payload so the exit
  // dialog can compute the 30-day due date without needing an explicit
  // Save action.
  useEffect(() => {
    if (!bothPhq2Answered || !positive) return;
    const savedAt = data.phq2?.savedAt || new Date().toISOString();
    if (!data.phq2?.savedAt) {
      onUpdate({ phq2: { ...(data.phq2 || {}), savedAt } });
    }
    if (typeof onOpenPhq9Gap === 'function') {
      onOpenPhq9Gap({ savedAt });
    }
    // Intentional narrow deps: we want to trigger on the transition to
    // (bothAnswered && positive), not on unrelated state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothPhq2Answered, positive]);

  return (
    <div className={styles.form}>
      {/* EHR-sync info banner lives on the left pane's NoteContextPane;
          no duplicate needed on the evidence side. */}
      <FieldStack>
        <FieldLabel required>Location</FieldLabel>
        <div className={styles.radioStack}>
          {LOCATION_OPTIONS.map(opt => (
            <RadioButton
              key={opt.value}
              checked={data.location === opt.value}
              onChange={() => onUpdate({ location: opt.value })}
              label={opt.label}
            />
          ))}
        </div>
        {err('location') && <FieldError>Location is required</FieldError>}
      </FieldStack>

      {data.location === 'telehealth' && !consentSatisfied && submitted && (
        <Alert
          tone="warning"
          message="Verbal telehealth consent required. Tick Audio-only or Audio-video visit in the Date of Service card above."
        />
      )}

      <div className={styles.grid2}>
        <FieldStack>
          <FieldLabel required>Performed by</FieldLabel>
          <Select
            options={DSF_PROVIDERS}
            value={data.performedBy}
            onChange={(v2) => onUpdate({ performedBy: v2 })}
            placeholder="Select Provider"
            variant={err('performedBy') ? 'error' : 'default'}
          />
          {err('performedBy') && <FieldError>Provider is required</FieldError>}
        </FieldStack>
        <div className={styles.procedureRow}>
          <span className={styles.procedureLabel}>Procedure Performed</span>
          <span className={styles.procedureValue}>PHQ-2</span>
        </div>
      </div>

      <FieldStack>
        <FieldLabel required>PHQ-2 Score</FieldLabel>
        <LikertMatrix
          scoreKey="phq2"
          values={phq2Values}
          onChange={(next) => onUpdate({
            phq2: { ...(data.phq2 || {}), item1: next[0], item2: next[1] },
          })}
        />
      </FieldStack>

      {bothPhq2Answered && (
        <div className={styles.scoreBlock}>
          <div className={styles.scoreBlockRow}>
            <span className={styles.scoreTotal}>Total: {phq2Total}</span>
            <span
              className={[styles.resultLabel, positive ? styles.resultLabelPositive : styles.resultLabelNegative].join(' ')}
            >
              {positive ? 'Positive for depression' : 'Negative for depression'}
            </span>
          </div>
        </div>
      )}

      {bothPhq2Answered && !positive && (
        <CarePlanOutcomePanel
          title={DSF_CARE_PLANS.phq2Negative.title}
          bullets={DSF_CARE_PLANS.phq2Negative.bullets}
          allCompleted={data.carePlan?.allCompleted}
          onAllCompletedChange={(next) => onUpdate({
            carePlan: { ...(data.carePlan || {}), allCompleted: next },
          })}
          outreachNotes={data.carePlan?.outreachNotes}
          onOutreachNotesChange={(next) => onUpdate({
            carePlan: { ...(data.carePlan || {}), outreachNotes: next },
          })}
        />
      )}
    </div>
  );
}

// ── DSF-B (PHQ-9) ───────────────────────────────────────────────────

export function DsfbEvidenceForm({ v, data, submitted }) {
  const onUpdate = (patch) => v.updateGap('DSF-B', patch);
  const err = (field) => submitted && !data[field];
  const phq9Values = data.phq9?.items || [null, null, null, null, null, null, null, null, null];
  const allAnswered = phq9Values.every(v2 => v2 !== null && v2 !== undefined);
  const phq9Total = data.phq9?.totalScore ?? totalScore(phq9Values);
  const branch = phq9Branch(phq9Total);
  // The shared validated-instruments module splits 15-19 into its own
  // "Moderately severe" band; the story only defines four branches
  // (Minimal / Mild / Moderate / Severe) so the visible badge follows
  // the branch label to stay consistent with the care-plan panel.
  const bandLabel = branch ? branch.charAt(0).toUpperCase() + branch.slice(1) : null;

  // Timestamp the first "all answered" moment so the note payload has a
  // stable savedAt for downstream analytics + the 30-day due-date math.
  // Idempotent — writes once when the item vector first completes.
  useEffect(() => {
    if (!allAnswered) return;
    if (data.phq9?.savedAt) return;
    onUpdate({ phq9: { ...(data.phq9 || {}), totalScore: phq9Total, band: branch, savedAt: new Date().toISOString() } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnswered]);

  // Which care plan block is visible right now, given band + Mild
  // sub-question + Decline standing checkbox. Decline always wins.
  let planKey = null;
  if (data.decline) planKey = 'decline';
  else if (allAnswered && branch === 'minimal') planKey = 'phq9Minimal';
  else if (allAnswered && branch === 'mild' && data.phq9?.subMildAnswer === 'yes') planKey = 'phq9MildYes';
  else if (allAnswered && branch === 'mild' && data.phq9?.subMildAnswer === 'no') planKey = 'phq9MildNo';
  else if (allAnswered && branch === 'moderate') planKey = 'phq9Moderate';
  else if (allAnswered && branch === 'severe') planKey = 'phq9Severe';

  const acknowledged = data.decline || !!data.carePlan?.allCompleted;

  return (
    <div className={styles.form}>
      <FieldStack>
        <FieldLabel required>PHQ-9 Score</FieldLabel>
        <LikertMatrix
          scoreKey="phq9"
          values={phq9Values}
          onChange={(next) => onUpdate({ phq9: { ...(data.phq9 || {}), items: next } })}
          locked={data.decline}
        />
      </FieldStack>

      {allAnswered && !data.decline && (
        <div className={styles.scoreBlock}>
          <div className={styles.scoreBlockRow}>
            <span className={styles.scoreTotal}>Total: {phq9Total}</span>
            {bandLabel && <Badge tone="grey" size="S" label={bandLabel} />}
          </div>
        </div>
      )}

      {allAnswered && !data.decline && branch === 'mild' && (
        <div className={styles.subQuestion}>
          <span className={styles.subQuestionText}>
            Are any of the following present?
            <br />
            Hx of prior depressive episodes, and/or symptoms greater than 3 months
          </span>
          <div className={styles.subQuestionRadios}>
            <RadioButton
              checked={data.phq9?.subMildAnswer === 'yes'}
              onChange={() => onUpdate({ phq9: { ...(data.phq9 || {}), subMildAnswer: 'yes' } })}
              label="Yes"
            />
            <RadioButton
              checked={data.phq9?.subMildAnswer === 'no'}
              onChange={() => onUpdate({ phq9: { ...(data.phq9 || {}), subMildAnswer: 'no' } })}
              label="No"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        role="checkbox"
        aria-checked={!!data.decline}
        className={styles.declineRow}
        onClick={() => onUpdate({ decline: !data.decline })}
      >
        <CheckboxTick checked={!!data.decline} size={16} />
        <span className={styles.declineLabel}>
          Decline Follow-Up
          <span style={{ color: 'var(--neutral-300)', fontWeight: 400, marginLeft: 8 }}>
            Patient declines further evaluation and treatment.
          </span>
        </span>
      </button>

      {planKey && (
        <CarePlanOutcomePanel
          title={DSF_CARE_PLANS[planKey].title}
          bullets={DSF_CARE_PLANS[planKey].bullets}
          allCompleted={data.carePlan?.allCompleted}
          onAllCompletedChange={(next) => onUpdate({
            carePlan: { ...(data.carePlan || {}), allCompleted: next },
            carePlanAcknowledged: data.decline || next,
          })}
          outreachNotes={data.carePlan?.outreachNotes}
          onOutreachNotesChange={(next) => onUpdate({
            carePlan: { ...(data.carePlan || {}), outreachNotes: next },
          })}
        />
      )}

      {submitted && !acknowledged && (
        <FieldError>Acknowledge the care plan or mark Decline Follow-Up to submit.</FieldError>
      )}
    </div>
  );
}

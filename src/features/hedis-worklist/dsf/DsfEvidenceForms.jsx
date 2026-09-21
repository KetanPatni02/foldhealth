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
import { useMemo } from 'react';
// (No side effects here — derived flags like carePlanAcknowledged are
// computed on the read side inside isMandatoryComplete instead of being
// mirrored into the payload.)
import { Alert } from '../../../components/Alert/Alert';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { Icon } from '../../../components/Icon/Icon';
import { InfoBar } from '../../../components/InfoBar/InfoBar';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { CheckboxTick } from '../../../components/CheckboxTick/CheckboxTick';
import { Select } from '../../../components/Select/Select';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { getItems, getResponseScale, isPhq2Positive, phq9Branch, phq9BandLabel, totalScore } from './dsfScoring';
import { DSF_CARE_PLANS } from './dsfCarePlans';
import styles from './DsfEvidenceForms.module.css';

// Sample provider roster — production wires this through the tenant's
// staff directory. Sample names include Dr. Dennis per the story.
export const DSF_PROVIDERS = [
  { value: 'dr-dennis',   label: 'Dr. Dennis' },
  { value: 'dr-becerra',  label: 'Dr. Becerra' },
  { value: 'dr-yu',       label: 'Dr. Helen Yu' },
  { value: 'np-priya',    label: 'Priya Shah, NP' },
  { value: 'np-lee',      label: 'Jordan Lee, NP' },
];

export const LOCATION_OPTIONS = [
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

// PHQ-style questionnaire: each question is a numbered heading with
// its response options stacked vertically underneath. The parent owns
// state; this component just reads/writes an array of numbers. Point
// values are intentionally hidden from the option labels — the score
// interpretation lives in the summary card below the questionnaire.
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
    <div className={[styles.questionnaire, locked ? styles.questionnaireLocked : ''].filter(Boolean).join(' ')}>
      {items.map((item, idx) => (
        <div key={item.code} className={styles.questionBlock}>
          <div className={styles.questionText}>
            <span className={styles.questionNumber}>{idx + 1}.</span>
            {item.text}
          </div>
          <div className={styles.optionStack}>
            {scale.map(opt => (
              <RadioButton
                key={opt.score}
                checked={values?.[idx] === opt.score}
                onChange={() => setAt(idx, opt.score)}
                label={opt.value}
                disabled={locked}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// The Care Plan outcome panel — reused for every DSF branch. The
// bulleted body is static clinical guidance the reviewer follows in
// the encounter; commit lives on the note-level Sign & Save (and the
// PHQ-2 / PHQ-9 Save Score on their own cards). No per-panel checkbox
// — an all-or-nothing tick on top of static reference text reads as
// clickwrap rather than a real attestation. Optional Outreach Notes
// textarea captures any per-encounter commentary.
function CarePlanOutcomePanel({ title, bullets, outreachNotes, onOutreachNotesChange }) {
  return (
    <div className={styles.carePlanPanel}>
      <div className={styles.carePlanTitle}>{title}</div>
      <ul className={styles.carePlanBullets}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <div className={styles.carePlanFooter}>
        <Textarea
          title="Outreach Notes"
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
  const phq2Total = totalScore(phq2Values);
  const positive = isPhq2Positive(phq2Total);
  // DSF-A is only locked once THIS note has committed a Save on a
  // Positive PHQ-2 (which is also the moment DSF-B is created). A
  // fresh note starts unlocked regardless of whether DSF-B may exist
  // for the member from an earlier flow, and Negative scoring keeps
  // the form editable forever (no save step, no lock).
  const phq2Saved = !!data.phq2?.savedAt;

  // Positive PHQ-2 gates DSF-B creation on an explicit Save click so a
  // mis-tick at 3 points doesn't spawn a gap. Negative flows show the
  // wellness care plan inline without a Save step.
  const handleSavePhq2Score = () => {
    if (!bothPhq2Answered || !positive || phq2Saved) return;
    const savedAt = new Date().toISOString();
    // Save locks PHQ-2, marks DSF-A Ready for Review (so the note picker
    // includes it automatically), and opens the linked DSF-B gap.
    onUpdate({ phq2: { ...(data.phq2 || {}), savedAt }, manuallyOff: false });
    if (typeof onOpenPhq9Gap === 'function') {
      onOpenPhq9Gap({ savedAt });
    }
  };

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

      <div className={styles.phq2Card}>
        <div className={styles.phq2CardHeader}>
          <div className={styles.fieldLabel}>Depression Screening : PHQ-2<span className={styles.required}>•</span></div>
        </div>
        <LikertMatrix
          scoreKey="phq2"
          values={phq2Values}
          onChange={(next) => onUpdate({
            phq2: { ...(data.phq2 || {}), item1: next[0], item2: next[1] },
          })}
          locked={phq2Saved}
        />
        {/* Footer row surfaces once both PHQ-2 items are answered:
              • Positive + !saved → Save Score button + live badge.
              • Positive + saved  → badge only (Save is replaced by the
                success info bar below).
              • Negative          → badge only (no explicit save step —
                Negative auto-completes without a gap).
            The scoring-bands info tooltip sits inside the badge itself
            so band context anchors to where the score is read. */}
        {bothPhq2Answered && (
          <div className={styles.phq2CardFooter}>
            {positive && !phq2Saved && (
              <Button
                variant="primary"
                size="M"
                leadingIcon="solar:check-circle-linear"
                onClick={handleSavePhq2Score}
              >
                Save score
              </Button>
            )}
            <Badge
              tone={positive ? 'warning' : 'success'}
              size="M"
              label={`Score : ${phq2Total} Point${phq2Total === 1 ? '' : 's'} (${positive ? 'Positive for Depression' : 'Negative for Depression'})`}
              trailingIconElement={
                <Tooltip
                  variant="light"
                  maxWidth={240}
                  label={
                    <div className={styles.scoreLegend}>
                      <div className={styles.scoreLegendTitle}>PHQ-2 scoring bands</div>
                      <ul className={styles.scoreLegendList}>
                        <li><strong>0–2</strong> Negative for Depression</li>
                        <li><strong>3–6</strong> Positive for Depression</li>
                      </ul>
                    </div>
                  }
                >
                  <span className={styles.scoreBadgeInfo} aria-label="PHQ-2 scoring bands">
                    <Icon name="solar:info-circle-linear" size={14} color="currentColor" />
                  </span>
                </Tooltip>
              }
            />
          </div>
        )}
        {bothPhq2Answered && positive && !phq2Saved && (
          <InfoBar className={styles.phq2InfoBarAttached}>
            Saving this score opens the DSF-B gap for this patient. Once saved, DSF-A cannot be edited.
          </InfoBar>
        )}
        {phq2Saved && (
          <InfoBar
            className={styles.phq2InfoBarAttached}
            tone="success"
            icon="solar:check-circle-linear"
          >
            <span className={styles.phq2InfoBarSaved}>
              <span>Score saved, DSF-A locked and DSF-B is created.</span>
              <Button
                variant="tertiary"
                size="S"
                trailingIcon="solar:arrow-right-linear"
                onClick={() => (v.openDsfbView ? v.openDsfbView() : v.setActiveGapCode?.('DSF-B'))}
              >
                Open DSF-B
              </Button>
            </span>
          </InfoBar>
        )}
      </div>

      {bothPhq2Answered && !positive && (
        <CarePlanOutcomePanel
          title={DSF_CARE_PLANS.phq2Negative.title}
          bullets={DSF_CARE_PLANS.phq2Negative.bullets}
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
  // When the note has no paired DSF-A, DSF-B is standalone — the
  // reviewer completed the PHQ-2 virtually and skipped creating the
  // Depression Screening care program. DSF-B has to collect its own
  // Location + Performed by; the paired flow keeps inheriting them
  // from the DSF-A carrier.
  const hasPairedDsfA = !!v.activeGaps?.some(g => g.code === 'DSF-A');
  const phq9Values = data.phq9?.items || [null, null, null, null, null, null, null, null, null];
  const allAnswered = phq9Values.every(v2 => v2 !== null && v2 !== undefined);
  // Always recompute from the current items — falling back to a stored
  // `data.phq9.totalScore` would freeze the visible total the first time
  // the payload savedAt is stamped, so any later edit (change one item's
  // score) wouldn't show up in the Badge.
  const phq9Total = totalScore(phq9Values);
  const branch = phq9Branch(phq9Total);
  // Reference vocabulary — see dsfScoring.phq9BandLabel. Renders as
  // "Minimal / None", "Mild", "Moderate", "Severe" so the DSF-B Badge
  // reads the same as the clinical scoring reference sheet.
  const bandLabel = phq9BandLabel(branch);
  const bandTone = branch === 'minimal' ? 'success'
    : branch === 'mild' ? 'warning'
    : branch === 'moderate' ? 'secondary'
    : branch === 'severe' ? 'error'
    : 'grey';

  // Save Score gate — mirrors the PHQ-2 pattern. Users answer all 9
  // items, then commit the score via an explicit Save Score button.
  // Save stamps `savedAt` (feeds the 30-day due-date math), locks the
  // Likert matrix, and reveals the band's care plan below.
  const phq9Saved = !!data.phq9?.savedAt;
  // Save requires: all 9 items answered, not already saved, not
  // declined. Mild bands' sub-question stays available before AND after
  // save; the care plan panel below only surfaces once both the score
  // is saved AND the sub-question is answered.
  const canSavePhq9 = allAnswered && !phq9Saved && !data.decline;
  const handleSavePhq9Score = () => {
    if (!canSavePhq9) return;
    onUpdate({
      phq9: {
        ...(data.phq9 || {}),
        totalScore: phq9Total,
        band: branch,
        savedAt: new Date().toISOString(),
      },
      manuallyOff: false,
    });
  };

  // Which care plan block is visible right now. Decline always wins;
  // band-driven plans surface as soon as the questionnaire is complete
  // so the reviewer can preview the recommendation before committing.
  // Save Score is still a separate commit that locks the score, but it
  // is no longer a gate for the care-plan preview.
  let planKey = null;
  if (data.decline) planKey = 'decline';
  else if (allAnswered && branch === 'minimal') planKey = 'phq9Minimal';
  else if (allAnswered && branch === 'mild' && data.phq9?.subMildAnswer === 'yes') planKey = 'phq9MildYes';
  else if (allAnswered && branch === 'mild' && data.phq9?.subMildAnswer === 'no') planKey = 'phq9MildNo';
  else if (allAnswered && branch === 'moderate') planKey = 'phq9Moderate';
  else if (allAnswered && branch === 'severe') planKey = 'phq9Severe';

  return (
    <div className={styles.form}>
      {/* Standalone DSF-B (no paired DSF-A on the note) needs its own
          visit-context fields. The DSF-A carrier normally provides
          these, but a virtually-run PHQ-2 skips creating that gap. */}
      {!hasPairedDsfA && (
        <>
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
        </>
      )}

      <div className={styles.phq2Card}>
        <div className={styles.phq2CardHeader}>
          <div className={styles.fieldLabel}>
            Depression Follow-Up : PHQ-9
            <span className={styles.required}>•</span>
          </div>
        </div>
        <LikertMatrix
          scoreKey="phq9"
          values={phq9Values}
          onChange={(next) => onUpdate({ phq9: { ...(data.phq9 || {}), items: next } })}
          locked={data.decline || phq9Saved}
        />
        {/* Footer row surfaces once PHQ-9 is fully answered (and the
            note isn't Decline follow-up):
              • !phq9Saved → Save Score button + live badge.
              • phq9Saved  → badge only (Save is replaced by the success
                info bar below).
            Scoring-bands info tooltip sits inside the badge so band
            context stays anchored to where the score is read. */}
        {allAnswered && !data.decline && bandLabel && (
          <div className={styles.phq2CardFooter}>
            {canSavePhq9 && (
              <Button
                variant="primary"
                size="M"
                leadingIcon="solar:check-circle-linear"
                onClick={handleSavePhq9Score}
              >
                Save score
              </Button>
            )}
            <Badge
              tone={bandTone}
              size="M"
              label={`Score : ${phq9Total} Point${phq9Total === 1 ? '' : 's'} (${bandLabel})`}
              trailingIconElement={
                <Tooltip
                  variant="light"
                  maxWidth={240}
                  label={
                    <div className={styles.scoreLegend}>
                      <div className={styles.scoreLegendTitle}>PHQ-9 scoring bands</div>
                      <ul className={styles.scoreLegendList}>
                        <li><strong>0–4</strong> Minimal / None</li>
                        <li><strong>5–9</strong> Mild</li>
                        <li><strong>10–19</strong> Moderate</li>
                        <li><strong>20–27</strong> Severe</li>
                      </ul>
                    </div>
                  }
                >
                  <span className={styles.scoreBadgeInfo} aria-label="PHQ-9 scoring bands">
                    <Icon name="solar:info-circle-linear" size={14} color="currentColor" />
                  </span>
                </Tooltip>
              }
            />
          </div>
        )}
        {canSavePhq9 && (
          <InfoBar className={styles.phq2InfoBarAttached}>
            Saving this score commits the PHQ-9 result. Once saved, the assessment cannot be edited.
          </InfoBar>
        )}
        {phq9Saved && (
          <InfoBar
            className={styles.phq2InfoBarAttached}
            tone="success"
            icon="solar:check-circle-linear"
          >
            <span className={styles.phq2InfoBarSaved}>
              <span>Score saved, PHQ-9 locked{bandLabel ? ` (${bandLabel})` : ''}.</span>
            </span>
          </InfoBar>
        )}
      </div>

      {allAnswered && !data.decline && branch === 'mild' && (
        <div className={styles.subQuestion}>
          <div className={styles.subQuestionText}>
            Are any of the following present?
            <span className={styles.required}>•</span>
          </div>
          <ul className={styles.subQuestionBullets}>
            <li>History of prior depressive episodes, and/or</li>
            <li>Symptoms lasting more than 3 months</li>
          </ul>
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

      {planKey && (
        <CarePlanOutcomePanel
          title={DSF_CARE_PLANS[planKey].title}
          bullets={DSF_CARE_PLANS[planKey].bullets}
          outreachNotes={data.carePlan?.outreachNotes}
          onOutreachNotesChange={(next) => onUpdate({
            carePlan: { ...(data.carePlan || {}), outreachNotes: next },
          })}
        />
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
          Decline follow-up:
          <span style={{ color: 'var(--neutral-400)', fontWeight: 400, marginLeft: 4 }}>
            patient declines further evaluation and treatment related to this depression screening measure, independent of the result above.
          </span>
        </span>
      </button>
    </div>
  );
}

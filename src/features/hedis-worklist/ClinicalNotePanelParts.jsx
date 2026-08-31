import { useRef, useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { DownChevronIcon } from '../../components/Icon/DownChevronIcon';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Switch } from '../../components/Switch/Switch';
import { Input } from '../../components/Input/Input';
import { Select } from '../../components/Select/Select';
import { DatePicker } from '../../components/DatePicker/DatePicker';
import { RadioButton } from '../../components/RadioButton/RadioButton';
import { CheckboxTick } from '../../components/CheckboxTick/CheckboxTick';
import { UploadDropField } from '../../components/UploadDropField/UploadDropField';
import { Avatar } from '../../components/Avatar/Avatar';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import {
  GENDER_LABEL,
  MEASURE_NAMES,
  EED_EXAM_TYPES,
  EED_EVIDENCE_TYPES,
  EED_EXAM_RESULTS,
  EED_FOLLOW_UP_OPTIONS,
  CBP_LOCATIONS,
  CBP_YES_NO,
  CBP_SYMPTOM_OPTIONS,
  GAP_TEMPLATES,
  isMandatoryComplete,
} from './ClinicalNotePanel.utils';
import styles from './ClinicalNotePanel.module.css';

export function HeaderActions({
  onSaveDraft,
  onSaveAndSign,
  onSubmitForReview,
  onSignAndPrint,
  primaryLabel = 'Sign & Save',
  canSaveDraft = true,
  canSign = true,
}) {
  const menuItems = [
    { key: 'submit',  label: 'Submit for Review', icon: 'solar:upload-square-linear' },
    { key: 'print',   label: 'Sign and Print',    icon: 'solar:printer-linear' },
  ];
  const runMenu = (key) => {
    if (key === 'submit') onSubmitForReview();
    else if (key === 'print') onSignAndPrint();
  };
  return (
    <>
      <Button
        variant="secondary"
        size="L"
        leadingIcon="solar:file-linear"
        onClick={onSaveDraft}
        disabled={!canSaveDraft}
      >
        Save as Draft
      </Button>
      <Button
        variant="primary"
        size="L"
        menuItems={menuItems}
        onMenuSelect={runMenu}
        onClick={onSaveAndSign}
        disabled={!canSign}
      >
        {primaryLabel}
      </Button>
    </>
  );
}

export function TitleBlock({ title, statusLabel = 'In Progress' }) {
  return (
    <span className={styles.titleBlock}>
      <span className={styles.titleText}>{title}</span>
      <Badge tone="warning" size="S" dot label={statusLabel} />
    </span>
  );
}

/* MultiUploadDropField — thin wrapper around UploadDropField that renders
   one completed-file card per uploaded document + one live Dropzone at
   the bottom for the next file. Each slot is its own UploadDropField
   instance (fresh `key` so its internal state is scoped to that slot).
   On the first successful upload we push another empty slot so the drop
   area is always available. Clear a slot from its own trash icon —
   UploadDropField already handles that. */
function MultiUploadDropField({ onFile }) {
  const [slots, setSlots] = useState([{ id: 0, hasFile: false }]);
  const nextIdRef = useRef(1);
  const handleChange = (slotId) => (file) => {
    setSlots((prev) => {
      const idx = prev.findIndex((s) => s.id === slotId);
      if (idx < 0) return prev;
      const willHaveFile = !!file;
      // No-op if the slot's has-file flag isn't changing (the shared
      // component fires onChange(null) mid-upload too).
      if (prev[idx].hasFile === willHaveFile) return prev;
      const next = prev.map((s, i) => (i === idx ? { ...s, hasFile: willHaveFile } : s));
      // When the LAST slot receives a file, append a fresh empty slot so
      // the dropzone stays reachable for the next document.
      if (willHaveFile && idx === prev.length - 1) {
        next.push({ id: nextIdRef.current++, hasFile: false });
      }
      return next;
    });
    if (file) onFile?.(file);
  };
  return (
    <div className={styles.multiUpload}>
      {slots.map((slot) => (
        <UploadDropField key={slot.id} onChange={handleChange(slot.id)} />
      ))}
    </div>
  );
}

/* AssigneeDisplay — read-only Avatar + full name used inside the
   ClinicalNotePanel's LHS Visit Notes table and the RHS active-gap
   header. Assignee changes on the clinical note itself aren't wired,
   so this replaces the interactive AssigneeChange chip: no hover, no
   dropdown chevron, name shown in full (no ellipsis). */
function AssigneeDisplay({ name }) {
  if (!name) {
    return <span className={styles.assigneeName}>Unassigned</span>;
  }
  const initials = name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('');
  return (
    <span className={styles.assigneeDisplay}>
      <Avatar type="initial" variant="provider" size="XS" initials={initials} />
      <span className={styles.assigneeName} title={name}>{name}</span>
    </span>
  );
}

function CheckboxRow({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={styles.checkRow}
      onClick={() => onChange(!checked)}
    >
      <CheckboxTick checked={checked} size={16} />
      <span className={styles.checkLabel}>
        {label && <strong className={styles.checkLabelStrong}>{label}</strong>}
        {label && description ? ' – ' : null}
        {description}
      </span>
    </button>
  );
}

export function NoteContextPane({ v, member, year }) {
  return (
    <div className={styles.leftPane}>
      <div className={styles.patientBannerSlot}>
        <PatientBanner
          initials={member.in}
          name={member.name}
          gender={GENDER_LABEL[member.gender] ?? member.gender}
          age={member.age}
          dob={member.dob}
          memberId={member.memberId}
          hidePatientLabel
          onCall={() => v.showToast('Call — coming soon')}
        />
      </div>

      <div className={styles.infoBanner}>
        <Icon name="solar:info-circle-linear" size={14} color="var(--status-info)" />
        <span>All signed notes sync to the patient's EHR.</span>
      </div>

      <div className={styles.leftPaneScroll}>
        <div className={styles.dosCard}>
          <div className={styles.dosHeader}>
            <span className={styles.dosTitle}>
              Date of Service &amp; Telehealth Statement <span className={styles.required}>•</span>
            </span>
            <Badge tone="info" size="S" label="Common for all gaps" />
          </div>
          <div className={styles.dosBody}>
            <div className={styles.fieldStack}>
              <div className={styles.fieldLabel}>Date of Service <span className={styles.required}>•</span></div>
              <DatePicker value={v.dateOfService} onSelect={v.setDateOfService} hasError={v.submitted && !v.dateOfService} placeholder="Select Date" />
              {v.submitted && !v.dateOfService && <div className={styles.fieldError}>Date of Service is required</div>}
            </div>
            <div className={styles.fieldStack}>
              <div className={styles.fieldLabel}>Telehealth Statement</div>
              <div className={styles.checkStack}>
                <CheckboxRow
                  checked={v.audioOnly}
                  onChange={v.setAudioOnly}
                  label="Audio-only visit"
                  description="Verbal consent was obtained from the patient to conduct the visit via audio-only. The patient was informed of the nature of the visit, the limitations of audio-only communication, and agreed to proceed."
                />
                <CheckboxRow
                  checked={v.audioVideo}
                  onChange={v.setAudioVideo}
                  label="Audio-video visit"
                  description="Verbal consent was obtained from the patient to conduct the visit via audio and video. The patient was informed of the nature of the visit, the limitations of audio-video communication, and agreed to proceed."
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.visitNotesHeader}>
          <span className={styles.visitNotesTitle}>Visit Notes <span className={styles.visitNotesHelper}>(Included in Consolidated Note):</span></span>
          <span className={styles.visitNotesYear}>Measurement Year: {year}</span>
        </div>

        <div className={styles.gapTable}>
          <div className={styles.gapTableHeader}>
            <span>Open Care Gaps</span>
            <span>Assignee</span>
            <span className={styles.gapTableReadyHead}>Ready</span>
          </div>
          {v.activeGaps.map(g => (
            <GapRow
              key={g.code}
              gap={g}
              data={v.gapState[g.code]}
              ready={v.isReadyForReview(g.code)}
              mandatoryComplete={isMandatoryComplete(g.code, v.gapState[g.code])}
              assignee={v.assigneeFor(g)}
              isActive={v.activeGapCode === g.code}
              onSelect={() => v.setActiveGapCode(g.code)}
              onToggleReady={(next) => {
                if (next && !isMandatoryComplete(g.code, v.gapState[g.code])) return;
                v.updateGap(g.code, { manuallyOff: !next });
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GapRow({ gap, data, ready, mandatoryComplete, assignee, isActive, onSelect, onToggleReady }) {
  const measureName = MEASURE_NAMES[gap.code] ?? gap.code;
  const rowCls = [styles.gapRow, isActive ? styles.gapRowActive : ''].filter(Boolean).join(' ');
  return (
    <div
      role="button"
      tabIndex={0}
      className={rowCls}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
    >
      <div className={styles.gapRowMain}>
        <div className={styles.gapRowTitle}>
          <span className={styles.gapName}>{gap.code} - {measureName}</span>
        </div>
        <div className={styles.gapRowMeta}>
          <Badge size="S" variant="ai-care" label={gap.status} />
          {data && !!Object.keys(data).some(k => k !== 'manuallyOff' && data[k]) && (
            <span className={styles.gapRowUpdate}>
              <span className={styles.dot}>•</span> Last Updated Today, 09:15 AM <span className={styles.dot}>•</span> You
            </span>
          )}
        </div>
      </div>
      <div className={styles.gapRowAssignee} onClick={(e) => e.stopPropagation()}>
        <AssigneeDisplay name={assignee} />
      </div>
      <div className={styles.gapRowReady} onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={ready}
          disabled={!mandatoryComplete}
          onChange={onToggleReady}
          ariaLabel={`Ready for review — ${gap.code}`}
        />
      </div>
    </div>
  );
}

export function GapEvidencePane({ v }) {
  const gap = v.activeGap;
  if (!gap) {
    return (
      <div className={styles.rightPane}>
        <div className={styles.rightEmpty}>
          <Icon name="solar:file-text-linear" size={40} color="var(--neutral-150)" />
          <p className={styles.rightEmptyTitle}>Select a care gap to enter evidence.</p>
        </div>
      </div>
    );
  }

  const data = v.gapState[gap.code] ?? {};
  const ready = v.isReadyForReview(gap.code);
  const mandatoryComplete = isMandatoryComplete(gap.code, data);
  const measureName = MEASURE_NAMES[gap.code] ?? gap.code;
  const assignee = v.assigneeFor(gap);

  return (
    <div className={styles.rightPane}>
      {/* Pinned header rows: title + status + Ready-for-Review, and the
          evidence-type row directly under it. Both sit OUTSIDE the scroll
          container so only the evidence body scrolls. */}
      <div className={styles.gapEvidenceTopRow}>
        <div className={styles.gapEvidenceHeadLeft}>
          <span className={styles.gapEvidenceTitle}>
            {gap.code} - {measureName}
          </span>
          <div className={styles.gapEvidenceStatusRow}>
            <Badge size="S" variant="ai-care" label={gap.status} />
            <span className={styles.headerDivider} aria-hidden="true" />
            <AssigneeDisplay name={assignee} />
          </div>
        </div>
        <div className={styles.gapEvidenceReadyRow}>
          <Switch
            checked={ready}
            disabled={!mandatoryComplete}
            onChange={(next) => {
              if (next && !mandatoryComplete) return;
              v.updateGap(gap.code, { manuallyOff: !next });
            }}
            ariaLabel={`Ready for review — ${gap.code}`}
          />
          <span className={styles.gapEvidenceReadyLabel}>
            Ready for Review
            <Icon name="solar:info-circle-linear" size={13} color="var(--neutral-300)" />
          </span>
        </div>
      </div>

      <div className={`${styles.evidenceTypeRow} ${styles.evidenceTypeRowPinned}`}>
        <Select
          disabled
          options={[{ value: gap.code, label: `${gap.code} Evidence` }]}
          value={gap.code}
          onChange={() => {}}
          ariaLabel={`${gap.code} evidence type`}
        />
        <Input
          aria-label="Evidence label"
          value={data.evidenceLabel ?? `${gap.code} Evidence`}
          onChange={(e) => v.updateGap(gap.code, { evidenceLabel: e.target.value })}
        />
      </div>

      <div className={styles.rightPaneScroll}>
        <div className={styles.evidenceBody}>
          {gap.code === 'EED' ? (
            <EedEvidenceForm v={v} data={data} submitted={v.submitted} />
          ) : gap.code === 'CBP' ? (
            <CbpEvidenceForm v={v} data={data} submitted={v.submitted} />
          ) : GAP_TEMPLATES[gap.code] ? (
            <GenericEvidenceForm code={gap.code} v={v} data={data} submitted={v.submitted} />
          ) : (
            <div className={styles.evidenceComingSoon}>
              <Icon name="solar:hourglass-line-linear" size={36} color="var(--neutral-150)" />
              <p className={styles.evidenceComingSoonTitle}>Coming soon</p>
              <p className={styles.evidenceComingSoonBody}>Evidence form pending design for {gap.code}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ConsolidatedNoteBody — stacked authoring layout used when the author
   clicks Edit on a Pending Review note (leftWorkspace mode
   'clinical-note-consolidated'). One shared DOS card at the top, then
   one collapsible section per gap the submitted note bundled — each
   section reuses the same evidence-form component the single-gap
   workspace renders (EED, CBP, or the templated GenericEvidenceForm).
   Content hydrates from the submitted note's payload via
   useClinicalNotePanel's restore effect. */
export function ConsolidatedNoteBody({ v }) {
  return (
    <div className={styles.consolidatedBody}>
      {/* Info banner is hoisted to CareGapDetailDrawer so it can sit as
          a sibling of leftPaneBody — outside the padded, scrollable
          container. See the 'clinical-note-consolidated' branch there. */}
      <div className={styles.consolidatedScroll}>
        <div className={styles.dosCard}>
          <div className={styles.dosHeader}>
            <span className={styles.dosTitle}>
              Date of Service &amp; Telehealth Statement <span className={styles.required}>•</span>
            </span>
            <Badge tone="info" size="S" label="Common for all gaps" />
          </div>
          <div className={styles.dosBody}>
            <div className={styles.fieldStack}>
              <DatePicker
                label="Date of Service"
                required
                value={v.dateOfService}
                onSelect={v.setDateOfService}
                hasError={v.submitted && !v.dateOfService}
                placeholder="Select Date"
              />
              {v.submitted && !v.dateOfService && (
                <div className={styles.fieldError}>Date of Service is required</div>
              )}
            </div>
            <div className={styles.fieldStack}>
              <div className={styles.fieldLabel}>Telehealth Statement</div>
              <div className={styles.checkStack}>
                <CheckboxRow
                  checked={v.audioOnly}
                  onChange={v.setAudioOnly}
                  label="Audio-only visit"
                  description="Verbal consent was obtained from the patient to conduct the visit via audio-only. The patient was informed of the nature of the visit, the limitations of audio-only communication, and agreed to proceed."
                />
                <CheckboxRow
                  checked={v.audioVideo}
                  onChange={v.setAudioVideo}
                  label="Audio-video visit"
                  description="Verbal consent was obtained from the patient to conduct the visit via audio and video. The patient was informed of the nature of the visit, the limitations of audio-video communication, and agreed to proceed."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Only gaps the user has BOTH completed (mandatory fields filled)
            AND flagged as Ready for Review make it into the consolidated
            note. Gaps that aren't ready are intentionally omitted — they
            do not render as empty or "pending" sections. */}
        {(() => {
          const readyGaps = v.activeGaps.filter(g => v.isReadyForReview(g.code));
          if (readyGaps.length === 0) {
            return (
              <div className={styles.consolidatedEmpty}>
                <Icon name="solar:clipboard-list-linear" size={36} color="var(--neutral-200)" />
                <p className={styles.consolidatedEmptyTitle}>No gaps ready for review yet</p>
                <p className={styles.consolidatedEmptyBody}>
                  Complete a care gap's note and toggle Ready for Review to include it here.
                </p>
              </div>
            );
          }
          return readyGaps.map((gap) => <GapSection key={gap.code} v={v} gap={gap} />);
        })()}
      </div>
    </div>
  );
}

function GapSection({ v, gap }) {
  const [expanded, setExpanded] = useState(true);
  const data = v.gapState[gap.code] ?? {};
  const measureName = MEASURE_NAMES[gap.code] ?? gap.code;
  return (
    <div className={styles.gapSection}>
      <button
        type="button"
        className={styles.gapSectionHeader}
        aria-expanded={expanded}
        onClick={() => setExpanded(x => !x)}
      >
        <span className={`${styles.gapSectionChevron} ${expanded ? '' : styles.gapSectionChevronCollapsed}`}>
          <DownChevronIcon size={16} color="var(--neutral-400)" />
        </span>
        <span className={styles.gapSectionTitle}>
          {gap.code} - {measureName}
        </span>
      </button>
      {expanded && (
        <div className={styles.gapSectionBody}>
          {gap.code === 'EED' ? (
            <EedEvidenceForm v={v} data={data} submitted={v.submitted} />
          ) : gap.code === 'CBP' ? (
            <CbpEvidenceForm v={v} data={data} submitted={v.submitted} />
          ) : GAP_TEMPLATES[gap.code] ? (
            <GenericEvidenceForm code={gap.code} v={v} data={data} submitted={v.submitted} />
          ) : (
            <div className={styles.evidenceComingSoon}>
              <Icon name="solar:hourglass-line-linear" size={36} color="var(--neutral-150)" />
              <p className={styles.evidenceComingSoonTitle}>Coming soon</p>
              <p className={styles.evidenceComingSoonBody}>Evidence form pending design for {gap.code}.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EedEvidenceForm({ v, data, submitted }) {
  const onUpdate = (patch) => v.updateGap('EED', patch);
  const err = (field) => submitted && !data[field];
  return (
    <div className={styles.evidenceForm}>
      <FieldStack>
        <FieldLabel required>Evidence Type</FieldLabel>
        <div className={styles.radioGroupStack}>
          {EED_EVIDENCE_TYPES.map(opt => (
            <RadioButton
              key={opt}
              checked={data.evidenceType === opt}
              onChange={() => onUpdate({ evidenceType: opt })}
              label={opt}
            />
          ))}
        </div>
        {err('evidenceType') && <FieldError>Evidence type is required</FieldError>}
      </FieldStack>

      <div className={styles.formGrid2}>
        <FieldStack>
          <FieldLabel required>Exam Type</FieldLabel>
          <Select
            options={EED_EXAM_TYPES}
            value={data.examType}
            onChange={(v2) => onUpdate({ examType: v2 })}
            placeholder="Select Exam Type"
            variant={err('examType') ? 'error' : 'default'}
          />
          {err('examType') && <FieldError>Exam type is required</FieldError>}
        </FieldStack>
        <FieldStack>
          <FieldLabel required>Exam Date</FieldLabel>
          <DatePicker
            value={data.examDate}
            onSelect={(v2) => onUpdate({ examDate: v2 })}
            hasError={err('examDate')}
          />
          {err('examDate') && <FieldError>Exam date is required</FieldError>}
        </FieldStack>
      </div>

      <div className={styles.formGrid2}>
        <FieldStack>
          <FieldLabel required>Examining Provider</FieldLabel>
          <Input
            value={data.examiningProvider}
            onChange={(e) => onUpdate({ examiningProvider: e.target.value })}
            placeholder="Enter Provider Name"
            variant={err('examiningProvider') ? 'error' : undefined}
          />
          {err('examiningProvider') && <FieldError>Provider is required</FieldError>}
        </FieldStack>
        <FieldStack>
          <FieldLabel>NPI</FieldLabel>
          <Input
            value={data.npi}
            onChange={(e) => onUpdate({ npi: e.target.value })}
            placeholder="10 digit NPI"
            inputMode="numeric"
          />
        </FieldStack>
      </div>

      <FieldStack>
        <FieldLabel required>Exam Result</FieldLabel>
        <div className={styles.radioGroupStack}>
          {EED_EXAM_RESULTS.map(opt => (
            <RadioButton
              key={opt}
              checked={data.examResult === opt}
              onChange={() => onUpdate({ examResult: opt })}
              label={opt}
            />
          ))}
        </div>
        {err('examResult') && <FieldError>Exam result is required</FieldError>}
      </FieldStack>

      <div className={styles.formGrid2}>
        <FieldStack>
          <FieldLabel>Laterality</FieldLabel>
          <Select
            options={[
              { value: 'both',  label: 'Both eyes' },
              { value: 'left',  label: 'Left eye' },
              { value: 'right', label: 'Right eye' },
            ]}
            value={data.laterality}
            onChange={(v2) => onUpdate({ laterality: v2 })}
            placeholder="Select Laterality"
          />
        </FieldStack>
        <FieldStack>
          <FieldLabel required>ICD-10 Diagnosis Code</FieldLabel>
          <Select
            options={[
              { value: 'E11.311', label: 'E11.311' },
              { value: 'E11.319', label: 'E11.319' },
              { value: 'E11.321', label: 'E11.321' },
              { value: 'E11.9',   label: 'E11.9' },
            ]}
            value={data.icd10}
            onChange={(v2) => onUpdate({ icd10: v2 })}
            placeholder="Select ICD"
            variant={err('icd10') ? 'error' : 'default'}
          />
          {err('icd10') && <FieldError>ICD-10 is required</FieldError>}
        </FieldStack>
      </div>

      <FieldStack>
        <FieldLabel required>Follow-up Recommended</FieldLabel>
        <div className={styles.checkStack}>
          {EED_FOLLOW_UP_OPTIONS.map(opt => (
            <CheckboxRow
              key={opt.key}
              checked={!!(data.followUp && data.followUp[opt.key])}
              onChange={(next) => onUpdate({ followUp: { ...(data.followUp || {}), [opt.key]: next } })}
              label={opt.label}
            />
          ))}
        </div>
      </FieldStack>

      <div className={styles.formGrid2}>
        <FieldStack>
          <FieldLabel>Next Exam Due</FieldLabel>
          <DatePicker value={data.nextExamDue} onSelect={(v2) => onUpdate({ nextExamDue: v2 })} />
        </FieldStack>
        <FieldStack>
          <FieldLabel required>Patient Counseled On</FieldLabel>
          <Select
            options={[
              { value: 'retinopathy',       label: 'Diabetic retinopathy risk' },
              { value: 'follow-up',         label: 'Follow-up schedule' },
              { value: 'lifestyle',         label: 'Lifestyle & glycemic control' },
            ]}
            value={data.patientCounseledOn}
            onChange={(v2) => onUpdate({ patientCounseledOn: v2 })}
            placeholder="Select"
            variant={err('patientCounseledOn') ? 'error' : 'default'}
          />
          {err('patientCounseledOn') && <FieldError>This field is required</FieldError>}
        </FieldStack>
      </div>

      <FieldStack>
        <FieldLabel>Upload Evidence (if available):</FieldLabel>
        <MultiUploadDropField onFile={() => v.showToast('Attach evidence — coming soon')} />
      </FieldStack>
    </div>
  );
}

/* CBP Visit Note — Controlling Blood Pressure evidence form.
   Backed by the "CBP Visit Note" template row (form_type='Note') seeded in
   supabase/forms_type_column_and_cbp_visit_note_migration.sql. */
function CbpEvidenceForm({ v, data, submitted }) {
  const onUpdate = (patch) => v.updateGap('CBP', patch);
  const err = (field) => submitted && !data[field];
  const priorReading = '156/78 mmHg on 06/04/2026';
  return (
    <div className={styles.evidenceForm}>
      {/* Initial Blood Pressure card — date + BP reading + location. */}
      <div className={styles.cbpCard}>
        <div className={styles.cbpCardTitle}>Initial Blood Pressure</div>
        <div className={styles.cbpBpBlock}>
          <div className={styles.cbpBpDateRow}>
            <span className={styles.cbpBpDateLabel}>Blood Pressure</span>
            <div className={styles.cbpBpDatePicker}>
              <DatePicker
                value={data.bpDate}
                onSelect={(v2) => onUpdate({ bpDate: v2 })}
                placeholder="Select Date"
                hasError={err('bpDate')}
              />
            </div>
          </div>
          <div className={styles.cbpBpValueRow}>
            <div className={styles.cbpBpValueLeft}>
              <span className={styles.cbpBpValueLabel}>Blood Pressure</span>
              <span className={styles.cbpBpValueHelper}>Recorded {priorReading}</span>
            </div>
            <div className={styles.cbpBpValueInputs}>
              <Input
                type="number"
                inputMode="numeric"
                aria-label="Systolic BP"
                value={data.systolic}
                onChange={(e) => onUpdate({ systolic: e.target.value })}
                placeholder="121"
                hasError={err('systolic')}
              />
              <span className={styles.cbpBpSlash} aria-hidden="true">/</span>
              <Input
                type="number"
                inputMode="numeric"
                aria-label="Diastolic BP"
                value={data.diastolic}
                onChange={(e) => onUpdate({ diastolic: e.target.value })}
                placeholder="76"
                hasError={err('diastolic')}
              />
              <span className={styles.cbpBpUnit}>mmHg</span>
            </div>
          </div>
        </div>

        <CbpRadioGroup
          label="Location"
          value={data.location}
          options={CBP_LOCATIONS}
          onChange={(v2) => onUpdate({ location: v2 })}
          error={err('location') ? 'Location is required' : null}
        />
      </div>

      <CbpRadioGroup
        label="Does the patient check their blood pressure regularly and log the results?"
        value={data.selfMonitors}
        options={CBP_YES_NO}
        onChange={(v2) => onUpdate({ selfMonitors: v2 })}
      />
      <CbpRadioGroup
        label="Is the patient taking their high blood pressure medications as prescribed?"
        value={data.takingMeds}
        options={[
          ...CBP_YES_NO,
          { value: 'med-list', label: 'Name of BP Medication / Dosage / Last dose table?' },
        ]}
        onChange={(v2) => onUpdate({ takingMeds: v2 })}
      />
      <CbpRadioGroup
        label="Do you have any symptoms? (BP<100/60)"
        value={data.symptomsLow}
        options={CBP_SYMPTOM_OPTIONS}
        onChange={(v2) => onUpdate({ symptomsLow: v2 })}
      />
      <CbpRadioGroup
        label="Do you have any symptoms? (BP >140/90 and <160/100)"
        value={data.symptomsMid}
        options={CBP_SYMPTOM_OPTIONS}
        onChange={(v2) => onUpdate({ symptomsMid: v2 })}
      />
      <CbpRadioGroup
        label="Do you have any symptoms? (BP >160/100)"
        value={data.symptomsHigh}
        options={CBP_SYMPTOM_OPTIONS}
        onChange={(v2) => onUpdate({ symptomsHigh: v2 })}
      />

      <FieldStack>
        <FieldLabel>Upload Evidence (if available):</FieldLabel>
        <MultiUploadDropField onFile={() => v.showToast('Attach evidence — coming soon')} />
      </FieldStack>
    </div>
  );
}

function CbpRadioGroup({ label, value, options, onChange, error }) {
  return (
    <FieldStack>
      <span className={styles.cbpQuestionLabel}>{label}</span>
      <div className={styles.radioGroupStack}>
        {options.map(opt => (
          <RadioButton
            key={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            label={opt.label}
          />
        ))}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </FieldStack>
  );
}

/* GenericEvidenceForm — renders any gap whose fields live in
   GAP_TEMPLATES (utils). Backed by the parallel "{CODE} Visit Note"
   template rows seeded in
   supabase/hedis_gap_clinical_note_templates_seed.sql. Field types map to
   library primitives: text/number → Input, date → DatePicker, select →
   Select, radio → vertical RadioButton stack, checkbox → CheckboxRow.
   Fields with `column: 2` pair up in a formGrid2 row (must appear in
   pairs). */
function GenericEvidenceForm({ code, v, data, submitted }) {
  const template = GAP_TEMPLATES[code];
  if (!template) return null;
  const onUpdate = (patch) => v.updateGap(code, patch);
  const err = (field, req) => submitted && req && !data[field];

  const rows = [];
  let i = 0;
  while (i < template.length) {
    const f = template[i];
    const next = template[i + 1];
    if (f.column === 2 && next && next.column === 2) {
      rows.push({ kind: 'pair', a: f, b: next });
      i += 2;
    } else {
      rows.push({ kind: 'single', field: f });
      i += 1;
    }
  }

  return (
    <div className={styles.evidenceForm}>
      {rows.map((row, idx) =>
        row.kind === 'pair' ? (
          <div key={idx} className={styles.formGrid2}>
            <GenericField field={row.a} data={data} onUpdate={onUpdate} err={err} />
            <GenericField field={row.b} data={data} onUpdate={onUpdate} err={err} />
          </div>
        ) : (
          <GenericField
            key={idx}
            field={row.field}
            data={data}
            onUpdate={onUpdate}
            err={err}
          />
        )
      )}
      <FieldStack>
        <FieldLabel>Upload Evidence (if available):</FieldLabel>
        <MultiUploadDropField onFile={() => v.showToast('Attach evidence — coming soon')} />
      </FieldStack>
    </div>
  );
}

function GenericField({ field, data, onUpdate, err }) {
  const { key, label, type, options, required, placeholder } = field;
  const value = data[key] ?? (type === 'checkbox' ? false : '');
  const hasError = err(key, required);
  const errorText = required ? `${label} is required` : null;

  if (type === 'checkbox') {
    return (
      <FieldStack>
        <CheckboxRow
          checked={!!value}
          onChange={(v2) => onUpdate({ [key]: v2 })}
          label={label}
        />
      </FieldStack>
    );
  }

  if (type === 'radio') {
    return (
      <FieldStack>
        <span className={styles.cbpQuestionLabel}>
          {label}
          {required && <span className={styles.required}>&nbsp;•</span>}
        </span>
        <div className={styles.radioGroupStack}>
          {options.map(opt => (
            <RadioButton
              key={opt.value}
              checked={value === opt.value}
              onChange={() => onUpdate({ [key]: opt.value })}
              label={opt.label}
            />
          ))}
        </div>
        {hasError && <FieldError>{errorText}</FieldError>}
      </FieldStack>
    );
  }

  if (type === 'select') {
    return (
      <FieldStack>
        <Select
          label={label}
          required={required}
          options={options}
          value={value}
          onChange={(v2) => onUpdate({ [key]: v2 })}
          placeholder={placeholder || `Select ${label}`}
          variant={hasError ? 'error' : 'default'}
        />
        {hasError && <FieldError>{errorText}</FieldError>}
      </FieldStack>
    );
  }

  if (type === 'date') {
    return (
      <FieldStack>
        <DatePicker
          label={label}
          required={required}
          value={value}
          onSelect={(v2) => onUpdate({ [key]: v2 })}
          placeholder={placeholder || 'Select Date'}
          hasError={hasError}
        />
        {hasError && <FieldError>{errorText}</FieldError>}
      </FieldStack>
    );
  }

  // text / number
  return (
    <FieldStack>
      <Input
        label={label}
        required={required}
        type={type === 'number' ? 'number' : 'text'}
        inputMode={type === 'number' ? 'numeric' : undefined}
        value={value}
        onChange={(e) => onUpdate({ [key]: e.target.value })}
        placeholder={placeholder}
        variant={hasError ? 'error' : undefined}
      />
      {hasError && <FieldError>{errorText}</FieldError>}
    </FieldStack>
  );
}

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

/* Single-gap inline body — rendered inside CareGapDetailDrawer's left
   workspace when the member has only one open gap. Reuses the DOS card and
   evidence form from the consolidated drawer; drops the visit-notes table
   and the "Common for all gaps" pill (both meaningless with one gap). */
export function ClinicalNoteWorkspaceBody({ v }) {
  const gap = v.activeGap;
  if (!gap) return null;
  const data = v.gapState[gap.code] ?? {};
  return (
    <div className={styles.inlineWorkspaceBody}>
      <div className={styles.infoBanner}>
        <Icon name="solar:info-circle-linear" size={14} color="var(--status-info)" />
        <span>All signed notes sync to the patient's EHR.</span>
      </div>

      <div className={styles.evidenceTypeRow}>
        <Select
          disabled
          options={[{ value: gap.code, label: `${gap.code} Evidence` }]}
          value={gap.code}
          onChange={() => {}}
          ariaLabel={`${gap.code} evidence type`}
        />
        <Input
          aria-label="Evidence label"
          value={data.evidenceLabel ?? `${gap.code} Evidence`}
          onChange={(e) => v.updateGap(gap.code, { evidenceLabel: e.target.value })}
        />
      </div>

      <div className={styles.inlineWorkspaceScroll}>
        <div className={styles.dosCard}>
          <div className={styles.dosHeader}>
            <span className={styles.dosTitle}>
              Date of Service &amp; Telehealth Statement <span className={styles.required}>•</span>
            </span>
          </div>
          <div className={styles.dosBody}>
            <div className={styles.fieldStack}>
              <DatePicker
                label="Date of Service"
                required
                value={v.dateOfService}
                onSelect={v.setDateOfService}
                hasError={v.submitted && !v.dateOfService}
                placeholder="Select Date"
              />
              {v.submitted && !v.dateOfService && (
                <div className={styles.fieldError}>Date of Service is required</div>
              )}
            </div>
            <div className={styles.fieldStack}>
              <div className={styles.fieldLabel}>Telehealth Statement</div>
              <div className={styles.checkStack}>
                <CheckboxRow
                  checked={v.audioOnly}
                  onChange={v.setAudioOnly}
                  label="Audio-only visit"
                  description="Verbal consent was obtained from the patient to conduct the visit via audio-only. The patient was informed of the nature of the visit, the limitations of audio-only communication, and agreed to proceed."
                />
                <CheckboxRow
                  checked={v.audioVideo}
                  onChange={v.setAudioVideo}
                  label="Audio-video visit"
                  description="Verbal consent was obtained from the patient to conduct the visit via audio and video. The patient was informed of the nature of the visit, the limitations of audio-video communication, and agreed to proceed."
                />
              </div>
            </div>
          </div>
        </div>

        {gap.code === 'EED' ? (
          <EedEvidenceForm v={v} data={data} submitted={v.submitted} />
        ) : gap.code === 'CBP' ? (
          <CbpEvidenceForm v={v} data={data} submitted={v.submitted} />
        ) : GAP_TEMPLATES[gap.code] ? (
          <GenericEvidenceForm code={gap.code} v={v} data={data} submitted={v.submitted} />
        ) : (
          <div className={styles.evidenceComingSoon}>
            <Icon name="solar:hourglass-line-linear" size={36} color="var(--neutral-150)" />
            <p className={styles.evidenceComingSoonTitle}>Coming soon</p>
            <p className={styles.evidenceComingSoonBody}>
              Evidence form pending design for {gap.code}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

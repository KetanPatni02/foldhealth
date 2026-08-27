import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import {
  MEASURE_NAMES,
  CBP_LOCATIONS,
  CBP_YES_NO,
  CBP_SYMPTOM_OPTIONS,
  EED_EXAM_TYPES,
  EED_EXAM_RESULTS,
  EED_EVIDENCE_TYPES,
  GAP_TEMPLATES,
} from './ClinicalNotePanel.utils';
import styles from './ClinicalNotePreviewBody.module.css';

/** Read-only note preview rendered in the CareGapDetailDrawer's left pane. */
export function ClinicalNotePreviewBody({ memberId, gapCode, noteId }) {
  const notes = useAppStore(s => (memberId ? s.clinicalNotesByMember?.[memberId] : null)) || [];
  const note = useMemo(() => {
    if (noteId) {
      const byId = notes.find(n => n.id === noteId);
      if (byId) return byId;
    }
    // Prefer the freshest note that covers this gap; fall back to the
    // freshest note tied to this member so a viewer never sees "empty".
    return notes.find(n => (n.gapCodes || []).includes(gapCode))
      || notes[0]
      || null;
  }, [notes, gapCode, noteId]);

  if (!note) {
    return (
      <div className={styles.emptyBody}>
        <Icon name="solar:notes-linear" size={36} color="var(--neutral-200)" />
        <p className={styles.emptyTitle}>No saved note yet for this gap.</p>
      </div>
    );
  }

  const payload = note.payload || {};
  const gapCodes = (note.gapCodes && note.gapCodes.length ? note.gapCodes : [gapCode]).filter(Boolean);
  const gapsPayload = payload.gaps || {};
  const telehealth = payload.audioOnly ? 'Audio-only visit — Verbal consent obtained.'
    : payload.audioVideo ? 'Audio-video visit — Verbal consent obtained.'
    : '—';

  return (
    <div className={styles.wrap}>
      {/* Title + signer/reviewer subtitle are rendered by the pane header
          in CareGapDetailDrawer — the body focuses on section content only. */}
      <Section title="Date of Service & Telehealth Statement">
        <KV label="DOS" value={payload.dateOfService} />
        <KV label="Telehealth Statement" value={telehealth} wide />
      </Section>

      {gapCodes.map(code => (
        <Section key={code} title={`${code} - ${MEASURE_NAMES[code] ?? code}`}>
          {code === 'CBP' && <CbpRows data={gapsPayload[code] || {}} />}
          {code === 'EED' && <EedRows data={gapsPayload[code] || {}} />}
          {code !== 'CBP' && code !== 'EED' && (
            <GenericRows code={code} data={gapsPayload[code] || {}} />
          )}
        </Section>
      ))}

      {(note.uploadedDocuments || []).length > 0 && (
        <Section title="Documents">
          {note.uploadedDocuments.map((doc, i) => (
            <div key={doc.id || i} className={styles.docRow}>
              <Icon name="solar:document-text-linear" size={16} color="var(--neutral-300)" />
              <span className={styles.docName}>{doc.filename || 'Uploaded Document'}</span>
              <button type="button" className={styles.docAction} onClick={() => { const w = window.open(doc.url, '_blank'); try { w?.focus(); } catch {} }}>
                <Icon name="solar:eye-linear" size={16} color="var(--neutral-400)" />
              </button>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.sectionBody}>
        {children}
      </div>
    </section>
  );
}

function KV({ label, value, wide }) {
  const display = value == null || value === '' ? '—' : String(value);
  return (
    <div className={wide ? styles.rowWide : styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowSep}>:</span>
      <span className={styles.rowValue}>{display}</span>
    </div>
  );
}

function GenericRows({ code, data }) {
  const fields = GAP_TEMPLATES[code];
  if (!fields?.length) return <KV label="Evidence" value="—" wide />;
  const hasAnyValue = fields.some(f => data[f.key] != null && data[f.key] !== '');
  if (!hasAnyValue) return <KV label="Evidence" value="—" wide />;
  return (
    <>
      {fields.map(f => {
        const raw = data[f.key];
        let display;
        if (f.type === 'checkbox') {
          display = raw ? 'Yes' : 'No';
        } else if ((f.type === 'select' || f.type === 'radio') && f.options) {
          display = f.options.find(o => o.value === raw)?.label || raw;
        } else {
          display = raw;
        }
        return <KV key={f.key} label={f.label} value={display} wide={!f.column} />;
      })}
    </>
  );
}

function CbpRows({ data }) {
  const loc = CBP_LOCATIONS.find(o => o.value === data.location)?.label || data.location;
  const yn = (v) => CBP_YES_NO.find(o => o.value === v)?.label
    || CBP_SYMPTOM_OPTIONS.find(o => o.value === v)?.label
    || (v === 'med-list' ? 'Yes (medications listed)' : v);
  const bp = data.systolic && data.diastolic ? `${data.systolic} / ${data.diastolic} mmHg` : null;
  return (
    <>
      <KV label="Reading recorded Date" value={data.bpDate} />
      <KV label="Blood Pressure" value={bp} />
      <KV label="Location Type" value={loc} />
      <KV label="Self-monitors BP regularly" value={yn(data.selfMonitors)} wide />
      <KV label="Taking BP meds as prescribed" value={yn(data.takingMeds)} wide />
      <KV label="Symptoms (BP < 100/60)" value={yn(data.symptomsLow)} wide />
      <KV label="Symptoms (BP > 140/90 and < 160/100)" value={yn(data.symptomsMid)} wide />
      <KV label="Symptoms (BP > 160/100)" value={yn(data.symptomsHigh)} wide />
    </>
  );
}

function EedRows({ data }) {
  const examType = EED_EXAM_TYPES.find(o => o.value === data.examType)?.label || data.examType;
  const evidenceType = EED_EVIDENCE_TYPES.includes(data.evidenceType) ? data.evidenceType : data.evidenceType;
  const result = EED_EXAM_RESULTS.includes(data.examResult) ? data.examResult : data.examResult;
  return (
    <>
      <KV label="Evidence Type" value={evidenceType} wide />
      <KV label="Exam Type" value={examType} />
      <KV label="Exam Date" value={data.examDate} />
      <KV label="Examining Provider" value={data.examiningProvider} />
      <KV label="Exam Result" value={result} />
      <KV label="ICD-10 Diagnosis Code" value={data.icd10} wide />
      <KV label="Follow-up" value={summarizeFollowUp(data.followUp)} wide />
    </>
  );
}

function summarizeFollowUp(followUp) {
  if (!followUp || typeof followUp !== 'object') return null;
  const labels = Object.entries(followUp)
    .filter(([, v]) => v)
    .map(([k]) => FOLLOW_UP_LABEL[k] || k);
  return labels.length ? labels.join(', ') : null;
}

const FOLLOW_UP_LABEL = {
  referOphthalmology: 'Refer to ophthalmology',
  laserTreatment: 'Laser treatment recommended',
  antiVegf: 'Anti-VEGF therapy discussed',
  annualScheduled: 'Annual follow-up scheduled',
};


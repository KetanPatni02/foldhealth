import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import {
  MEASURE_NAMES,
  CBP_LOCATIONS,
  CBP_YES_NO,
  CBP_SYMPTOM_OPTIONS,
  EED_EXAM_TYPES,
  EED_EXAM_RESULTS,
  EED_EVIDENCE_TYPES,
} from './ClinicalNotePanel.utils';
import styles from './ClinicalNotePreviewBody.module.css';

/**
 * ClinicalNotePreviewBody — read-only note summary for Draft / Pending
 * Review / Signed notes. Rendered inside the CareGapDetailDrawer's left
 * workspace slot when the user clicks the eye affordance on any note card.
 * Mirrors Figma 511:105429 — sectioned key/value rows, optional PDF, plus
 * a DB-backed version audit (clinical_note_versions) so Amend history never
 * relies on local state.
 *
 * The payload it renders is whatever `upsertClinicalNote` persisted for
 * this member/gap — currently `{ dateOfService, audioOnly, audioVideo,
 * gaps: { <code>: <gapState> } }`. Unknown fields are skipped so future
 * form additions surface without touching this component.
 */
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
  const versions = useAppStore(s => (note?.id ? s.clinicalNoteVersionsById?.[note.id] : null)) || [];
  const fetchClinicalNoteVersions = useAppStore(s => s.fetchClinicalNoteVersions);
  useEffect(() => { if (note?.id) fetchClinicalNoteVersions(note.id); }, [note?.id, fetchClinicalNoteVersions]);

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
            <KV label="Evidence" value="—" wide />
          )}
        </Section>
      ))}

      {note?.pdfDataUrl && (
        <Section title="Document">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={note.status === 'signed' ? 'success' : note.status === 'submitted' ? 'warning' : 'grey'} size="S" label={note.status} />
            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--neutral-400)' }}>{note.pdfFilename || 'Clinical Note PDF'}</span>
            <Button variant="secondary" size="S" leadingIcon="solar:eye-linear" onClick={() => { const w = window.open(note.pdfDataUrl, '_blank'); try { w?.focus(); } catch {} }}>
              View PDF
            </Button>
            <Button variant="secondary" size="S" leadingIcon="solar:document-text-linear" onClick={() => {
              const a = document.createElement('a'); a.href = note.pdfDataUrl; a.download = note.pdfFilename || 'clinical-note.pdf'; a.click();
            }}>
              Download
            </Button>
          </div>
          <div style={{ marginTop: 12, border: '1px solid var(--neutral-150)', borderRadius: 8, overflow: 'hidden', height: 420 }}>
            <iframe title="Clinical Note PDF" src={note.pdfDataUrl} style={{ width: '100%', height: '100%', border: 0 }} />
          </div>
        </Section>
      )}

      <Section title={`Audit Log — ${versions.length ? `${versions.length} prior version${versions.length === 1 ? '' : 's'}` : 'No amendments yet'}`}>
        {versions.length === 0 ? (
          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--neutral-400)' }}>
            Current version is <Badge tone={note.status === 'signed' ? 'success' : note.status === 'submitted' ? 'warning' : 'grey'} size="S" label={note.status} /> saved {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''} by {note.authorName || note.signedByName || '—'}. Every Amend is snapshotted to <code>clinical_note_versions</code> via DB trigger, so history persists after reload.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Current */}
            <div style={{ padding: '10px 12px', border: '1px solid var(--primary-150)', background: 'var(--primary-25)', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', display: 'flex', gap: 8, alignItems: 'center' }}>
                Current <Badge tone={note.status === 'signed' ? 'success' : note.status === 'submitted' ? 'warning' : 'grey'} size="S" label={note.status} />
                <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>{note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''} · {note.authorName || note.signedByName || '—'}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 'var(--font-sm)', color: 'var(--neutral-500)' }}>
                DOS: {payload.dateOfService || '—'} · Gaps: {(note.gapCodes || []).join(', ') || '—'}
              </div>
            </div>
            {versions.map(v => (
              <div key={v.id} style={{ padding: '10px 12px', border: '1px solid var(--neutral-150)', borderRadius: 8, background: 'var(--neutral-0)' }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', display: 'flex', gap: 8, alignItems: 'center' }}>
                  v{v.version} <Badge tone={v.status === 'signed' ? 'success' : v.status === 'submitted' ? 'warning' : 'grey'} size="S" label={v.status} />
                  <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''} · {v.authorName || v.signedByName || '—'}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 'var(--font-sm)', color: 'var(--neutral-500)' }}>
                  DOS: {v.payload?.dateOfService || '—'} · Gaps: {(v.payload?.gaps ? Object.keys(v.payload.gaps).join(', ') : (v.payload?.gapCodes?.join(', ') || '—'))}
                </div>
                {v.pdfFilename && <div style={{ marginTop: 4, fontSize: 'var(--font-xs)', color: 'var(--neutral-300)' }}>PDF: {v.pdfFilename}</div>}
              </div>
            ))}
          </div>
        )}
      </Section>
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

/* Per-gap value rows kept here so the preview never has to fall back to
   the raw payload keys — screen reads the same as the note-authoring
   form's labels. */
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


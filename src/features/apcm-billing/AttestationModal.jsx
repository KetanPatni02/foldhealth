import { useRef, useState } from 'react';
import Signature from '@uiw/react-signature';
import { Drawer } from '../../components/Drawer/Drawer';
import { Icon } from '../../components/Icon/Icon';
import { Input } from '../../components/Input/Input';
import { Toggle } from '../../components/Toggle/Toggle';
import { Button } from '../../components/Button/Button';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import styles from './AttestationModal.module.css';

// perfect-freehand stroke options — mirrors the controls shown in the
// @uiw/react-signature demo (Size / Smoothing / Thinning / Streamline).
const SIGNATURE_OPTIONS = {
  size: 4,
  smoothing: 0.46,
  thinning: 0.73,
  streamline: 0.5,
};

// Persist drawn signatures to localStorage so users can reuse a signature
// across attestation sessions. Stored per browser, capped at 5 entries to
// keep the panel scannable.
const SAVED_SIGNATURES_KEY = 'apcm-saved-signatures';
const MAX_SAVED_SIGNATURES = 5;

function loadSavedSignatures() {
  try {
    const raw = localStorage.getItem(SAVED_SIGNATURES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistSavedSignatures(list) {
  try { localStorage.setItem(SAVED_SIGNATURES_KEY, JSON.stringify(list)); }
  catch { /* quota or private mode — silent */ }
}

function serializeSignatureSvg(svgEl) {
  if (!svgEl) return null;
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  // Ensure a viewBox is set so the SVG scales correctly in thumbnails.
  if (!clone.getAttribute('viewBox')) {
    const w = clone.getAttribute('width') || svgEl.clientWidth;
    const h = clone.getAttribute('height') || svgEl.clientHeight;
    clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  return new XMLSerializer().serializeToString(clone);
}

const SIGNATURE_MODES = [
  { key: 'type', label: 'Type', icon: 'solar:keyboard-linear' },
  { key: 'draw', label: 'Draw', icon: 'solar:pen-linear' },
];

const SIGNATURE_HINT = {
  type: 'By typing your name above you are applying your digital signature and agree this constitutes a legally binding signature.',
  draw: 'By drawing your signature above you are applying your digital signature and agree this constitutes a legally binding signature.',
};

const ATTESTATION_TEXT =
  'I attest that this medical record entry accurately reflects the history, examination, ' +
  'assessments, diagnoses, and procedures/services that I personally performed or directly ' +
  'supervised on the date(s) of service indicated. I further attest that all services documented ' +
  'were medically necessary, appropriate to the patient\'s condition, and provided in accordance ' +
  'with applicable standards of care and payer requirements. To the best of my knowledge, the ' +
  'information recorded in this note is complete and accurate.';

// Builds the props shape expected by the shared PatientBanner component
// from an APCM patient record (which lacks gender/age — those fields are
// optional in the banner and will simply not render).
function toBannerProps(patient) {
  if (!patient) return null;
  const initials = patient.renderingProviderInitials
    || (patient.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('');
  return {
    initials,
    name: patient.name,
    memberId: patient.memberId,
  };
}

function now() {
  return new Date().toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

export function AttestationModal({ patients = [], onClose, onSubmit }) {
  const selectedCount = patients.length;
  const [patientListOpen, setPatientListOpen] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [npi, setNpi] = useState('');
  const [signatureDate] = useState(now);
  const [signature, setSignature] = useState('');
  const [signatureMode, setSignatureMode] = useState('type'); // 'type' | 'draw'
  const [drawnSignature, setDrawnSignature] = useState(null); // truthy when current pad has strokes
  const [savedSignatures, setSavedSignatures] = useState(loadSavedSignatures);
  const [selectedSavedId, setSelectedSavedId] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const signaturePadRef = useRef(null);
  const [consent, setConsent] = useState(null); // 'accept' | 'decline'
  const [errors, setErrors] = useState({});
  const [resultType, setResultType] = useState(null); // 'accept' | 'decline'

  const validate = () => {
    const e = {};
    if (!providerName.trim()) e.providerName = 'Required';
    if (!credentials.trim()) e.credentials = 'Required';
    if (!/^\d{10}$/.test(npi.trim())) e.npi = 'Must be 10 digits';
    if (signatureMode === 'type') {
      if (!signature.trim()) e.signature = 'Required';
    } else {
      // Draw mode — either drew strokes OR selected a previously saved signature.
      if (!drawnSignature && !selectedSavedId) e.signature = 'Please draw your signature or pick a saved one';
    }
    if (!consent) e.consent = 'Please select an option';
    return e;
  };

  const handleClearSignature = () => {
    signaturePadRef.current?.clear();
    setDrawnSignature(null);
    setErrors(p => ({ ...p, signature: null }));
  };

  const handleDownloadSignature = () => {
    const svg = signaturePadRef.current?.svg;
    if (!svg) return;
    // Wrap the live <svg> as a self-contained file. cloneNode + explicit
    // xmlns so the downloaded file renders standalone in any viewer.
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const source = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signature-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // @uiw/react-signature's onPointer fires on each pointer move while
  // drawing. The first invocation tells us a stroke was started — flip
  // drawnSignature truthy so validation + download enable.
  const handlePointer = (points) => {
    if (points && points.length > 0) {
      setDrawnSignature('drawn');
      setErrors(p => ({ ...p, signature: null }));
    }
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setResultType(consent);
  };

  const handleDone = () => {
    onSubmit(consent);
  };

  // ── Result view (shown inside Drawer after submit) ──
  if (resultType) {
    const isAccept = resultType === 'accept';
    return (
      <Drawer
        title="APCM Billing Attestation"
        onClose={handleDone}
      >
        <div className={styles.resultBody}>
          <div className={`${styles.resultIcon} ${isAccept ? styles.resultIconSuccess : styles.resultIconDecline}`}>
            <Icon
              name={isAccept ? 'solar:check-circle-linear' : 'solar:close-circle-linear'}
              size={32}
              color={isAccept ? 'var(--status-success)' : 'var(--status-error)'}
            />
          </div>
          <p className={styles.resultTitle}>
            {isAccept ? 'Claim Generation In Progress' : 'Billing Not Generated'}
          </p>
          <p className={styles.resultMsg}>
            {isAccept
              ? `Patient claim generation is in progress for ${selectedCount} patient${selectedCount !== 1 ? 's' : ''}. You will be notified once the claims have been processed.`
              : `Billing has not been generated as the consent to bill has been declined for ${selectedCount} patient${selectedCount !== 1 ? 's' : ''}.`}
          </p>
          <Button variant="primary" onClick={handleDone}>Done</Button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      title="APCM Billing Attestation"
      onClose={onClose}
      headerRight={
        <Button variant="primary" size="L" leadingIcon="solar:pen-linear" onClick={handleSubmit}>
          Submit Attestation
        </Button>
      }
    >
      <div className={styles.body}>

        {/* Patient summary —
            • 1 patient  → show that patient's banner directly
            • N patients → show a count row that expands to reveal banners */}
        {selectedCount === 1 ? (
          <PatientBanner {...toBannerProps(patients[0])} />
        ) : (
          <div className={styles.patientSummaryGroup}>
            <button
              type="button"
              className={styles.patientSummaryHeader}
              onClick={() => setPatientListOpen(o => !o)}
              aria-expanded={patientListOpen}
            >
              <Icon name="solar:users-group-rounded-linear" size={16} color="var(--primary-400)" />
              <span className={styles.patientSummaryLabel}>
                Attesting for {selectedCount} patients
              </span>
              <Icon
                name="solar:alt-arrow-down-linear"
                size={14}
                color="var(--primary-400)"
                className={`${styles.patientSummaryChevron} ${patientListOpen ? styles.patientSummaryChevronOpen : ''}`}
              />
            </button>
            {patientListOpen && (
              <div className={styles.patientSummaryList}>
                {patients.map(p => <PatientBanner key={p.id} {...toBannerProps(p)} />)}
              </div>
            )}
          </div>
        )}

        {/* Attestation text */}
        <div className={styles.attestationBox}>
          <div className={styles.attestationTitle}>Attestation Statement</div>
          <p className={styles.attestationText}>{ATTESTATION_TEXT}</p>
        </div>

        {/* Signatory information */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Signatory Information</div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>
                Provider Name <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${errors.providerName ? styles.inputError : ''}`}
                placeholder="Full name"
                value={providerName}
                onChange={e => { setProviderName(e.target.value); setErrors(p => ({ ...p, providerName: null })); }}
              />
              {errors.providerName && <span className={styles.errorMsg}>{errors.providerName}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Credentials <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${errors.credentials ? styles.inputError : ''}`}
                placeholder="e.g. MD, DO, NP"
                value={credentials}
                onChange={e => { setCredentials(e.target.value); setErrors(p => ({ ...p, credentials: null })); }}
              />
              {errors.credentials && <span className={styles.errorMsg}>{errors.credentials}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                NPI <span className={styles.required}>*</span>
              </label>
              <input
                className={`${styles.input} ${errors.npi ? styles.inputError : ''}`}
                placeholder="10-digit NPI"
                value={npi}
                maxLength={10}
                onChange={e => { setNpi(e.target.value.replace(/\D/g, '')); setErrors(p => ({ ...p, npi: null })); }}
              />
              {errors.npi && <span className={styles.errorMsg}>{errors.npi}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Date &amp; Time of Signature</label>
              <input
                className={`${styles.input} ${styles.inputReadonly}`}
                value={signatureDate}
                readOnly
              />
            </div>

            <div className={`${styles.field} ${styles.formGridFull}`}>
              <div className={styles.signatureHeader}>
                <label className={styles.label}>
                  Digital Signature <span className={styles.required}>*</span>
                </label>
                <Toggle
                  items={SIGNATURE_MODES}
                  active={signatureMode}
                  onChange={(mode) => { setSignatureMode(mode); setErrors(p => ({ ...p, signature: null })); }}
                  size="S"
                />
              </div>

              {signatureMode === 'type' ? (
                <Input
                  variant={errors.signature ? 'error' : 'default'}
                  placeholder="Type your full name as your digital signature"
                  value={signature}
                  onChange={e => { setSignature(e.target.value); setErrors(p => ({ ...p, signature: null })); }}
                />
              ) : (
                <div className={`${styles.signaturePad} ${errors.signature ? styles.signaturePadError : ''}`}>
                  <Signature
                    ref={signaturePadRef}
                    options={SIGNATURE_OPTIONS}
                    onPointer={handlePointer}
                    className={styles.signatureCanvas}
                  />
                  <div className={styles.signatureActions}>
                    <button
                      type="button"
                      className={styles.signatureActionBtn}
                      onClick={handleClearSignature}
                      aria-label="Clear signature"
                    >
                      <Icon name="solar:eraser-linear" size={14} color="var(--neutral-300)" />
                      Clear
                    </button>
                    <button
                      type="button"
                      className={styles.signatureActionBtn}
                      onClick={handleDownloadSignature}
                      disabled={!drawnSignature}
                      aria-label="Download signature as SVG"
                    >
                      <Icon name="solar:download-minimalistic-linear" size={14} color="var(--neutral-300)" />
                      Download SVG
                    </button>
                  </div>
                </div>
              )}

              <span className={styles.signatureHint}>
                {SIGNATURE_HINT[signatureMode]}
              </span>
              {errors.signature && <span className={styles.errorMsg}>{errors.signature}</span>}
            </div>
          </div>
        </div>

        {/* Accept / Decline */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Consent to Bill</div>
          <div className={styles.consentOptions}>
            {/* Accept */}
            <div
              className={[
                styles.consentOption,
                consent === 'accept' ? `${styles.consentOptionSelected} ${styles.accept}` : '',
              ].join(' ')}
              onClick={() => { setConsent('accept'); setErrors(p => ({ ...p, consent: null })); }}
            >
              <div className={`${styles.radioOuter} ${styles.radioOuterAccept} ${consent === 'accept' ? styles.selected : ''}`}>
                {consent === 'accept' && <div className={`${styles.radioDot} ${styles.radioDotAccept}`} />}
              </div>
              <span className={styles.consentLabel}>
                <span className={styles.consentLabelAccept}>I accept</span> the consent to bill for the selected patient/s
              </span>
            </div>

            {/* Decline */}
            <div
              className={[
                styles.consentOption,
                consent === 'decline' ? `${styles.consentOptionSelected} ${styles.decline}` : '',
              ].join(' ')}
              onClick={() => { setConsent('decline'); setErrors(p => ({ ...p, consent: null })); }}
            >
              <div className={`${styles.radioOuter} ${styles.radioOuterDecline} ${consent === 'decline' ? styles.selected : ''}`}>
                {consent === 'decline' && <div className={`${styles.radioDot} ${styles.radioDotDecline}`} />}
              </div>
              <span className={styles.consentLabel}>
                <span className={styles.consentLabelDecline}>I decline</span> the consent to bill for the selected patient/s
              </span>
            </div>
          </div>
          {errors.consent && <span className={styles.errorMsg}>{errors.consent}</span>}
        </div>

      </div>
    </Drawer>
  );
}

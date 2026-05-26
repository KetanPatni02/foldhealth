import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Button } from '../../components/Button/Button';
import { Avatar } from '../../components/Avatar/Avatar';
import styles from './AttestationModal.module.css';

const ATTESTATION_TEXT =
  'I attest that this medical record entry accurately reflects the history, examination, ' +
  'assessments, diagnoses, and procedures/services that I personally performed or directly ' +
  'supervised on the date(s) of service indicated. I further attest that all services documented ' +
  'were medically necessary, appropriate to the patient\'s condition, and provided in accordance ' +
  'with applicable standards of care and payer requirements. To the best of my knowledge, the ' +
  'information recorded in this note is complete and accurate.';

function now() {
  return new Date().toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });
}

// ── Result modal shown after submission ──
function ResultModal({ type, count, onClose }) {
  const isAccept = type === 'accept';
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.resultModal} onClick={e => e.stopPropagation()}>
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
            ? `Patient claim generation is in progress for ${count} patient${count !== 1 ? 's' : ''}. You will be notified once the claims have been processed.`
            : `Billing has not been generated as the consent to bill has been declined for ${count} patient${count !== 1 ? 's' : ''}.`}
        </p>
        <Button variant="primary" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

export function AttestationModal({ selectedCount, onClose, onSubmit }) {
  const [providerName, setProviderName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [npi, setNpi] = useState('');
  const [signatureDate] = useState(now);
  const [signature, setSignature] = useState('');
  const [consent, setConsent] = useState(null); // 'accept' | 'decline'
  const [errors, setErrors] = useState({});
  const [resultType, setResultType] = useState(null); // 'accept' | 'decline'

  const validate = () => {
    const e = {};
    if (!providerName.trim()) e.providerName = 'Required';
    if (!credentials.trim()) e.credentials = 'Required';
    if (!/^\d{10}$/.test(npi.trim())) e.npi = 'Must be 10 digits';
    if (!signature.trim()) e.signature = 'Required';
    if (!consent) e.consent = 'Please select an option';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setResultType(consent);
  };

  const handleResultClose = () => {
    onSubmit(consent);
  };

  if (resultType) {
    return <ResultModal type={resultType} count={selectedCount} onClose={handleResultClose} />;
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>APCM Billing Attestation</h2>
            <span className={styles.subtitle}>
              Review and sign before triggering billing
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Close">
            <Icon name="solar:close-circle-linear" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Selected patient count */}
          <div className={styles.patientSummary}>
            <Icon name="solar:users-group-rounded-linear" size={16} color="var(--primary-400)" />
            Attesting for {selectedCount} patient{selectedCount !== 1 ? 's' : ''}
          </div>

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
                <label className={styles.label}>
                  Digital Signature <span className={styles.required}>*</span>
                </label>
                <input
                  className={`${styles.input} ${styles.signatureInput} ${errors.signature ? styles.inputError : ''}`}
                  placeholder="Type your full name as your digital signature"
                  value={signature}
                  onChange={e => { setSignature(e.target.value); setErrors(p => ({ ...p, signature: null })); }}
                />
                <span className={styles.signatureHint}>
                  By typing your name above you are applying your digital signature and agree this constitutes a legally binding signature.
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

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" leadingIcon="solar:pen-linear" onClick={handleSubmit}>
            Submit Attestation
          </Button>
        </div>

      </div>
    </div>
  );
}

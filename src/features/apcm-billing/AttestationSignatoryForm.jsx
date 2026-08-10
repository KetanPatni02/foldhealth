import Signature from '@uiw/react-signature';
import { Icon } from '../../components/Icon/Icon';
import { Input } from '../../components/Input/Input';
import { Toggle } from '../../components/Toggle/Toggle';
import { SIGNATURE_HINT, SIGNATURE_MODES, SIGNATURE_OPTIONS } from './attestationModalUtils';
import styles from './AttestationModal.module.css';

export function AttestationSignatoryForm({
  providerName,
  onProviderNameChange,
  credentials,
  onCredentialsChange,
  npi,
  onNpiChange,
  signatureDate,
  signatureMode,
  onSignatureModeChange,
  signature,
  onSignatureChange,
  signaturePadRef,
  onPointer,
  onClearSignature,
  onDownloadSignature,
  drawnSignature,
  errors,
}) {
  return (
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
            onChange={onProviderNameChange}
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
            onChange={onCredentialsChange}
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
            onChange={onNpiChange}
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
              onChange={onSignatureModeChange}
              size="S"
            />
          </div>

          {signatureMode === 'type' ? (
            <Input
              variant={errors.signature ? 'error' : 'default'}
              placeholder="Type your full name as your digital signature"
              value={signature}
              onChange={onSignatureChange}
            />
          ) : (
            <div className={`${styles.signaturePad} ${errors.signature ? styles.signaturePadError : ''}`}>
              <Signature
                ref={signaturePadRef}
                options={SIGNATURE_OPTIONS}
                onPointer={onPointer}
                className={styles.signatureCanvas}
              />
              <div className={styles.signatureActions}>
                <button
                  type="button"
                  className={styles.signatureActionBtn}
                  onClick={onClearSignature}
                  aria-label="Clear signature"
                >
                  <Icon name="solar:eraser-linear" size={14} color="var(--neutral-300)" />
                  Clear
                </button>
                <button
                  type="button"
                  className={styles.signatureActionBtn}
                  onClick={onDownloadSignature}
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
  );
}

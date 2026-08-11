import styles from './AttestationModal.module.css';

export function AttestationConsentOptions({ consent, onConsentChange, errors }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Consent to Bill</div>
      <div className={styles.consentOptions}>
        {/* Accept */}
        <div
          className={[
            styles.consentOption,
            consent === 'accept' ? `${styles.consentOptionSelected} ${styles.accept}` : '',
          ].join(' ')}
          onClick={() => onConsentChange('accept')}
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
          onClick={() => onConsentChange('decline')}
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
  );
}

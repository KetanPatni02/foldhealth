import { Icon } from '../../../components/Icon/Icon';
import styles from './UploadDocumentDrawer.module.css';

export function StepIndicator({ activeStep = 1 }) {
  return (
    <div className={styles.steps}>
      <div className={styles.step}>
        <span className={`${styles.stepBadge}${activeStep >= 1 ? '' : ` ${styles.stepBadgeIdle}`}`}>1</span>
        <span className={`${styles.stepLabel}${activeStep >= 1 ? '' : ` ${styles.stepLabelIdle}`}`}>Upload File</span>
      </div>
      <span className={styles.stepDivider} />
      <div className={styles.step}>
        <span className={`${styles.stepBadge}${activeStep >= 2 ? '' : ` ${styles.stepBadgeIdle}`}`}>2</span>
        <span className={`${styles.stepLabel}${activeStep >= 2 ? '' : ` ${styles.stepLabelIdle}`}`}>AI Review</span>
      </div>
    </div>
  );
}

const ACCEPT_EXT  = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff';
const ACCEPT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/tiff',
]);
const ACCEPT_LABEL = 'Supported formats: PDF, DOC, JPG, PNG, TIFF';

const WHAT_HAPPENS_NEXT_STEPS = [
  {
    n: 1,
    title: 'We extract key information',
    body: 'patient demographics, date of service, provider, place of service, and ICD codes.',
  },
  {
    n: 2,
    title: 'You review and confirm',
    body: 'Review each record and fix any flagged fields.',
  },
  {
    n: 3,
    title: 'Add or merge',
    body: 'Confirm to add a new worklist entry or merge into an existing one.',
  },
];

const CHOOSER_OPTIONS = [
  {
    key: 'single', tone: 'primary',
    icon: 'solar:user-rounded-linear',
    title: 'Add a Single Encounter',
    desc: 'Manually add one encounter for a patient — pick the patient, add ICDs, attach the document.',
    cta: 'Add Encounter',
  },
  {
    key: 'picker', tone: 'secondary',
    icon: 'solar:users-group-rounded-linear',
    title: 'Upload Single Document',
    desc: 'Upload one PDF that contains encounters for one or more patients — AI extracts and groups them for review.',
    cta: 'Upload PDF',
  },
  {
    key: 'sftp', tone: 'neutral',
    icon: 'solar:server-2-linear',
    title: 'Upload Multiple Documents (SFTP)',
    desc: 'Drop multiple documents on the secure SFTP server — they\'ll be ingested automatically and queued for AI review.',
    cta: 'Open SFTP Details',
  },
];

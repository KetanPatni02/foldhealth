import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import styles from './HccTutorialPane.module.css';

// HCC Tutorial (Figma A8BWt2o8MJkUhZ79Vq1SM0 2383:130863): what each ICD
// action does, and what each HCC status means. Opened from the chart
// toolbar's More > Tutorial.
const SECTIONS = [
  {
    title: 'HCC Workflow Tutorial',
    items: [
      { term: 'Accept', text: ['Confirm agreement with the suggested ICD-10 diagnosis when it is clinically valid and supported by your assessment.'] },
      {
        term: 'Dismiss',
        text: [
          'Indicate disagreement with the suggested diagnosis if it is not present, ruled out, historical or a misclassification.',
          'Please provide a reason for dismissal to support transparency and improve coding accuracy.',
        ],
      },
      { term: 'Comment', text: ['Add context or clarification regarding the diagnosis that can be viewed by other care team members for collaborative review.'] },
      { term: 'Document', text: ['Attach supporting evidence (e.g., labs, imaging reports, consult notes) that either supports or refutes the diagnosis.'] },
    ],
  },
  {
    title: 'HCC Status Tutorial',
    items: [
      {
        term: 'Open HCC - Unresolved Diagnoses',
        bullets: [
          'Indicates the HCC workflow is open, with diagnoses requiring physician review.',
          'Diagnoses under this status must be addressed using one of the following actions: Accept, Dismiss, or Comment.',
        ],
      },
      {
        term: 'Closed HCC - Unresolved Diagnoses',
        bullets: [
          'Indicates the HCC workflow has been closed, but some diagnoses remain unresolved.',
          'These may include diagnoses that were not reviewed or lacked sufficient information to be resolved.',
          'Diagnoses under this status can still be addressed using: Accept, Dismiss, or Comment.',
        ],
      },
      {
        term: 'Closed HCC - All Diagnoses Resolved',
        bullets: [
          'Indicates that all HCC diagnoses have been reviewed and resolved through Accept, Dismiss, or Comment.',
          'No further action is required.',
        ],
      },
      {
        term: 'Closed HCC - Other',
        bullets: [
          'Indicates that the HCC workflow has been closed due to administrative reasons, patient ineligibility, duplicate records, data corrections, or other factors.',
          'No further action is required.',
        ],
      },
    ],
  },
];

/** The chart's left pane in Tutorial mode. `onClose` collapses the pane. */
export function HccTutorialPane({ onClose }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>HCC Tutorial</span>
        <ActionButton tooltip="Close" onClick={onClose}>
          <CloseIcon size={16} color="var(--neutral-300)" />
        </ActionButton>
      </div>
      <div className={styles.body}>
        {SECTIONS.map(section => (
          <section key={section.title} className={styles.card}>
            <h3 className={styles.cardTitle}>{section.title}</h3>
            {section.items.map(item => (
              <div key={item.term} className={styles.item}>
                <div className={styles.term}>{item.term}</div>
                {item.text?.map(t => <p key={t} className={styles.text}>{t}</p>)}
                {item.bullets && (
                  <ul className={styles.bullets}>
                    {item.bullets.map(b => <li key={b}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

import { Button } from '../../../../../../../components/Button/Button';
import { UnityIcon } from '../../../../../../../components/UnityIcon/UnityIcon';
import { TableSkeleton } from '../../../../../../../components/TableSkeleton/TableSkeleton';
import styles from './IndividualizedPlanCard.module.css';

/**
 * The Individualized Plan AI surface on a care plan:
 *   'start'    an empty plan: draft it from the record, or start from a template
 *   'drafting' UnityAI is reading the record and drafting
 *   'review'   AI-drafted items still awaiting review: review all, or discard
 */
export function IndividualizedPlanCard({ state, pending = 0, error, onDraft, onUseTemplate, onReviewAll, onDiscard, busy = false }) {
  if (state === 'drafting') {
    return (
      <div className={styles.card} role="status" aria-live="polite">
        <span className={styles.title}>
          <UnityIcon size={16} color="var(--primary-300)" />
          Drafting an individualized plan…
        </span>
        <span className={styles.text}>
          Reading conditions, lab trends, recent events, assessments and barriers, then choosing templates and tailoring goals, interventions and barriers.
        </span>
        <TableSkeleton rows={4} />
      </div>
    );
  }
  if (state === 'review') {
    return (
      <div className={`${styles.card} ${styles.review}`} role="status">
        <div className={styles.row}>
          <UnityIcon size={16} color="var(--primary-300)" />
          <div className={styles.copy}>
            <span className={styles.title}>{pending} AI-drafted {pending === 1 ? 'item' : 'items'} awaiting review</span>
            <span className={styles.text}>Open an item’s AI · Review badge to see why it was suggested and the patient inputs it cites. Edit or remove anything before signing.</span>
          </div>
          <Button variant="secondary" size="S" disabled={busy} onClick={onDiscard}>Discard AI Items</Button>
          <Button size="S" disabled={busy} onClick={onReviewAll}>Mark All Reviewed</Button>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.card}>
      <span className={styles.title}>Start this care plan</span>
      <span className={styles.text}>
        UnityAI reads this patient’s conditions, latest assessments, barriers, recent events and lab trends, picks the best-fitting templates and drafts a tailored plan. Every suggestion cites the inputs behind it and stays flagged until you review it.
      </span>
      {error && <span className={styles.error}>{error}</span>}
      <div className={styles.actions}>
        <Button size="L" leadingIconElement={<UnityIcon size={16} color="currentColor" />} onClick={onDraft}>
          Draft Individualized Plan
        </Button>
        {onUseTemplate && <Button variant="secondary" size="L" onClick={onUseTemplate}>Use Template</Button>}
      </div>
    </div>
  );
}

import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/Button/Button';
import { Icon } from '../../../components/Icon/Icon';
import styles from './DismissConfirmModal.module.css';

/**
 * DismissConfirmModal — shown when a user clicks Dismiss on an ICD that's
 * linked to more than one DOS. Dismissal is all-or-nothing per the spec
 * (partial dismissal is not permitted), so we surface the count + a
 * warning callout before letting the user commit.
 *
 * Props:
 *  - open       (boolean)        Whether the modal is visible.
 *  - icd        ({ code, dos_entries })  The ICD being dismissed.
 *  - onConfirm  (fn)             Apply Dismiss across all linked DOSs.
 *  - onCancel   (fn)             Dismiss the modal without action.
 */
export function DismissConfirmModal({ open, icd, onConfirm, onCancel }) {
  if (!icd) return null;
  const dosCount = icd.dos_entries?.length || 1;

  return (
    <Dialog open={!!open} onOpenChange={(o) => { if (!o) onCancel?.(); }}>
      <DialogContent className={styles.content}>
        <div className={styles.header}>
          <span className={styles.iconBubble}>
            <Icon name="solar:danger-triangle-linear" size={17} color="var(--status-error)" />
          </span>
          <DialogTitle className={styles.title}>Dismiss All Linked DOSs?</DialogTitle>
        </div>

        <p className={styles.body}>
          <strong className={styles.code}>{icd.code}</strong> is linked to{' '}
          <strong className={styles.dosCount}>
            {dosCount} {dosCount === 1 ? 'DOS' : 'DOSs'}
          </strong>
          . Dismissal applies to <strong>all linked DOSs</strong> simultaneously.
        </p>

        <div className={styles.warning}>
          <div className={styles.warningLine}>
            ⚠ Partial dismissal for a subset of DOSs is not permitted.
          </div>
          {dosCount > 1 && (
            <div className={styles.warningMeta}>
              This will generate <strong>{dosCount}</strong> DELETE entries in the ASM file.
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="M" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="M" onClick={onConfirm}>
            Dismiss All {dosCount > 1 ? `(${dosCount} DOSs)` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

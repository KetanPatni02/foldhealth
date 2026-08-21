import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from '../../../components/ConfirmDialog/AlertDialogPrimitives';
import { Button } from '../../../components/Button/Button';
import { Textarea } from '../../../components/Textarea/Textarea';
import styles from './RecordsRequestDialog.module.css';

// Roles a QA / Compliance user can request records FROM. The value is the
// engine role key that setRoleState / lifecycle.js speak; the label is what
// the coder sees. Keep the order Coder-first — retrieval requests skew
// heavily toward coding clarifications.
const ROLE_OPTIONS = [
  { value: 'coder',   label: 'Coder',        description: 'Ask the coder to revisit their ICD/HCC decisions.' },
  { value: 'support', label: 'Support Team', description: 'Ask Support to retrieve or re-upload documentation.' },
];

const COMMENT_MAX = 150;

/**
 * Modal shown when QA / Compliance picks `Record Requested` in the
 * DosStatusMenu. Forces a role selection (Coder or Support Team) before
 * the transition commits and optionally captures a comment (≤150 chars)
 * that the destination role will see in the Comments tab. Layout mirrors
 * Figma ICD-Import 5723-171525.
 */
export function RecordsRequestDialog({ onCancel, onConfirm }) {
  const [role, setRole] = useState(null);
  const [comment, setComment] = useState('');
  const canSubmit = role != null;
  const clamp = (v) => v.slice(0, COMMENT_MAX);
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel?.(); }}>
      <AlertDialogContent className={styles.dialog}>
        <div className={styles.header}>
          <AlertDialogTitle className={styles.title}>
            Request Records?
          </AlertDialogTitle>
          <AlertDialogDescription className={styles.subtitle}>
            Select who you'd like to request the records from.
          </AlertDialogDescription>
        </div>

        <div className={styles.radioGroup} role="radiogroup" aria-label="Request records from">
          {ROLE_OPTIONS.map((opt) => {
            const active = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={opt.label}
                className={styles.option}
                onClick={() => setRole(opt.value)}
              >
                <span className={[styles.radio, active ? styles.radioActive : ''].filter(Boolean).join(' ')}>
                  {active && <span className={styles.radioDot} />}
                </span>
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{opt.label}</span>
                  <span className={styles.optionDescription}>{opt.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.commentField}>
          <label className={styles.commentLabel} htmlFor="records-request-comment">
            Comment (Optional)
          </label>
          <div className={styles.commentBox}>
            <Textarea
              id="records-request-comment"
              rows={3}
              placeholder="Add a Comment"
              value={comment}
              onChange={(e) => setComment(clamp(e.target.value))}
              maxLength={COMMENT_MAX}
            />
            <span className={styles.commentCounter} aria-live="polite">
              {comment.length}/{COMMENT_MAX}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="L" fullWidth onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            size="L"
            fullWidth
            disabled={!canSubmit}
            onClick={() => onConfirm({ destinationRole: role, note: comment.trim() })}
          >
            Request Record
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

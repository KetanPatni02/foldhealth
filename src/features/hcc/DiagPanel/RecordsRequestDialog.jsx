import { useEffect, useMemo, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from '../../../components/ConfirmDialog/AlertDialogPrimitives';
import { Button } from '../../../components/Button/Button';
import { Textarea } from '../../../components/Textarea/Textarea';
import { useAppStore } from '../../../store/useAppStore';
import styles from './RecordsRequestDialog.module.css';

// Roles a QA / Compliance user can request records FROM. The value is the
// engine role key that setRoleState / lifecycle.js speak; the label is what
// the coder sees. Support Team is listed first so retrieval requests
// (missing / illegible documents) are the primary path.
const ROLE_OPTIONS = [
  { value: 'support', label: 'Support Team', description: 'Ask Support to retrieve or re-upload documentation.' },
  { value: 'coder',   label: 'Coder',        description: 'Ask the coder to revisit their ICD/HCC decisions.' },
];

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
  const [mentions, setMentions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  // Roster for @-mention autocomplete inside the Textarea's richText
  // editor. Same source as CommentComposer — profiles rows + a fallback
  // fixture — so mentioning the same colleague in this dialog resolves
  // to the same profile id downstream.
  const platformUsers = useAppStore(s => s.platformUsers);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  useEffect(() => { fetchPlatformUsers?.(); }, [fetchPlatformUsers]);
  const mentionUsers = useMemo(() => {
    const base = (platformUsers || []).map(u => ({
      ...u,
      realProfile: true,
      initials: u.initials || (u.name || '').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase(),
    }));
    if (!currentUserProfile?.name) return base;
    if (base.some(u => u.id === currentUserProfile.id || u.name === currentUserProfile.name)) return base;
    const initials = currentUserProfile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return [{ id: currentUserProfile.id, name: currentUserProfile.name, initials, realProfile: true }, ...base];
  }, [platformUsers, currentUserProfile]);

  // Comment is REQUIRED — the destination role needs context on what to
  // retrieve / revisit, so an empty note used to leave them guessing. The
  // shared Textarea's richText mode owns the label + mandatory dot +
  // formatting toolbar + attachment + mention picker; we just read plain
  // text via onChange's second arg to gate the CTA.
  const canSubmit = role != null && comment.trim().length > 0;
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

        <Textarea
          title="Comment"
          mandatory
          richText
          attachment
          mentions
          mentionUsers={mentionUsers}
          placeholder="Add a comment, use @ to mention someone"
          onChange={(_html, plain) => setComment(plain ?? '')}
          onMentionsChange={setMentions}
          onAttachmentFiles={(files) => setAttachments(prev => [...prev, ...Array.from(files)])}
        />

        <div className={styles.actions}>
          <Button variant="secondary" size="L" fullWidth onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            size="L"
            fullWidth
            disabled={!canSubmit}
            onClick={() => onConfirm({
              destinationRole: role,
              note: comment.trim(),
              mentions,
              attachments,
            })}
          >
            Request Record
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

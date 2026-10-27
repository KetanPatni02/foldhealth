import { useRef, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { Coachmark } from '../../../components/Coachmark/Coachmark';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../components/ShadcnDialog/ShadcnDialog';
import { PersonOption } from './PersonOption';
import { memberMeta, sharedBy } from './smsMembers';
import styles from './SmsAttribution.module.css';

/**
 * "Log For: Member ⌄" beside the composer's Internal toggle (3540:64859):
 * picks who the next SMS is logged for.
 */
export function LogForChip({ ref, members, value, onChange }) {
  const own = useRef(null);
  const anchorRef = ref || own;
  const [open, setOpen] = useState(false);
  const current = members.find(m => m.id === value) || members[0];
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={styles.chip}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Icon name="solar:user-linear" size={12} color="var(--neutral-300)" />
        <span className={styles.chipText}>Log For: {current?.name}</span>
        <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
      </button>
      {open && (
        <MenuPopover
          anchorRef={anchorRef}
          align="left"
          width={300}
          ariaLabel="Log SMS for"
          items={members.map(m => ({
            key: m.id,
            tall: true,
            selected: m.id === current?.id,
            label: <PersonOption name={m.name} initials={m.initials} meta={memberMeta(m)} />,
          }))}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const COACHMARK_KEY = 'fold-sms-logfor-coachmark';

function readSeen(userId) {
  try { return localStorage.getItem(`${COACHMARK_KEY}:${userId || 'me'}`) === '1'; } catch { return false; }
}

/** Shown once per user, until dismissed (3540:64643). */
export function LogForCoachmark({ anchorRef, userId }) {
  const [seen, setSeen] = useState(() => readSeen(userId));
  if (seen) return null;
  const dismiss = () => {
    try { localStorage.setItem(`${COACHMARK_KEY}:${userId || 'me'}`, '1'); } catch { /* storage blocked: hide for now */ }
    setSeen(true);
  };
  return (
    <Coachmark anchorRef={anchorRef} icon="solar:user-id-linear" onClose={dismiss}>
      When a number is shared by multiple members, select who the SMS is logged for before sending. Sent SMS is logged to that member&apos;s Activity.
    </Coachmark>
  );
}

/**
 * "Select Member to log SMS for:" (3540:64613 / 64628): one member for the
 * selected messages. Save stays off until someone is picked.
 */
export function SelectMemberModal({ open, members, saving = false, onClose, onSave }) {
  const [picked, setPicked] = useState(null);
  const close = () => { setPicked(null); onClose(); };
  const member = members.find(m => m.id === picked);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className={styles.modal} hideClose>
        <DialogTitle className={styles.modalTitle}>Select Member to log SMS for:</DialogTitle>
        <div className={styles.modalBody}>
          <DialogDescription className={styles.modalHelper}>
            {sharedBy(members)} Selected SMS will be logged for the member you select below :
          </DialogDescription>
          <div className={styles.memberList} role="radiogroup" aria-label="Members">
            {members.map(m => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={m.id === picked}
                className={[styles.memberRow, m.id === picked ? styles.memberRowPicked : ''].filter(Boolean).join(' ')}
                onClick={() => setPicked(m.id)}
              >
                <PersonOption name={m.isOwner ? `${m.name} (Default)` : m.name} initials={m.initials} meta={memberMeta(m)} />
              </button>
            ))}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button variant="secondary" size="L" fullWidth onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            size="L"
            fullWidth
            disabled={!member || saving}
            onClick={async () => { if (member && await onSave(member) !== false) setPicked(null); }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

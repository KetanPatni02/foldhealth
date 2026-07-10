import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { CheckIcon } from '../../../components/Icon/CheckIcon';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { Textarea } from '../../../components/Textarea/Textarea';
import { Button } from '../../../components/Button/Button';
import styles from './IcdDosCard.module.css';

// Dismiss reasons — Figma ICD-Import states (node 4696:135817).
const DISMISS_REASONS = [
  'Condition Not Present (Unsupported, Resolved or Transient)',
  'Condition Ruled Out',
  'Historical Diagnosis',
  'Coding Error or Misclassification',
  'Other',
];

/**
 * IcdDosCard — one card per ICD with one action row per DOS (Paper 1WXT /
 * "RA Coder Workflow"; ICD row states from Figma ICD-Import 4696:132231).
 *
 * Head: purple code + description (selecting opens the source-document
 * preview on the left), comment / activity counters. Body: a row per DOS —
 * date, `HCC n (V28)` chip (or `No HCC`), `Claim` link, `Manually Added`
 * chip — with per-DOS states:
 *   • unactioned → [✓ Accept] [✗ Reject] [⋯]
 *   • accepted   → green "✓ Accepted" + undo + ⋯
 *   • rejected   → inline dismiss-reason form → red "✗ Dismissed" +
 *                  "Dismiss Reason" link + undo + ⋯
 *   • missed / deferred → tag + actions (from the ⋯ menu, keys M/D)
 *
 * @param {object} props
 * @param {object} props.icd       gap record + `entries: [{dos, claimed?}]`
 * @param {string} [props.focusKey]      `${code}|${dos}` of the focused row
 * @param {string} [props.openDismissKey] `${code}|${dos}` whose form is open
 * @param {(key:string|null)=>void} [props.onOpenDismiss]
 */
export function IcdDosCard({ icd, focusKey, onFocusRow, selectedKeys, onToggleSelect, openDismissKey, onOpenDismiss }) {
  const openIcdPanel = useAppStore(s => s.openIcdPanel);
  const openIcdActivityLog = useAppStore(s => s.openIcdActivityLog);
  const diagActivityIcd = useAppStore(s => s.diagActivityIcd);
  const clearDiagActivityIcd = useAppStore(s => s.clearDiagActivityIcd);
  const setDiagLeftPanel = useAppStore(s => s.setDiagLeftPanel);
  const dosActions = useAppStore(s => s.hccGapDosActions);
  const dosMeta = useAppStore(s => s.hccGapDosMeta);
  const setDosAction = useAppStore(s => s.setHccGapDosAction);
  const dismissDos = useAppStore(s => s.dismissHccGapDos);
  const showToast = useAppStore(s => s.showToast);

  const hccShort = (icd.hcc || '').split(' - ')[0].trim();
  const isSelected = diagActivityIcd === icd.code;

  // Selecting an ICD expands the drawer and opens the source-document
  // preview on the left, scoped to this code. Clicking again deselects.
  const toggleSelect = () => {
    if (isSelected) {
      clearDiagActivityIcd();
      setDiagLeftPanel(null);
    } else {
      openIcdPanel('documents', icd.code);
    }
  };

  return (
    <div className={[styles.card, isSelected ? styles.cardSelected : ''].filter(Boolean).join(' ')}>
      <div className={styles.head}>
        <div className={styles.headMain}>
          <div className={styles.titleLine}>
            <button
              type="button"
              className={styles.code}
              title={isSelected ? 'Deselect' : `Open source document for ${icd.code}`}
              onClick={toggleSelect}
            >
              {icd.code}
            </button>
            <span
              className={styles.desc}
              role="button"
              tabIndex={0}
              onClick={toggleSelect}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(); } }}
            >
              {icd.desc}
            </span>
          </div>
          {icd.by && (
            <div className={styles.lastLine}>
              Last Reviewed by {icd.by} • {icd.last}
            </div>
          )}
        </div>
        <div className={styles.counters}>
          <button type="button" className={styles.counter} title="Comments" onClick={() => openIcdPanel('comments', icd.code)}>
            <Icon name="solar:chat-round-line-linear" size={14} />
            {icd.cmts ?? 0}
          </button>
          <span className={styles.counterDivider} />
          <button type="button" className={styles.counter} title="Activity" onClick={() => openIcdActivityLog(icd.code)}>
            <Icon name="solar:history-linear" size={14} />
            {(icd.docs ?? 0) + (icd.notes ?? 0)}
          </button>
        </div>
      </div>

      <div className={styles.rows}>
        {icd.entries.map((entry) => {
          const key = `${icd.code}|${entry.dos}`;
          return (
            <DosActionRow
              key={key}
              rowKey={key}
              entry={entry}
              icd={icd}
              hccShort={hccShort}
              action={dosActions[key] || null}
              meta={dosMeta[key] || null}
              focused={focusKey === key}
              selected={selectedKeys?.has(key) || false}
              dismissOpen={openDismissKey === key}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(key) : null}
              onFocus={() => onFocusRow?.(key)}
              onAccept={() => setDosAction(icd.code, entry.dos, 'accepted')}
              onOpenDismiss={() => onOpenDismiss?.(key)}
              onCloseDismiss={() => onOpenDismiss?.(null)}
              onConfirmDismiss={(reason, note) => { dismissDos(icd.code, entry.dos, reason, note); onOpenDismiss?.(null); }}
              onUndo={() => setDosAction(icd.code, entry.dos, dosActions[key])}
              onMissed={() => setDosAction(icd.code, entry.dos, 'missed')}
              onDefer={() => setDosAction(icd.code, entry.dos, 'deferred')}
              showToast={showToast}
            />
          );
        })}
      </div>
    </div>
  );
}

function DosActionRow({
  rowKey, entry, icd, hccShort, action, meta, focused, selected, dismissOpen,
  onToggleSelect, onFocus, onAccept, onOpenDismiss, onCloseDismiss, onConfirmDismiss,
  onUndo, onMissed, onDefer, showToast,
}) {
  const [menuPos, setMenuPos] = useState(null);
  const moreRef = useRef(null);
  const isManual = entry.manual || icd.type === 'Manual';
  const isAccepted = action === 'accepted';
  const isRejected = action === 'rejected';

  useEffect(() => {
    if (!menuPos) return undefined;
    const onDoc = (e) => {
      if (!moreRef.current?.contains(e.target) && !e.target.closest?.('[data-dos-menu]')) setMenuPos(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuPos(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [menuPos]);

  const openMenu = () => {
    const r = moreRef.current?.getBoundingClientRect();
    if (r) setMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 180) });
  };

  return (
    <>
      <div
        className={[styles.row, focused ? styles.rowFocused : '', isRejected ? styles.rowRejected : ''].filter(Boolean).join(' ')}
        onMouseEnter={onFocus}
        data-rowkey={rowKey}
      >
        {onToggleSelect && (
          <input
            type="checkbox"
            className={styles.rowCheck}
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${icd.code} on ${entry.dos}`}
          />
        )}
        <span className={styles.dosDate}>{entry.dos}</span>
        <span className={styles.hccChip}>{hccShort ? `${hccShort} (V28)` : 'No HCC'}</span>
        {entry.claimed && (
          <button type="button" className={styles.claimLink} onClick={() => showToast?.('Opening claim preview — coming soon')}>
            Claim
          </button>
        )}
        {isManual && <span className={styles.manualChip}>Manually Added</span>}
        {isRejected && (
          <button type="button" className={styles.dismissReasonLink} onClick={onOpenDismiss} title={meta?.reason || 'View dismiss reason'}>
            Dismiss Reason
            <Icon name="solar:info-circle-linear" size={12} />
          </button>
        )}
        {(action === 'missed' || action === 'deferred') && (
          <span className={styles.stateTag}>{action === 'missed' ? 'Missed opportunity' : 'Deferred'}</span>
        )}

        <div className={styles.rowActions}>
          {isAccepted ? (
            <>
              <span className={styles.acceptedPill}><CheckIcon size={13} color="currentColor" /> Accepted</span>
              <button type="button" className={styles.undoBtn} title="Undo" aria-label="Undo accept" onClick={onUndo}>
                <Icon name="solar:undo-left-round-linear" size={15} />
              </button>
            </>
          ) : isRejected ? (
            <>
              <span className={styles.dismissedPill}><CloseIcon size={12} color="currentColor" /> Dismissed</span>
              <button type="button" className={styles.undoBtn} title="Undo" aria-label="Undo dismiss" onClick={onUndo}>
                <Icon name="solar:undo-left-round-linear" size={15} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.acceptBtn} aria-label="Accept" title="Accept (A)" onClick={onAccept}>
                <CheckIcon size={15} color="currentColor" />
              </button>
              <button
                type="button"
                className={[styles.rejectBtn, dismissOpen ? styles.rejectBtnActive : ''].filter(Boolean).join(' ')}
                aria-label="Reject" title="Reject (X)"
                onClick={dismissOpen ? onCloseDismiss : onOpenDismiss}
              >
                <CloseIcon size={13} color="currentColor" />
              </button>
            </>
          )}
          <button ref={moreRef} type="button" className={styles.moreBtn} aria-label="More actions" onClick={() => (menuPos ? setMenuPos(null) : openMenu())}>
            <Icon name="solar:menu-dots-linear" size={15} />
          </button>
        </div>
      </div>

      {dismissOpen && (
        <DismissForm
          initialReason={meta?.reason || ''}
          initialNote={meta?.note || ''}
          onCancel={onCloseDismiss}
          onConfirm={onConfirmDismiss}
        />
      )}

      {menuPos && createPortal(
        <div data-dos-menu className={styles.moreMenu} style={{ top: menuPos.top, left: menuPos.left }}>
          <button type="button" className={styles.moreItem} onClick={() => { onMissed(); setMenuPos(null); }}>
            <Icon name="solar:flag-linear" size={14} color="var(--neutral-400)" />
            {action === 'missed' ? 'Undo missed opportunity' : 'Missed opportunity'}
          </button>
          <button type="button" className={styles.moreItem} onClick={() => { onDefer(); setMenuPos(null); }}>
            <Icon name="solar:alarm-linear" size={14} color="var(--neutral-400)" />
            {action === 'deferred' ? 'Undo defer' : 'Defer'}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

// Inline dismiss-reason form (Figma 4696:135817) — reason radios + note,
// Confirm disabled until a reason is chosen.
function DismissForm({ initialReason, initialNote, onCancel, onConfirm }) {
  const [reason, setReason] = useState(initialReason);
  const [note, setNote] = useState(initialNote);

  return (
    <div className={styles.dismissForm}>
      <div className={styles.dismissTitle}>Select a reason and add a note to dismiss the diagnosis gap:</div>
      <div className={styles.reasonList}>
        {DISMISS_REASONS.map((r) => (
          <RadioButton
            key={r}
            name="dismiss-reason"
            value={r}
            label={r}
            checked={reason === r}
            onChange={() => setReason(r)}
          />
        ))}
      </div>
      <div className={styles.noteLabel}>Note</div>
      <Textarea rows={3} placeholder="Add a Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className={styles.dismissActions}>
        <Button variant="primary" size="S" disabled={!reason} onClick={() => onConfirm(reason, note)}>Confirm</Button>
        <Button variant="secondary" size="S" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

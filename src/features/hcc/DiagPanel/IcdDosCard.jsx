import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { CheckIcon } from '../../../components/Icon/CheckIcon';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import styles from './IcdDosCard.module.css';

/**
 * IcdDosCard — one card per ICD with one action row per DOS (Paper node
 * 1WXT / "RA Coder Workflow" redesign; see
 * docs/features/hcc-coding-workflow.md §4).
 *
 * Head: purple code + description, comment / activity counters (open the
 * LeftWorkspace scoped to this code). Body: a row per DOS — date,
 * `HCC n (V28)` chip (or `No HCC`), `Claim` link when already claimed,
 * `Manually Added` chip — with ✓ Accept / ✗ Reject / ⋯ (Missed
 * opportunity, Defer) actions. Decisions are per (code × DOS) via
 * `setHccGapDosAction`; a focus ring follows the keyboard model owned by
 * DiagPanel.
 *
 * @param {object} props
 * @param {object} props.icd       gap record + `entries: [{dos, claimed?}]`
 * @param {string} [props.focusKey]  `${code}|${dos}` of the focused row
 * @param {(key:string)=>void} [props.onFocusRow]
 */
export function IcdDosCard({ icd, focusKey, onFocusRow, selectedKeys, onToggleSelect }) {
  const openIcdPanel = useAppStore(s => s.openIcdPanel);
  const openIcdActivityLog = useAppStore(s => s.openIcdActivityLog);
  const diagActivityIcd = useAppStore(s => s.diagActivityIcd);
  const clearDiagActivityIcd = useAppStore(s => s.clearDiagActivityIcd);
  const setDiagLeftPanel = useAppStore(s => s.setDiagLeftPanel);
  const dosActions = useAppStore(s => s.hccGapDosActions);
  const setDosAction = useAppStore(s => s.setHccGapDosAction);
  const showToast = useAppStore(s => s.showToast);

  const hccShort = (icd.hcc || '').split(' - ')[0].trim();
  const isSelected = diagActivityIcd === icd.code;

  // Selecting an ICD expands the drawer and opens the source-document
  // preview on the left, scoped to this code (evidence line highlighted).
  // Clicking the selected card again deselects and closes the pane.
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
          <button
            type="button"
            className={styles.counter}
            title="Comments"
            onClick={() => openIcdPanel('comments', icd.code)}
          >
            <Icon name="solar:chat-round-line-linear" size={14} />
            {icd.cmts ?? 0}
          </button>
          <span className={styles.counterDivider} />
          <button
            type="button"
            className={styles.counter}
            title="Activity"
            onClick={() => openIcdActivityLog(icd.code)}
          >
            <Icon name="solar:history-linear" size={14} />
            {(icd.docs ?? 0) + (icd.notes ?? 0)}
          </button>
        </div>
      </div>

      <div className={styles.rows}>
        {icd.entries.map((entry) => {
          const key = `${icd.code}|${entry.dos}`;
          const action = dosActions[key] || null;
          return (
            <DosActionRow
              key={key}
              entry={entry}
              icd={icd}
              hccShort={hccShort}
              action={action}
              focused={focusKey === key}
              selected={selectedKeys?.has(key) || false}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(key) : null}
              onFocus={() => onFocusRow?.(key)}
              onAction={(a) => setDosAction(icd.code, entry.dos, a)}
              showToast={showToast}
            />
          );
        })}
      </div>
    </div>
  );
}

function DosActionRow({ entry, icd, hccShort, action, focused, selected, onToggleSelect, onFocus, onAction, showToast }) {
  const [menuPos, setMenuPos] = useState(null);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!menuPos) return undefined;
    const onDoc = (e) => {
      if (!moreRef.current?.contains(e.target) && !e.target.closest?.('[data-dos-menu]')) {
        setMenuPos(null);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setMenuPos(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuPos]);

  const openMenu = () => {
    const r = moreRef.current?.getBoundingClientRect();
    if (!r) return;
    setMenuPos({ top: r.bottom + 4, left: Math.max(8, r.right - 180) });
  };

  const isManual = entry.manual || icd.type === 'Manual';

  return (
    <div
      className={[
        styles.row,
        focused ? styles.rowFocused : '',
        action === 'rejected' ? styles.rowRejected : '',
      ].filter(Boolean).join(' ')}
      onMouseEnter={onFocus}
      data-rowkey={`${icd.code}|${entry.dos}`}
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
        <button
          type="button"
          className={styles.claimLink}
          onClick={() => showToast?.('Opening claim preview — coming soon')}
        >
          Claim
        </button>
      )}
      {isManual && <span className={styles.manualChip}>Manually Added</span>}
      {(action === 'missed' || action === 'deferred') && (
        <span className={styles.stateTag}>
          {action === 'missed' ? 'Missed opportunity' : 'Deferred'}
        </span>
      )}

      <div className={styles.rowActions}>
        <button
          type="button"
          className={[styles.acceptBtn, action === 'accepted' ? styles.acceptBtnActive : ''].filter(Boolean).join(' ')}
          aria-label={action === 'accepted' ? 'Accepted — click to undo' : 'Accept'}
          title="Accept (A)"
          onClick={() => onAction('accepted')}
        >
          <CheckIcon size={15} color="currentColor" />
        </button>
        <button
          type="button"
          className={[styles.rejectBtn, action === 'rejected' ? styles.rejectBtnActive : ''].filter(Boolean).join(' ')}
          aria-label={action === 'rejected' ? 'Rejected — click to undo' : 'Reject'}
          title="Reject (X)"
          onClick={() => onAction('rejected')}
        >
          <CloseIcon size={13} color="currentColor" />
        </button>
        <button
          ref={moreRef}
          type="button"
          className={styles.moreBtn}
          aria-label="More actions"
          onClick={() => (menuPos ? setMenuPos(null) : openMenu())}
        >
          <Icon name="solar:menu-dots-linear" size={15} />
        </button>
      </div>

      {menuPos && createPortal(
        <div data-dos-menu className={styles.moreMenu} style={{ top: menuPos.top, left: menuPos.left }}>
          <button
            type="button"
            className={styles.moreItem}
            onClick={() => { onAction('missed'); setMenuPos(null); }}
          >
            <Icon name="solar:flag-linear" size={14} color="var(--neutral-400)" />
            {action === 'missed' ? 'Undo missed opportunity' : 'Missed opportunity'}
          </button>
          <button
            type="button"
            className={styles.moreItem}
            onClick={() => { onAction('deferred'); setMenuPos(null); }}
          >
            <Icon name="solar:alarm-linear" size={14} color="var(--neutral-400)" />
            {action === 'deferred' ? 'Undo defer' : 'Defer'}
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

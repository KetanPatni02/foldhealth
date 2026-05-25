import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { DismissConfirmModal } from './DismissConfirmModal';
import { DosSelectModal } from './DosSelectModal';
import styles from './SweepIcdRow.module.css';

// Color spec per ICD type (Suspect / Recapture / Manual / Added In EHR).
// Mirrors prototype's ICD_TYPE_STYLE (line 169).
const TYPE_STYLE = {
  Suspect:        { className: styles.typeSuspect,    label: 'Suspect' },
  Recapture:      { className: styles.typeRecapture,  label: 'Recapture' },
  Manual:         { className: styles.typeManual,     label: 'Manual' },
  'Added In EHR': { className: styles.typeAddedInEhr, label: 'Added In EHR' },
};

const STATUS_CLASS = {
  New:                 styles.statusNew,
  'In Progress':       styles.statusInProgress,
  Completed:           styles.statusCompleted,
  Accepted:            styles.statusAccepted,
  Dismissed:           styles.statusDismissed,
  'Records Requested': styles.statusRecRequested,
  Returned:            styles.statusReturned,
  Rejected:            styles.statusRejected,
};

/**
 * SweepIcdRow — the row shown in sweep mode (DOS = "All DOSs"). Each entry
 * is one deduplicated ICD across every DOS the member has, with a
 * collapsible breakdown of per-DOS status / RAF / claim state.
 *
 * Accept / Dismiss buttons are single-click for single-DOS rows, and open a
 * confirmation surface for multi-DOS rows (Phase 2e wires the real
 * `DismissConfirmModal` + `DOSSelectPopup`; for now they fall through to a
 * direct action).
 *
 * Props:
 *  - icd        — sweep entry (code, desc, hcc, type, dos_entries, trumpedBy, …)
 *  - onAccept   — fn(code) — apply Accept across all dos_entries
 *  - onDismiss  — fn(code) — apply Dismiss across all dos_entries
 *  - dosList    — full member.dos_list (used by the "select DOS" popup in 2e)
 */
export function SweepIcdRow({ icd, onAccept, onDismiss, dosList }) {
  const [expanded, setExpanded] = useState(false);
  // Modal flags — DOS-select (for unlinked accept) and dismiss-confirm (for
  // multi-DOS dismiss).
  const [dosSelectAction, setDosSelectAction] = useState(null); // 'accept' | null
  const [dismissConfirm, setDismissConfirm] = useState(false);

  const entries = icd.dos_entries || [];
  const isUnlinked = entries.length === 0;
  const isMultiDOS = entries.length > 1;
  const isTrumped  = !!icd.trumpedBy;
  const mainEntry  = entries[0] || {};
  const mainStatus = mainEntry.status || 'New';

  // A row is fully accepted/dismissed when EVERY per-DOS entry is in that state.
  const isAccepted  = !isTrumped && entries.length > 0 && entries.every(e => e.status === 'Accepted');
  const isDismissed = !isTrumped && entries.length > 0 && entries.every(e => e.status === 'Dismissed');

  const typeStyle = icd.type ? TYPE_STYLE[icd.type] : null;

  const handleAccept = (e) => {
    e.stopPropagation();
    if (isTrumped) return;
    // Unlinked ICDs need a DOS pick before they can be accepted.
    if (isUnlinked) { setDosSelectAction('accept'); return; }
    onAccept?.(icd.code);
  };
  const handleDismiss = (e) => {
    e.stopPropagation();
    if (isTrumped) return;
    // Multi-DOS rows get a confirm step — dismissal is all-or-nothing.
    if (isMultiDOS) { setDismissConfirm(true); return; }
    onDismiss?.(icd.code);
  };

  return (
    <div className={[styles.row, isTrumped ? styles.rowTrumped : ''].join(' ')}>
      <div className={styles.main}>
        {/* Left column — code + type tag */}
        <div className={styles.left}>
          <div className={[styles.code, isTrumped ? styles.codeTrumped : ''].join(' ')}>{icd.code}</div>
          {typeStyle && (
            <span className={[styles.typeTag, typeStyle.className].join(' ')}>
              {typeStyle.label}
            </span>
          )}
        </div>

        {/* Middle column — content */}
        <div className={styles.middle}>
          {isTrumped && (
            <span className={styles.overrideBanner}>
              <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-300)" />
              Overridden by {icd.trumpedBy}
            </span>
          )}
          <div className={styles.hccLabel}>{icd.hcc}</div>
          <div className={[styles.desc, isTrumped ? styles.descTrumped : ''].join(' ')}>
            {icd.desc}
          </div>

          {/* DOS indicator row */}
          <div className={styles.dosIndicator}>
            {isUnlinked ? (
              <span className={styles.noDos}>No DOS linked</span>
            ) : (
              <>
                <span className={styles.dosLabel}>DOS {mainEntry.dos}</span>
                {isMultiDOS && (
                  <button
                    type="button"
                    className={styles.moreDos}
                    onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                  >
                    <Icon
                      name={expanded ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
                      size={12}
                      color="var(--primary-300)"
                    />
                    +{entries.length - 1} DOS
                  </button>
                )}
                <span className={[styles.statusPill, STATUS_CLASS[mainStatus] || styles.statusNew].join(' ')}>
                  {mainStatus}
                </span>
                {mainEntry.raf != null && (
                  <span className={styles.rafLabel}>RAF {mainEntry.raf.toFixed(3)}</span>
                )}
              </>
            )}
          </div>

          {/* Dismiss reason */}
          {icd.dismissReason && (
            <div className={styles.dismissReason}>
              <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-300)" />
              <em>{icd.dismissReason}</em>
            </div>
          )}

          {/* Last reviewed + counts */}
          <div className={styles.meta}>
            {icd.last && <span className={styles.lastReviewed}>{icd.last}</span>}
            {icd.by && <span className={styles.lastBy}>{icd.by}</span>}
            <div className={styles.counts}>
              {icd.docs > 0 && (
                <span className={styles.countChip}>
                  <Icon name="solar:file-text-linear" size={16} color="var(--neutral-200)" />
                  {icd.docs}
                </span>
              )}
              {icd.cmts > 0 && (
                <span className={styles.countChip}>
                  <Icon name="solar:chat-square-linear" size={16} color="var(--neutral-200)" />
                  {icd.cmts}
                </span>
              )}
              {icd.notes > 0 && (
                <span className={styles.countChip}>
                  <Icon name="solar:notes-linear" size={16} color="var(--neutral-200)" />
                  {icd.notes}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right column — action buttons */}
        <div className={styles.actions}>
          {isTrumped ? (
            <span className={styles.readOnly}>
              <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-200)" />
              Read-only
            </span>
          ) : (
            <>
              <button
                type="button"
                className={[styles.actionIcon, isAccepted ? styles.acceptedIcon : ''].join(' ')}
                onClick={handleAccept}
                aria-label="Accept across all DOSs"
                title={isMultiDOS ? `Accept across ${entries.length} DOSs` : 'Accept'}
              >
                <Icon
                  name="solar:check-read-linear"
                  size={16}
                  color={isAccepted ? 'var(--neutral-0)' : 'var(--neutral-300)'}
                />
              </button>
              <button
                type="button"
                className={[styles.actionIcon, isDismissed ? styles.dismissedIcon : ''].join(' ')}
                onClick={handleDismiss}
                aria-label="Dismiss across all DOSs"
                title={isMultiDOS ? `Dismiss across ${entries.length} DOSs` : 'Dismiss'}
              >
                <Icon
                  name="solar:close-circle-linear"
                  size={16}
                  color={isDismissed ? 'var(--neutral-0)' : 'var(--neutral-300)'}
                />
              </button>
            </>
          )}
        </div>
      </div>

      <DismissConfirmModal
        open={dismissConfirm}
        icd={icd}
        onCancel={() => setDismissConfirm(false)}
        onConfirm={() => { setDismissConfirm(false); onDismiss?.(icd.code); }}
      />
      <DosSelectModal
        open={!!dosSelectAction}
        icd={icd}
        action={dosSelectAction || 'accept'}
        dosList={dosList || []}
        onCancel={() => setDosSelectAction(null)}
        onConfirm={() => { setDosSelectAction(null); onAccept?.(icd.code); }}
      />

      {/* Per-DOS breakdown */}
      {expanded && isMultiDOS && (
        <div className={styles.dosBreakdown}>
          {entries.map((e, idx) => (
            <div key={idx} className={styles.dosEntry}>
              <Icon name="solar:calendar-linear" size={12} color="var(--neutral-300)" />
              <span className={styles.dosEntryDate}>DOS: {e.dos}</span>
              <span className={[styles.statusPill, STATUS_CLASS[e.status] || styles.statusNew].join(' ')}>
                {e.status}
              </span>
              <span className={styles.rafLabel}>RAF {e.raf?.toFixed(3) ?? '—'}</span>
              {e.claimed && (
                <span className={styles.claimedPill}>Claimed</span>
              )}
              <span className={[styles.asmTag, e.claimed ? styles.asmTagExcluded : styles.asmTagIn].join(' ')}>
                {e.claimed ? 'Excluded from ASM' : 'In ASM'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

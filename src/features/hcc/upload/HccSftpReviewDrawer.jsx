import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Input } from '../../../components/Input/Input';
import { Badge } from '../../../components/Badge/Badge';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Select } from '../../../components/Select/Select';
// BulkBar import removed — per-card actions replace the floating bar
// in the new Document Review layout (Figma 121:87283).
import { useAppStore } from '../../../store/useAppStore';
import { getFieldConfidence } from '../data/confidence';
import { POS_LABEL } from './mockOcr';
import { ICDS } from '../data/icds';

// Group pending encounters into one entry per patient — a patient with
// multiple DOS records becomes a single review unit (Figma 1:3574).
function groupEncountersByPatient(encounters) {
  const groups = new Map();
  for (const enc of encounters) {
    const key = enc.patient?.matchedMemberId
      ? `m-${enc.patient.matchedMemberId}`
      : `u-${enc.patient?.name || ''}-${enc.patient?.dob || ''}`;
    if (!groups.has(key)) {
      groups.set(key, { key, patient: enc.patient, encounters: [] });
    }
    groups.get(key).encounters.push(enc);
  }
  return Array.from(groups.values());
}

// Flat ICD lookup — memoized once at module load so the read-only card can
// resolve `E11.22` → `{ desc, hcc }` without walking every member every render.
const ICD_LOOKUP = (() => {
  const map = new Map();
  Object.values(ICDS || {}).forEach(list => {
    (list || []).forEach(entry => {
      if (entry?.code && !map.has(entry.code)) {
        map.set(entry.code, { desc: entry.desc || '', hcc: entry.hcc || '' });
      }
    });
  });
  return map;
})();
import { Checkbox } from '../../../components/ui/checkbox';
import { AuditBadge } from '../../../components/AuditBadge/AuditBadge';
import { ReasonDialog } from '../../../components/ReasonDialog/ReasonDialog';
import {
  OCR_TIER_LABEL, OCR_TIER_TONE, anyCheckFailed, anyCheckPending,
  CHECK_KEYS, CHECK_LABELS, STANDARD_REASONS,
} from '../compliance';
import styles from './HccSftpReviewDrawer.module.css';

/**
 * HccSftpReviewDrawer — multi-document SFTP review surface.
 *
 * Triggered from the bell-notification when a background SFTP batch
 * finishes extracting. The drawer is a wide two-panel layout:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Title · Doc switcher tabs · Add to Worklist                  │
 *   ├──────────────────┬───────────────────────────────────────────┤
 *   │  Page preview    │  Encounter table for the active document  │
 *   │  (left, 40%)     │  (right, 60%)                             │
 *   └──────────────────┴───────────────────────────────────────────┘
 *
 * Each "document" tab shows its filename + extracted-encounter count.
 * Switching tabs re-renders both panels. Add to Worklist applies the
 * encounters for the active doc to the HCC worklist via the existing
 * confirm path, then drops that doc from the SFTP queue.
 */
export function HccSftpReviewDrawer() {
  const open = useAppStore(s => s.hccSftpReviewOpen);
  const close = useAppStore(s => s.closeHccSftpReview);
  const batches = useAppStore(s => s.hccSftpBatches) || [];
  const activeId = useAppStore(s => s.hccSftpActiveBatchId);
  const setActiveId = useAppStore(s => s.setHccSftpActiveBatchId);
  const patchEnc = useAppStore(s => s.patchHccSftpEncounter);
  const removeEnc = useAppStore(s => s.removeHccSftpEncounter);
  const removeBatch = useAppStore(s => s.removeHccSftpBatch);
  const createFromEncounter = useAppStore(s => s.hccCreateOrMergeFromEncounter);
  const applyComplianceDecision = useAppStore(s => s.applyHccComplianceDecision);
  const hccMembers = useAppStore(s => s.hccMembers) || [];
  const showToast = useAppStore(s => s.showToast);
  const [selectedIdxs, setSelectedIdxs] = useState(() => new Set());
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Patient pagination index — one step per PATIENT across the review set
  // (Figma 1:3574). Reset when the review set changes.
  const [focusIdx, setFocusIdx] = useState(0);
  const cardStackRef = useRef(null);

  const sourceBatchIds = useAppStore(s => s.hccReviewSourceBatchIds);

  // Build the ordered "patient slot" list. In aggregate mode (ICD Creation
  // Review) we span every source document; otherwise just the active batch
  // (SFTP bell-notification flow). Each slot = { batch, group } so the left
  // preview + handlers can follow the focused patient back to its document.
  const review = useMemo(() => {
    const done = batches.filter(b => b.status === 'done');
    const src = (sourceBatchIds && sourceBatchIds.length)
      ? sourceBatchIds.map(id => batches.find(b => b.id === id)).filter(Boolean)
      : [];
    const reviewBatches = src.length
      ? src
      : [batches.find(b => b.id === activeId) || done[0] || batches[0]].filter(Boolean);
    const slots = [];
    reviewBatches.forEach(b => {
      const pend = (b.encounters || []).filter(e => (e._docStatus || 'pending') === 'pending');
      groupEncountersByPatient(pend).forEach(group => slots.push({ batch: b, group }));
    });
    return { slots };
  }, [batches, sourceBatchIds, activeId]);

  const focusedSlot = review.slots[focusIdx] || review.slots[0] || null;
  // The display/active batch follows the focused patient's source document.
  const activeBatch = focusedSlot?.batch
    || batches.find(b => b.id === activeId)
    || batches.find(b => b.status === 'done')
    || batches[0];

  useEffect(() => { setFocusIdx(0); }, [activeId, (sourceBatchIds || []).join(',')]);
  const setEncounterStatus = useAppStore(s => s.setHccSftpEncounterStatus);
  useEffect(() => { setSelectedIdxs(new Set()); }, [activeBatch?.id]);
  const toggleSelected = (idx) => setSelectedIdxs(prev => {
    const next = new Set(prev);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    return next;
  });
  const setSelectedAll = (idxs, all) => setSelectedIdxs(prev => {
    const next = new Set(prev);
    if (all) idxs.forEach(i => next.add(i));
    else     idxs.forEach(i => next.delete(i));
    return next;
  });

  // Aggregate quick-stats for the title. MUST run before any early return
  // to keep the hook order stable across renders.
  const stats = useMemo(() => {
    const docs = batches.length;
    const ready = batches.filter(b => b.status === 'done').length;
    const pending = batches.filter(b => b.status === 'pending').length;
    const totalEncs = batches.reduce((sum, b) => sum + (b.encounters?.length || 0), 0);
    const patientKeys = new Set();
    batches.forEach(b => (b.encounters || []).forEach(e => {
      patientKeys.add(e.patient?.matchedMemberId || `__u-${e.tempId}`);
    }));
    return { docs, ready, pending, totalEncs, patients: patientKeys.size };
  }, [batches]);

  if (!open) return null;

  // Apply only the selected encounters of the active batch to the
  // worklist. Invoked from the floating BulkBar's "Add to Worklist"
  // action; the row's checkbox set drives what gets added.
  //
  // hccCreateOrMergeFromEncounter takes an encounter object directly —
  // not a wrapper — and threads `_docName` through for the activity
  // log entry that gets stamped on the matched member.
  const handleAddSelectedToWorklist = () => {
    if (!activeBatch) return;
    const encs = activeBatch.encounters || [];
    const useSelection = selectedIdxs.size > 0;
    let created = 0, updated = 0, skipped = 0;
    const appliedIdxs = [];
    encs.forEach((enc, idx) => {
      const valid = enc.patient?.matchedMemberId && (!enc.errors || enc.errors.length === 0);
      const include = useSelection ? selectedIdxs.has(idx) : true;
      if (!include || !valid) { skipped += 1; return; }
      const r = createFromEncounter?.({ ...enc, _docName: activeBatch.fileName });
      if (r?.kind === 'created') { created += 1; appliedIdxs.push(idx); }
      else if (r?.kind === 'updated') { updated += 1; appliedIdxs.push(idx); }
      else { skipped += 1; }
    });
    const parts = [];
    if (created) parts.push(`${created} created`);
    if (updated) parts.push(`${updated} updated`);
    if (skipped) parts.push(`${skipped} skipped`);
    showToast?.(parts.length ? parts.join(', ') : 'No changes applied');
    setSelectedIdxs(new Set());
    // Trim applied rows out of the batch so the table no longer shows
    // them. Sort descending so removing by index doesn't shift later
    // targets.
    appliedIdxs.sort((a, b) => b - a).forEach(idx => removeEnc?.(activeBatch.id, idx));
    // If the batch is now empty, drop it — nothing left to review.
    const after = (useAppStore.getState().hccSftpBatches || []).find(b => b.id === activeBatch.id);
    if (after && (after.encounters?.length || 0) === 0) {
      removeBatch?.(activeBatch.id);
    }
  };

  // Delete the selected encounters from the active batch in one go.
  // No worklist write; just trims the queue so the reviewer can sweep
  // rejects.
  const handleDeleteSelected = () => {
    if (!activeBatch || selectedIdxs.size === 0) return;
    // Sort descending so removing by index doesn't shift later targets.
    const idxs = Array.from(selectedIdxs).sort((a, b) => b - a);
    idxs.forEach(idx => removeEnc?.(activeBatch.id, idx));
    showToast?.(`${idxs.length} encounter${idxs.length === 1 ? '' : 's'} removed`);
    setSelectedIdxs(new Set());
  };

  // Per-batch encounter buckets driven by the new _docStatus field.
  const activeEncs = activeBatch?.encounters || [];
  const bucket = (status) => activeEncs.filter(e => (e._docStatus || 'pending') === status);
  const pendingEncs = bucket('pending');
  const addedEncs   = bucket('added');
  const deletedEncs = bucket('deleted');

  const encStatus = (enc) => {
    if (!enc?.patient?.matchedMemberId) return 'mismatch';
    if (Array.isArray(enc?.errors) && enc.errors.length > 0) return 'error';
    return 'ready';
  };

  // Per Figma 1:3574 we review ONE PATIENT at a time. `review.slots`
  // (computed above) is the ordered patient list — across all source
  // documents in aggregate mode. focusIdx points at the current patient.
  const patientSlots = review.slots;
  const focusedGroup = focusedSlot?.group || null;
  const visibleEncs = focusedGroup?.encounters || [];
  const docTab = 'pending'; // hard-coded so empty-state branches keep working

  const title = (
    <span className={styles.titleBlock}>
      <span className={styles.titleTop}>Document Review</span>
    </span>
  );

  const headerRight = (
    <span className={styles.titleStats}>
      <strong>{stats.totalEncs}</strong>&nbsp;Recorded
      <span className={styles.titleSubDot}>•</span>
      <strong>{stats.patients}</strong>&nbsp;Members
    </span>
  );

  return (
    <Drawer
      title={title}
      onClose={close}
      className={styles.drawer}
      bodyClassName={styles.body}
      headerRight={headerRight}
      noCloseDivider
    >
      {activeBatch ? (
        <div className={styles.panels}>
          {/* LEFT — filename strip + page preview. */}
          <div className={styles.leftPanel}>
            <div className={styles.fileStrip}>
              <button
                type="button"
                className={styles.fileStripBtn}
                onClick={() => setSwitcherOpen(v => !v)}
                title="Switch document"
              >
                <Icon name="solar:document-text-linear" size={14} color="var(--neutral-400)" />
                <span className={styles.fileStripName}>{activeBatch.fileName}</span>
                <Icon
                  name={switcherOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                  size={12}
                  color="var(--neutral-400)"
                />
              </button>
              {/* Inline compliance — OCR tier + a checks badge that opens
                  the 7-point Document Review checklist (Figma 6:5838). */}
              {activeBatch.compliance && (
                <span className={styles.fileStripChecks}>
                  <Badge
                    variant={OCR_TIER_TONE[activeBatch.ocrTier] || 'warning'}
                    label={`OCR · ${OCR_TIER_LABEL[activeBatch.ocrTier] || 'Unknown'}`}
                  />
                  <DocChecksBadge
                    compliance={activeBatch.compliance}
                    ocrTier={activeBatch.ocrTier}
                    fileName={activeBatch.fileName}
                    onApplyDecision={({ checkKey, decision, reason }) =>
                      applyComplianceDecision?.({ batchId: activeBatch.id, checkKey, decision, reason })
                    }
                  />
                </span>
              )}
              <button
                type="button"
                className={styles.fileStripExternal}
                title="Open document in new tab"
              >
                <Icon name="solar:square-arrow-right-up-linear" size={14} color="var(--neutral-400)" />
              </button>
              {switcherOpen && batches.length > 1 && (
                <div className={styles.fileStripMenu} role="listbox">
                  {batches.map(b => {
                    const isActive = b.id === activeBatch.id;
                    const isPending = b.status === 'pending';
                    return (
                      <button
                        key={b.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        disabled={isPending}
                        className={[
                          styles.fileStripMenuItem,
                          isActive ? styles.fileStripMenuItemActive : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => { setActiveId(b.id); setSwitcherOpen(false); }}
                      >
                        <Icon name="solar:document-text-linear" size={12} color={isActive ? 'var(--primary-300)' : 'var(--neutral-400)'} />
                        <span>{b.fileName}</span>
                        <span className={styles.fileStripMenuCount}>{b.encounters?.length || 0}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <PagePreview
              activeBatch={activeBatch}
              batches={batches}
              onSelect={(id) => setActiveId(id)}
            />
          </div>

          {/* RIGHT — minimal "Reviewing: N of M" header + encounter
              card stack + Previous/Next footer (Figma 1:3540). The
              earlier Pending/Added/Deleted tab + Ready/Mismatch/Error
              filter cluster is intentionally removed — the surface now
              focuses the reviewer on one card at a time. */}
          <div className={styles.rightPanel}>
            {patientSlots.length > 0 && (
              <div className={styles.reviewingHeader}>
                <span>
                  Reviewing: <strong>{Math.min(focusIdx + 1, patientSlots.length)}</strong> of <strong>{patientSlots.length}</strong> {patientSlots.length === 1 ? 'Patient' : 'Patients'}
                </span>
                <span className={styles.reviewingHeaderActions}>
                  <ActionButton size="S" icon="solar:magnifer-linear" tooltip="Search" />
                  <Button
                    variant="alt"
                    size="S"
                    leadingIcon="solar:add-circle-linear"
                    onClick={() => showToast?.('Add New Record — coming soon')}
                  >
                    Add New Record
                  </Button>
                </span>
              </div>
            )}

            {/* Patient banner — one per focused patient (Figma 1:3574).
                Shows the demographics + RAF once so the DOS cards below
                don't repeat per-card patient info. */}
            {focusedGroup && (
              <PatientReviewBanner
                patient={focusedGroup.patient}
                member={hccMembers.find(m => m.id === focusedGroup.patient?.matchedMemberId)}
                encounterCount={focusedGroup.encounters.length}
              />
            )}

            {/* Encounter card stack — replaces the table. */}
            <div ref={cardStackRef} className={styles.cardStack}>
              {visibleEncs.length === 0 ? (
                /* Empty-state branching:
                   1. "Document Review Completed" hero — every pending
                      encounter has been triaged on this doc (Figma
                      180:63466). Offers a primary Review Next Document
                      (jumps to the next batch with pending work) and
                      a secondary Back to Worklist (closes the drawer).
                   2. Sub-filter empty — Pending tab is non-empty but
                      the current Ready/Mismatch/Error bucket is. Quiet
                      one-liner.
                   3. Other tabs (Added / Deleted) empty — quiet
                      one-liner explaining the bucket. */
                docTab === 'pending' && pendingEncs.length === 0 && activeEncs.length > 0
                  ? (
                    <DocReviewCompleted
                      total={activeEncs.length}
                      nextBatch={batches.find(b => b.id !== activeBatch.id && (b.encounters || []).some(e => (e._docStatus || 'pending') === 'pending'))}
                      onPickNext={(id) => setActiveId(id)}
                      onBackToWorklist={close}
                    />
                  )
                  : (
                    <div className={styles.cardStackEmpty}>
                      <Icon name="solar:checklist-minimalistic-linear" size={28} color="var(--neutral-200)" />
                      <span>
                        {docTab === 'pending'
                          ? (statusFilter === 'all'
                              ? 'No encounters left to review on this document'
                              : `No ${statusFilter} encounters in this document`)
                          : docTab === 'added'
                            ? 'Nothing has been added to the worklist yet'
                            : 'Nothing has been deleted yet'}
                      </span>
                    </div>
                  )
              ) : visibleEncs.map((enc, visibleI) => {
                const idx = activeEncs.indexOf(enc);
                return (
                  <EncounterCard
                    key={enc.tempId || idx}
                    enc={enc}
                    status={encStatus(enc)}
                    hccMembers={hccMembers}
                    docTab={docTab}
                    cardIdx={visibleI}
                    hidePatient
                    onPatch={(patch) => patchEnc?.(activeBatch.id, idx, patch)}
                    onAddToWorklist={() => {
                      const r = createFromEncounter?.({ ...enc, _docName: activeBatch.fileName });
                      if (r?.kind === 'skipped') {
                        showToast?.(`Cannot add — ${r.reason || 'encounter is incomplete'}`);
                        return;
                      }
                      setEncounterStatus?.(activeBatch.id, idx, 'added');
                      showToast?.(`Added ${enc.patient?.name || 'encounter'} to worklist`);
                    }}
                    onDelete={() => {
                      setEncounterStatus?.(activeBatch.id, idx, 'deleted');
                      showToast?.(`Deleted ${enc.patient?.name || 'encounter'}`);
                    }}
                    onRestore={() => {
                      setEncounterStatus?.(activeBatch.id, idx, null);
                      showToast?.(`Restored ${enc.patient?.name || 'encounter'} to pending`);
                    }}
                  />
                );
              })}
            </div>

            {/* Previous / Next Patient nav — pages patient-by-patient
                across every document in the review set (Figma 1:3574).
                On the last patient the primary becomes Finish Review. */}
            {patientSlots.length > 0 && (
              <div className={styles.reviewFooter}>
                <Button
                  variant="secondary"
                  size="S"
                  leadingIcon="solar:alt-arrow-left-linear"
                  disabled={focusIdx <= 0}
                  onClick={() => {
                    setFocusIdx(Math.max(0, focusIdx - 1));
                    cardStackRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Previous
                </Button>
                {focusIdx >= patientSlots.length - 1 ? (
                  <Button
                    variant="primary"
                    size="S"
                    trailingIcon="solar:check-circle-linear"
                    onClick={close}
                  >
                    Finish Review
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="S"
                    trailingIcon="solar:alt-arrow-right-linear"
                    onClick={() => {
                      setFocusIdx(Math.min(patientSlots.length - 1, focusIdx + 1));
                      cardStackRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Next Patient
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span className={styles.emptyStateBubble}>
            <Icon name="solar:server-2-linear" size={28} color="var(--neutral-300)" />
          </span>
          <span className={styles.emptyStateTitle}>No documents in the queue</span>
          <span className={styles.emptyStateSub}>Documents you upload appear here once extraction completes.</span>
        </div>
      )}
    </Drawer>
  );
}

/**
 * Slim toolbar above the encounter table — file name, encounter
 * stats, and a pair of bulk affordances ("Accept All High Confidence",
 * "Review Flagged") that mirror the upload-drawer table so the SFTP
 * surface feels the same.
 */
function DocToolbar({ batch, setSelectedAll, showToast }) {
  const encs = batch.encounters || [];
  const flagged = encs.filter(e =>
    !e.patient?.matchedMemberId || (e.errors && e.errors.length > 0)
  ).length;
  const ready = encs.length - flagged;
  const acceptAllHigh = () => {
    const highIdxs = encs
      .map((e, i) => ({ e, i }))
      .filter(({ e }) =>
        (e.patient?.matchConfidence ?? 0) >= 85
        && e.patient?.matchedMemberId
        && (!e.errors || e.errors.length === 0)
      )
      .map(({ i }) => i);
    setSelectedAll?.(highIdxs, true);
    showToast?.(`${highIdxs.length} high-confidence encounter${highIdxs.length === 1 ? '' : 's'} selected`);
  };
  const reviewFlagged = () => {
    if (flagged === 0) {
      showToast?.('No flagged encounters in this document');
      return;
    }
    setTimeout(() => {
      const row = document.querySelector(`[class*="rowError_"], [class*="rowMismatch_"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);
  };
  return (
    <div className={styles.docToolbar}>
      <span className={styles.docToolbarIcon}>
        <Icon name="solar:document-text-linear" size={14} color="var(--primary-300)" />
      </span>
      <span className={styles.docToolbarName}>{batch.fileName}</span>
      <span className={styles.docToolbarSep} />
      <span className={styles.docToolbarStat}>
        <strong>{encs.length}</strong> encounter{encs.length === 1 ? '' : 's'}
      </span>
      <span className={styles.docToolbarStat}>
        <span className={[styles.docToolbarDot, styles.docToolbarDotReady].join(' ')} />
        <strong>{ready}</strong> ready
      </span>
      {flagged > 0 && (
        <span className={styles.docToolbarStat}>
          <span className={[styles.docToolbarDot, styles.docToolbarDotFlag].join(' ')} />
          <strong>{flagged}</strong> to review
        </span>
      )}
      <span className={styles.docToolbarSpacer} />
      <button
        type="button"
        className={styles.docToolbarBtn}
        onClick={acceptAllHigh}
        title="Select every encounter with ≥85% match confidence and no errors"
      >
        <Icon name="solar:check-circle-linear" size={12} color="var(--status-success)" />
        Accept All High Confidence
      </button>
      <button
        type="button"
        className={styles.docToolbarBtn}
        disabled={flagged === 0}
        onClick={reviewFlagged}
        title={flagged === 0 ? 'No flagged rows' : 'Jump to the first flagged row'}
      >
        <Icon name="solar:flag-2-linear" size={12} color="var(--status-warning)" />
        Review Flagged ({flagged})
      </button>
    </div>
  );
}

/**
 * Left-panel preview. Shows a stack of "scanned pages" for the active
 * document — one card per encounter page. Clicking a card brings the
 * preview into focus (currently just visual; future enhancement could
 * scroll-sync with the table).
 */
/**
 * DocSwitcher — dropdown-style selector inside the preview header.
 * Replaces the top tab strip. Clicking the active filename opens a
 * popover listing every batch with its status icon (pending / ready /
 * flagged), encounter count, and a "current" marker on the active
 * batch. Picking one switches the panels below.
 */
/**
 * PatientReviewBanner — top of the right panel when reviewing a patient's
 * DOS records. Renders the patient identity once (avatar + name +
 * demographics + member id + RAF) so the individual DOS cards below
 * don't repeat it (Figma 1:3574).
 */
function PatientReviewBanner({ patient, member, encounterCount }) {
  const name = member?.name || patient?.name || '(unmatched patient)';
  const initials = member?.in || name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const gender = member?.g || '';
  const age = member?.age || '';
  const memberId = member?.memberId || patient?.matchedMemberDisplayId || patient?.patientId || '—';
  const raf = member?.raf ?? null;
  const rafDelta = member?.rafDelta ?? null;

  return (
    <div className={styles.patientBanner}>
      <Avatar variant="patient" initials={initials} />
      <div className={styles.patientBannerBody}>
        <div className={styles.patientBannerName}>
          <span>{name}</span>
          <Icon name="solar:alt-arrow-right-linear" size={14} color="var(--neutral-300)" />
        </div>
        <div className={styles.patientBannerMeta}>
          <span>Patient</span>
          <span className={styles.patientBannerDot}>•</span>
          {gender && <><span>{gender}</span><span className={styles.patientBannerDot}>•</span></>}
          {age && <><span>{age}</span><span className={styles.patientBannerDot}>•</span></>}
          <span>#{memberId}</span>
          {raf != null && (
            <>
              <span className={styles.patientBannerDot}>•</span>
              <span>RAF <strong>{Number(raf).toFixed(3)}</strong></span>
              {rafDelta != null && (
                <span className={[styles.rafDelta, rafDelta >= 0 ? styles.rafDeltaUp : styles.rafDeltaDown].join(' ')}>
                  {Number(rafDelta).toFixed(3)}
                  <Icon name={rafDelta >= 0 ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} size={10} color="currentColor" />
                </span>
              )}
            </>
          )}
          <span className={styles.patientBannerDot}>•</span>
          <span className={styles.patientBannerCount}>{encounterCount} {encounterCount === 1 ? 'DOS record' : 'DOS records'}</span>
        </div>
      </div>
      <div className={styles.patientBannerActions}>
        <ActionButton size="S" icon="solar:phone-linear" tooltip="Contact patient" />
        <ActionButton size="S" icon="solar:alt-arrow-down-linear" tooltip="More" />
      </div>
    </div>
  );
}

function DocSwitcher({ activeBatch, batches, onSelect }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const flaggedCount = (b) => (b.encounters || []).filter(e =>
    !e.patient?.matchedMemberId || (e.errors && e.errors.length > 0)
  ).length;
  const activeFlagged = activeBatch ? flaggedCount(activeBatch) : 0;
  const multi = batches.length > 1;

  return (
    <div ref={wrapRef} className={styles.switcher}>
      <button
        type="button"
        className={[styles.switcherTrigger, open ? styles.switcherTriggerOpen : ''].join(' ')}
        onClick={() => multi && setOpen(o => !o)}
        disabled={!multi}
        title={multi ? 'Switch document' : activeBatch?.fileName}
      >
        <span className={styles.switcherStatus}>
          {activeBatch?.status === 'pending' ? (
            <span className={styles.switcherStatusPulse} />
          ) : activeFlagged > 0 ? (
            <Icon name="solar:danger-circle-bold" size={13} color="var(--status-warning)" />
          ) : (
            <Icon name="solar:document-text-linear" size={13} color="var(--primary-300)" />
          )}
        </span>
        <span className={styles.switcherName}>{activeBatch?.fileName || '—'}</span>
        {multi && (
          <>
            <span className={styles.switcherCounter}>
              {(batches.findIndex(b => b.id === activeBatch?.id) + 1) || 1} / {batches.length}
            </span>
            <Icon
              name={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
              size={12}
              color="var(--neutral-400)"
            />
          </>
        )}
      </button>
      {open && (
        <div className={styles.switcherMenu} role="listbox">
          <div className={styles.switcherMenuHead}>
            <Icon name="solar:layers-linear" size={11} color="var(--neutral-300)" />
            Documents · {batches.length}
          </div>
          {batches.map(b => {
            const isActive = b.id === activeBatch?.id;
            const isPending = b.status === 'pending';
            const flagged = flaggedCount(b);
            const ready = (b.encounters || []).length - flagged;
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={isPending}
                className={[
                  styles.switcherItem,
                  isActive ? styles.switcherItemActive : '',
                  isPending ? styles.switcherItemPending : '',
                ].filter(Boolean).join(' ')}
                onClick={() => { if (!isPending) { onSelect?.(b.id); setOpen(false); } }}
              >
                <span className={styles.switcherItemIcon}>
                  {isPending ? (
                    <span className={styles.switcherStatusPulse} />
                  ) : flagged > 0 ? (
                    <Icon name="solar:danger-circle-bold" size={13} color="var(--status-warning)" />
                  ) : (
                    <Icon name="solar:check-circle-bold" size={13} color="var(--status-success)" />
                  )}
                </span>
                <span className={styles.switcherItemBody}>
                  <span className={styles.switcherItemName}>{b.fileName}</span>
                  <span className={styles.switcherItemMeta}>
                    {isPending
                      ? 'Extracting…'
                      : `${b.encounters?.length || 0} encounter${(b.encounters?.length || 0) === 1 ? '' : 's'}${flagged > 0 ? ` · ${flagged} to review` : ''}`}
                  </span>
                </span>
                {!isPending && (
                  <span className={[styles.switcherItemCount, flagged > 0 ? styles.switcherItemCountFlag : ''].join(' ')}>
                    {ready}
                  </span>
                )}
                {isActive && (
                  <Icon name="solar:check-read-linear" size={13} color="var(--primary-300)" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PagePreview({ activeBatch, batches, onSelect }) {
  const fileName = activeBatch?.fileName || 'Uploaded document';
  const encounters = activeBatch?.encounters || [];
  const pages = useMemo(() => {
    const map = new Map();
    encounters.forEach(enc => {
      const p = enc.sourcePage || 1;
      if (!map.has(p)) map.set(p, []);
      map.get(p).push(enc);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [encounters]);

  return (
    <div className={styles.previewWrap}>
      {/* Inner preview header removed — the outer file strip at the
          top of the left panel already shows the filename + switcher,
          so this row was redundant. */}
      <div className={styles.previewBody}>
        {pages.length === 0 ? (
          <div className={styles.previewEmpty}>
            <Icon name="solar:document-linear" size={20} color="var(--neutral-200)" />
            <span>No pages extracted</span>
          </div>
        ) : pages.map(([page, encs]) => (
          <div key={page} className={styles.previewPage}>
            <div className={styles.previewPageHeader}>
              <div className={styles.previewPageOrg}>Fold Health Medical Group</div>
              <div className={styles.previewPagePagenum}>Page {page} · {fileName}</div>
            </div>
            <h2 className={styles.previewPageH1}>Progress Note</h2>
            {encs.map((enc, i) => (
              <div key={i} className={styles.previewPageEnc}>
                <div className={styles.previewPageMeta}>
                  <div><strong>Patient:</strong> {enc.patient?.name || '—'}</div>
                  <div><strong>DOB:</strong> {enc.patient?.dob || '—'}</div>
                  <div><strong>DOS:</strong> {enc.dos || '—'}</div>
                  <div><strong>Provider:</strong> {enc.provider || '—'}</div>
                </div>
                <div className={styles.previewPageSection}>
                  <h3 className={styles.previewPageH2}>Assessment &amp; Plan</h3>
                  <ul className={styles.previewPageIcds}>
                    {(enc.icds || []).map(icd => (
                      <li key={icd.code}>
                        <strong>{icd.code}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                {i < encs.length - 1 && <div className={styles.previewPageSep} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Right-panel table — slimmer cousin of the main upload-review table.
 * Renders one row per encounter with Member · DOS · Provider · POS ·
 * ICDs · Action, each with the per-field confidence chip the main
 * drawer uses.
 */
function SftpReviewTable({ batch, hccMembers, onPatch, onRemove, showToast, selectedIdxs, toggleSelected, setSelectedAll }) {
  const encounters = batch.encounters || [];
  if (encounters.length === 0) {
    return (
      <div className={styles.tableEmpty}>
        <Icon name="solar:document-linear" size={24} color="var(--neutral-200)" />
        <span>{batch.status === 'pending' ? 'Extracting…' : 'No encounters found'}</span>
      </div>
    );
  }
  const allIdxs = encounters.map((_, i) => i);
  const allSelected = allIdxs.length > 0 && allIdxs.every(i => selectedIdxs?.has(i));
  const someSelected = allIdxs.some(i => selectedIdxs?.has(i));
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thCheck}>
              <Checkbox
                aria-label="Select all encounters"
                checked={allSelected ? true : (someSelected ? 'indeterminate' : false)}
                onCheckedChange={(v) => setSelectedAll?.(allIdxs, v === true)}
              />
            </th>
            <th className={styles.thMember}>Member</th>
            <th className={styles.thField}>DOS *</th>
            <th className={styles.thField}>Rendering Provider *</th>
            <th className={styles.thField}>POS *</th>
            <th className={styles.thField}>ICD Codes</th>
            <th className={styles.thStatus}>Status</th>
            <th className={styles.thActions}>Action</th>
          </tr>
        </thead>
        <tbody>
          {encounters.map((enc, idx) => (
            <SftpRow
              key={enc.tempId || idx}
              enc={enc}
              hccMembers={hccMembers}
              onPatch={(patch) => onPatch(idx, patch)}
              onRemove={() => onRemove(idx)}
              showToast={showToast}
              checked={selectedIdxs?.has(idx) || false}
              onToggle={() => toggleSelected?.(idx)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SftpRow({ enc, hccMembers, onPatch, onRemove, showToast, checked, onToggle }) {
  const errors = new Set(enc.errors || []);
  const isMatched = !!enc.patient?.matchedMemberId;
  const member = isMatched ? hccMembers.find(m => m.id === enc.patient.matchedMemberId) : null;
  const status = !isMatched ? 'mismatched' : (errors.size > 0 ? 'error' : 'ready');
  const rowCls = [
    styles.row,
    status === 'error' ? styles.rowError : '',
    status === 'mismatched' ? styles.rowMismatch : '',
    checked ? styles.rowSelected : '',
  ].filter(Boolean).join(' ');

  return (
    <tr className={rowCls}>
      <td className={styles.tdCheck}>
        <Checkbox
          aria-label="Select encounter"
          checked={!!checked}
          onCheckedChange={() => onToggle?.({ target: { checked: !checked } })}
        />
      </td>
      <td className={styles.tdMember}>
        {isMatched ? (
          <div className={styles.memberCell}>
            <Avatar variant="patient" initials={member?.in || (enc.patient.name || '?').split(' ').map(p => p[0]).slice(0,2).join('')} />
            <div className={styles.memberMain}>
              <div className={styles.memberName}>{member?.name || enc.patient.name}</div>
              {member && (
                <div className={styles.memberMeta}>
                  {member.g || ''}{member.age ? `·${member.age}` : ''}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className={styles.memberUnmatched}>
            <Icon name="solar:link-broken-linear" size={11} color="var(--status-error)" />
            Unmatched
          </span>
        )}
      </td>
      <td className={styles.tdField}>
        <Input
          variant={errors.has('dos') ? 'error' : 'default'}
          value={enc.dos || ''}
          placeholder="Enter DOS"
          onChange={(e) => onPatch({ dos: e.target.value })}
          className={styles.cellInput}
        />
        <FieldConf score={getFieldConfidence(enc, 'dos')} />
      </td>
      <td className={styles.tdField}>
        <Input
          variant={errors.has('provider') ? 'error' : 'default'}
          value={enc.provider || ''}
          placeholder="Provider"
          onChange={(e) => onPatch({ provider: e.target.value })}
          className={styles.cellInput}
        />
        <FieldConf score={getFieldConfidence(enc, 'provider')} />
      </td>
      <td className={styles.tdField}>
        <Input
          variant={errors.has('pos') ? 'error' : 'default'}
          value={enc.pos || ''}
          placeholder="POS"
          onChange={(e) => onPatch({ pos: e.target.value, posDesc: POS_LABEL[e.target.value] || '' })}
          className={styles.cellInput}
        />
        <FieldConf score={getFieldConfidence(enc, 'pos')} />
      </td>
      <td className={styles.tdField}>
        <div className={styles.icdRow}>
          {(enc.icds || []).slice(0, 1).map(icd => (
            <span key={icd.code} className={[styles.icdChip, icd.valid === false ? styles.icdChipInvalid : ''].filter(Boolean).join(' ')}>
              {icd.code}
            </span>
          ))}
          {(enc.icds || []).length > 1 && (
            <span className={styles.icdOverflow}>+{enc.icds.length - 1}</span>
          )}
          <button
            type="button"
            className={styles.icdAddBtn}
            onClick={() => showToast?.('ICD search not wired in this view yet')}
            aria-label="Add ICD"
          >
            <Icon name="solar:add-circle-linear" size={13} color="var(--neutral-300)" />
          </button>
        </div>
        <FieldConf score={getFieldConfidence(enc, 'icds')} />
      </td>
      <td className={styles.tdStatus}>
        <span className={[
          styles.statusInline,
          status === 'ready' ? styles.statusReady : '',
          status === 'error' ? styles.statusError : '',
          status === 'mismatched' ? styles.statusMismatch : '',
        ].filter(Boolean).join(' ')}>
          {status === 'ready' && <Icon name="solar:check-circle-bold" size={11} color="var(--status-success)" />}
          {status === 'error' && <Icon name="solar:danger-triangle-bold" size={11} color="var(--status-error)" />}
          {status === 'mismatched' && <Icon name="solar:question-circle-bold" size={11} color="var(--status-warning)" />}
          {status === 'ready' ? 'Ready' : status === 'error' ? 'Missing' : 'Mismatched'}
        </span>
      </td>
      <td className={styles.tdActions}>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={onRemove}
          aria-label="Remove encounter"
        >
          <Icon name="solar:trash-bin-trash-linear" size={13} color="var(--status-error)" />
        </button>
      </td>
    </tr>
  );
}

/**
 * DocReviewCompleted — empty-state hero shown in the Pending tab
 * once every encounter on the active document has been triaged
 * (added / deleted). Matches Figma 180:63466.
 */
function DocReviewCompleted({ total, nextBatch, onPickNext, onBackToWorklist }) {
  return (
    <div className={styles.docCompleted}>
      <span className={styles.docCompletedBadgeWrap}>
        <span className={styles.docCompletedRingOuter} />
        <span className={styles.docCompletedRingInner} />
        <span className={styles.docCompletedBadge}>
          <Icon name="solar:check-circle-bold" size={24} color="#fff" />
        </span>
      </span>
      <div className={styles.docCompletedTitle}>Document Review Completed</div>
      <div className={styles.docCompletedBody}>
        All {total} extracted record{total === 1 ? ' has' : 's have'} been reviewed.
      </div>
      <div className={styles.docCompletedActions}>
        <Button
          variant="primary"
          size="L"
          disabled={!nextBatch}
          onClick={() => nextBatch && onPickNext(nextBatch.id)}
        >
          Review Next Document
        </Button>
        <Button
          variant="alt"
          size="L"
          trailingIcon="solar:arrow-right-up-linear"
          onClick={onBackToWorklist}
        >
          Back to Worklist
        </Button>
      </div>
    </div>
  );
}

/**
 * Document Review encounter card — one card per encounter,
 * stacked vertically. Header: avatar + member identity + Ready /
 * Mismatch / Error pill + per-card actions. Body: 2-column field
 * grid (DOS · ICD Codes / Provider · POS) each with an inline
 * confidence gauge bar matching Figma 121:87283.
 */
function EncounterCard({ enc, status, hccMembers, docTab, cardIdx, hidePatient, onPatch, onAddToWorklist, onDelete, onRestore }) {
  const isMatched = !!enc.patient?.matchedMemberId;
  const member = isMatched ? hccMembers.find(m => m.id === enc.patient.matchedMemberId) : null;
  const errors = new Set(enc.errors || []);
  // Read-only default for high-confidence (Ready) records when we're in
  // the patient-grouped view. Mismatch/Error records always open in edit
  // mode so the reviewer can fix them. Pen icon flips into edit; Save
  // (or X) collapses back to read-only. Legacy hidePatient=false uses
  // edit mode unconditionally (preserved for other callers of this card).
  const canReadOnly = hidePatient && status === 'ready';
  const [isEditing, setIsEditing] = useState(!canReadOnly);
  // Map status → shared Badge variant (uses the existing status- tokens
  // so this card matches every other status pill in the app).
  const badgeVariant = (
    status === 'ready'    ? 'status-completed' :
    status === 'mismatch' ? 'status-review' :
                            'status-failed'
  );
  const badgeIcon = (
    status === 'ready'    ? 'solar:check-circle-bold' :
    status === 'mismatch' ? 'solar:question-circle-bold' :
                            'solar:danger-triangle-bold'
  );
  const statusLabel = status === 'ready' ? 'Ready' : status === 'mismatch' ? 'Mismatch' : 'Error';
  // Per-field confidence drives the gauge bar next to each label.
  const fieldConf = (name) => {
    if (errors.has(name)) return 0;
    return getFieldConfidence(enc, name);
  };
  return (
    <div className={styles.encCard} data-card-idx={cardIdx}>
      <div className={styles.encCardHead}>
        {hidePatient ? (
          // Grouped-by-patient view: patient info lives in the banner above.
          // Card header shows just DOS + status so it reads as a DOS record.
          <div className={styles.encCardDosHead}>
            <div className={styles.encCardDosLine}>
              <span className={styles.encCardDosLabel}>DOS:</span>
              <span className={styles.encCardDosValue}>{enc.dos || '—'}</span>
              <Badge variant={badgeVariant} icon={badgeIcon} label={statusLabel} />
            </div>
            <div className={styles.encCardDosMeta}>
              Rendering Provider: {enc.provider || '—'} · POS: {enc.pos ? `${enc.pos}${enc.posDesc ? ' - ' + enc.posDesc : ''}` : '—'}
            </div>
          </div>
        ) : (
          <>
            <Avatar
              variant="patient"
              initials={member?.in || (enc.patient?.name || '?').split(' ').map(p => p[0]).slice(0,2).join('')}
            />
            <div className={styles.encCardIdent}>
              <div className={styles.encCardName}>{member?.name || enc.patient?.name || '(unmatched)'}</div>
              <div className={styles.encCardMeta}>
                {member?.g || ''} <span className={styles.encCardMetaDot}>•</span>
                {member?.age || ''} <span className={styles.encCardMetaDot}>•</span>
                #{enc.patient?.patientId || enc.patient?.matchedMemberDisplayId || '—'}
              </div>
            </div>
            <Badge variant={badgeVariant} icon={badgeIcon} label={statusLabel} />
          </>
        )}
        <div className={styles.encCardActions}>
          {docTab === 'pending' ? (
            <>
              <Button
                variant="ghost"
                size="S"
                leadingIcon="solar:add-circle-linear"
                disabled={status !== 'ready'}
                onClick={onAddToWorklist}
              >
                {hidePatient ? 'Add' : 'Add to Worklist'}
              </Button>
              {/* Pen icon — only when read-only is available. Toggles the
                  card between the compact display and the full form. */}
              {canReadOnly && (
                <ActionButton
                  size="S"
                  icon={isEditing ? 'solar:eye-linear' : 'solar:pen-linear'}
                  tooltip={isEditing ? 'Collapse edit' : 'Edit record'}
                  onClick={() => setIsEditing(v => !v)}
                />
              )}
              <ActionButton size="S" icon="solar:trash-bin-trash-linear" tooltip="Delete" onClick={onDelete} />
            </>
          ) : (
            <Button
              variant="ghost"
              size="S"
              leadingIcon="solar:undo-left-round-linear"
              onClick={onRestore}
            >
              Restore
            </Button>
          )}
        </div>
      </div>

      {/* Read-only body — DOS/Provider/POS live in the header above.
          ICD Codes and Document Type remain interactive here (with
          per-field confidence pills) because those are the two fields
          reviewers most commonly correct even on high-confidence
          records (Figma 3:7620). Static ICD descriptions + HCC
          mappings sit below the controls. */}
      {!isEditing && canReadOnly && (
        <div className={styles.encReadOnly}>
          <div className={styles.encReadOnlyForm}>
            <FieldBlock label="ICD Codes" required confidence={fieldConf('icds')} confVariant="tier">
              <IcdMultiSelect
                icds={enc.icds || []}
                onChange={(nextIcds) => onPatch({ icds: nextIcds })}
              />
            </FieldBlock>
            <FieldBlock label="Document Type" required confidence={fieldConf('docType')} confVariant="tier">
              <Select
                value={enc.docType || 'Progress Note'}
                onChange={(v) => onPatch({ docType: v })}
                options={[
                  { value: 'AWV',           label: 'AWV' },
                  { value: 'Progress Note', label: 'Progress Note' },
                  { value: 'SOAP Note',     label: 'SOAP Note' },
                  { value: 'Telehealth Note', label: 'Telehealth Note' },
                  { value: 'Lab',           label: 'Lab' },
                  { value: 'Other',         label: 'Other' },
                ]}
              />
            </FieldBlock>
          </div>
          <ul className={styles.encIcdList}>
            {(enc.icds || []).map(icd => {
              const meta = ICD_LOOKUP.get(icd.code);
              return (
                <li key={icd.code} className={styles.encIcdRow}>
                  <span className={styles.encIcdCode}>{icd.code}</span>
                  <span className={styles.encIcdDesc}>{meta?.desc || 'ICD description not on file'}</span>
                  {meta?.hcc && (
                    <span className={styles.encIcdHcc}>
                      <span className={styles.encIcdHccDot} /> {meta.hcc}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className={styles.encReadOnlyIndex}>
            Index: <span className={styles.encIndexDot} data-tone="v24" /> v24 · <span className={styles.encIndexDot} data-tone="v28" /> v28
          </div>
        </div>
      )}

      {/* Edit body — full form (existing UI). Shown when the card is in
          edit mode: any Mismatch/Error record, or a Ready record after
          the user clicks the pen icon. */}
      {isEditing && (
      <div className={styles.encGrid}>
        <FieldBlock label="DOS" required confidence={fieldConf('dos')}>
          <Input
            value={enc.dos || ''}
            placeholder="MM/DD/YYYY"
            variant={errors.has('dos') ? 'error' : 'default'}
            onChange={(e) => onPatch({ dos: e.target.value })}
          />
        </FieldBlock>
        <FieldBlock label="ICD Codes" required confidence={fieldConf('icds')}>
          <div className={styles.encIcds}>
            {(enc.icds || []).map(icd => (
              <span key={icd.code} className={styles.encIcdChip}>
                {icd.code}
                <button
                  type="button"
                  className={styles.encIcdClose}
                  onClick={() => onPatch({ icds: enc.icds.filter(i => i.code !== icd.code) })}
                  aria-label={`Remove ${icd.code}`}
                >
                  <Icon name="solar:close-circle-linear" size={10} color="var(--primary-300)" />
                </button>
              </span>
            ))}
          </div>
        </FieldBlock>
        <FieldBlock label="Rendering Provider" required confidence={fieldConf('provider')}>
          <Input
            value={enc.provider || ''}
            placeholder="Provider"
            variant={errors.has('provider') ? 'error' : 'default'}
            onChange={(e) => onPatch({ provider: e.target.value })}
          />
        </FieldBlock>
        <FieldBlock label="POS" required confidence={fieldConf('pos')}>
          <Input
            value={enc.pos ? `${enc.pos} - ${POS_LABEL[enc.pos] || ''}` : ''}
            placeholder="POS"
            variant={errors.has('pos') ? 'error' : 'default'}
            onChange={(e) => {
              const code = e.target.value.split(' ')[0];
              onPatch({ pos: code, posDesc: POS_LABEL[code] || '' });
            }}
          />
        </FieldBlock>
        {/* Spec J — category is mandatory and correctable inline.
            Providers often misfile labs as AWVs at upload time; this
            lets the Support Team correct after the fact. */}
        <FieldBlock label="Category" required>
          <Select
            value={enc.docType || 'Progress Note'}
            onChange={(v) => onPatch({ docType: v })}
            options={[
              { value: 'AWV',           label: 'AWV' },
              { value: 'Progress Note', label: 'Progress Note' },
              { value: 'Lab',           label: 'Lab' },
              { value: 'Other',         label: 'Other' },
            ]}
          />
        </FieldBlock>
        {/* Duplicate-warning chip — flagged at OCR time when the
            member's existing dos_list already has this DOS + provider
            + POS (spec L). */}
        {enc._duplicateOfMemberId && (
          <FieldBlock label="">
            <span className={styles.encDupWarn} title="Same DOS + Provider + POS already exists for this member">
              <Icon name="solar:danger-triangle-bold" size={11} color="var(--status-warning)" />
              Possible duplicate — review before adding
            </span>
          </FieldBlock>
        )}
      </div>
      )}

      {/* Save / X footer — shown only when the user opened edit mode on
          a Ready record via the pen icon. Save collapses back to read
          only. X discards the local flip without touching data. */}
      {isEditing && canReadOnly && (
        <div className={styles.encEditFooter}>
          <Button variant="primary" size="S" onClick={() => setIsEditing(false)}>
            Save
          </Button>
          <ActionButton
            size="S"
            icon="solar:close-circle-linear"
            tooltip="Close editor"
            onClick={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * FieldBlock — label + confidence gauge bar + input slot.
 * Used inside every encounter card cell. The gauge fills based on
 * confidence: 5 segments tinted green/amber/red per tier.
 */
function FieldBlock({ label, required, confidence, confVariant = 'bars', children }) {
  return (
    <div className={styles.fieldBlock}>
      <div className={styles.fieldBlockHead}>
        <span className={styles.fieldBlockLabel}>
          {label}{required && <span className={styles.fieldBlockReq}>•</span>}
        </span>
        {confVariant === 'tier'
          ? <ConfTier score={confidence} />
          : <ConfGauge score={confidence} />}
      </div>
      <div className={styles.fieldBlockBody}>
        {children}
      </div>
    </div>
  );
}

/**
 * IcdMultiSelect — searchable ICD chip input for the read-only DOS card.
 * Selected codes render as removable chips; the "+" opens a typeahead
 * over the full ICD catalog. Removing a chip (or picking a new one) flows
 * through onChange, so the description list below the control stays in
 * sync automatically (Figma 3:7620).
 */
function IcdMultiSelect({ icds, onChange }) {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!searching) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) { setSearching(false); setQ(''); } };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [searching]);

  const existing = new Set((icds || []).map(i => i.code));
  const matches = (() => {
    const query = q.trim().toLowerCase();
    const all = Array.from(ICD_LOOKUP.entries()).map(([code, meta]) => ({ code, ...meta }));
    const filtered = query
      ? all.filter(i => i.code.toLowerCase().includes(query) || (i.desc || '').toLowerCase().includes(query))
      : all;
    return filtered.filter(i => !existing.has(i.code)).slice(0, 8);
  })();

  const addCode = (item) => {
    onChange([...(icds || []), { code: item.code, valid: true }]);
    setQ('');
    setSearching(false);
  };
  const removeCode = (code) => onChange((icds || []).filter(i => i.code !== code));

  return (
    <div className={styles.icdMulti} ref={wrapRef}>
      <div className={styles.encIcdsInput}>
        {(icds || []).map(icd => (
          <span key={icd.code} className={styles.encIcdChip}>
            {icd.code}
            <button
              type="button"
              className={styles.encIcdClose}
              onClick={() => removeCode(icd.code)}
              aria-label={`Remove ${icd.code}`}
            >
              <Icon name="solar:close-circle-linear" size={10} color="var(--primary-300)" />
            </button>
          </span>
        ))}
        <button
          type="button"
          className={styles.icdAddBtn}
          onClick={() => setSearching(v => !v)}
          aria-label="Add ICD code"
        >
          <Icon name="solar:add-circle-linear" size={14} color="var(--primary-300)" />
        </button>
      </div>
      {searching && (
        <div className={styles.icdSearchPop}>
          <div className={styles.icdSearchHead}>
            <Icon name="solar:magnifer-linear" size={12} color="var(--neutral-300)" />
            <input
              autoFocus
              className={styles.icdSearchInput}
              placeholder="Search ICD by code or description"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className={styles.icdSearchList}>
            {matches.length === 0 ? (
              <div className={styles.icdSearchEmpty}>No matches</div>
            ) : matches.map(item => (
              <button key={item.code} type="button" className={styles.icdSearchItem} onClick={() => addCode(item)} title={item.desc}>
                <span className={styles.icdSearchCode}>{item.code}</span>
                <span className={styles.icdSearchDesc}>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ConfTier — sparkle + High/Medium/Low label (Figma 3:7620). Used in the
 * read-only DOS card where the exact percentage is noise; the reviewer
 * only needs the tier to decide whether to trust or re-check.
 */
function ConfTier({ score }) {
  if (typeof score !== 'number' || score === 0) {
    return <span className={styles.confTierEmpty}>—</span>;
  }
  const tier = score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
  const label = tier === 'high' ? 'High' : tier === 'medium' ? 'Medium' : 'Low';
  return (
    <span className={[styles.confTier, styles[`confTier_${tier}`]].join(' ')} title={`AI confidence ${score}%`}>
      <Icon name="solar:magic-stick-3-bold" size={12} color="currentColor" />
      {label}
    </span>
  );
}

/**
 * ConfGauge — 5-segment horizontal gauge that fills based on score.
 * High (≥85%): full green; Medium (60-84%): mixed amber; Low (<60%):
 * red. Shows the percent number to the left of the bars.
 */
function ConfGauge({ score }) {
  if (typeof score !== 'number' || score === 0) {
    return <span className={styles.confGaugeEmpty}>—</span>;
  }
  const tier = score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
  // 5 segments. Fill count is proportional to score.
  const fillCount = Math.max(1, Math.min(5, Math.round((score / 100) * 5)));
  return (
    <span className={styles.confGauge}>
      <span className={[styles.confGaugePct, styles[`confGauge_${tier}Text`]].join(' ')}>{score}%</span>
      <span className={styles.confGaugeBars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={[
              styles.confGaugeBar,
              i < fillCount ? styles[`confGauge_${tier}Bar`] : styles.confGauge_offBar,
            ].join(' ')}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * ComplianceBlock — at-a-glance OCR tier badge + 5-dot strip + expandable
 * review panel for the active document. Lives between the file switcher
 * and the page preview on the left side of the drawer.
 */
/**
 * DocChecksBadge — inline pass/fail badge on the file title that opens the
 * 7-point Document Review checklist popover (Figma 6:5838). The badge
 * reflects the aggregate: all pass → success "Pass N/N"; any fail → error
 * "Failed"; otherwise → warning "Review X/N".
 */
function DocChecksBadge({ compliance, ocrTier, fileName, onApplyDecision }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // { checkKey, decision }
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const total = CHECK_KEYS.length;
  const passCount = CHECK_KEYS.filter(k => compliance[k]?.status === 'pass').length;
  const failed = anyCheckFailed(compliance);
  const pendingAny = anyCheckPending(compliance);

  const variant = failed ? 'error' : (pendingAny ? 'warning' : 'success');
  const label = failed ? 'Checks · Failed' : `Checks · ${passCount}/${total}`;

  const submitReason = (reason) => {
    if (!pending) return;
    onApplyDecision?.({ checkKey: pending.checkKey, decision: pending.decision, reason });
    setPending(null);
  };

  return (
    <span className={styles.docChecks} ref={wrapRef}>
      <button type="button" className={styles.docChecksTrigger} onClick={() => setOpen(v => !v)}>
        <Badge variant={variant} label={label} />
        <Icon name={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} size={11} color="var(--neutral-400)" />
      </button>

      {open && (
        <div className={styles.docChecksPop} role="dialog" aria-label="Document Review checklist">
          <div className={styles.docChecksHead}>
            <Icon name="solar:clipboard-check-linear" size={16} color="var(--neutral-500)" />
            <div className={styles.docChecksHeadText}>
              <div className={styles.docChecksTitle}>Document Review</div>
              <div className={styles.docChecksSub}>Make sure the document meets these criteria</div>
            </div>
            <button type="button" className={styles.docChecksClose} onClick={() => setOpen(false)} aria-label="Close">
              <Icon name="solar:close-circle-linear" size={16} color="var(--neutral-300)" />
            </button>
          </div>
          <ul className={styles.docChecksList}>
            {CHECK_KEYS.map(k => {
              const c = compliance[k] || {};
              const passed = c.status === 'pass';
              const failedCheck = c.status === 'fail';
              return (
                <li key={k} className={styles.docChecksRow}>
                  <Icon
                    name={passed ? 'solar:check-circle-bold' : failedCheck ? 'solar:close-circle-bold' : 'solar:record-circle-linear'}
                    size={16}
                    color={passed ? 'var(--status-success)' : failedCheck ? 'var(--status-error)' : 'var(--neutral-200)'}
                  />
                  <span className={styles.docChecksLabel}>{CHECK_LABELS[k]}</span>
                  {c.source && <AuditBadge source={c.source} actor={c.actor} at={c.at} />}
                  {ocrTier !== 'unreadable' && (
                    <span className={styles.docChecksActions}>
                      {!passed && (
                        <button type="button" className={styles.docChecksPass} onClick={() => setPending({ checkKey: k, decision: 'pass' })}>Pass</button>
                      )}
                      {!failedCheck && (
                        <button type="button" className={styles.docChecksFail} onClick={() => setPending({ checkKey: k, decision: 'fail' })}>Fail</button>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {ocrTier === 'unreadable' && (
            <div className={styles.docChecksUnreadable}>
              Document is unreadable — re-scan or re-request before it can be reviewed.
            </div>
          )}
        </div>
      )}

      {pending && (
        <ReasonDialog
          title={pending.decision === 'pass' ? 'Confirm manual pass' : 'Confirm manual fail'}
          description={CHECK_LABELS[pending.checkKey]}
          decision={pending.decision}
          standardReasons={STANDARD_REASONS[pending.checkKey] || []}
          onCancel={() => setPending(null)}
          onSubmit={submitReason}
        />
      )}
    </span>
  );
}

function FieldConf({ score }) {
  if (typeof score !== 'number') return null;
  if (score === 0) {
    return <span className={[styles.fieldConf, styles.fieldConfMissing].join(' ')}>No value</span>;
  }
  let tier = 'Low';
  let tierCls = styles.fieldConfLow;
  if (score >= 85) { tier = 'High';   tierCls = styles.fieldConfHigh; }
  else if (score >= 60) { tier = 'Medium'; tierCls = styles.fieldConfMedium; }
  return (
    <span className={[styles.fieldConf, tierCls].join(' ')} title={`AI Confidence ${score}%`}>
      {score}% {tier}
    </span>
  );
}

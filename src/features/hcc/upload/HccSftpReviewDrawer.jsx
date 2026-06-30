import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Input } from '../../../components/Input/Input';
import { Badge } from '../../../components/Badge/Badge';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Toggle } from '../../../components/Toggle/Toggle';
import { Select } from '../../../components/Select/Select';
// BulkBar import removed — per-card actions replace the floating bar
// in the new Document Review layout (Figma 121:87283).
import { useAppStore } from '../../../store/useAppStore';
import { getFieldConfidence } from '../data/confidence';
import { POS_LABEL } from './mockOcr';
import { Checkbox } from '../../../components/ui/checkbox';
import { ComplianceStrip } from '../../../components/ComplianceStrip/ComplianceStrip';
import { ComplianceReviewPanel } from '../../../components/ComplianceReviewPanel/ComplianceReviewPanel';
import { OCR_TIER_LABEL, OCR_TIER_TONE, allChecksPassed, anyCheckFailed, anyCheckPending } from '../compliance';
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
  // Per-doc disclosure state: whether the full ComplianceReviewPanel is
  // expanded for this batch. Defaults to expanded when the doc has anything
  // needing a Support touch (any fail or pending check) — so the reviewer
  // doesn't have to discover the panel.
  const [complianceOpenIds, setComplianceOpenIds] = useState(new Set());

  const activeBatch = useMemo(
    () => batches.find(b => b.id === activeId) || batches.find(b => b.status === 'done') || batches[0],
    [batches, activeId],
  );

  // Per-batch selection state — when the user switches tabs we reset
  // the set so bulk actions only ever apply to the visible batch.
  const [selectedIdxs, setSelectedIdxs] = useState(() => new Set());
  // Document Review now has three top-level tabs: Pending Review,
  // Added to Worklist, Deleted. We drive them from each encounter's
  // _docStatus annotation (set by setHccSftpEncounterStatus).
  const [docTab, setDocTab] = useState('pending');
  // Status filter inside the Pending tab — All / Ready / Mismatch / Error.
  const [statusFilter, setStatusFilter] = useState('all');
  // Doc-switcher popover open state (filename click).
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Card-stack pagination index — drives the "Reviewing: X of Y" indicator
  // and Previous/Next Record nav at the bottom of the right panel
  // (Figma 1:3540). Reset whenever the visible set changes.
  const [focusIdx, setFocusIdx] = useState(0);
  const cardStackRef = useRef(null);
  useEffect(() => { setFocusIdx(0); }, [activeId, docTab, statusFilter]);
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
  const readyCount    = pendingEncs.filter(e => encStatus(e) === 'ready').length;
  const mismatchCount = pendingEncs.filter(e => encStatus(e) === 'mismatch').length;
  const errorCount    = pendingEncs.filter(e => encStatus(e) === 'error').length;

  // Filtered list for the right-pane card stack. 'all' shows every
  // pending encounter regardless of status.
  const visibleEncs = (
    docTab === 'pending'
      ? (statusFilter === 'all' ? pendingEncs : pendingEncs.filter(e => encStatus(e) === statusFilter))
    : docTab === 'added'   ? addedEncs
    :                        deletedEncs
  );

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

            {/* ── Document compliance summary + review panel ────────
             * Per the Astrana spec, every document carries an OCR tier
             * (Clean / Degraded / Unreadable) plus a 5-point compliance
             * checklist. The compact strip + tier badge is always visible
             * so Support can see at a glance whether a doc is releasable;
             * the full review panel expands on click for manual pass/fail.
             */}
            {activeBatch.compliance && (
              <ComplianceBlock
                batch={activeBatch}
                expanded={complianceOpenIds.has(activeBatch.id)}
                onToggle={() => setComplianceOpenIds(prev => {
                  const next = new Set(prev);
                  if (next.has(activeBatch.id)) next.delete(activeBatch.id);
                  else next.add(activeBatch.id);
                  return next;
                })}
                onApplyDecision={({ checkKey, decision, reason }) =>
                  applyComplianceDecision?.({ batchId: activeBatch.id, checkKey, decision, reason })
                }
              />
            )}

            <PagePreview
              activeBatch={activeBatch}
              batches={batches}
              onSelect={(id) => setActiveId(id)}
            />
          </div>

          {/* RIGHT — Pending / Added / Deleted tabs + filter chips +
              encounter card stack. */}
          <div className={styles.rightPanel}>
            {/* "Reviewing: X of Y Records" pagination indicator
                (Figma 1:3540 — sits above the tab bar). */}
            {visibleEncs.length > 0 && (
              <div className={styles.reviewingHeader}>
                Reviewing: <strong>{Math.min(focusIdx + 1, visibleEncs.length)}</strong> of <strong>{visibleEncs.length}</strong> Records
              </div>
            )}
            <div className={styles.docTabBar}>
              <button
                type="button"
                className={[styles.docTab, docTab === 'pending' ? styles.docTabActive : ''].join(' ')}
                onClick={() => setDocTab('pending')}
              >
                Pending Review<span className={styles.docTabCount}>({pendingEncs.length})</span>
              </button>
              <button
                type="button"
                className={[styles.docTab, docTab === 'added' ? styles.docTabActive : ''].join(' ')}
                onClick={() => setDocTab('added')}
              >
                Added to Worklist<span className={styles.docTabCount}>({addedEncs.length})</span>
              </button>
              <button
                type="button"
                className={[styles.docTab, docTab === 'deleted' ? styles.docTabActive : ''].join(' ')}
                onClick={() => setDocTab('deleted')}
              >
                Deleted<span className={styles.docTabCount}>({deletedEncs.length})</span>
              </button>
              <span className={styles.docTabBarSpacer} />
              <ActionButton size="S" icon="solar:magnifer-linear" tooltip="Search" />
              <Button
                variant="alt"
                size="S"
                leadingIcon="solar:add-circle-linear"
                onClick={() => showToast?.('Add New Record — coming soon')}
              >
                Add New Record
              </Button>
            </div>

            {/* Filter chips inside the Pending tab — uses the shared
                <Toggle> primitive so the segmented-control behavior +
                visuals match every other filter cluster in the app. */}
            {docTab === 'pending' && (
              <div className={styles.statusChipsRow}>
                <Toggle
                  size="S"
                  items={[
                    { key: 'all',      label: `All (${pendingEncs.length})` },
                    { key: 'ready',    label: `Ready (${readyCount})` },
                    { key: 'mismatch', label: `Mismatch (${mismatchCount})` },
                    { key: 'error',    label: `Error (${errorCount})` },
                  ]}
                  active={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
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

            {/* Previous / Next Record nav — pages through the visible
                encounter stack (Figma 1:3540). */}
            {visibleEncs.length > 1 && (
              <div className={styles.reviewFooter}>
                <Button
                  variant="secondary"
                  size="S"
                  leadingIcon="solar:alt-arrow-left-linear"
                  disabled={focusIdx <= 0}
                  onClick={() => {
                    const next = Math.max(0, focusIdx - 1);
                    setFocusIdx(next);
                    const card = cardStackRef.current?.querySelectorAll('[data-card-idx]')?.[next];
                    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="primary"
                  size="S"
                  trailingIcon="solar:alt-arrow-right-linear"
                  disabled={focusIdx >= visibleEncs.length - 1}
                  onClick={() => {
                    const next = Math.min(visibleEncs.length - 1, focusIdx + 1);
                    setFocusIdx(next);
                    const card = cardStackRef.current?.querySelectorAll('[data-card-idx]')?.[next];
                    card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Next Record
                </Button>
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
function EncounterCard({ enc, status, hccMembers, docTab, cardIdx, onPatch, onAddToWorklist, onDelete, onRestore }) {
  const isMatched = !!enc.patient?.matchedMemberId;
  const member = isMatched ? hccMembers.find(m => m.id === enc.patient.matchedMemberId) : null;
  const errors = new Set(enc.errors || []);
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
                Add to Worklist
              </Button>
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
    </div>
  );
}

/**
 * FieldBlock — label + confidence gauge bar + input slot.
 * Used inside every encounter card cell. The gauge fills based on
 * confidence: 5 segments tinted green/amber/red per tier.
 */
function FieldBlock({ label, required, confidence, children }) {
  return (
    <div className={styles.fieldBlock}>
      <div className={styles.fieldBlockHead}>
        <span className={styles.fieldBlockLabel}>
          {label}{required && <span className={styles.fieldBlockReq}>•</span>}
        </span>
        <ConfGauge score={confidence} />
      </div>
      <div className={styles.fieldBlockBody}>
        {children}
      </div>
    </div>
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
function ComplianceBlock({ batch, expanded, onToggle, onApplyDecision }) {
  const { ocrTier, compliance, fileName } = batch;
  const hasIssue = anyCheckFailed(compliance) || anyCheckPending(compliance) || ocrTier === 'unreadable';
  const ready = ocrTier !== 'unreadable' && allChecksPassed(compliance);

  const summaryLabel = ocrTier === 'unreadable'
    ? 'Unreadable — Support re-scan'
    : ready
      ? 'All 5 checks passed'
      : hasIssue
        ? 'Support review required'
        : 'In review';

  const summaryTone = ocrTier === 'unreadable' || anyCheckFailed(compliance)
    ? 'error'
    : ready
      ? 'success'
      : 'warning';

  return (
    <div className={styles.complianceBlock}>
      <button
        type="button"
        className={styles.complianceHeader}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`compliance-detail-${batch.id}`}
      >
        <div className={styles.complianceHeaderLeft}>
          <Badge variant={OCR_TIER_TONE[ocrTier] || 'warning'} label={`OCR · ${OCR_TIER_LABEL[ocrTier] || 'Unknown'}`} />
          {ocrTier !== 'unreadable' && (
            <ComplianceStrip compliance={compliance} size="S" />
          )}
          <span className={[styles.complianceSummary, styles[`tone_${summaryTone}`]].join(' ')}>
            {summaryLabel}
          </span>
        </div>
        <Icon
          name={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
          size={14}
          color="var(--neutral-300)"
        />
      </button>
      {expanded && (
        <div id={`compliance-detail-${batch.id}`} className={styles.complianceDetail}>
          <ComplianceReviewPanel
            fileName={fileName}
            ocrTier={ocrTier}
            compliance={compliance}
            onDecision={({ checkKey, decision, reason, actor }) =>
              onApplyDecision?.({ checkKey, decision, reason, actor })
            }
          />
        </div>
      )}
    </div>
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

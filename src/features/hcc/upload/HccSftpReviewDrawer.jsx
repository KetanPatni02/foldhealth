import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Input } from '../../../components/Input/Input';
import { Badge } from '../../../components/Badge/Badge';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Select } from '../../../components/Select/Select';
import { IcdSearch } from '../../../components/IcdSearch/IcdSearch';
// BulkBar import removed — per-card actions replace the floating bar
// in the new Document Review layout (Figma 121:87283).
import { useAppStore } from '../../../store/useAppStore';
import { getFieldConfidence } from '../data/confidence';
import { POS_LABEL } from './mockOcr';
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
  const allBatches = useAppStore(s => s.hccSftpBatches) || [];
  const sourceBatchIds = useAppStore(s => s.hccReviewSourceBatchIds);
  const activeId = useAppStore(s => s.hccSftpActiveBatchId);
  const setActiveId = useAppStore(s => s.setHccSftpActiveBatchId);
  // When review is opened over a specific set of documents (e.g. from the
  // upload picker's "Review"), scope the drawer — and its Previous/Next
  // navigation — to just those, in the order they were passed (focus first).
  const batches = useMemo(() => {
    if (!sourceBatchIds || !sourceBatchIds.length) return allBatches;
    const order = new Map(sourceBatchIds.map((id, i) => [id, i]));
    return allBatches
      .filter(b => order.has(b.id))
      .sort((a, b) => order.get(a.id) - order.get(b.id));
  }, [allBatches, sourceBatchIds]);
  const patchEnc = useAppStore(s => s.patchHccSftpEncounter);
  const removeEnc = useAppStore(s => s.removeHccSftpEncounter);
  const removeBatch = useAppStore(s => s.removeHccSftpBatch);
  const createFromEncounter = useAppStore(s => s.hccCreateOrMergeFromEncounter);
  const hccMembers = useAppStore(s => s.hccMembers) || [];
  const showToast = useAppStore(s => s.showToast);

  const activeBatch = useMemo(
    () => batches.find(b => b.id === activeId) || batches.find(b => b.status === 'done') || batches[0],
    [batches, activeId],
  );

  // Per-batch selection state — when the user switches tabs we reset
  // the set so bulk actions only ever apply to the visible batch.
  const [selectedIdxs, setSelectedIdxs] = useState(() => new Set());
  // Doc-switcher popover open state (filename click).
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Ref to the left-pane preview scroll container. Used by the per-field
  // confidence pills to scroll the matching page into view and pulse a
  // highlight on the cited encounter when the user clicks them.
  const previewBodyRef = useRef(null);
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

  // Scroll the left-pane preview to the cited page and pulse a brief
  // highlight on the matching encounter's field row so the reviewer
  // can verify the AI's extraction against the source document.
  const citeField = (page, encTempId, field) => {
    const root = previewBodyRef.current;
    if (!root) return;
    const pageEl = root.querySelector(`[data-preview-page="${page}"]`);
    if (!pageEl) return;
    pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const target = encTempId
      ? root.querySelector(`[data-preview-page="${page}"] [data-preview-enc="${encTempId}"] [data-preview-field="${field}"]`)
        || root.querySelector(`[data-preview-page="${page}"] [data-preview-enc="${encTempId}"]`)
      : pageEl;
    if (!target) return;
    target.classList.add(styles.previewHighlight);
    setTimeout(() => target.classList.remove(styles.previewHighlight), 1600);
  };

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
      const r = createFromEncounter?.({ ...enc, _docName: activeBatch.fileName, _batchId: activeBatch.id });
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

  const encStatus = (enc) => {
    if (!enc?.patient?.matchedMemberId) return 'mismatch';
    if (Array.isArray(enc?.errors) && enc.errors.length > 0) return 'error';
    return 'ready';
  };
  // No tabs / status filter — the card stack shows every pending record for
  // this document, grouped by patient.
  const visibleEncs = pendingEncs;

  // Group encounters by patient so one card == one patient, with N DOS
  // blocks inside. Insertion-ordered Map preserves the document's
  // chronological appearance. Matched encounters group by member id;
  // unmatched fall back to extracted name + DOB. Plain const — not a
  // hook — so it stays compatible with the early-return above.
  const visibleGroups = (() => {
    const map = new Map();
    visibleEncs.forEach((enc) => {
      const key = enc.patient?.matchedMemberId
        ? `m:${enc.patient.matchedMemberId}`
        : `u:${(enc.patient?.name || '').toLowerCase()}|${enc.patient?.dob || ''}`;
      if (!map.has(key)) map.set(key, { key, encs: [] });
      map.get(key).encs.push(enc);
    });
    return Array.from(map.values());
  })();

  const title = (
    <span className={styles.titleBlock}>
      <span className={styles.titleTop}>Document Review</span>
    </span>
  );

  // Step through the reviewed documents with Previous / Next (Figma
  // 4999:156381). Falls back to the recorded/members stats for a single doc.
  const activeIndex = batches.findIndex(b => b.id === activeBatch?.id);
  const totalDocs = batches.length;
  const goToDoc = (idx) => { const b = batches[idx]; if (b) setActiveId(b.id); };

  const headerRight = totalDocs > 1 ? (
    <span className={styles.reviewNav}>
      <Button
        variant="alt"
        size="S"
        leadingIcon="solar:alt-arrow-left-linear"
        disabled={activeIndex <= 0}
        onClick={() => goToDoc(activeIndex - 1)}
      >
        Previous
      </Button>
      <span className={styles.reviewNavLabel}>
        Reviewing: {activeIndex + 1} of {totalDocs} Documents
      </span>
      <Button
        variant="alt"
        size="S"
        trailingIcon="solar:alt-arrow-right-linear"
        disabled={activeIndex >= totalDocs - 1}
        onClick={() => goToDoc(activeIndex + 1)}
      >
        Next
      </Button>
    </span>
  ) : (
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
            <PagePreview
              activeBatch={activeBatch}
              batches={batches}
              onSelect={(id) => setActiveId(id)}
              previewRef={previewBodyRef}
            />
          </div>

          {/* RIGHT — per-patient encounter card stack (one patient per
              document, N DOS inside). No tabs / status filters — the
              reviewer just works the document's records. */}
          <div className={styles.rightPanel}>
            {/* Encounter card stack — replaces the table. */}
            <div className={styles.cardStack}>
              {visibleEncs.length === 0 ? (
                // Every record on this document has been triaged → completion
                // hero with a jump to the next document that still has work.
                activeEncs.length > 0 ? (
                  <DocReviewCompleted
                    total={activeEncs.length}
                    nextBatch={batches.find(b => b.id !== activeBatch.id && (b.encounters || []).some(e => (e._docStatus || 'pending') === 'pending'))}
                    onPickNext={(id) => setActiveId(id)}
                    onBackToWorklist={close}
                  />
                ) : (
                  <div className={styles.cardStackEmpty}>
                    <Icon name="solar:checklist-minimalistic-linear" size={28} color="var(--neutral-200)" />
                    <span>No records to review on this document</span>
                  </div>
                )
              ) : visibleGroups.map((group) => (
                <PatientCard
                  key={group.key}
                  group={group}
                  hccMembers={hccMembers}
                  encStatus={encStatus}
                  onCite={citeField}
                  showToast={showToast}
                  patchEnc={(enc, patch) => patchEnc?.(activeBatch.id, activeEncs.indexOf(enc), patch)}
                  onAddToWorklist={(enc) => {
                    const r = createFromEncounter?.({ ...enc, _docName: activeBatch.fileName, _batchId: activeBatch.id });
                    if (r?.kind === 'skipped') {
                      showToast?.(`Cannot add — ${r.reason || 'encounter is incomplete'}`);
                      return false;
                    }
                    setEncounterStatus?.(activeBatch.id, activeEncs.indexOf(enc), 'added');
                    return true;
                  }}
                  onDelete={(enc) => {
                    setEncounterStatus?.(activeBatch.id, activeEncs.indexOf(enc), 'deleted');
                    showToast?.(`Deleted ${enc.patient?.name || 'encounter'}`);
                  }}
                />
              ))}
            </div>
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

function PagePreview({ activeBatch, batches, onSelect, previewRef }) {
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
      <div className={styles.previewBody} ref={previewRef}>
        {pages.length === 0 ? (
          <div className={styles.previewEmpty}>
            <Icon name="solar:document-linear" size={20} color="var(--neutral-200)" />
            <span>No pages extracted</span>
          </div>
        ) : pages.map(([page, encs]) => (
          <div key={page} className={styles.previewPage} data-preview-page={page}>
            <div className={styles.previewPageHeader}>
              <div className={styles.previewPageOrg}>Fold Health Medical Group</div>
              <div className={styles.previewPagePagenum}>Page {page} · {fileName}</div>
            </div>
            <h2 className={styles.previewPageH1}>Progress Note</h2>
            {encs.map((enc, i) => (
              <div key={enc.tempId || i} className={styles.previewPageEnc} data-preview-enc={enc.tempId}>
                <div className={styles.previewPageMeta}>
                  <div data-preview-field="patient"><strong>Patient:</strong> {enc.patient?.name || '—'}</div>
                  <div data-preview-field="dob"><strong>DOB:</strong> {enc.patient?.dob || '—'}</div>
                  <div data-preview-field="dos"><strong>DOS:</strong> {enc.dos || '—'}</div>
                  <div data-preview-field="provider"><strong>Provider:</strong> {enc.provider || '—'}</div>
                  <div data-preview-field="pos"><strong>POS:</strong> {enc.pos || '—'}{enc.posDesc ? ` — ${enc.posDesc}` : ''}</div>
                </div>
                <div className={styles.previewPageSection} data-preview-field="icds">
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
              <input
                type="checkbox"
                aria-label="Select all encounters"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                onChange={(e) => setSelectedAll?.(allIdxs, e.target.checked)}
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
  const [icdOpen, setIcdOpen] = useState(false);
  const icdWrapRef = useRef(null);
  useEffect(() => {
    if (!icdOpen) return undefined;
    const onDocClick = (e) => { if (!icdWrapRef.current?.contains(e.target)) setIcdOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [icdOpen]);

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
        <input
          type="checkbox"
          aria-label="Select encounter"
          checked={!!checked}
          onChange={onToggle}
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
          <span className={styles.icdAddWrap} ref={icdWrapRef}>
            <button
              type="button"
              className={styles.icdAddBtn}
              onClick={() => setIcdOpen((v) => !v)}
              aria-label="Add ICD"
            >
              <Icon name="solar:add-circle-linear" size={13} color="var(--neutral-300)" />
            </button>
            {icdOpen && (
              <span className={styles.icdPickPop}>
                <IcdSearch
                  autoFocus
                  excludeCodes={(enc.icds || []).map(i => i.code)}
                  placeholder="Search ICD by code or description"
                  onSelect={(icd) => {
                    onPatch({ icds: [...(enc.icds || []), { code: icd.code, desc: icd.title, hcc: icd.hcc || '', valid: true }] });
                    setIcdOpen(false);
                  }}
                />
              </span>
            )}
          </span>
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
 * Document Review patient card — one card per patient. Header shows
 * the matched member identity once, followed by N "encounter blocks"
 * — one per DOS surfaced in this document. Each block carries its own
 * Ready/Mismatch/Error pill, per-DOS actions, and the editable field
 * grid (DOS · ICD · Provider · POS · Category). Single-DOS patients
 * render with no DOS-count chip and no separators.
 */
function PatientCard({ group, hccMembers, encStatus, patchEnc, onAddToWorklist, onDelete, onCite, showToast }) {
  const first = group.encs[0];
  const isMatched = !!first?.patient?.matchedMemberId;
  const member = isMatched ? hccMembers.find(m => m.id === first.patient.matchedMemberId) : null;
  const displayName = member?.name || first?.patient?.name || '(unmatched)';
  const initials = member?.in || displayName.split(' ').map(p => p[0]).slice(0, 2).join('');
  const uploadRef = useRef(null);

  // Patient-level "Add to Worklist" — commits every ready DOS for this
  // patient in one action (only ready rows are eligible).
  const readyEncs = group.encs.filter(e => encStatus(e) === 'ready');
  const handleAddAll = () => {
    let added = 0;
    readyEncs.forEach((enc) => { if (onAddToWorklist(enc)) added += 1; });
    if (added) showToast?.(`Added ${added} DOS for ${displayName} to worklist`);
  };

  return (
    <div className={styles.encCard}>
      <div className={styles.encCardHead}>
        <Avatar variant="patient" initials={initials} />
        <div className={styles.encCardIdent}>
          <div className={styles.encCardName}>{displayName}</div>
          <div className={styles.encCardMeta}>
            {member?.g || ''} <span className={styles.encCardMetaDot}>•</span>
            {member?.age || ''} <span className={styles.encCardMetaDot}>•</span>
            #{first?.patient?.patientId || first?.patient?.matchedMemberDisplayId || '—'}
          </div>
        </div>
        <span className={styles.encGroupCount}>{group.encs.length} DOS</span>
        {/* Patient-level actions — upload a document, add another DOS record,
            and add every ready DOS to the worklist in one go. */}
        <div className={styles.encPatientActions}>
          <input
            ref={uploadRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) showToast?.(`Uploaded ${f.name} for ${displayName}`);
              e.target.value = '';
            }}
          />
          <ActionButton size="S" icon="solar:upload-minimalistic-linear" tooltip="Upload document" onClick={() => uploadRef.current?.click()} />
          <Button variant="alt" size="S" leadingIcon="solar:add-circle-linear" onClick={() => showToast?.(`Add new record for ${displayName} — coming soon`)}>
            Add New Record
          </Button>
          <Button variant="primary" size="S" leadingIcon="solar:check-read-linear" disabled={readyEncs.length === 0} onClick={handleAddAll}>
            Add to Worklist
          </Button>
        </div>
      </div>
      {group.encs.map((enc, i) => (
        <EncounterBlock
          key={enc.tempId || `${group.key}:${i}`}
          enc={enc}
          status={encStatus(enc)}
          isFirst={i === 0}
          onPatch={(patch) => patchEnc(enc, patch)}
          onDelete={() => onDelete(enc)}
          onCite={onCite}
        />
      ))}
    </div>
  );
}

/**
 * One DOS row inside a PatientCard. Renders the status pill + actions
 * at the top, then the editable 2-column field grid.
 */
/**
 * Status badge with a hover tooltip explaining *why* this row is
 * flagged. Tooltip is portaled to escape the card's overflow. No tip
 * when `reason` is empty (e.g. Ready rows) — just renders the Badge.
 */
function StatusBadgeWithTip({ variant, icon, label, reason, tone }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!hover || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 6 });
  }, [hover]);
  if (!reason) {
    return <Badge variant={variant} icon={icon} label={label} />;
  }
  return (
    <span
      ref={wrapRef}
      className={styles.statusTipWrap}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Badge variant={variant} icon={icon} label={label} />
      {hover && createPortal(
        <span
          role="tooltip"
          className={[
            styles.statusTip,
            tone === 'mismatch' ? styles.statusTipMismatch : styles.statusTipError,
          ].join(' ')}
          style={{
            left: Math.min(window.innerWidth - 320, Math.max(8, pos.left)),
            top: pos.top,
          }}
        >
          {reason}
        </span>,
        document.body
      )}
    </span>
  );
}

function EncounterBlock({ enc, status, isFirst, onPatch, onDelete, onCite }) {
  const [icdOpen, setIcdOpen] = useState(false);
  const icdWrapRef = useRef(null);
  useEffect(() => {
    if (!icdOpen) return undefined;
    const onDocClick = (e) => { if (!icdWrapRef.current?.contains(e.target)) setIcdOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [icdOpen]);

  const errors = new Set(enc.errors || []);
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
  const fieldConf = (name) => {
    if (errors.has(name)) return 0;
    return getFieldConfidence(enc, name);
  };
  // Explain *why* this row is flagged. Mismatch → no roster member, or
  // OCR'd ID disagrees with the matched member's ID. Error → which
  // required field(s) couldn't be read from the document.
  let reason = null;
  if (status === 'mismatch') {
    if (enc.patient?.idMismatch) {
      reason = `Member ID on document (#${enc.patient.patientId || '—'}) doesn't match the linked member's ID`;
    } else {
      const bits = [];
      if (enc.patient?.name) bits.push(`"${enc.patient.name}"`);
      if (enc.patient?.dob) bits.push(`DOB ${enc.patient.dob}`);
      reason = `No member found for ${bits.join(' · ') || 'this patient'} in your roster`;
    }
  } else if (status === 'error') {
    const labelMap = { dos: 'DOS', icds: 'ICD codes', provider: 'Provider', pos: 'POS' };
    const list = (enc.errors || []).map(e => labelMap[e] || e);
    if (list.length) {
      reason = `Missing required ${list.length > 1 ? 'fields' : 'field'}: ${list.join(', ')}`;
    }
  }
  return (
    <div className={[styles.encBlock, isFirst ? '' : styles.encBlockSep].join(' ')}>
      <div className={styles.encBlockHead}>
        <StatusBadgeWithTip
          variant={badgeVariant}
          icon={badgeIcon}
          label={statusLabel}
          reason={reason}
          tone={status}
        />
        <div className={styles.encCardActions}>
          <ActionButton size="S" icon="solar:trash-bin-trash-linear" tooltip="Remove this DOS" onClick={onDelete} />
        </div>
      </div>

      <div className={styles.encGrid}>
        <FieldBlock label="DOS" required confidence={fieldConf('dos')} sourcePage={enc.sourcePage} onCite={onCite ? () => onCite(enc.sourcePage || 1, enc.tempId, 'dos') : null}>
          <Input
            value={enc.dos || ''}
            placeholder="MM/DD/YYYY"
            variant={errors.has('dos') ? 'error' : 'default'}
            onChange={(e) => onPatch({ dos: e.target.value })}
          />
        </FieldBlock>
        <FieldBlock label="ICD Codes" required confidence={fieldConf('icds')} sourcePage={enc.sourcePage} onCite={onCite ? () => onCite(enc.sourcePage || 1, enc.tempId, 'icds') : null}>
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
            <span className={styles.icdAddWrap} ref={icdWrapRef}>
              <button
                type="button"
                className={styles.icdAddBtn}
                onClick={() => setIcdOpen((v) => !v)}
                aria-label="Add ICD"
              >
                <Icon name="solar:add-circle-linear" size={13} color="var(--neutral-300)" />
              </button>
              {icdOpen && (
                <span className={styles.icdPickPop}>
                  <IcdSearch
                    autoFocus
                    excludeCodes={(enc.icds || []).map(i => i.code)}
                    placeholder="Search ICD by code or description"
                    onSelect={(icd) => {
                      onPatch({ icds: [...(enc.icds || []), { code: icd.code, desc: icd.title, hcc: icd.hcc || '', valid: true }] });
                      setIcdOpen(false);
                    }}
                  />
                </span>
              )}
            </span>
          </div>
        </FieldBlock>
        <FieldBlock label="Rendering Provider" required confidence={fieldConf('provider')} sourcePage={enc.sourcePage} onCite={onCite ? () => onCite(enc.sourcePage || 1, enc.tempId, 'provider') : null}>
          <Input
            value={enc.provider || ''}
            placeholder="Provider"
            variant={errors.has('provider') ? 'error' : 'default'}
            onChange={(e) => onPatch({ provider: e.target.value })}
          />
        </FieldBlock>
        <FieldBlock label="POS" required confidence={fieldConf('pos')} sourcePage={enc.sourcePage} onCite={onCite ? () => onCite(enc.sourcePage || 1, enc.tempId, 'pos') : null}>
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
 * FieldBlock — label + confidence pill + input slot. The pill shows
 * the AI's High/Medium/Low confidence tier for this field and, when
 * the encounter has a sourcePage, doubles as a citation affordance:
 * hover reveals "Source · Page N", click scrolls the left-pane PDF
 * preview to that page and pulses a highlight on the cited row.
 */
function FieldBlock({ label, required, confidence, sourcePage, onCite, children }) {
  return (
    <div className={styles.fieldBlock}>
      <div className={styles.fieldBlockHead}>
        <span className={styles.fieldBlockLabel}>
          {label}{required && <span className={styles.fieldBlockReq}>•</span>}
        </span>
        <ConfPill score={confidence} sourcePage={sourcePage} onCite={onCite} />
      </div>
      <div className={styles.fieldBlockBody}>
        {children}
      </div>
    </div>
  );
}

/**
 * ConfPill — replaces the old percent-based gauge with a plain
 * High/Medium/Low label, mirroring how the AI's underlying tier model
 * actually reports confidence (the percent number was always derived
 * from the same tier mapping anyway, so showing it was misleading
 * precision). When a sourcePage is available the pill becomes a
 * button with a hover tooltip ("Source · Page N — Click to view")
 * and clicking it fires `onCite` which scrolls the left-pane preview
 * to that page and highlights the cited encounter row.
 */
function ConfPill({ score, sourcePage, onCite }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!hover || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 6 });
  }, [hover]);
  if (typeof score !== 'number' || score === 0) {
    return <span className={styles.confPillEmpty}>—</span>;
  }
  const tier = score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low';
  const label = tier === 'high' ? 'High' : tier === 'medium' ? 'Medium' : 'Low';
  const canCite = typeof onCite === 'function' && !!sourcePage;
  const cls = [styles.confPill, styles[`confPill_${tier}`], canCite ? styles.confPillClickable : ''].join(' ');
  if (!canCite) {
    return <span className={cls}>{label}</span>;
  }
  return (
    <span
      ref={wrapRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className={cls}
        onClick={(e) => { e.preventDefault(); onCite(); }}
      >
        {label}
      </button>
      {hover && createPortal(
        <span
          role="tooltip"
          className={styles.confPillTip}
          style={{
            left: Math.min(window.innerWidth - 220, Math.max(8, pos.left)),
            top: pos.top,
          }}
        >
          <span className={styles.confPillTipHead}>Source · Page {sourcePage}</span>
          <span className={styles.confPillTipSub}>Click to view in document</span>
        </span>,
        document.body
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

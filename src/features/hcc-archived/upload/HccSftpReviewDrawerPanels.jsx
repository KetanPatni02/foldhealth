import { Icon } from '../../../components/Icon/Icon';
import { Badge } from '../../../components/Badge/Badge';
import { OCR_TIER_TONE, OCR_TIER_LABEL } from '../compliance';
import {
  PagePreview, DocReviewCompleted, PatientReviewBanner, EncounterCard,
  DocChecksBadge,
} from './HccSftpReviewDrawerParts';
import styles from './HccSftpReviewDrawer.module.css';

export function HccSftpReviewDrawerPanels({
  activeBatch, batches, switcherOpen, setSwitcherOpen, setActiveId,
  focusedGroup, visibleEncs, activeEncs, patientSlots, focusIdx,
  hccMembers, docTab, cardStackRef, applyComplianceDecision,
  activeBatchEncs, patchEnc, createFromEncounter, setEncounterStatus, showToast,
  handleAddPatientToWorklist, goNext,
}) {
  return activeBatch ? (
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

          {/* RIGHT — patient banner + encounter card stack. The
              Previous/Reviewing/Next nav now lives in the top header bar
              and the Delete/Add actions in the footer (Figma 4001:179835). */}
          <div className={styles.rightPanel}>
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
                      <span>No encounters left to review on this document</span>
                    </div>
                  )
              ) : visibleEncs.map((enc, visibleI) => {
                const idx = activeEncs.indexOf(enc);
                return (
                  <EncounterCard
                    key={enc.tempId || idx}
                    enc={enc}
                    status={sftpEncStatus(enc)}
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
      ;
}

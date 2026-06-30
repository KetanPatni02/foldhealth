import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { Button } from '../../../components/Button/Button';
import { Input } from '../../../components/Input/Input';
import { Select } from '../../../components/Select/Select';
import { Badge } from '../../../components/Badge/Badge';
import { Dropzone } from '../../../components/Dropzone/Dropzone';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { POS_LABEL } from './mockOcr';
import styles from './IcdCreationScreen.module.css';

/**
 * ICD Creation — unified entry point for adding HCC records.
 *
 * Replaces the legacy 3-item popover (New Record Manually / Extract from
 * Document / Open SFTP Server) with a single screen that handles all
 * three flows in one surface:
 *
 *   Left  — Upload & Review Document (dropzone + "Sync via SFTP" trigger)
 *   Right — Session records list (extracted encounters waiting for confirm)
 *           with an "Add Manually" CTA when empty.
 *
 * Dropped files run through queueHccDocumentForOcr (the same pipeline as
 * SFTP ingest), so OCR tier + 5-point compliance are evaluated identically
 * regardless of how the doc entered the system.
 *
 * Wired from the HCC worklist's Upload Document toolbar button.
 */

const ACCEPT_EXT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
const ACCEPT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

export function IcdCreationScreen() {
  const open = useAppStore(s => s.icdCreationOpen);
  const close = useAppStore(s => s.closeIcdCreation);
  const queueOcr = useAppStore(s => s.queueHccDocumentForOcr);
  const simulateSftp = useAppStore(s => s.simulateSftpIngest);
  const trackBatch = useAppStore(s => s.trackIcdCreationBatch);
  const showToast = useAppStore(s => s.showToast);
  const batches = useAppStore(s => s.hccSftpBatches) || [];
  const sessionIds = useAppStore(s => s.icdCreationSessionBatchIds) || [];
  const createFromEncounter = useAppStore(s => s.hccCreateOrMergeFromEncounter);

  const [mode, setMode] = useState('records'); // 'records' | 'manual'
  const [whatNextOpen, setWhatNextOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Staged-files queue — files are added here by the dropzone but OCR
  // doesn't run until Start Extraction. Each entry:
  //   { id, file, status: 'complete'|'extracting'|'done' }
  // 'complete' = upload finished, ready for extraction (per Figma 1:18181).
  const [queue, setQueue] = useState([]);
  const [extracting, setExtracting] = useState(false);

  if (!open) return null;

  // Encounters extracted in this session — the right panel's records list.
  // We pull them from the batches the store knows about, then filter to
  // only the ones added during this Upload Document session.
  const sessionBatches = batches.filter(b => sessionIds.includes(b.id));
  const sessionEncounters = sessionBatches.flatMap(b =>
    (b.encounters || []).map(e => ({ ...e, _batchId: b.id, _fileName: b.fileName, _ocrTier: b.ocrTier }))
  );

  const handleDrop = (file) => {
    if (!file) return;
    // Stage the file — DON'T kick off OCR until the user clicks
    // Start Extraction. Matches Figma 1:18181: uploaded files appear
    // in a queue below the dropzone with eye/trash actions; OCR is a
    // separate explicit step.
    setQueue(prev => [...prev, {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      status: 'complete',
    }]);
  };

  const handleRemoveQueued = (id) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  };

  const handleStartExtraction = async () => {
    if (queue.length === 0 || extracting) return;
    setExtracting(true);
    setQueue(prev => prev.map(q => ({ ...q, status: 'extracting' })));
    // Run extraction on each queued file in parallel via the existing
    // pipeline. Each landed batch gets tracked so the right panel only
    // shows THIS session's records.
    await Promise.all(queue.map(async (q) => {
      const before = useAppStore.getState().hccSftpBatches?.length || 0;
      await queueOcr?.(q.file);
      const after = useAppStore.getState().hccSftpBatches || [];
      const newest = after[after.length - 1] || after[0];
      if (newest && after.length > before) trackBatch?.(newest.id);
    }));
    setExtracting(false);
    setQueue([]); // queue clears once results land in the right panel
  };

  const handleDiscardQueue = () => setQueue([]);

  const handleSftpSync = async () => {
    setSyncing(true);
    const before = useAppStore.getState().hccSftpBatches || [];
    const beforeIds = new Set(before.map(b => b.id));
    await simulateSftp?.();
    const after = useAppStore.getState().hccSftpBatches || [];
    after.forEach(b => { if (!beforeIds.has(b.id)) trackBatch?.(b.id); });
    setSyncing(false);
  };

  const handleAddToWorklist = (enc) => {
    const r = createFromEncounter?.({ ...enc, _docName: enc._fileName });
    if (r?.kind === 'created' || r?.kind === 'updated') {
      showToast?.(`Added to worklist: ${enc.patient?.name || 'encounter'}`);
    }
  };

  return createPortal(
    <>
      <div className={styles.overlay} onClick={close} />
      <div className={styles.panel} role="dialog" aria-label="ICD Creation" aria-modal="true">
        {/* Title bar */}
        <header className={styles.titleBar}>
          <h2 className={styles.title}>ICD Creation</h2>
          <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </header>

        <div className={styles.body}>
          {/* ── Left: Upload & Review Document ───────────────────────── */}
          <section className={styles.leftCol}>
            <div className={styles.colHeader}>
              <h3 className={styles.colTitle}>Upload &amp; Review Document</h3>
              <Button
                variant="alt"
                size="S"
                leadingIcon="solar:refresh-linear"
                disabled={syncing}
                onClick={handleSftpSync}
              >
                {syncing ? 'Syncing…' : 'Sync via SFTP'}
              </Button>
            </div>

            <Dropzone
              accept={ACCEPT_EXT}
              acceptMime={ACCEPT_MIME}
              icon="solar:upload-minimalistic-linear"
              iconSize={28}
              onPick={handleDrop}
              onReject={(rejected) => showToast?.(`${rejected[0]?.name}: unsupported format`)}
              helperText="Supported formats: PDF, DOC, JPG, or PNG"
              secondaryText="Max size: 100 MB"
            />

            {/* Staged-files queue — appears between dropzone and footer
                once the user has dropped one or more files. */}
            {queue.length > 0 && (
              <ul className={styles.queueList}>
                {queue.map((q) => (
                  <li key={q.id} className={styles.queueRow}>
                    <Icon name="solar:document-text-linear" size={20} color="var(--primary-300)" />
                    <div className={styles.queueMeta}>
                      <div className={styles.queueName}>{q.file?.name || 'Document'}</div>
                      <div className={styles.queueSub}>
                        {formatBytes(q.file?.size)} / 100 MB
                        <span className={styles.queueStatus}>
                          {q.status === 'extracting' ? (
                            <>
                              <span className={styles.dotProcessing} />
                              <span>Extracting…</span>
                            </>
                          ) : (
                            <>
                              <Icon name="solar:check-circle-bold" size={12} color="var(--status-success)" />
                              <span>Complete</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className={styles.queueActions}>
                      <button
                        type="button"
                        className={styles.queueIconBtn}
                        title="Preview"
                        disabled={extracting}
                      >
                        <Icon name="solar:eye-linear" size={16} color="var(--neutral-400)" />
                      </button>
                      <button
                        type="button"
                        className={styles.queueIconBtn}
                        title="Remove"
                        onClick={() => handleRemoveQueued(q.id)}
                        disabled={extracting}
                      >
                        <Icon name="solar:trash-bin-trash-linear" size={16} color="var(--neutral-400)" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Start Extraction / Discard footer — only when files queued. */}
            {queue.length > 0 && (
              <div className={styles.queueFooter}>
                <Button
                  variant="primary"
                  size="M"
                  leadingIcon="solar:magic-stick-3-linear"
                  disabled={extracting}
                  onClick={handleStartExtraction}
                >
                  {extracting ? 'Extracting…' : 'Start Extraction'}
                </Button>
                <Button
                  variant="secondary"
                  size="M"
                  disabled={extracting}
                  onClick={handleDiscardQueue}
                >
                  Discard
                </Button>
              </div>
            )}

            {/* "What happens next?" collapsible hint */}
            <button
              type="button"
              className={styles.whatNext}
              onClick={() => setWhatNextOpen(v => !v)}
              aria-expanded={whatNextOpen}
            >
              <Icon name="solar:lightbulb-bolt-linear" size={14} color="var(--primary-300)" />
              <span>What happens next?</span>
              <Icon
                name={whatNextOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-right-linear'}
                size={12}
                color="var(--neutral-300)"
              />
            </button>
            {whatNextOpen && (
              <ol className={styles.whatNextList}>
                <li>AI runs OCR + the 5-point compliance check on the document.</li>
                <li>Pages flagged as Unreadable route to Support for re-scan.</li>
                <li>Extracted records show on the right — confirm each one to add it to the worklist.</li>
              </ol>
            )}
          </section>

          {/* ── Right: Session records ──────────────────────────────── */}
          <section className={styles.rightCol}>
            {mode === 'manual' ? (
              <ManualEntryForm
                onCancel={() => setMode('records')}
                onCreated={() => { setMode('records'); }}
              />
            ) : sessionEncounters.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Icon name="solar:clipboard-text-linear" size={32} color="var(--neutral-200)" />
                </div>
                <div className={styles.emptyTitle}>No Records Added Yet</div>
                <div className={styles.emptyMsg}>
                  Records that have been successfully added to the worklist will appear here.
                </div>
                <Button
                  variant="primary"
                  size="M"
                  leadingIcon="solar:pen-linear"
                  onClick={() => setMode('manual')}
                >
                  Add Manually
                </Button>
              </div>
            ) : (
              <RecordsList
                encounters={sessionEncounters}
                onAdd={handleAddToWorklist}
                onAddManually={() => setMode('manual')}
              />
            )}
          </section>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Right column: records list ────────────────────────────────────────

function RecordsList({ encounters, onAdd, onAddManually }) {
  return (
    <div className={styles.recordsWrap}>
      <header className={styles.recordsHeader}>
        <div>
          <div className={styles.recordsTitle}>Records</div>
          <div className={styles.recordsSubtitle}>{encounters.length} extracted</div>
        </div>
        <Button variant="secondary" size="S" leadingIcon="solar:pen-linear" onClick={onAddManually}>
          Add Manually
        </Button>
      </header>
      <ul className={styles.recordsList}>
        {encounters.map((enc) => (
          <li key={enc.tempId || `${enc.patient?.name}-${enc.dos}`} className={styles.recordCard}>
            <div className={styles.recordMain}>
              <div className={styles.recordTitleRow}>
                <div className={styles.recordName}>{enc.patient?.name || 'Unknown patient'}</div>
                {enc._ocrTier && (
                  <Badge
                    variant={enc._ocrTier === 'clean' ? 'success' : enc._ocrTier === 'degraded' ? 'warning' : 'error'}
                    label={`OCR · ${enc._ocrTier[0].toUpperCase()}${enc._ocrTier.slice(1)}`}
                  />
                )}
              </div>
              <div className={styles.recordMeta}>
                <span><strong>DOS</strong> {enc.dos || '—'}</span>
                <span><strong>Provider</strong> {enc.provider || '—'}</span>
                <span><strong>POS</strong> {enc.pos ? `${enc.pos} · ${POS_LABEL[enc.pos] || ''}` : '—'}</span>
              </div>
              <div className={styles.recordIcds}>
                {(enc.icds || []).map((c, i) => (
                  <span key={i} className={c.valid ? styles.icdChip : styles.icdChipInvalid}>{c.code}</span>
                ))}
              </div>
            </div>
            <div className={styles.recordActions}>
              <Button variant="primary" size="S" onClick={() => onAdd(enc)}>
                Add to Worklist
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Right column: manual entry form ───────────────────────────────────

function ManualEntryForm({ onCancel, onCreated }) {
  const hccMembers = useAppStore(s => s.hccMembers) || [];
  const createFromEncounter = useAppStore(s => s.hccCreateOrMergeFromEncounter);
  const showToast = useAppStore(s => s.showToast);

  const [memberId, setMemberId] = useState('');
  const [dos, setDos] = useState('');
  const [provider, setProvider] = useState('');
  const [pos, setPos] = useState('');
  const [icds, setIcds] = useState('');

  const memberOptions = [
    { value: '', label: 'Select a member…' },
    ...hccMembers.map(m => ({ value: m.id, label: m.name })),
  ];

  const posOptions = [
    { value: '', label: 'Select POS…' },
    ...Object.entries(POS_LABEL).map(([code, label]) => ({ value: code, label: `${code} · ${label}` })),
  ];

  const valid = !!memberId && !!dos && !!provider && !!pos && !!icds.trim();

  const submit = () => {
    if (!valid) return;
    const member = hccMembers.find(m => m.id === memberId);
    const enc = {
      tempId: `manual-${Date.now()}`,
      patient: {
        name: member?.name || '',
        dob: member?.dob || '',
        matchedMemberId: member?.id || null,
        matchedMemberDisplayId: member?.memberId || null,
        matchConfidence: 100,
      },
      dos,
      provider,
      pos,
      posDesc: POS_LABEL[pos] || '',
      icds: icds.split(/[,\s]+/).filter(Boolean).map(c => ({ code: c.trim().toUpperCase(), valid: true })),
      docType: 'Manual Entry',
      errors: [],
      _docName: 'Manual Entry',
    };
    const r = createFromEncounter?.(enc);
    if (r?.kind === 'created' || r?.kind === 'updated') {
      showToast?.(`Added to worklist: ${member?.name}`);
      onCreated?.();
    }
  };

  return (
    <div className={styles.manualForm}>
      <header className={styles.manualHeader}>
        <h3 className={styles.recordsTitle}>Add Record Manually</h3>
        <button type="button" className={styles.linkBtn} onClick={onCancel}>Cancel</button>
      </header>

      <div className={styles.formGroup}>
        <label className={styles.label}>Patient<span className={styles.required}>*</span></label>
        <Select options={memberOptions} value={memberId} onChange={setMemberId} placeholder="Select a member…" />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Date of Service<span className={styles.required}>*</span></label>
        <Input value={dos} onChange={e => setDos(e.target.value)} placeholder="MM/DD/YYYY" />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Rendering Provider<span className={styles.required}>*</span></label>
        <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="Dr. Provider Name" />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>POS<span className={styles.required}>*</span></label>
        <Select options={posOptions} value={pos} onChange={setPos} placeholder="Select POS…" />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>ICD Codes<span className={styles.required}>*</span></label>
        <Input
          value={icds}
          onChange={e => setIcds(e.target.value)}
          placeholder="e.g. E11.22, I50.32, J44.9"
        />
        <span className={styles.helper}>Comma or space separated.</span>
      </div>

      <div className={styles.manualFooter}>
        <Button variant="secondary" size="L" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="L" disabled={!valid} onClick={submit}>
          Add to Worklist
        </Button>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)}${units[i]}`;
}

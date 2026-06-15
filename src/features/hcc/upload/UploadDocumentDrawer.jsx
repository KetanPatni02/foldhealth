import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Icon } from '../../../components/Icon/Icon';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Input } from '../../../components/Input/Input';
import { Toggle } from '../../../components/Toggle/Toggle';
import { useAppStore } from '../../../store/useAppStore';
import { runMockOcr, mandatoryFields, POS_LABEL } from './mockOcr';
import styles from './UploadDocumentDrawer.module.css';

// Accepted file types for clinical document upload. PDFs are the canonical
// source; Word docs cover dictated notes from EHRs that export to .docx;
// JPG/PNG cover scanned/photographed encounter sheets and lab reports.
// Keep the MIME and extension lists in sync — `accept=` uses extensions
// for cross-OS reliability, the runtime check uses MIME.
// Numbered step indicator shared between the picker (active=1) and the
// review phases (active=2). Keeps both surfaces visually anchored to the
// same flow so the user knows where they are.
function StepIndicator({ activeStep = 1 }) {
  return (
    <div className={styles.steps}>
      <div className={styles.step}>
        <span className={`${styles.stepBadge}${activeStep >= 1 ? '' : ` ${styles.stepBadgeIdle}`}`}>1</span>
        <span className={`${styles.stepLabel}${activeStep >= 1 ? '' : ` ${styles.stepLabelIdle}`}`}>Upload File</span>
      </div>
      <span className={styles.stepDivider} />
      <div className={styles.step}>
        <span className={`${styles.stepBadge}${activeStep >= 2 ? '' : ` ${styles.stepBadgeIdle}`}`}>2</span>
        <span className={`${styles.stepLabel}${activeStep >= 2 ? '' : ` ${styles.stepLabelIdle}`}`}>OCR Review</span>
      </div>
    </div>
  );
}

const ACCEPT_EXT  = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
const ACCEPT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const ACCEPT_LABEL = 'Supported formats: PDF, DOC, JPG, PNG';
const isAcceptedFile = (file) => {
  if (!file) return false;
  if (ACCEPT_MIME.has(file.type)) return true;
  // Some browsers (older Safari, drag-drop from certain sources) report
  // an empty MIME — fall back to extension matching.
  return /\.(pdf|docx?|jpe?g|png)$/i.test(file.name || '');
};

/**
 * UploadDocumentDrawer — three phases (picker · processing · review).
 * Implements the Jira "Individual Upload" path: Support picks a PDF,
 * OCR (mocked) extracts every encounter section across all patients,
 * each encounter is shown grouped by patient with editable fields and
 * field-level error chips, and Confirm fires `confirmHccUpload()` which
 * creates/merges HCC worklist rows.
 *
 * Drawer is mounted once in AppLayout, controlled by `hccUploadSession`.
 */
export function UploadDocumentDrawer() {
  const session = useAppStore(s => s.hccUploadSession);
  const setFile = useAppStore(s => s.setHccUploadFile);
  const setEncounters = useAppStore(s => s.setHccUploadEncounters);
  const appendEncounters = useAppStore(s => s.appendHccUploadEncounters);
  const patchEnc = useAppStore(s => s.patchHccUploadEncounter);
  const removeEnc = useAppStore(s => s.removeHccUploadEncounter);
  const cancel = useAppStore(s => s.cancelHccUpload);
  const confirm = useAppStore(s => s.confirmHccUpload);
  const hccMembers = useAppStore(s => s.hccMembers);
  const showToast = useAppStore(s => s.showToast);

  if (!session) return null;
  return <Inner
    session={session}
    setFile={setFile} setEncounters={setEncounters}
    appendEncounters={appendEncounters}
    patchEnc={patchEnc} removeEnc={removeEnc}
    cancel={cancel} confirm={confirm}
    hccMembers={hccMembers} showToast={showToast}
  />;
}

function Inner({ session, setFile, setEncounters, appendEncounters, patchEnc, removeEnc, cancel, confirm, hccMembers, showToast }) {
  const [drag, setDrag] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filter, setFilter] = useState('all'); // all | error | mismatched | ready
  const [layout, setLayout] = useState('card'); // card | table
  const [appending, setAppending] = useState(false);
  // Bulk-select state for the table layout. A Set of encounter `_idx`
  // (the position in session.encounters). Empty = no selection → Confirm
  // falls back to "apply all" behavior (matches the card layout). Non-empty
  // → Confirm applies only selected, marks the rest as rejected, and the
  // History summary entry lists both buckets.
  const [selectedIdxs, setSelectedIdxs] = useState(() => new Set());
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
  const fileInputRef = useRef(null);
  const appendInputRef = useRef(null);

  // ── Phase machine ──────────────────────────────────────────────────
  // picker → processing → review. Kick OCR when phase enters processing.
  useEffect(() => {
    if (session.phase !== 'processing' || !session.file) return;
    let cancelled = false;
    (async () => {
      const encounters = await runMockOcr(session.file, hccMembers);
      // If a member was pre-seeded (entry from AllPatientsRow / QuickView)
      // and OCR's match is ambiguous, auto-link the first unmatched
      // encounter to the seeded member so the user doesn't have to do it.
      if (session.seededMemberId) {
        const seedMember = hccMembers.find(m => m.id === session.seededMemberId);
        if (seedMember) {
          for (const enc of encounters) {
            if (!enc.patient.matchedMemberId) {
              enc.patient.matchedMemberId = seedMember.id;
              enc.patient.matchConfidence = 100;
              enc.patient.name = enc.patient.name || seedMember.name;
            }
          }
        }
      }
      if (!cancelled) setEncounters(encounters);
    })();
    return () => { cancelled = true; };
  }, [session.phase, session.file, session.seededMemberId, hccMembers, setEncounters]);

  const handleFileSelect = (file) => {
    if (!file) return;
    // Multi-type accept: PDF · DOC/DOCX · JPG · PNG. Filter at both
    // accept attr + MIME/extension check.
    if (!isAcceptedFile(file)) {
      showToast('Please upload a PDF, DOC, JPG, or PNG file');
      return;
    }
    setFile(file);
  };

  // Group encounters by matched patient (or "unmatched" bucket).
  const groups = useMemo(() => {
    const map = new Map();
    (session.encounters || []).forEach((enc, idx) => {
      const key = enc.patient?.matchedMemberId || `__unmatched-${idx}`;
      if (!map.has(key)) map.set(key, { memberId: enc.patient?.matchedMemberId || null, encounters: [] });
      map.get(key).encounters.push({ ...enc, _idx: idx });
    });
    return Array.from(map.values());
  }, [session.encounters]);

  // Confirm gates on validity. In table layout with bulk selection active
  // we only validate the SELECTED rows — the unselected ones are about to
  // be rejected, so their errors / unmatched state don't block the action.
  // In card layout (or table with no selection) all encounters must be
  // valid, matching the original AC-8 / AC-9 contract.
  const canConfirm = useMemo(() => {
    const all = session.encounters || [];
    if (!all.length) return false;
    const isValid = (e) =>
      e.patient?.matchedMemberId &&
      (!e.errors || e.errors.length === 0);
    if (layout === 'table' && selectedIdxs.size > 0) {
      // Validate only the selected encounters.
      return Array.from(selectedIdxs).every(idx => {
        const e = all[idx];
        return e && isValid(e);
      });
    }
    return all.every(isValid);
  }, [session.encounters, layout, selectedIdxs]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    // If the user has bulk-selected rows in table layout, only those get
    // applied. Others are rejected and recorded in the activity log.
    const acceptedIdxs = (layout === 'table' && selectedIdxs.size > 0)
      ? Array.from(selectedIdxs)
      : null;
    const summary = confirm(acceptedIdxs ? { acceptedIdxs } : undefined);
    const created = summary.created || 0;
    const updated = summary.updated || 0;
    const rejected = summary.rejected || 0;
    const parts = [];
    if (created) parts.push(`${created} created`);
    if (updated) parts.push(`${updated} updated`);
    if (rejected) parts.push(`${rejected} rejected`);
    showToast(parts.length ? parts.join(', ') : 'No changes applied');
    setSelectedIdxs(new Set());
  };

  // Append more encounters from a second PDF without dropping the
  // already-reviewed ones. Runs the same OCR pipeline and merges into
  // session.encounters.
  const handleAppendUpload = async (file) => {
    if (!file) return;
    if (!isAcceptedFile(file)) {
      showToast('Please upload a PDF, DOC, JPG, or PNG file');
      return;
    }
    setAppending(true);
    try {
      const more = await runMockOcr(file, hccMembers);
      appendEncounters(more);
      showToast(`Added ${more.length} more encounter${more.length === 1 ? '' : 's'} from ${file.name}`);
    } finally {
      setAppending(false);
      // Reset the input so picking the same file twice still fires onChange.
      if (appendInputRef.current) appendInputRef.current.value = '';
    }
  };

  const title = (
    <span className={styles.title}>
      Upload Document
      {session.phase === 'review' && (
        <span className={styles.titleHint}>
          · Review {session.encounters.length} encounter{session.encounters.length === 1 ? '' : 's'}
        </span>
      )}
    </span>
  );

  const headerRight = session.phase === 'review' ? (
    <>
      {/* Layout toggle: master-detail (card) vs editable table (table).
          Built with the Fold Toggle component so it matches every other
          segmented control in the app (animated sliding pill). */}
      <Toggle
        size="S"
        items={[
          { key: 'card',  label: 'Option 1' },
          { key: 'table', label: 'Option 2' },
        ]}
        active={layout}
        onChange={setLayout}
      />
      <span className={styles.headerDivider} />
      {/* Upload-more — append a second PDF's encounters into the current
          review session without losing edits. Uses Button "alt" variant
          (outlined primary) so it matches Fold's standard secondary CTA. */}
      <Button
        variant="alt"
        size="S"
        leadingIcon={appending ? undefined : 'solar:upload-linear'}
        disabled={appending}
        onClick={() => appendInputRef.current?.click()}
      >
        {appending ? 'Processing…' : 'Upload'}
      </Button>
      <input
        ref={appendInputRef}
        type="file"
        accept={ACCEPT_EXT}
        style={{ display: 'none' }}
        onChange={(e) => handleAppendUpload(e.target.files?.[0])}
      />
      <span className={styles.headerDivider} />
      <Button
        variant="primary"
        size="S"
        disabled={!canConfirm}
        onClick={handleConfirm}
      >
        Confirm
      </Button>
    </>
  ) : null;

  // Drawer expands once OCR is running or done — the review panel needs
  // the extra width. Picker phase stays narrow.
  const drawerCls = [
    styles.drawer,
    session.phase === 'picker' ? '' : styles.drawerExpanded,
  ].filter(Boolean).join(' ');

  return (
    <Drawer
      title={title}
      onClose={cancel}
      className={drawerCls}
      bodyClassName={styles.body}
      headerRight={headerRight}
    >
      {session.phase === 'picker' && (
        <div className={styles.pickerPhase}>
          {/* Subtitle — HCC-specific framing under the drawer title. */}
          <p className={styles.pickerSubtitle}>
            Upload clinical documents to extract HCC encounters and update the worklist.
          </p>

          <StepIndicator activeStep={1} />

          {/* Concentric-ring hero — neutral chrome that frames the upload action. */}
          <div className={styles.hero} aria-hidden="true">
            <span className={styles.heroRingOuter} />
            <span className={styles.heroRingMid} />
            <span className={styles.heroCenter}>
              <Icon name="solar:file-text-linear" size={36} color="var(--neutral-300)" />
            </span>
          </div>

          {/* How-to info banner. */}
          <div className={styles.howToBanner}>
            <div className={styles.howToHead}>
              <Icon name="solar:info-circle-linear" size={16} color="var(--status-info, #145ECC)" />
              <span>How to upload HCC documents</span>
            </div>
            <ol className={styles.howToList}>
              <li>Upload a file (PDF, DOC, JPG, or PNG) — clinical notes, SOAP notes, progress notes, or scans</li>
              <li>OCR extracts patient demographics, DOS, provider, POS, and ICDs</li>
              <li>Review each encounter and resolve any field-level errors</li>
              <li>Confirm to create new or merge into existing worklist rows</li>
            </ol>
          </div>

          {/* Dropzone. */}
          <label
            className={[styles.dropZone, drag ? styles.dropZoneActive : ''].join(' ')}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              handleFileSelect(e.dataTransfer.files?.[0]);
            }}
          >
            <Icon name="solar:upload-minimalistic-linear" size={24} color="var(--neutral-300)" />
            <div className={styles.dropZoneCta}>
              <span className={styles.dropZoneTitle}>Drag and drop file here or</span>
              <span className={styles.dropZoneLink}>Choose file</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_EXT}
              className={styles.fileInput}
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </label>

          {/* Supported formats line. */}
          <div className={styles.formatsLine}>
            <span>{ACCEPT_LABEL}</span>
            <span>Max size: 25 MB</span>
          </div>

          {/* Sample document card — the Figma "Download sample" slot, repurposed
              for HCC as a list of demo PDFs the mock OCR knows how to script. */}
          <div className={styles.sampleCard}>
            <span className={styles.sampleIcon}>
              <Icon name="solar:file-text-linear" size={20} color="var(--neutral-400)" />
            </span>
            <div className={styles.sampleText}>
              <div className={styles.sampleTitle}>Try a demo document</div>
              <div className={styles.sampleDesc}>
                Use a sample clinical note to see how OCR extracts encounters and ICDs.
              </div>
              <div className={styles.sampleChips}>
                {[
                  'demo-single.pdf',
                  'demo-multi-patient.pdf',
                  'demo-same-patient-multi-dos.pdf',
                  'demo-bulk-multi-patient.pdf',
                  'demo-missing-dos.pdf',
                  'demo-dob-mismatch.pdf',
                ].map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={styles.demoChip}
                    onClick={() => {
                      const file = new File([new Blob(['%PDF-1.4 demo'])], name, { type: 'application/pdf' });
                      handleFileSelect(file);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer info note — what happens after upload. */}
          <div className={styles.footerNote}>
            <Icon name="solar:info-circle-linear" size={15} color="var(--neutral-300)" />
            <span>
              After OCR completes, you'll review each extracted encounter before it creates or
              merges into HCC worklist rows. Documents in any source — manual upload or SFTP —
              are logged in <strong>History</strong>.
            </span>
          </div>
        </div>
      )}

      {session.phase === 'processing' && (
        <div className={styles.processingPhase}>
          <div className={styles.spinner} />
          <div className={styles.processingTitle}>Extracting encounters…</div>
          <div className={styles.processingHint}>
            Running OCR on <strong>{session.file?.name}</strong>
          </div>
        </div>
      )}

      {session.phase === 'review' && (
        <ReviewPhase
          encounters={session.encounters}
          groups={groups}
          hccMembers={hccMembers}
          patchEnc={patchEnc}
          removeEnc={removeEnc}
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          filter={filter}
          setFilter={setFilter}
          layout={layout}
          selectedIdxs={selectedIdxs}
          toggleSelected={toggleSelected}
          setSelectedAll={setSelectedAll}
          sourceFileName={session.file?.name}
        />
      )}
    </Drawer>
  );
}

/**
 * Status of a single encounter — drives status chip color and filter
 * bucketing. Priority: mismatched > error > ready.
 */
function encounterStatus(enc) {
  if (!enc.patient?.matchedMemberId) return 'mismatched';
  if (enc.errors && enc.errors.length > 0) return 'error';
  return 'ready';
}

function ReviewPhase({ encounters, groups, hccMembers, patchEnc, removeEnc, selectedIdx, setSelectedIdx, filter, setFilter, layout, selectedIdxs, toggleSelected, setSelectedAll, sourceFileName }) {
  // Aggregate counts per status for the filter chips. The bucket keys
  // here must match what encounterStatus() returns ('error' singular,
  // 'mismatched', 'ready') — historically had a typo where the chip
  // initialized `errors: 0` and the increment created a new `error` key.
  const counts = useMemo(() => {
    const c = { all: encounters.length, error: 0, mismatched: 0, ready: 0 };
    encounters.forEach(e => { c[encounterStatus(e)]++; });
    return c;
  }, [encounters]);

  // Filter the master list. Filter keys must match encounterStatus()
  // return values for the predicate to match.
  const visibleGroups = useMemo(() => {
    if (filter === 'all') return groups;
    return groups
      .map(g => ({ ...g, encounters: g.encounters.filter(e => encounterStatus(e) === filter) }))
      .filter(g => g.encounters.length > 0);
  }, [groups, filter]);

  // If selected encounter is filtered out, jump to first visible one.
  useEffect(() => {
    const visibleIdxs = visibleGroups.flatMap(g => g.encounters.map(e => e._idx));
    if (visibleIdxs.length && !visibleIdxs.includes(selectedIdx)) {
      setSelectedIdx(visibleIdxs[0]);
    }
  }, [visibleGroups, selectedIdx, setSelectedIdx]);

  const selectedEnc = encounters.find((_, i) => i === selectedIdx) || null;
  const selectedMember = selectedEnc?.patient?.matchedMemberId
    ? hccMembers.find(m => m.id === selectedEnc.patient.matchedMemberId)
    : null;

  const handleRemove = (idx) => {
    removeEnc(idx);
    // After remove, indices shift — let the useEffect above refind a valid one.
    if (idx === selectedIdx) setSelectedIdx(Math.max(0, idx - 1));
  };

  const patientCount = new Set(
    encounters.map(e => e.patient?.matchedMemberId || `__unmatched-${e.tempId}`),
  ).size;

  return (
    <div className={styles.reviewPhase}>
      {/* Step indicator — mirrors the picker phase but with step 2 active. */}
      <div className={styles.reviewSteps}>
        <StepIndicator activeStep={2} />
      </div>
      {/* Stats bar + filter chips */}
      <div className={styles.statsBar}>
        <div className={styles.statsSummary}>
          <span><strong>{counts.all}</strong> encounter{counts.all === 1 ? '' : 's'}</span>
          <span>·</span>
          <span><strong>{patientCount}</strong> patient{patientCount === 1 ? '' : 's'}</span>
        </div>
        <div className={styles.filterChips}>
          {[
            { key: 'all',         label: 'All',         count: counts.all },
            { key: 'error',       label: 'Errors',      count: counts.error },
            { key: 'mismatched',  label: 'Mismatched',  count: counts.mismatched },
            { key: 'ready',       label: 'Ready',       count: counts.ready },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              className={[styles.filterChip, filter === f.key ? styles.filterChipActive : ''].filter(Boolean).join(' ')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className={styles.filterChipCount}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selection summary — only meaningful in table layout. */}
      {layout === 'table' && selectedIdxs.size > 0 && (
        <div className={styles.selectionBar}>
          <Icon name="solar:check-square-linear" size={14} color="var(--primary-300)" />
          <span>
            <strong>{selectedIdxs.size}</strong> of {encounters.length} selected
            {' · '}
            on Confirm the other {encounters.length - selectedIdxs.size} will be rejected
          </span>
        </div>
      )}

      {/* Layout body — master-detail or editable table. */}
      {layout === 'table' ? (
        <TableLayout
          visibleGroups={visibleGroups}
          encounters={encounters}
          hccMembers={hccMembers}
          patchEnc={patchEnc}
          handleRemove={handleRemove}
          sourceFileName={sourceFileName}
          selectedIdxs={selectedIdxs}
          toggleSelected={toggleSelected}
          setSelectedAll={setSelectedAll}
        />
      ) : (
      <div className={styles.masterDetail}>
        {/* Master: encounter list grouped by patient */}
        <div className={styles.master}>
          {visibleGroups.length === 0 ? (
            <div className={styles.masterEmpty}>No encounters match this filter.</div>
          ) : visibleGroups.map((g) => {
            const member = g.memberId ? hccMembers.find(m => m.id === g.memberId) : null;
            const displayName = member?.name || g.encounters[0]?.patient?.name || 'Unmatched patient';
            return (
              <div key={g.memberId || `unmatched-${g.encounters[0]?._idx}`}>
                <div className={styles.patientGroupBanner}>
                  <Avatar variant="patient" initials={member?.in || (displayName.split(' ').map(p => p[0]).slice(0,2).join(''))} />
                  <span>{displayName}</span>
                  <span className={styles.patientGroupBannerCount}>
                    · {g.encounters.length} encounter{g.encounters.length === 1 ? '' : 's'}
                  </span>
                  {!member && <span className={styles.unmatchedBadge}>Unmatched</span>}
                </div>
                {g.encounters.map(enc => (
                  <MasterRow
                    key={enc.tempId}
                    enc={enc}
                    selected={enc._idx === selectedIdx}
                    onSelect={() => setSelectedIdx(enc._idx)}
                    onRemove={() => handleRemove(enc._idx)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Detail: editor for the selected encounter */}
        <div className={styles.detail}>
          {!selectedEnc ? (
            <div className={styles.detailEmpty}>Select an encounter to edit</div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <Avatar
                  variant="patient"
                  initials={selectedMember?.in || (selectedEnc.patient?.name || '?').split(' ').map(p => p[0]).slice(0,2).join('')}
                />
                <div className={styles.detailHeaderText}>
                  <span className={styles.detailHeaderName}>
                    {selectedMember?.name || selectedEnc.patient?.name || 'Unmatched patient'}
                  </span>
                  <span className={styles.detailHeaderMeta}>
                    DOS {selectedEnc.dos || '—'} · {selectedEnc.provider || '—'}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.detailRemoveBtn}
                  onClick={() => handleRemove(selectedIdx)}
                >
                  <Icon name="solar:trash-bin-trash-linear" size={14} color="var(--status-error)" />
                  Remove encounter
                </button>
              </div>
              <div className={styles.detailBody}>
                <EncounterCard
                  enc={selectedEnc}
                  hccMembers={hccMembers}
                  onPatch={(patch) => patchEnc(selectedIdx, patch)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * Option 2 — flat editable table. Each row is one encounter with all
 * fields editable inline. Designed for keyboard-driven bulk review at
 * scale. Patient column shows the matched member's name (or a "Link
 * patient" picker for unmatched rows).
 */
function TableLayout({ visibleGroups, encounters, hccMembers, patchEnc, handleRemove, selectedIdxs, toggleSelected, setSelectedAll, sourceFileName }) {
  // Flatten visibleGroups back into a single ordered list of encounters
  // (we still want patient grouping visible via row banding, but the
  // table layout reads row-by-row, not nested).
  const rows = useMemo(
    () => visibleGroups.flatMap(g => g.encounters),
    [visibleGroups],
  );

  const recalcErrors = (enc) => {
    const errors = [];
    if (!enc.patient?.name) errors.push('patientName');
    if (!enc.patient?.dob) errors.push('dob');
    if (!enc.dos) errors.push('dos');
    if (!enc.provider) errors.push('provider');
    if (!enc.pos) errors.push('pos');
    return errors;
  };

  const patchField = (idx, patch) => {
    const cur = encounters[idx];
    const next = {
      ...cur,
      ...patch,
      patient: { ...cur.patient, ...(patch.patient || {}) },
    };
    patchEnc(idx, { ...patch, errors: recalcErrors(next) });
  };

  if (rows.length === 0) {
    return <div className={styles.tableEmpty}>No encounters match this filter.</div>;
  }

  const visibleIdxs = rows.map(r => r._idx);
  const allSelected = visibleIdxs.length > 0 && visibleIdxs.every(i => selectedIdxs?.has(i));
  const someSelected = visibleIdxs.some(i => selectedIdxs?.has(i));

  return (
    <div className={styles.tableWrap}>
      <table className={styles.encTable}>
        <thead>
          <tr>
            <th className={styles.thCheck}>
              <input
                type="checkbox"
                aria-label="Select all encounters"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                onChange={(e) => setSelectedAll?.(visibleIdxs, e.target.checked)}
              />
            </th>
            <th className={styles.thPatient}>Patient</th>
            <th>DOB</th>
            <th>DOS</th>
            <th>Rendering Provider</th>
            <th className={styles.thNarrow}>POS</th>
            <th>Document Type</th>
            <th>ICD Codes</th>
            <th className={styles.thStatus}>Status</th>
            <th className={styles.thActions}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((enc) => (
            <TableRow
              key={enc.tempId}
              enc={enc}
              hccMembers={hccMembers}
              onPatch={(patch) => patchField(enc._idx, patch)}
              onRemove={() => handleRemove(enc._idx)}
              checked={selectedIdxs?.has(enc._idx) || false}
              onToggle={() => toggleSelected?.(enc._idx)}
              sourceFileName={sourceFileName}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ enc, hccMembers, onPatch, onRemove, checked, onToggle, sourceFileName }) {
  const status = encounterStatus(enc);
  const errors = new Set(enc.errors || []);
  const isMatched = !!enc.patient?.matchedMemberId;
  const member = isMatched ? hccMembers.find(m => m.id === enc.patient.matchedMemberId) : null;
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState('');

  const rowCls = [
    styles.encTableRow,
    status === 'error' ? styles.encTableRowError : '',
    status === 'mismatched' ? styles.encTableRowMismatch : '',
  ].filter(Boolean).join(' ');

  const filteredMembers = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    if (!q) return hccMembers.slice(0, 6);
    return hccMembers.filter(m => (m.name || '').toLowerCase().includes(q)).slice(0, 6);
  }, [hccMembers, pickQuery]);

  const handleLink = (m) => {
    onPatch({
      patient: {
        ...enc.patient,
        name: m.name,
        matchedMemberId: m.id,
        matchConfidence: 100,
      },
    });
    setPicking(false);
    setPickQuery('');
  };

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
      {/* Patient — read-only when matched, picker when not. */}
      <td className={styles.tdPatient}>
        {isMatched ? (
          <div className={styles.tdPatientMatched}>
            <Avatar variant="patient" initials={member?.in || (enc.patient.name || '?').split(' ').map(p => p[0]).slice(0,2).join('')} />
            <span className={styles.tdPatientName}>{member?.name || enc.patient.name}</span>
          </div>
        ) : !picking ? (
          <button
            type="button"
            className={styles.tdPatientLinkBtn}
            onClick={() => setPicking(true)}
            title="Link a Fold patient to this encounter"
          >
            <Icon name="solar:link-linear" size={12} color="var(--status-error)" />
            Link patient…
          </button>
        ) : (
          <div className={styles.tdPatientPicker}>
            <Input
              autoFocus
              placeholder="Search by name"
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
            />
            <div className={styles.tdPatientPickerList}>
              {filteredMembers.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={styles.tdPatientPickerItem}
                  onClick={() => handleLink(m)}
                >
                  <Avatar variant="patient" initials={m.in} />
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </td>
      <CellInput
        value={enc.patient?.dob || ''}
        onChange={(v) => onPatch({ patient: { ...enc.patient, dob: v } })}
        error={errors.has('dob')}
        placeholder="MM/DD/YYYY"
      />
      <CellInput
        value={enc.dos || ''}
        onChange={(v) => onPatch({ dos: v })}
        error={errors.has('dos')}
        placeholder="MM/DD/YYYY"
      />
      <CellInput
        value={enc.provider || ''}
        onChange={(v) => onPatch({ provider: v })}
        error={errors.has('provider')}
      />
      <CellInput
        value={enc.pos || ''}
        onChange={(v) => onPatch({ pos: v, posDesc: POS_LABEL[v] || '' })}
        error={errors.has('pos')}
        narrow
      />
      <CellInput
        value={enc.docType || ''}
        onChange={(v) => onPatch({ docType: v })}
      />
      <td className={styles.tdIcds}>
        <IcdChipStack
          icds={enc.icds || []}
          onRemove={(code) => onPatch({ icds: enc.icds.filter(i => i.code !== code) })}
        />
      </td>
      <td className={styles.tdStatus}>
        <span className={[
          styles.masterStatusChip,
          status === 'ready' ? styles.masterStatusReady : '',
          status === 'error' ? styles.masterStatusError : '',
          status === 'mismatched' ? styles.masterStatusMismatch : '',
        ].filter(Boolean).join(' ')}>
          {status === 'ready' && <Icon name="solar:check-circle-bold" size={11} color="var(--status-success)" />}
          {status === 'error' && <Icon name="solar:danger-triangle-bold" size={11} color="var(--status-error)" />}
          {status === 'mismatched' && <Icon name="solar:question-circle-bold" size={11} color="var(--status-warning)" />}
          {status === 'ready' ? 'Ready' : status === 'error' ? 'Missing field' : 'Mismatch'}
        </span>
      </td>
      <td className={styles.tdActions}>
        <button
          type="button"
          className={styles.tdLinkDocBtn}
          aria-label="View source document"
          title={sourceFileName ? `Source: ${sourceFileName}` : 'Source document'}
        >
          <Icon name="solar:paperclip-linear" size={14} color="var(--neutral-300)" />
        </button>
        <button
          type="button"
          className={styles.tdRemoveBtn}
          onClick={onRemove}
          aria-label="Remove encounter"
          title="Remove encounter"
        >
          <Icon name="solar:trash-bin-trash-linear" size={14} color="var(--status-error)" />
        </button>
      </td>
    </tr>
  );
}

function CellInput({ value, onChange, error, placeholder, narrow }) {
  return (
    <td className={narrow ? styles.tdNarrow : ''}>
      <Input
        variant={error ? 'error' : 'default'}
        value={value || ''}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
        className={styles.tdInput}
      />
    </td>
  );
}

/**
 * Compact ICD chip stack for the table layout. Shows first 2 chips and
 * a "+N" overflow that expands on click. Invalid (non-V28) codes render
 * struck-through.
 */
function IcdChipStack({ icds, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  if (!icds.length) {
    return <span className={styles.tdIcdsEmpty}>—</span>;
  }
  const shown = expanded ? icds : icds.slice(0, 2);
  const overflow = icds.length - shown.length;
  return (
    <div className={styles.tdIcdsRow}>
      {shown.map(icd => (
        <span
          key={icd.code}
          className={[styles.icdChip, icd.valid === false ? styles.icdChipInvalid : ''].filter(Boolean).join(' ')}
          title={icd.valid === false ? 'Not a V28 HCC code' : undefined}
        >
          {icd.code}
          <button
            type="button"
            className={styles.icdChipClose}
            onClick={() => onRemove(icd.code)}
            aria-label={`Remove ${icd.code}`}
          >
            <Icon name="solar:close-circle-linear" size={10} color="var(--neutral-300)" />
          </button>
        </span>
      ))}
      {overflow > 0 && (
        <button type="button" className={styles.icdOverflow} onClick={() => setExpanded(true)}>
          +{overflow}
        </button>
      )}
    </div>
  );
}

/**
 * One row in the master list. Shows DOS + provider, with a status chip
 * on the right and an inline trash. Clicking the row selects it (loads
 * the editor in the right panel).
 */
function MasterRow({ enc, selected, onSelect, onRemove }) {
  const status = encounterStatus(enc);
  const rowCls = [
    styles.masterRow,
    selected ? styles.masterRowSelected : '',
    status === 'error' ? styles.masterRowError : '',
    status === 'mismatched' ? styles.masterRowMismatch : '',
  ].filter(Boolean).join(' ');
  const chipCls = [
    styles.masterStatusChip,
    status === 'ready' ? styles.masterStatusReady : '',
    status === 'error' ? styles.masterStatusError : '',
    status === 'mismatched' ? styles.masterStatusMismatch : '',
  ].filter(Boolean).join(' ');
  return (
    <div className={rowCls} onClick={onSelect}>
      <div className={styles.masterRowMain}>
        <span className={styles.masterRowDos}>{enc.dos || '— No DOS —'}</span>
        <span className={styles.masterRowMeta}>
          {enc.provider || '—'} · POS {enc.pos || '—'}
        </span>
      </div>
      <span className={styles.masterRowChips}>
        <span className={chipCls}>
          {status === 'ready' && <Icon name="solar:check-circle-bold" size={11} color="var(--status-success)" />}
          {status === 'error' && <Icon name="solar:danger-triangle-bold" size={11} color="var(--status-error)" />}
          {status === 'mismatched' && <Icon name="solar:question-circle-bold" size={11} color="var(--status-warning)" />}
          {status === 'ready' ? 'Ready' : status === 'error' ? 'Missing field' : 'Mismatch'}
        </span>
      </span>
      <span />
      <button
        type="button"
        className={styles.masterRemoveBtn}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Remove encounter"
      >
        <Icon name="solar:trash-bin-trash-linear" size={13} color="var(--status-error)" />
      </button>
    </div>
  );
}

function EncounterCard({ enc, hccMembers, onPatch }) {
  const errors = new Set(enc.errors || []);
  const isMatched = !!enc.patient?.matchedMemberId;
  const [picking, setPicking] = useState(false);
  const [pickQuery, setPickQuery] = useState('');

  // Update errors when fields change. Mandatory: patientName, dob, dos, provider, pos.
  const patchAndRevalidate = (patch) => {
    const next = {
      ...enc,
      ...patch,
      patient: { ...enc.patient, ...(patch.patient || {}) },
    };
    const newErrors = [];
    if (!next.patient?.name) newErrors.push('patientName');
    if (!next.patient?.dob) newErrors.push('dob');
    if (!next.dos) newErrors.push('dos');
    if (!next.provider) newErrors.push('provider');
    if (!next.pos) newErrors.push('pos');
    onPatch({ ...patch, errors: newErrors });
  };

  const handleLinkMember = (member) => {
    patchAndRevalidate({
      patient: {
        ...enc.patient,
        name: member.name,
        matchedMemberId: member.id,
        matchConfidence: 100,
      },
    });
    setPicking(false);
    setPickQuery('');
  };

  const filteredMembers = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    if (!q) return hccMembers.slice(0, 8);
    return hccMembers.filter(m => (m.name || '').toLowerCase().includes(q)).slice(0, 8);
  }, [hccMembers, pickQuery]);

  const removeIcd = (code) => {
    onPatch({ icds: enc.icds.filter(i => i.code !== code) });
  };

  return (
    <div className={[styles.encounterCard, isMatched ? '' : styles.encounterCardMismatch].filter(Boolean).join(' ')}>
      {!isMatched && (
        <div className={styles.mismatchBanner}>
          <Icon name="solar:danger-triangle-bold" size={14} color="var(--status-error)" />
          <span className={styles.mismatchText}>
            Patient identity could not be matched at 100% confidence. Manually link before confirming.
          </span>
          {!picking ? (
            <button className={styles.linkBtn} onClick={() => setPicking(true)}>
              Manually link
            </button>
          ) : (
            <div className={styles.memberPicker}>
              <Input
                placeholder="Search Fold patients by name…"
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                autoFocus
              />
              <div className={styles.memberPickerList}>
                {filteredMembers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    className={styles.memberPickerItem}
                    onClick={() => handleLinkMember(m)}
                  >
                    <Avatar variant="patient" initials={m.in} />
                    <span>{m.name}</span>
                    <span className={styles.memberPickerMeta}>{m.memberId}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.encounterGrid}>
        <Field
          label="Patient Name"
          value={enc.patient?.name || ''}
          onChange={(v) => patchAndRevalidate({ patient: { ...enc.patient, name: v } })}
          error={errors.has('patientName')}
          required
        />
        <Field
          label="DOB"
          value={enc.patient?.dob || ''}
          onChange={(v) => patchAndRevalidate({ patient: { ...enc.patient, dob: v } })}
          error={errors.has('dob')}
          required
          placeholder="MM/DD/YYYY"
        />
        <Field
          label="DOS"
          value={enc.dos || ''}
          onChange={(v) => patchAndRevalidate({ dos: v })}
          error={errors.has('dos')}
          required
          placeholder="MM/DD/YYYY"
        />
        <Field
          label="Rendering Provider"
          value={enc.provider || ''}
          onChange={(v) => patchAndRevalidate({ provider: v })}
          error={errors.has('provider')}
          required
        />
        <Field
          label="POS"
          value={enc.pos || ''}
          onChange={(v) => patchAndRevalidate({ pos: v, posDesc: POS_LABEL[v] || '' })}
          error={errors.has('pos')}
          required
          placeholder="11, 12, 22, 02"
          hint={enc.posDesc || ''}
        />
        <Field
          label="Document Type"
          value={enc.docType || ''}
          onChange={(v) => onPatch({ docType: v })}
        />
      </div>

      <div className={styles.icdsSection}>
        <div className={styles.icdsLabel}>ICD Codes <span className={styles.icdsHint}>(V28-validated)</span></div>
        <div className={styles.icdsChipRow}>
          {(enc.icds || []).length === 0 ? (
            <span className={styles.icdsEmpty}>No ICDs extracted.</span>
          ) : enc.icds.map(icd => (
            <span
              key={icd.code}
              className={[styles.icdChip, icd.valid === false ? styles.icdChipInvalid : ''].filter(Boolean).join(' ')}
              title={icd.valid === false ? 'Not a V28 HCC code' : undefined}
            >
              {icd.code}
              <button
                type="button"
                className={styles.icdChipClose}
                onClick={() => removeIcd(icd.code)}
                aria-label={`Remove ${icd.code}`}
              >
                <Icon name="solar:close-circle-linear" size={12} color="var(--neutral-300)" />
              </button>
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}

function Field({ label, value, onChange, error, required, placeholder, hint }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.fieldRequired}>*</span>}
      </span>
      <Input
        variant={error ? 'error' : 'default'}
        value={value || ''}
        placeholder={placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <span className={styles.fieldErrorText}>
          <Icon name="solar:danger-triangle-bold" size={12} color="var(--status-error)" />
          Required field
        </span>
      )}
      {!error && hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

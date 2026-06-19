import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Button } from '../../../components/Button/Button';
import { Icon } from '../../../components/Icon/Icon';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Input } from '../../../components/Input/Input';
import { Toggle } from '../../../components/Toggle/Toggle';
import { Select } from '../../../components/Select/Select';
import { useAppStore } from '../../../store/useAppStore';
import { runMockOcr, mandatoryFields, POS_LABEL } from './mockOcr';
import { ICDS as ICDS_BY_MEMBER } from '../data/icds';
import styles from './UploadDocumentDrawer.module.css';

// Accepted file types for clinical document upload. PDFs are the canonical
// source; Word docs cover dictated notes from EHRs that export to .docx;
// JPG/PNG cover scanned/photographed encounter sheets and lab reports.
// Keep the MIME and extension lists in sync — `accept=` uses extensions
// for cross-OS reliability, the runtime check uses MIME.
// Numbered step indicator shared between the picker (active=1) and the
// review phases (active=2). Keeps both surfaces visually anchored to the
// same flow so the user knows where they are.
/**
 * ProcessingPhase — shown while the AI extracts encounters from the
 * uploaded file. Mirrors the population-groups CSV processing surface:
 * animated hero, headline + filename, hint, and a primary Minimize +
 * outline Discard action pair. The actual extraction work runs in the
 * parent's useEffect — this view is purely the "please wait" canvas
 * the user can step away from.
 */
function ProcessingPhase({ fileName, onMinimize, onDiscard }) {
  return (
    <div className={styles.processingPhase}>
      <div className={styles.processingHero}>
        <div className={styles.processingHeroRing} />
        <div className={styles.processingHeroInner}>
          <Icon name="solar:document-medicine-linear" size={32} color="var(--primary-300)" />
        </div>
      </div>
      <div className={styles.processingTitle}>Processing Document…</div>
      <div className={styles.processingSubtitle}>
        Running AI extraction on your file <strong>{fileName || 'uploaded file'}</strong>
      </div>
      <div className={styles.processingDividerLine} />
      <div className={styles.processingHint}>
        You can minimize this window and continue working while it processes.
      </div>
      <div className={styles.processingActions}>
        <Button variant="primary" size="s" onClick={onMinimize}>
          <Icon name="solar:minimize-square-2-linear" size={14} color="#fff" />
          Minimize
        </Button>
        <Button variant="alt" size="s" onClick={onDiscard}>
          <Icon name="solar:trash-bin-2-linear" size={14} color="var(--neutral-300)" />
          Discard
        </Button>
      </div>
      {fileName && (
        <div className={styles.processingFileCard}>
          <div className={styles.processingFileIcon}>
            <Icon name="solar:document-text-linear" size={16} color="var(--neutral-300)" />
          </div>
          <div className={styles.processingFileName}>{fileName}</div>
          <button
            type="button"
            className={styles.processingFileEye}
            title="Preview file"
          >
            <Icon name="solar:eye-linear" size={16} color="var(--neutral-300)" />
          </button>
        </div>
      )}
      <div className={styles.processingInfoBanner}>
        <Icon name="solar:info-circle-linear" size={16} color="var(--neutral-300)" />
        <span>
          Once extraction is complete, you'll review each record before it's added
          to the HCC worklist. All uploads are saved in the document history on
          worklist.
        </span>
      </div>
    </div>
  );
}

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
        <span className={`${styles.stepLabel}${activeStep >= 2 ? '' : ` ${styles.stepLabelIdle}`}`}>AI Review</span>
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
  const addEnc = useAppStore(s => s.addHccUploadEncounter);
  const cancel = useAppStore(s => s.cancelHccUpload);
  const confirm = useAppStore(s => s.confirmHccUpload);
  const setPhase = useAppStore(s => s.setHccUploadPhase);
  const minimize = useAppStore(s => s.minimizeHccUpload);
  const minimized = useAppStore(s => s.hccUploadMinimized);
  const hccMembers = useAppStore(s => s.hccMembers);
  const createFromEncounter = useAppStore(s => s.hccCreateOrMergeFromEncounter);
  const showToast = useAppStore(s => s.showToast);

  // ── AI extraction effect ──────────────────────────────────────────
  // Lifted out of Inner so it keeps running even while the drawer is
  // minimized (HccUploadProcessingHost takes over the UI but the same
  // mock OCR pass produces the encounters). Pre-seed handling for
  // patient-context uploads stays here too.
  useEffect(() => {
    if (!session || session.phase !== 'processing' || !session.file) return;
    let cancelled = false;
    (async () => {
      const encounters = await runMockOcr(session.file, hccMembers);
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
  }, [session?.phase, session?.file, session?.seededMemberId, hccMembers, setEncounters]);

  // When the user closes the drawer while AI extraction is running we hide
  // the drawer but keep the session alive — HccUploadProcessingHost
  // (mounted in AppLayout) takes over with a floating progress chip.
  if (!session || minimized) return null;
  return <Inner
    session={session}
    setFile={setFile} setEncounters={setEncounters}
    appendEncounters={appendEncounters}
    patchEnc={patchEnc} removeEnc={removeEnc} addEnc={addEnc}
    cancel={cancel} confirm={confirm} setPhase={setPhase}
    minimize={minimize}
    hccMembers={hccMembers}
    createFromEncounter={createFromEncounter}
    showToast={showToast}
  />;
}

function Inner({ session, setFile, setEncounters, appendEncounters, patchEnc, removeEnc, addEnc, cancel, confirm, setPhase, minimize, hccMembers, createFromEncounter, showToast }) {
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

  // (AI extraction effect lives in the parent UploadDocumentDrawer so
  // it keeps running while the drawer is minimized.)

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

  const canBack = ['single', 'picker', 'sftp'].includes(session.phase) && !session.seededMemberId;
  // Phase-specific drawer title. Picker uses a single bold "Upload a
  // Document" line per Figma 13239:502724 (subtitle dropped in latest
  // iteration). Other phases keep the legacy treatment.
  const title = session.phase === 'picker' ? (
    <span className={styles.titleBlock}>
      {canBack && (
        <button
          type="button"
          className={styles.titleBackBtn}
          onClick={() => setPhase('chooser')}
          aria-label="Back to chooser"
        >
          <Icon name="solar:alt-arrow-left-linear" size={16} color="var(--neutral-400)" />
        </button>
      )}
      <span className={styles.titleMain}>Upload a Document</span>
    </span>
  ) : (
    <span className={styles.title}>
      {canBack && (
        <button
          type="button"
          className={styles.titleBackBtn}
          onClick={() => setPhase('chooser')}
          aria-label="Back to chooser"
        >
          <Icon name="solar:alt-arrow-left-linear" size={16} color="var(--neutral-400)" />
        </button>
      )}
      Upload Document
      {session.phase === 'review' && (
        <span className={styles.titleHint}>
          · Review {session.encounters.length} encounter{session.encounters.length === 1 ? '' : 's'}
        </span>
      )}
    </span>
  );

  const headerRight = session.phase === 'picker' ? (
    <>
      {/* "Extract Records" — disabled until a file is selected. Once a
          file lands, setHccUploadFile transitions to 'processing' which
          unmounts the picker, so this button effectively just signals
          to the user what the file-select gesture is leading to. */}
      <Button
        variant="secondary"
        size="S"
        disabled
      >
        Extract Records
      </Button>
      <span className={styles.headerDivider} />
    </>
  ) : session.phase === 'review' ? (
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

  // Only the review panel needs the wide canvas (master-detail layout).
  // Every other phase — including processing — uses the narrow 660px
  // shell so the centered processing hero reads correctly.
  const isWidePhase = session.phase === 'review';
  const drawerCls = [
    styles.drawer,
    isWidePhase ? styles.drawerExpanded : '',
  ].filter(Boolean).join(' ');

  return (
    <Drawer
      title={title}
      onClose={() => {
        // While AI extraction is running, closing the drawer minimizes
        // it to a floating progress chip instead of cancelling — the
        // user can keep working and we re-expand when extraction
        // completes. Every other phase still fully cancels.
        if (session.phase === 'processing') minimize();
        else cancel();
      }}
      className={drawerCls}
      bodyClassName={styles.body}
      headerRight={headerRight}
    >
      {session.phase === 'chooser' && (
        <ChooserPhase onPick={setPhase} />
      )}

      {session.phase === 'sftp' && (
        <SftpPhase showToast={showToast} />
      )}

      {session.phase === 'single' && (
        <SinglePhase
          hccMembers={hccMembers}
          batchId={session.id}
          showToast={showToast}
          createFromEncounter={createFromEncounter}
          onDone={cancel}
        />
      )}

      {session.phase === 'picker' && (
        <div className={styles.pickerPhase}>
          {/* Concentric-ring hero — smaller per Figma (120×120). */}
          <div className={styles.hero} aria-hidden="true">
            <span className={styles.heroRingOuter} />
            <span className={styles.heroRingMid} />
            <span className={styles.heroCenter}>
              <Icon name="solar:document-medicine-linear" size={32} color="var(--neutral-300)" />
            </span>
          </div>

          {/* Dropzone — sits above the how-to banner per Figma. */}
          <div className={styles.dropZoneBlock}>
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

            {/* Supported formats line — sits directly under the dropzone. */}
            <div className={styles.formatsLine}>
              <span>Supported formats: PDF, DOC, JPG, or PNG</span>
              <span>Max size: 100 MB</span>
            </div>
          </div>

          {/* "What happens after you upload" info banner — 3 simplified
              steps per Figma 1:24203. Drops the explicit "review and
              merge / new row" footer note since the third step now
              covers it. */}
          <div className={styles.howToBanner}>
            <div className={styles.howToHead}>
              <Icon name="solar:info-circle-linear" size={16} color="var(--status-info, #145ECC)" />
              <span>What happens after you upload</span>
            </div>
            <ol className={styles.howToList}>
              <li>The system extracts patient demographics, date of service, provider, place of service, and ICD codes.</li>
              <li>Review each record and fix any flagged fields.</li>
              <li>Confirm to add a new worklist entry or merge into an existing one.</li>
            </ol>
          </div>

          {/* Demo PDF chip strip — kept off the main visual surface so the
              upload flow stays end-to-end testable, but visually de-
              emphasised so it reads as developer affordance. */}
          <div className={styles.demoStrip}>
            <Icon name="solar:test-tube-linear" size={12} color="var(--neutral-300)" />
            <span className={styles.demoStripLabel}>Try a demo PDF:</span>
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
      )}

      {session.phase === 'processing' && (
        <ProcessingPhase
          fileName={session.file?.name}
          onMinimize={minimize}
          onDiscard={cancel}
        />
      )}

      {session.phase === 'review' && (
        <ReviewPhase
          encounters={session.encounters}
          groups={groups}
          hccMembers={hccMembers}
          patchEnc={patchEnc}
          removeEnc={removeEnc}
          addEnc={addEnc}
          setSelectedIdxOnAdd={setSelectedIdx}
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

// ── Chooser phase ──────────────────────────────────────────────────
// Three-card menu shown when the user opens Upload Document from the
// worklist toolbar (no patient seeded). Mirrors the Figma "Choose how
// you'd like to add team members" layout — first option primary-tinted,
// the other two secondary-tinted (matches Fold's purple/orange split).
function ChooserPhase({ onPick }) {
  const options = [
    {
      key: 'single', tone: 'primary',
      icon: 'solar:user-rounded-linear',
      title: 'Add a Single Encounter',
      desc: 'Manually add one encounter for a patient — pick the patient, add ICDs, attach the document.',
      cta: 'Add Encounter',
    },
    {
      key: 'picker', tone: 'secondary',
      icon: 'solar:users-group-rounded-linear',
      title: 'Upload Single Document',
      desc: 'Upload one PDF that contains encounters for one or more patients — AI extracts and groups them for review.',
      cta: 'Upload PDF',
    },
    {
      key: 'sftp', tone: 'neutral',
      icon: 'solar:server-2-linear',
      title: 'Upload Multiple Documents (SFTP)',
      desc: 'Drop multiple documents on the secure SFTP server — they\'ll be ingested automatically and queued for AI review.',
      cta: 'Open SFTP Details',
    },
  ];
  return (
    <div className={styles.chooserPhase}>
      <h3 className={styles.chooserHeading}>Choose how you'd like to add encounters</h3>
      <div className={styles.chooserCards}>
        {options.map(opt => (
          <button
            key={opt.key}
            type="button"
            className={`${styles.chooserCard} ${styles[`chooserCard_${opt.tone}`]}`}
            onClick={() => onPick(opt.key)}
          >
            <span className={styles.chooserIcon}>
              <Icon
                name={opt.icon}
                size={28}
                color={
                  opt.tone === 'primary'   ? 'var(--primary-300)'
                  : opt.tone === 'neutral' ? 'var(--neutral-400)'
                  :                          'var(--secondary-300)'
                }
              />
            </span>
            <span className={styles.chooserTitle}>{opt.title}</span>
            <span className={styles.chooserDesc}>{opt.desc}</span>
            <span className={`${styles.chooserCta} ${styles[`chooserCta_${opt.tone}`]}`}>
              {opt.cta}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── SFTP phase ─────────────────────────────────────────────────────
// Informational card for option 3. The actual SFTP server is set up
// per-org via Settings → Integrations; here we just surface the path
// + a copy-to-clipboard affordance + an external link to the
// credentials manager (stubbed for now).
function SftpPhase({ showToast }) {
  const sftpPath = 'sftp://upload.foldhealth.com/<your-org>/hcc/inbox';
  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(sftpPath);
      showToast('SFTP path copied to clipboard');
    } catch {
      showToast('Could not copy — your browser blocked clipboard access');
    }
  };
  return (
    <div className={styles.sftpPhase}>
      <p className={styles.pickerSubtitle}>
        Bulk-upload via SFTP. Documents dropped at the path below are picked
        up by Astrana / Support and ingested into the AI review queue.
      </p>

      <div className={styles.sftpCard}>
        <div className={styles.sftpCardHeader}>
          <Icon name="solar:server-2-linear" size={20} color="var(--secondary-300)" />
          <span>SFTP inbox</span>
        </div>
        <div className={styles.sftpPathRow}>
          <code className={styles.sftpPath}>{sftpPath}</code>
          <button type="button" className={styles.sftpCopyBtn} onClick={copyPath}>
            <Icon name="solar:copy-linear" size={14} color="var(--primary-300)" />
            Copy
          </button>
        </div>
        <ul className={styles.sftpHints}>
          <li>Files: PDF, DOC, JPG, PNG</li>
          <li>Naming: any — AI resolves patient + DOS from the document contents</li>
          <li>New files trigger a batch within ~5 minutes</li>
        </ul>
      </div>

      <div className={styles.sftpExternal}>
        <Icon name="solar:link-linear" size={14} color="var(--primary-300)" />
        <a
          href="https://foldhealth.example/sftp-credentials"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sftpExternalLink}
        >
          Manage SFTP credentials
        </a>
        <span className={styles.sftpExternalHint}>· opens in a new tab</span>
      </div>
    </div>
  );
}

// ── Single-encounter form (option 1) ───────────────────────────────
// Manual entry path: pick a patient, add ICD chips, fill the encounter
// context, attach a document, Confirm. Routes through the existing
// hccCreateOrMergeFromEncounter so dedup + activity-log wiring all works.
function SinglePhase({ hccMembers, batchId, showToast, createFromEncounter, onDone }) {
  const [patient, setPatient] = useState(null);   // selected hccMember or null
  const [patientQuery, setPatientQuery] = useState('');
  const [icdQuery, setIcdQuery] = useState('');
  const [icds, setIcds] = useState([]);             // [{ code, desc, hcc? }]
  const [dosMode, setDosMode] = useState('existing'); // 'existing' | 'new'
  const [dos, setDos] = useState('');
  const [provider, setProvider] = useState('');
  const [pos, setPos] = useState('11');
  const [docType, setDocType] = useState('Progress Note');
  const [condition, setCondition] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  // Patient search — typeahead over hccMembers by name.
  const patientMatches = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return hccMembers.slice(0, 6);
    return hccMembers
      .filter(m => (m.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [hccMembers, patientQuery]);

  // ICD search — flatten all known ICDs across members, then dedup by
  // code so the user gets a single entry per diagnosis even if it's
  // attached to multiple patients in the mock.
  const allIcds = useMemo(() => {
    const map = new Map();
    Object.values(ICDS_BY_MEMBER).forEach(list => {
      (list || []).forEach(item => {
        if (!map.has(item.code)) map.set(item.code, item);
      });
    });
    return [...map.values()];
  }, []);
  const icdMatches = useMemo(() => {
    const q = icdQuery.trim().toLowerCase();
    if (!q) return [];
    return allIcds
      .filter(i =>
        (i.code || '').toLowerCase().includes(q) ||
        (i.desc || '').toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [allIcds, icdQuery]);

  const addIcd = (item) => {
    if (icds.some(i => i.code === item.code)) return;
    setIcds([...icds, item]);
    setIcdQuery('');
  };
  const removeIcd = (code) => setIcds(icds.filter(i => i.code !== code));

  const existingDosList = patient?.dos_list?.map(d => d.date) || [];

  const canConfirm = patient && icds.length > 0 && dos && provider && pos;

  const handleConfirm = () => {
    if (!canConfirm) return;
    // Reuse the same create/merge path used by the OCR flow.
    const result = createFromEncounter({
      tempId: `single-${Date.now()}`,
      patient: {
        name: patient.name,
        dob: patient.dob,
        matchedMemberId: patient.id,
        matchConfidence: 100,
      },
      dos,
      provider,
      pos,
      posDesc: POS_LABEL[pos] || '',
      icds: icds.map(i => ({ code: i.code, valid: true })),
      _docName: file?.name || `Manual entry — ${condition || 'encounter'}.pdf`,
      _docType: docType,
      errors: [],
    });
    if (result.kind === 'skipped') {
      showToast('Could not save — patient not matched');
      return;
    }
    const label = result.kind === 'created'
      ? `Encounter added for ${patient.name}`
      : result.kind === 'updated'
        ? `ICDs merged into existing DOS for ${patient.name}`
        : `Related DOS created for ${patient.name}`;
    showToast(label);
    onDone?.();
  };

  return (
    <div className={styles.singlePhase}>
      <p className={styles.pickerSubtitle}>
        Add a single encounter manually — pick a patient, attach ICDs, and upload
        the supporting document.
      </p>

      {/* Patient picker — same layout as the OCR review's link-patient UI. */}
      <div className={styles.singleSection}>
        <label className={styles.singleLabel}>Patient *</label>
        {patient ? (
          <div className={styles.singlePatientChip}>
            <Avatar variant="patient" initials={patient.in} />
            <div className={styles.singlePatientText}>
              <div className={styles.singlePatientName}>{patient.name}</div>
              <div className={styles.singlePatientMeta}>
                {patient.memberId || patient.member_id || '—'} · DOB {patient.dob || '—'}
              </div>
            </div>
            <button
              type="button"
              className={styles.singlePatientChange}
              onClick={() => { setPatient(null); setPatientQuery(''); }}
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <Input
              placeholder="Search Fold patients by name…"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              autoFocus
            />
            <div className={styles.memberPickerList}>
              {patientMatches.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={styles.memberPickerItem}
                  onClick={() => { setPatient(m); setPatientQuery(''); }}
                >
                  <Avatar variant="patient" initials={m.in} />
                  <span>{m.name}</span>
                  <span className={styles.memberPickerMeta}>{m.memberId || m.member_id || ''}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ICD typeahead + chip list. */}
      <div className={styles.singleSection}>
        <label className={styles.singleLabel}>ICD codes *</label>
        <Input
          placeholder="Search by code or description (e.g. E11.9, COPD)…"
          value={icdQuery}
          onChange={(e) => setIcdQuery(e.target.value)}
        />
        {icdMatches.length > 0 && (
          <div className={styles.icdMatchList}>
            {icdMatches.map(m => (
              <button
                key={m.code}
                type="button"
                className={styles.icdMatchItem}
                onClick={() => addIcd(m)}
              >
                <code className={styles.icdMatchCode}>{m.code}</code>
                <span className={styles.icdMatchDesc}>{m.desc}</span>
                {m.hcc && <span className={styles.icdMatchHcc}>{m.hcc.replace(/ - .*$/, '')}</span>}
              </button>
            ))}
          </div>
        )}
        {icds.length > 0 && (
          <div className={styles.icdChosen}>
            {icds.map(i => (
              <span key={i.code} className={styles.icdChosenChip}>
                <code>{i.code}</code>
                <span className={styles.icdChosenDesc}>{i.desc}</span>
                <button
                  type="button"
                  className={styles.icdChosenRemove}
                  aria-label={`Remove ${i.code}`}
                  onClick={() => removeIcd(i.code)}
                >
                  <Icon name="solar:close-circle-linear" size={12} color="var(--neutral-300)" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* DOS — existing on the patient OR new. Toggle matches the
          segmented control used elsewhere in the drawer (Option 1/2). */}
      <div className={styles.singleSection}>
        <label className={styles.singleLabel}>Date of Service *</label>
        <Toggle
          size="S"
          items={[
            { key: 'existing', label: 'Use existing', disabled: !patient || existingDosList.length === 0 },
            { key: 'new',      label: 'New DOS' },
          ]}
          active={dosMode}
          onChange={setDosMode}
        />
        {dosMode === 'existing' && patient ? (
          <Select
            options={[
              { value: '', label: 'Select a DOS…' },
              ...existingDosList.map(d => ({ value: d, label: d })),
            ]}
            value={dos}
            onChange={setDos}
            placeholder="Select a DOS…"
          />
        ) : (
          <Input
            placeholder="MM/DD/YYYY"
            value={dos}
            onChange={(e) => setDos(e.target.value)}
          />
        )}
      </div>

      {/* Encounter context — provider · POS · doc type · condition. */}
      <div className={styles.singleGrid}>
        <div className={styles.singleField}>
          <label className={styles.singleLabel}>Rendering Provider *</label>
          <Input
            placeholder="Dr. Sarah Connor"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
        </div>
        <div className={styles.singleField}>
          <label className={styles.singleLabel}>POS *</label>
          <Select
            options={Object.entries(POS_LABEL).map(([code, label]) => ({
              value: code,
              label: `${code} — ${label}`,
            }))}
            value={pos}
            onChange={setPos}
          />
        </div>
        <div className={styles.singleField}>
          <label className={styles.singleLabel}>Document Type</label>
          <Select
            options={['Progress Note', 'SOAP Note', 'Telehealth Note', 'Visit Summary', 'Lab Report', 'Imaging Report'].map(t => ({
              value: t,
              label: t,
            }))}
            value={docType}
            onChange={setDocType}
          />
        </div>
        <div className={styles.singleField}>
          <label className={styles.singleLabel}>Condition / Notes</label>
          <Input
            placeholder="Short clinical note (optional)"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
        </div>
      </div>

      {/* Document attach. */}
      <div className={styles.singleSection}>
        <label className={styles.singleLabel}>Supporting document</label>
        {file ? (
          <div className={styles.singleFileChip}>
            <Icon name="solar:file-text-linear" size={16} color="var(--neutral-400)" />
            <span className={styles.singleFileName}>{file.name}</span>
            <button
              type="button"
              className={styles.singleFileRemove}
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.singleFileBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="solar:upload-linear" size={14} color="var(--primary-300)" />
            Attach document
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_EXT}
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!isAcceptedFile(f)) {
              showToast('Please upload a PDF, DOC, JPG, or PNG file');
              return;
            }
            setFile(f);
          }}
        />
      </div>

      {/* Footer — Confirm. */}
      <div className={styles.singleFooter}>
        <Button
          variant="primary"
          size="M"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          Add Encounter
        </Button>
      </div>
    </div>
  );
}

function ReviewPhase({ encounters, groups, hccMembers, patchEnc, removeEnc, addEnc, selectedIdx, setSelectedIdx, filter, setFilter, layout, selectedIdxs, toggleSelected, setSelectedAll, sourceFileName }) {
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
                  {member && (
                    /* Manual-encounter trigger — spawns a blank encounter
                       pre-linked to this patient so the user can add a DOS
                       that wasn't captured by OCR (e.g. a separate scanned
                       progress note). New row lands at the bottom of the
                       group and auto-selects so they can fill it in. */
                    <button
                      type="button"
                      className={styles.addEncounterBtn}
                      onClick={() => {
                        addEnc?.(member);
                        // Select the newly-appended row (it's now the last index).
                        setTimeout(() => {
                          const total = (encounters || []).length;
                          setSelectedIdx(total); // post-add the new row is at length-1 of NEW state
                        }, 0);
                      }}
                      title={`Add a new encounter for ${member.name}`}
                    >
                      <Icon name="solar:add-circle-linear" size={12} color="var(--primary-300)" />
                      Add encounter
                    </button>
                  )}
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
      {/* Patient — chip when matched (clickable to swap), picker when
          unmatched or when the user has opened the swap UI. */}
      <td className={styles.tdPatient}>
        {picking ? (
          <div className={styles.tdPatientPicker}>
            <Input
              autoFocus
              placeholder="Search by name"
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
            />
            <div className={styles.tdPatientPickerList}>
              {filteredMembers.map(m => {
                const isCurrent = m.id === enc.patient?.matchedMemberId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={[styles.tdPatientPickerItem, isCurrent ? styles.tdPatientPickerItemActive : ''].filter(Boolean).join(' ')}
                    onClick={() => handleLink(m)}
                  >
                    <Avatar variant="patient" initials={m.in} />
                    <span>{m.name}</span>
                    {isCurrent && <span className={styles.tdPatientPickerCurrent}>Current</span>}
                  </button>
                );
              })}
            </div>
            {isMatched && (
              <button
                type="button"
                className={styles.tdPatientPickerCancel}
                onClick={() => { setPicking(false); setPickQuery(''); }}
              >
                Cancel
              </button>
            )}
          </div>
        ) : isMatched ? (
          <button
            type="button"
            className={styles.tdPatientMatched}
            onClick={() => setPicking(true)}
            title="Change matched patient"
          >
            <Avatar variant="patient" initials={member?.in || (enc.patient.name || '?').split(' ').map(p => p[0]).slice(0,2).join('')} />
            <span className={styles.tdPatientName}>{member?.name || enc.patient.name}</span>
            <Icon name="solar:pen-2-linear" size={11} color="var(--neutral-300)" className={styles.tdPatientSwapIcon} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.tdPatientLinkBtn}
            onClick={() => setPicking(true)}
            title="Link a Fold patient to this encounter"
          >
            <Icon name="solar:link-linear" size={12} color="var(--status-error)" />
            Link patient…
          </button>
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

  // ── ICD search — flatten the ICD catalog into a unique-by-code list
  // so users can add a missed code without leaving the review pane.
  const [icdQuery, setIcdQuery] = useState('');
  const icdCatalog = useMemo(() => {
    const map = new Map();
    Object.values(ICDS_BY_MEMBER).forEach(list => {
      (list || []).forEach(item => { if (!map.has(item.code)) map.set(item.code, item); });
    });
    return [...map.values()];
  }, []);
  const icdMatches = useMemo(() => {
    const q = icdQuery.trim().toLowerCase();
    if (!q) return [];
    const existing = new Set((enc.icds || []).map(i => i.code));
    return icdCatalog
      .filter(i =>
        !existing.has(i.code) && (
          (i.code || '').toLowerCase().includes(q) ||
          (i.desc || '').toLowerCase().includes(q)
        ),
      )
      .slice(0, 6);
  }, [icdCatalog, icdQuery, enc.icds]);
  const addIcd = (item) => {
    onPatch({ icds: [...(enc.icds || []), { code: item.code, desc: item.desc, valid: true }] });
    setIcdQuery('');
  };

  return (
    <div className={[styles.encounterCard, isMatched ? '' : styles.encounterCardMismatch].filter(Boolean).join(' ')}>
      {!isMatched && (
        <div className={styles.mismatchBanner}>
          <Icon name="solar:danger-triangle-bold" size={14} color="var(--status-error)" />
          <span className={styles.mismatchText}>
            Patient identity could not be matched at 100% confidence. Manually link before confirming.
          </span>
          {!picking && (
            <button className={styles.linkBtn} onClick={() => setPicking(true)}>
              Manually link
            </button>
          )}
        </div>
      )}

      {/* Re-match affordance — visible on matched encounters so the user
          can swap an auto-matched (or previously-linked) patient. Hidden
          while the picker is open to avoid two open trigger states. */}
      {isMatched && !picking && (
        <div className={styles.rematchRow}>
          <span className={styles.rematchText}>
            Matched to{' '}
            <strong>{enc.patient?.name || 'this patient'}</strong>.
          </span>
          <button
            type="button"
            className={styles.rematchBtn}
            onClick={() => setPicking(true)}
          >
            <Icon name="solar:refresh-square-linear" size={12} color="var(--primary-300)" />
            Change patient
          </button>
        </div>
      )}

      {/* Shared picker — opens from either the mismatch banner (Manually
          link) or the rematch row (Change patient). */}
      {picking && (
        <div className={styles.memberPicker}>
          <Input
            placeholder="Search Fold patients by name…"
            value={pickQuery}
            onChange={(e) => setPickQuery(e.target.value)}
            autoFocus
          />
          <div className={styles.memberPickerList}>
            {filteredMembers.map(m => {
              const isCurrent = m.id === enc.patient?.matchedMemberId;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={[styles.memberPickerItem, isCurrent ? styles.memberPickerItemActive : ''].filter(Boolean).join(' ')}
                  onClick={() => handleLinkMember(m)}
                >
                  <Avatar variant="patient" initials={m.in} />
                  <span>{m.name}</span>
                  <span className={styles.memberPickerMeta}>{m.memberId}</span>
                  {isCurrent && <span className={styles.memberPickerCurrent}>Current</span>}
                </button>
              );
            })}
          </div>
          {isMatched && (
            <button
              type="button"
              className={styles.memberPickerCancel}
              onClick={() => { setPicking(false); setPickQuery(''); }}
            >
              Cancel
            </button>
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

        {/* Add ICD — typeahead over the catalog. Excludes codes already
            on this encounter so the user doesn't see false duplicates. */}
        <div className={styles.icdAddRow}>
          <Input
            placeholder="Add ICD — search by code or description (e.g. E11.9, COPD)…"
            value={icdQuery}
            onChange={(e) => setIcdQuery(e.target.value)}
          />
          {icdMatches.length > 0 && (
            <div className={styles.icdMatchList}>
              {icdMatches.map(m => (
                <button
                  key={m.code}
                  type="button"
                  className={styles.icdMatchItem}
                  onClick={() => addIcd(m)}
                >
                  <code className={styles.icdMatchCode}>{m.code}</code>
                  <span className={styles.icdMatchDesc}>{m.desc}</span>
                  {m.hcc && <span className={styles.icdMatchHcc}>{m.hcc.replace(/ - .*$/, '')}</span>}
                </button>
              ))}
            </div>
          )}
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

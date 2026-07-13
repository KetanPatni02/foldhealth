import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { Button } from '../../components/Button/Button';
import { Dropzone } from '../../components/Dropzone/Dropzone';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { useAppStore } from '../../store/useAppStore';
import { DocEvidenceViewer } from './DiagPanel/DocEvidenceViewer';
import { DOC_TYPES, makeUploadedChartDoc } from './data/chartDocs';
import { staffForRole } from './assignment/astranaStaff';
import styles from './ChartDetailDrawer.module.css';

// Document-review status options for the "Action Needed" dropdown. The icon
// (a light-filled status circle) sits beside the label and is mirrored into the
// trigger when selected.
const STATUS_OPTIONS = [
  { key: 'action-needed', label: 'Action Needed' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'insufficient', label: 'Insufficient' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected', textColor: 'var(--status-error)' },
];

// Badge colouring for the header status pill, keyed to the review outcome.
const STATUS_BADGE = {
  'action-needed': { color: 'var(--neutral-300)',     bg: 'var(--neutral-50)',            border: 'rgba(111, 122, 144, 0.1)' },
  'in-progress':   { color: 'var(--status-warning)',  bg: 'var(--status-warning-light)',  border: 'rgba(240, 160, 0, 0.2)' },
  'insufficient':  { color: 'var(--status-warning)',  bg: 'var(--status-warning-light)',  border: 'rgba(240, 160, 0, 0.2)' },
  'completed':     { color: 'var(--status-success)',  bg: 'var(--status-success-light)',  border: 'rgba(0, 155, 83, 0.2)' },
  'rejected':      { color: 'var(--status-error)',    bg: 'var(--status-error-light)',    border: 'rgba(215, 40, 37, 0.2)' },
};

/**
 * Derive the document-set review status from each doc's pass/fail state:
 *   • >1 failed            → insufficient
 *   • all passed           → completed
 *   • at least one decided → in progress
 *   • nothing decided yet  → action needed
 */
function deriveStatus(docs, actions) {
  const passCount = docs.filter(d => actions[d.id] === 'pass').length;
  const failCount = docs.filter(d => actions[d.id] === 'fail').length;
  if (failCount > 1) return 'insufficient';
  if (docs.length > 0 && passCount === docs.length) return 'completed';
  if (passCount + failCount > 0) return 'in-progress';
  return 'action-needed';
}

function StatusIcon({ status, size = 16 }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', style: { flexShrink: 0 } };
  switch (status) {
    case 'in-progress':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.5" stroke="var(--status-warning)" strokeWidth="1.2" />
          <path d="M8 1.5A6.5 6.5 0 0 1 8 14.5Z" fill="var(--status-warning)" />
        </svg>
      );
    case 'insufficient':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="var(--status-warning-light)" stroke="var(--status-warning)" />
          <path d="M8 4.5V8.6" stroke="var(--status-warning)" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="var(--status-warning)" />
        </svg>
      );
    case 'completed':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="var(--status-success-light)" stroke="var(--status-success)" />
          <path d="M5 8.2l2 2 4-4.4" stroke="var(--status-success)" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'rejected':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="var(--status-error-light)" stroke="var(--status-error)" />
          <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="var(--status-error)" strokeLinecap="round" />
        </svg>
      );
    case 'action-needed':
    default:
      return (
        <svg {...common}>
          <path d="M8 0.5C12.1421 0.5 15.5 3.85786 15.5 8C15.5 12.1421 12.1421 15.5 8 15.5C3.85786 15.5 0.5 12.1421 0.5 8C0.5 3.85786 3.85786 0.5 8 0.5Z" fill="var(--status-warning-light)" />
          <path d="M8 0.5C12.1421 0.5 15.5 3.85786 15.5 8C15.5 12.1421 12.1421 15.5 8 15.5C3.85786 15.5 0.5 12.1421 0.5 8C0.5 3.85786 3.85786 0.5 8 0.5Z" stroke="var(--neutral-400)" />
          <path d="M8 4V5.33333M12 8H10.6667M8 12V10.6667M4 8H5.33333M5.17151 5.17157L6.11432 6.11438M10.8284 5.17157L9.88556 6.11438M10.8285 10.8284L9.88568 9.88561M5.17163 10.8284L6.11444 9.88561" stroke="var(--neutral-400)" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

// A document is "addressed" once it has been passed or failed; the incoming
// chart status carries that over (Passed / Failed), otherwise it is pending.
const isAddressed = (doc) => doc?.status === 'Passed' || doc?.status === 'Failed';
const actionForStatus = (doc) =>
  doc?.status === 'Passed' ? 'pass' : doc?.status === 'Failed' ? 'fail' : null;

/**
 * ChartDetailDrawer — "Document Available Details" full-width overlay opened
 * from the ChartPopover. Left pane shows the selected chart PDF; right pane
 * lists every document on the patient's chart, with the entry document (or,
 * when opened via "View more", the first not-yet-reviewed document) selected
 * by default. Figma: ICD-Import 4481:112907.
 *
 * @param {object}   props
 * @param {object[]} props.charts    – full document list from getChartDocs
 * @param {string}   [props.initialId] – id of the doc to select; when omitted
 *                                       (opened from "View more") the first
 *                                       pass/fail-not-addressed doc is selected
 * @param {object}   props.member    – worklist member (patient banner + PDF)
 * @param {function} props.onClose
 */
export function ChartDetailDrawer({ charts, initialId, member, onClose }) {
  const docs = charts || [];

  // Selected document: the one entered from, else the first unaddressed, else
  // the first document.
  const [selectedId, setSelectedId] = useState(
    () => initialId || docs.find(d => !isAddressed(d))?.id || docs[0]?.id || null,
  );
  // Per-document pass/fail review state, seeded from each doc's status.
  const [docActions, setDocActions] = useState(() => {
    const m = {};
    docs.forEach(d => { const a = actionForStatus(d); if (a) m[d.id] = a; });
    return m;
  });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // "Assign Support Team" dropdown anchored on the team (DM) badge.
  const dmRef = useRef(null);
  const [assignPos, setAssignPos] = useState(null);
  const [selectedSupport, setSelectedSupport] = useState(null);
  useEffect(() => {
    if (!assignPos) return;
    const onDoc = (e) => {
      if (!dmRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.assignMenu}`)) setAssignPos(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [assignPos]);

  // Header status dropdown anchored on the status button. The status is
  // derived from the documents' pass/fail state; the user can also manually
  // override it (e.g. force Completed, or Rejected once a doc has passed).
  const actionRef = useRef(null);
  const [manualStatus, setManualStatus] = useState(null);
  const [actionPos, setActionPos] = useState(null);
  const showToast = useAppStore(s => s.showToast);
  const addChartDoc = useAppStore(s => s.addChartDoc);

  // Inline "Upload" panel (opened from the Upload link in the assoc row).
  // Mirrors the Add DOS drawer's upload states: Dropzone → uploading progress
  // card → uploaded file card.
  const [showUpload, setShowUpload] = useState(false);
  const [upFile, setUpFile] = useState(null);
  const [upCaption, setUpCaption] = useState('');
  const [upType, setUpType] = useState('');
  const [upProc, setUpProc] = useState(null); // null | { name, sizeLabel, progress }
  const [uploaded, setUploaded] = useState(false);
  useEffect(() => {
    if (!actionPos) return;
    const onDoc = (e) => {
      if (!actionRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.statusMenu}`)) setActionPos(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [actionPos]);
  // Drive the fake upload progress (0→100), then flip to the uploaded state.
  useEffect(() => {
    if (!upProc) return undefined;
    if (upProc.progress < 100) {
      const t = setTimeout(() => setUpProc(p => (p ? { ...p, progress: Math.min(100, p.progress + 12) } : p)), 100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setUpProc(null); setUploaded(true); }, 250);
    return () => clearTimeout(t);
  }, [upProc]);

  if (docs.length === 0) return null;

  const selected = docs.find(d => d.id === selectedId) || docs[0];

  const supportStaff = staffForRole('support');
  const openAssign = () => {
    if (assignPos) { setAssignPos(null); return; }
    const r = dmRef.current?.getBoundingClientRect();
    if (r) setAssignPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const reviewerName = selectedSupport?.name || member?.sup || 'D Morris';
  const passDoc = (id) => { setDocActions(a => ({ ...a, [id]: 'pass' })); showToast('Support Task is Completed'); };
  const failDoc = (id) => setDocActions(a => ({ ...a, [id]: 'fail' }));
  const undoDoc = (id) => setDocActions(a => { const n = { ...a }; delete n[id]; return n; });

  const effectiveStatus = manualStatus || deriveStatus(docs, docActions);
  const currentStatus = STATUS_OPTIONS.find(s => s.key === effectiveStatus) || STATUS_OPTIONS[0];
  const currentBadge = STATUS_BADGE[effectiveStatus] || STATUS_BADGE['action-needed'];
  const openAction = () => {
    if (actionPos) { setActionPos(null); return; }
    const r = actionRef.current?.getBoundingClientRect();
    if (r) setActionPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 198) });
  };

  const gender = member?.g === 'F' ? 'Female' : 'Male';
  const overdue = /overdue/i.test(member?.due || '');
  const selectedPassed = docActions[selected.id] === 'pass';

  const resetUpload = () => {
    setShowUpload(false); setUpFile(null); setUpCaption(''); setUpType('');
    setUpProc(null); setUploaded(false);
  };
  const clearUploadFile = () => { setUpFile(null); setUpProc(null); setUploaded(false); };
  const onPickUpload = (file) => {
    setUpFile(file);
    setUploaded(false);
    setUpProc({ name: file.name, sizeLabel: `${(file.size / 1e6).toFixed(1)}MB`, progress: 0 });
  };
  const canSaveUpload = !!(uploaded && upFile && upCaption.trim() && upType);
  const saveUpload = () => {
    if (!canSaveUpload) return;
    addChartDoc(member.id, makeUploadedChartDoc(member, { file: upFile, caption: upCaption, docType: upType }), upFile);
    showToast(`Uploaded ${upFile.name} to ${member?.name || 'patient'}'s documents.`);
    resetUpload();
  };

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel} role="dialog" aria-label="Document Available Details">
        {/* Title bar */}
        <div className={styles.titleBar}>
          <span className={styles.title}>Document Available Details</span>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <Icon name="solar:close-square-linear" size={20} color="var(--neutral-400)" />
          </button>
        </div>

        {/* Patient banner */}
        <div className={styles.banner}>
          <div className={styles.avatar}>{member?.in || 'AB'}</div>
          <div className={styles.bannerText}>
            <div className={styles.bannerName}>
              <span>{member?.name || 'Patient'}</span>
              <Icon name="solar:arrow-right-linear" size={13} color="var(--neutral-300)" />
            </div>
            <div className={styles.bannerMeta}>
              <span>Patient</span><span className={styles.dot}>•</span>
              <span>{gender}</span><span className={styles.dot}>•</span>
              <span>{member?.age || '—'}</span><span className={styles.dot}>•</span>
              <span>#{member?.memberId || '219384756102'}</span><span className={styles.dot}>•</span>
              <span>RAF</span>
              <span className={styles.rafVal}>{member?.raf || '—'}</span>
              <span className={styles.rafBadge}>
                {member?.ri || '0.512'}
                <Icon name={member?.ru === false ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'} size={12} color="var(--status-success)" />
              </span>
            </div>
          </div>
          <div className={styles.bannerActions}>
            <button type="button" className={styles.iconBtn} aria-label="Call PCP">
              <Icon name="solar:phone-calling-linear" size={20} color="var(--neutral-300)" />
            </button>
            <span className={styles.vDivider} />
            <button type="button" className={styles.iconBtn} aria-label="Expand">
              <Icon name="solar:maximize-square-linear" size={20} color="var(--neutral-300)" />
            </button>
          </div>
        </div>

        {/* Two-pane body */}
        <div className={styles.body}>
          {/* Left — PDF of the selected document */}
          <div className={styles.leftPane}>
            <div className={styles.paneHeader}>{selected.n}</div>
            <div className={styles.pdfWrap}>
              {selected.pdf ? (
                <iframe src={selected.pdf} title={selected.n} />
              ) : (
                <DocEvidenceViewer member={member} />
              )}
            </div>
          </div>

          {/* Right — metadata + document list */}
          <div className={styles.rightPane}>
            <div className={styles.rightHeader}>
              <div className={styles.createdGroup}>
                <span className={styles.createdLabel}>Created :</span>
                <span className={styles.createdDate}>{member?.date || '06/15/2026'}</span>
                {overdue && <span className={styles.overdue}>({member.due})</span>}
              </div>
              <span className={styles.vDivider} />
              <span className={styles.teamBadge}>
                <span className={styles.progressDot} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="var(--status-success)" strokeWidth="1.5" />
                    <path d="M8 2A6 6 0 0 1 8 14Z" fill="var(--status-success)" />
                  </svg>
                </span>
                Support Team
              </span>
              <div className={styles.rightHeaderEnd}>
                <button type="button" ref={dmRef} className={styles.dmBadge} onClick={openAssign}>
                  <span className={styles.dmAvatar}>{selectedSupport ? selectedSupport.initials : 'DM'}</span>
                  <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--secondary-300)" />
                </button>
                <span className={styles.vDivider} />
                <button
                  type="button"
                  ref={actionRef}
                  className={styles.actionNeeded}
                  style={{ color: currentBadge.color, background: currentBadge.bg, borderColor: currentBadge.border }}
                  onClick={openAction}
                >
                  <StatusIcon status={currentStatus.key} size={12} />
                  {currentStatus.label}
                  <Icon name="solar:alt-arrow-down-linear" size={12} color={currentBadge.color} />
                </button>
              </div>
            </div>

            {selectedPassed && (
              <div className={styles.passBanner}>
                <Icon name="solar:info-circle-linear" size={16} color="var(--status-success)" />
                <span>{reviewerName} Completed Document Review Task on {member?.date || '—'}.</span>
              </div>
            )}

            <div className={styles.rightBody}>
              <div className={styles.assocRow}>
                <div className={styles.assocLeft}>
                  <span className={styles.assocLabel}>Document Associated with</span>
                  <span className={styles.dosBadge}>
                    {(member?.cv || member?.tv || 3)}/{(member?.tv || 3)} DOSs
                    <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--primary-300)" />
                  </span>
                </div>
                <button type="button" className={styles.uploadLink} onClick={() => setShowUpload(v => !v)}>
                  <Icon name="solar:upload-minimalistic-linear" size={16} color="var(--primary-300)" />
                  Upload
                </button>
              </div>

              {showUpload && (
                <div className={styles.uploadPanel}>
                  {upProc ? (
                    <div className={styles.procCard}>
                      <div className={styles.procRow}>
                        <span className={styles.procIcon}>
                          <Icon name="solar:file-text-linear" size={16} color="var(--neutral-400)" />
                        </span>
                        <div className={styles.procMeta}>
                          <div className={styles.procName}>{upProc.name}</div>
                          <div className={styles.procSub}>
                            <span>{upProc.sizeLabel}</span>
                            <span>•</span>
                            <span className={styles.procStatus}>
                              <span className={styles.procSpin}><Icon name="solar:refresh-linear" size={13} /></span>
                              Uploading...
                            </span>
                          </div>
                        </div>
                        <button type="button" className={styles.procCancel} onClick={clearUploadFile} aria-label="Cancel upload">
                          <Icon name="solar:close-circle-linear" size={16} color="var(--neutral-400)" />
                        </button>
                      </div>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${upProc.progress}%` }} />
                      </div>
                    </div>
                  ) : uploaded && upFile ? (
                    <div className={styles.uplCard}>
                      <span className={styles.uplIcon}>
                        <Icon name="solar:document-text-linear" size={16} color="var(--primary-300)" />
                      </span>
                      <div className={styles.uplMeta}>
                        <div className={styles.uplName}>{upFile.name}</div>
                        <div className={styles.uplSub}>
                          <span>{`${(upFile.size / 1e6).toFixed(1)}MB`}</span>
                          <span>•</span>
                          <span className={styles.uplDone}>
                            <Icon name="solar:check-circle-bold" size={12} color="var(--status-success)" /> Uploaded just now
                          </span>
                        </div>
                      </div>
                      <button type="button" className={styles.uplAction} onClick={clearUploadFile} aria-label="Remove file">
                        <Icon name="solar:trash-bin-trash-linear" size={15} color="var(--neutral-400)" />
                      </button>
                    </div>
                  ) : (
                    <Dropzone
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      helperText="Supported formats: PDF, DOC, JPG, or PNG"
                      secondaryText="Max size: 100 MB"
                      icon="solar:upload-minimalistic-linear"
                      onPick={onPickUpload}
                    />
                  )}
                  <div className={styles.uploadField}>
                    <span className={styles.uploadLabel}>Caption<span className={styles.uploadReq} aria-hidden="true" /></span>
                    <input
                      type="text"
                      className={styles.uploadInput}
                      placeholder="Add caption"
                      value={upCaption}
                      onChange={(e) => setUpCaption(e.target.value)}
                    />
                  </div>
                  <div className={styles.uploadField}>
                    <span className={styles.uploadLabel}>Document Type<span className={styles.uploadReq} aria-hidden="true" /></span>
                    <Select value={upType} onValueChange={setUpType}>
                      <SelectTrigger className={styles.uploadSelect}>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={styles.uploadActions}>
                    <Button variant="primary" size="S" disabled={!canSaveUpload} onClick={saveUpload}>Save</Button>
                    <Button variant="secondary" size="S" onClick={resetUpload}>Discard</Button>
                  </div>
                </div>
              )}

              {docs.map((d) => {
                const action = docActions[d.id] || null;
                const isSel = d.id === selected.id;
                return (
                  <div
                    key={d.id}
                    className={`${styles.docCard} ${isSel ? styles.docCardSelected : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(d.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(d.id); } }}
                  >
                    <span className={styles.docThumb} aria-hidden="true">PDF</span>
                    <div className={styles.docCardText}>
                      <span className={styles.docName}>{d.caption || d.n}</span>
                      <span className={styles.docMeta}>
                        {d.t} • {d.dateAdded || '—'} • {d.addedBy || '—'}
                      </span>
                    </div>
                    <div className={styles.docActions} onClick={(e) => e.stopPropagation()}>
                      {action === 'pass' ? (
                        <>
                          <span className={styles.passedBadge}>
                            <Icon name="solar:check-read-linear" size={12} color="var(--status-success)" />
                            Passed
                          </span>
                          <button type="button" className={styles.undoBtn} aria-label="Undo" onClick={() => undoDoc(d.id)}>
                            <Icon name="solar:undo-left-round-linear" size={16} color="var(--neutral-400)" />
                          </button>
                        </>
                      ) : action === 'fail' ? (
                        <>
                          <span className={styles.failedBadge}>
                            <Icon name="solar:close-circle-linear" size={12} color="var(--status-error)" />
                            Failed
                          </span>
                          <button type="button" className={styles.undoBtn} aria-label="Undo" onClick={() => undoDoc(d.id)}>
                            <Icon name="solar:undo-left-round-linear" size={16} color="var(--neutral-400)" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className={styles.passFailPill} title="Pass" onClick={() => passDoc(d.id)}>
                            <Icon name="solar:check-circle-linear" size={12} color="var(--neutral-300)" />
                            Pass
                          </button>
                          <button type="button" className={styles.passFailPill} title="Fail" onClick={() => failDoc(d.id)}>
                            <Icon name="solar:close-circle-linear" size={12} color="var(--neutral-300)" />
                            Fail
                          </button>
                        </>
                      )}
                      <button type="button" className={styles.moreBtn} aria-label="More actions">
                        <Icon name="solar:menu-dots-linear" size={15} color="currentColor" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {assignPos && (
        <div
          className={styles.assignMenu}
          style={{ top: assignPos.top, right: assignPos.right }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.assignTitle}>Assign Support Team</div>
          {supportStaff.map(s => (
            <button
              key={s.id}
              type="button"
              className={styles.assignItem}
              onClick={() => { setSelectedSupport(s); setAssignPos(null); }}
            >
              <Avatar variant="assignee" initials={s.initials} />
              <span className={styles.assignName}>{s.name}</span>
              <span className={styles.assignRole}>Support Team</span>
            </button>
          ))}
        </div>
      )}

      {actionPos && (
        <div
          className={styles.statusMenu}
          style={{ top: actionPos.top, left: actionPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_OPTIONS.map(opt => {
            const sel = opt.key === effectiveStatus;
            return (
              <button
                key={opt.key}
                type="button"
                className={`${styles.statusItem} ${sel ? styles.statusItemSelected : ''}`}
                onClick={() => { setManualStatus(opt.key); setActionPos(null); }}
              >
                <StatusIcon status={opt.key} size={16} />
                <span
                  className={styles.statusLabel}
                  style={{ color: sel ? 'var(--primary-300)' : (opt.textColor || 'var(--neutral-400)') }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>,
    document.body,
  );
}

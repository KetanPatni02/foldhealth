import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/Icon/Icon';
import { Avatar } from '../../components/Avatar/Avatar';
import { PatientBanner } from '../../components/PatientBanner/PatientBanner';
import { Button } from '../../components/Button/Button';
import { UploadDropField } from '../../components/UploadDropField/UploadDropField';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { Switch } from '../../components/Switch/Switch';
import { useAppStore } from '../../store/useAppStore';
import { DocEvidenceViewer } from './DiagPanel/DocEvidenceViewer';
import { ReviewProgressPopover, buildReviewStages, computeReviewProgress, ProgressRing } from './DiagPanel/ReviewProgressPopover';
import { dosKey } from './assignment/dosState';
import { DestructiveDialog } from '../../components/Modal/DestructiveDialog';
import { RadioButton } from '../../components/RadioButton/RadioButton';
import { Textarea } from '../../components/Textarea/Textarea';
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
 *   • every doc failed     → insufficient (nothing usable on the chart)
 *   • >1 failed (mixed)    → insufficient
 *   • all passed           → completed
 *   • at least one decided → in progress
 *   • nothing decided yet  → action needed
 */
function deriveStatus(docs, actions) {
  const passCount = docs.filter(d => actions[d.id] === 'pass').length;
  const failCount = docs.filter(d => actions[d.id] === 'fail').length;
  if (docs.length > 0 && failCount === docs.length) return 'insufficient';
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

// Derive avatar initials from a display name ("E. Johnson" → "EJ").
function nameToInitials(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  // "Assign Support Team" dropdown anchored on the team badge.
  const dmRef = useRef(null);
  const [assignPos, setAssignPos] = useState(null);
  useEffect(() => {
    if (!assignPos) return;
    const onDoc = (e) => {
      if (!dmRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.assignMenu}`)) setAssignPos(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [assignPos]);

  // Per-document "More actions" menu (currently: Unlink). Anchored on the
  // clicked doc's ⋯ button; holds { docId, top, left }.
  const [moreMenu, setMoreMenu] = useState(null);
  // Fail-reason prompt — { id, name } | null. Set by failDoc; confirming
  // logs the reason and applies the Fail status.
  const [failPrompt, setFailPrompt] = useState(null);
  // Confirmation dialog for the delete action on the per-doc menu.
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
  // Review Progress popover state — hover-open + click-to-pin (mirrors the
  // DiagPanel status-pill treatment). Anchored on the "Support Team" badge
  // in the drawer header so a reviewer can peek at the four-stage timeline
  // without leaving the drawer.
  const teamBadgeRef = useRef(null);
  const [teamPillRect, setTeamPillRect] = useState(null);
  const [teamPillPinned, setTeamPillPinned] = useState(false);
  const teamOpenTimer = useRef(null);
  const teamCloseTimer = useRef(null);
  useEffect(() => {
    if (!moreMenu) return;
    const onDoc = (e) => {
      if (!e.target.closest?.(`.${styles.docMoreMenu}`) && !e.target.closest?.(`.${styles.moreBtn}`)) setMoreMenu(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreMenu]);

  // When the last document is unlinked we keep the drawer open and switch the
  // right pane to the Upload section (left preview hidden) instead of closing.
  const [emptiedViaUnlink, setEmptiedViaUnlink] = useState(false);

  // "N/M DOSs" expandable toggle list (mirrors the Diagnosis Gap drawer).
  const [dosExpanded, setDosExpanded] = useState(false);
  const [disabledDos, setDisabledDos] = useState(() => new Set());

  // Header status dropdown anchored on the status button. The status is
  // derived from the documents' pass/fail state; the user can also manually
  // override it (e.g. force Completed, or Rejected once a doc has passed).
  const actionRef = useRef(null);
  const [manualStatus, setManualStatus] = useState(null);
  const [actionPos, setActionPos] = useState(null);
  const showToast = useAppStore(s => s.showToast);
  const addChartDoc = useAppStore(s => s.addChartDoc);
  const setChartDocStatus = useAppStore(s => s.setChartDocStatus);
  const removeChartDoc = useAppStore(s => s.removeChartDoc);
  const addActivityEntry = useAppStore(s => s.addActivityEntry);
  const openHccUploadDrawerForEdit = useAppStore(s => s.openHccUploadDrawerForEdit);
  // Workflow-engine writers — these keep the Support assignee + status in sync
  // with the worklist Support column and the Diagnosis Gaps Details view.
  const hccReassignRole = useAppStore(s => s.hccReassignRole);
  const hccSetRoleStatus = useAppStore(s => s.hccSetRoleStatus);
  const hccCompleteSupport = useAppStore(s => s.hccCompleteSupport);
  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  // Live member from the store so the assignee badge reflects reassignments
  // made here (or elsewhere) without waiting on the parent's prop to refresh.
  const liveMember = useAppStore(s => s.hccMembers.find(x => x.id === member?.id));
  const m = liveMember || member;

  // Inline "Upload" panel (opened from the Upload link in the assoc row).
  // Mirrors the Add DOS drawer's upload states: Dropzone → uploading progress
  // card → uploaded file card.
  const [showUpload, setShowUpload] = useState(false);
  const [upFile, setUpFile] = useState(null);
  const [upCaption, setUpCaption] = useState('');
  const [upType, setUpType] = useState('');
  const [uploadKey, setUploadKey] = useState(0); // remount UploadDropField to reset it
  useEffect(() => {
    if (!actionPos) return;
    const onDoc = (e) => {
      if (!actionRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.statusMenu}`)) setActionPos(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [actionPos]);

  // Nothing to show only when the drawer opened empty. If the user unlinked
  // down to zero, stay open and render the Upload section (handled below).
  if (docs.length === 0 && !emptiedViaUnlink) return null;

  const isEmpty = docs.length === 0;
  const selected = docs.find(d => d.id === selectedId) || docs[0] || null;

  // DOS list for the "N/M DOSs" toggle. Prefer member.dos_list; fall back to a
  // single synthetic entry from member.dos. Provider/POS/visit-type read from
  // the entry with member-level fallbacks (same as the Diagnosis Gap drawer).
  const dosList = m?.dos_list?.length
    ? m.dos_list
    : (m?.dos ? [{ date: m.dos }] : []);
  const enabledDosCount = dosList.filter(d => !disabledDos.has(d.date)).length;
  const toggleDos = (date) => setDisabledDos(prev => {
    const next = new Set(prev);
    if (next.has(date)) next.delete(date); else next.add(date);
    return next;
  });

  const supportStaff = staffForRole('support');
  const openAssign = () => {
    if (assignPos) { setAssignPos(null); return; }
    const r = dmRef.current?.getBoundingClientRect();
    if (r) setAssignPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  // Current Support assignee, read live from the store — must match the
  // worklist RoleStatusCell rule: a lingering name with no real status (or
  // status 'Assign') still counts as UNASSIGNED. Only a name + concrete
  // status shows an owner.
  const supportName = m?.sup || null;
  const supportStatus = m?.supS || null;
  const isSupportAssigned = !!(supportName && supportStatus && supportStatus !== 'Assign');
  const supportInitials = isSupportAssigned ? nameToInitials(supportName) : null;
  const reviewerName = (isSupportAssigned && supportName) || 'the support team';

  // DOS anchor for engine writes — the drawer is chart-level, so use the
  // member's primary DOS (falls back to first listed DOS, then created date).
  const dosDate = member?.dos || member?.dos_list?.[0]?.date || member?.date;

  // The logged-in user acting in the Support role. Real Supabase identity when
  // present; otherwise the first active Support staffer stands in (dev/bypass),
  // so avatars + the worklist show consistent, real initials.
  const currentUser = currentUserProfile?.name
    ? { id: currentUserProfile.id, name: currentUserProfile.name, initials: nameToInitials(currentUserProfile.name) }
    : (supportStaff.find(s => s.active) || supportStaff[0]);

  // Assign the logged-in user to Support if the DOS has no support owner yet.
  // Reads fresh store state so it's idempotent across rapid actions.
  const ensureSupportAssignee = () => {
    if (!dosDate || !currentUser) return;
    const fresh = useAppStore.getState().hccMembers.find(x => x.id === member.id);
    const assigned = fresh?.sup && fresh?.supS && fresh.supS !== 'Assign';
    if (!assigned) {
      hccReassignRole(member.id, dosDate, 'support', currentUser.id, 'You',
        'Auto-assigned on document review', currentUser.name);
    }
  };

  // Push a derived/selected review status to the workflow engine. Completed
  // routes through completeSupport so the Coder is auto-assigned (AC); every
  // other status is a plain support-status patch that leaves the Coder alone.
  const syncSupportStatus = (statusKey) => {
    if (!dosDate) return;
    switch (statusKey) {
      case 'completed':    hccCompleteSupport(member.id, dosDate, currentUser?.name); break;
      case 'insufficient': hccSetRoleStatus(member.id, dosDate, 'support', 'Insufficient'); break;
      case 'rejected':     hccSetRoleStatus(member.id, dosDate, 'support', 'Reject'); break;
      case 'in-progress':  hccSetRoleStatus(member.id, dosDate, 'support', 'In Progress'); break;
      default:             hccSetRoleStatus(member.id, dosDate, 'support', 'Awaiting'); break;
    }
  };

  // Pass/Fail writes the doc status through to the store (worklist evidence
  // cell) AND — because changing a document's status is a Support action —
  // assigns the acting user and syncs the derived Support status everywhere.
  const applyDocAction = (id, action) => {
    const next = action
      ? { ...docActions, [id]: action }
      : (() => { const n = { ...docActions }; delete n[id]; return n; })();
    setDocActions(next);
    setChartDocStatus(member.id, id, action === 'pass' ? 'Passed' : action === 'fail' ? 'Failed' : 'Pending');
    if (action) ensureSupportAssignee();
    // The header can be manually overridden; when it isn't, the document set
    // drives the Support status.
    if (!manualStatus) syncSupportStatus(deriveStatus(docs, next));
  };
  const passDoc = (id) => { applyDocAction(id, 'pass'); showToast('Support Task is Completed'); };
  const failDoc = (id) => {
    const doc = docs.find(d => d.id === id);
    setFailPrompt({ id, name: doc?.n || 'Document' });
  };
  const undoDoc = (id) => applyDocAction(id, null);
  const confirmFailDoc = ({ reason, note }) => {
    if (!failPrompt) return;
    applyDocAction(failPrompt.id, 'fail');
    const doc = docs.find(d => d.id === failPrompt.id);
    addActivityEntry?.({
      t: 'doc-status', by: 'You', role: 'Support Team',
      headline: `Marked "${doc?.n || failPrompt.name}" as Failed`,
      details: [{ note: note ? `${reason} — ${note}` : reason }],
    });
    showToast(`Marked ${failPrompt.name} failed`);
    setFailPrompt(null);
  };

  // Build the four-stage review timeline for the popover. Reads the same
  // dosState + member the ReviewProgressPopover already understands.
  const hccDosAssignmentsMap = useAppStore(s => s.hccDosAssignments);
  const dosStateForBadge = (member?.id && dosDate)
    ? hccDosAssignmentsMap[dosKey(member.id, dosDate, member.rp, member.pos)]
    : null;
  const teamReviewStages = buildReviewStages(member, dosStateForBadge);
  const teamReviewProgress = computeReviewProgress(teamReviewStages);

  const onTeamPillEnter = () => {
    if (teamCloseTimer.current) { clearTimeout(teamCloseTimer.current); teamCloseTimer.current = null; }
    if (teamPillRect) return;
    teamOpenTimer.current = setTimeout(() => {
      const r = teamBadgeRef.current?.getBoundingClientRect();
      if (r) setTeamPillRect(r);
    }, 80);
  };
  const onTeamPillLeave = () => {
    if (teamPillPinned) return;
    if (teamOpenTimer.current) { clearTimeout(teamOpenTimer.current); teamOpenTimer.current = null; }
    teamCloseTimer.current = setTimeout(() => setTeamPillRect(null), 200);
  };
  const onTeamPillClick = (e) => {
    e.stopPropagation();
    if (teamOpenTimer.current) { clearTimeout(teamOpenTimer.current); teamOpenTimer.current = null; }
    if (teamCloseTimer.current) { clearTimeout(teamCloseTimer.current); teamCloseTimer.current = null; }
    if (teamPillPinned) {
      setTeamPillPinned(false); setTeamPillRect(null);
    } else {
      const r = teamBadgeRef.current?.getBoundingClientRect();
      if (r) { setTeamPillRect(r); setTeamPillPinned(true); }
    }
  };
  const cancelTeamClose = () => {
    if (teamCloseTimer.current) { clearTimeout(teamCloseTimer.current); teamCloseTimer.current = null; }
  };
  const requestTeamClose = () => {
    if (teamPillPinned) return;
    teamCloseTimer.current = setTimeout(() => setTeamPillRect(null), 200);
  };
  useEffect(() => {
    if (!teamPillPinned) return undefined;
    const onDoc = (e) => {
      if (teamBadgeRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[role="tooltip"][aria-label="Review progress"]')) return;
      setTeamPillPinned(false); setTeamPillRect(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') { setTeamPillPinned(false); setTeamPillRect(null); } };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [teamPillPinned]);

  // Unlink a document from this Created-date record. Removes it from the
  // member's chart list (store) + clears its local review state. When it was
  // the last document, keep the drawer open on the Upload section with the
  // left preview hidden; closing the drawer then shows the Upload button in
  // the Chart Available column (existing empty-chart behaviour).
  const unlinkDoc = (id) => {
    setMoreMenu(null);
    const remaining = docs.filter(d => d.id !== id);
    removeChartDoc(member.id, id);
    setDocActions(a => { const n = { ...a }; delete n[id]; return n; });
    if (remaining.length === 0) {
      setEmptiedViaUnlink(true);
      setShowUpload(true);
    } else if (id === selectedId) {
      setSelectedId(remaining[0].id);
    }
    showToast('Document unlinked from this record');
  };

  // Manually assign a Support staffer from the badge popover.
  const assignSupport = (staff) => {
    setAssignPos(null);
    if (dosDate) {
      hccReassignRole(member.id, dosDate, 'support', staff.id, 'You',
        'Assigned via document review', staff.name);
    }
  };

  // Header status dropdown: assign the acting user, then sync the status.
  const chooseStatus = (statusKey) => {
    setManualStatus(statusKey);
    setActionPos(null);
    ensureSupportAssignee();
    syncSupportStatus(statusKey);
  };

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
  // Only surface the "Completed Document Review Task" banner when the overall
  // status is Completed — not when it's manually set to anything else.
  const showReviewBanner = effectiveStatus === 'completed';

  const resetUpload = () => {
    setShowUpload(false); setUpFile(null); setUpCaption(''); setUpType('');
    setUploadKey(k => k + 1);
  };
  const canSaveUpload = !!(upFile && upCaption.trim() && upType);
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

        {/* Body — two panes normally; right-pane only once the last doc is
            unlinked (left preview closed, Upload section shown). PatientBanner
            + Created meta strip live INSIDE the right pane per Figma
            ICD-Import 4481:112909, so the left PDF gets the full drawer height. */}
        <div className={`${styles.body} ${isEmpty ? styles.bodyEmpty : ''}`}>
          {/* Left — PDF of the selected document */}
          {!isEmpty && selected && (
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
          )}

          {/* Right — metadata + document list */}
          <div className={styles.rightPane}>
            {/* Shared PatientBanner — scoped to the right column (Figma
                ICD-Import 4481:112909). */}
            <PatientBanner
              initials={member?.in || (member?.name || 'P').split(' ').map(w => w[0]).slice(0, 2).join('')}
              name={member?.name || 'Patient'}
              gender={gender}
              age={member?.age || ''}
              memberId={member?.memberId || `#${member?.id || ''}`}
              raf={member?.raf}
              rafChange={member?.ri}
              rafUp={member?.ru !== false}
            />
            {/* Created / Support Team / assignee / status strip. */}
            <div className={styles.metaStrip}>
              <div className={styles.createdGroup}>
                <span className={styles.createdLabel}>Created :</span>
                <span className={styles.createdDate}>{member?.date || '06/15/2026'}</span>
                {overdue && <span className={styles.overdue}>({member.due})</span>}
              </div>
              <span className={styles.vDivider} />
              <span
                ref={teamBadgeRef}
                className={styles.teamBadge}
                onMouseEnter={onTeamPillEnter}
                onMouseLeave={onTeamPillLeave}
                onClick={onTeamPillClick}
                role="button"
                tabIndex={0}
                aria-label={`Support Team — review ${Math.round(teamReviewProgress * 100)}% complete. Hover or click for details.`}
                aria-expanded={!!teamPillRect}
              >
                <ProgressRing progress={teamReviewProgress} size={16} stroke={2} />
                <span>Support Team</span>
              </span>
              {teamPillRect && (
                <ReviewProgressPopover
                  anchorRect={teamPillRect}
                  stages={teamReviewStages}
                  onEnter={cancelTeamClose}
                  onLeave={requestTeamClose}
                  onClose={() => { setTeamPillPinned(false); setTeamPillRect(null); }}
                />
              )}
              <div className={styles.metaStripEnd}>
                {isSupportAssigned ? (
                  <button type="button" ref={dmRef} className={styles.dmBadge} onClick={openAssign} title={supportName}>
                    <span className={styles.dmAvatar}>{supportInitials}</span>
                    <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--secondary-300)" />
                  </button>
                ) : (
                  <button type="button" ref={dmRef} className={styles.dmUnassigned} onClick={openAssign} title="Assign Support Team" aria-label="Assign Support Team">
                    <Icon name="solar:user-plus-linear" size={14} color="var(--neutral-300)" />
                    <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
                  </button>
                )}
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
            {showReviewBanner && (
              <div className={styles.passBanner}>
                <Icon name="solar:info-circle-linear" size={16} color="var(--status-success)" />
                <span>{reviewerName} Completed Document Review Task on {member?.date || '—'}.</span>
              </div>
            )}

            <div className={styles.rightBody}>
              <div className={styles.assocRow}>
                <div className={styles.assocLeft}>
                  <span className={styles.assocLabel}>Document Associated with</span>
                  <button
                    type="button"
                    className={styles.dosBadge}
                    onClick={() => setDosExpanded(o => !o)}
                    aria-expanded={dosExpanded}
                  >
                    {enabledDosCount}/{dosList.length} DOSs
                    <Icon name={dosExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} size={11} color="var(--primary-300)" />
                  </button>
                </div>
                <button type="button" className={styles.uploadLink} onClick={() => setShowUpload(v => !v)}>
                  <Icon name="solar:upload-minimalistic-linear" size={16} color="var(--primary-300)" />
                  Upload
                </button>
              </div>

              {/* Expandable DOS list with a per-DOS toggle (mirrors the
                  Diagnosis Gap drawer). */}
              {dosExpanded && dosList.length > 0 && (
                <div className={styles.dosPanel}>
                  {dosList.map(d => {
                    const enabled = !disabledDos.has(d.date);
                    const provider = d.provider || m?.rp || '—';
                    const pos = d.pos || d.posDesc || m?.pos || m?.posDesc || '—';
                    const vt = d.vt || m?.vt || 'HCC';
                    return (
                      <div key={d.date} className={styles.dosPanelRow}>
                        <div className={styles.dosPanelInfo}>
                          <div className={styles.dosPanelDate}>{d.date}</div>
                          <div className={styles.dosPanelMeta}>
                            Rendering Provider: {provider}
                            <span className={styles.dosPanelSep}>•</span>
                            POS: {pos}
                            <span className={styles.dosPanelSep}>•</span>
                            Visit Type: {vt}
                          </div>
                        </div>
                        <Switch
                          checked={enabled}
                          ariaLabel={`Toggle DOS ${d.date}`}
                          onChange={() => toggleDos(d.date)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {showUpload && (
                <div className={styles.uploadPanel}>
                  <UploadDropField key={uploadKey} onChange={setUpFile} />
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
                const isFailing = failPrompt?.id === d.id;
                return (
                  <Fragment key={d.id}>
                  <div
                    className={`${styles.docCard} ${isSel ? styles.docCardSelected : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(d.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(d.id); } }}
                  >
                    <span className={styles.docThumb} aria-hidden="true">
                      <Icon name="custom:pdf-file" size={20} color="var(--neutral-400)" />
                    </span>
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
                      <button
                        type="button"
                        className={styles.moreBtn}
                        aria-label="More actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (moreMenu?.docId === d.id) { setMoreMenu(null); return; }
                          const r = e.currentTarget.getBoundingClientRect();
                          setMoreMenu({ docId: d.id, top: r.bottom + 4, right: window.innerWidth - r.right });
                        }}
                      >
                        <Icon name="solar:menu-dots-linear" size={15} color="currentColor" />
                      </button>
                    </div>
                  </div>
                  {isFailing && (
                    <FailReasonInline
                      docName={failPrompt.name}
                      onCancel={() => setFailPrompt(null)}
                      onConfirm={confirmFailDoc}
                    />
                  )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {moreMenu && (
        <div
          className={styles.docMoreMenu}
          style={{ top: moreMenu.top, right: moreMenu.right }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={styles.docMoreItem}
            onClick={() => {
              const doc = docs.find(d => d.id === moreMenu.docId);
              setMoreMenu(null);
              if (!doc) return;
              // Reuse the Upload Document drawer as the edit surface. It reads
              // hccUploadEditDoc and prefills caption + docType from the row.
              openHccUploadDrawerForEdit(m, doc);
            }}
          >
            <Icon name="solar:pen-linear" size={16} color="var(--neutral-400)" />
            Edit
          </button>
          <button
            type="button"
            className={styles.docMoreItem}
            onClick={() => unlinkDoc(moreMenu.docId)}
          >
            <Icon name="solar:link-broken-minimalistic-linear" size={16} color="var(--status-error)" />
            Unlink
          </button>
          <button
            type="button"
            className={styles.docMoreItem}
            onClick={() => {
              const doc = docs.find(d => d.id === moreMenu.docId);
              setMoreMenu(null);
              if (doc) setConfirmDeleteDoc({ id: doc.id, name: doc.n });
            }}
          >
            <Icon name="solar:trash-bin-2-linear" size={16} color="var(--status-error)" />
            Delete
          </button>
        </div>
      )}
      {confirmDeleteDoc && (
        <DestructiveDialog
          title="Delete document?"
          description={`"${confirmDeleteDoc.name}" will be removed from this record. This can't be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDeleteDoc(null)}
          onConfirm={() => {
            unlinkDoc(confirmDeleteDoc.id);
            setConfirmDeleteDoc(null);
          }}
        />
      )}

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
              onClick={() => assignSupport(s)}
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
                onClick={() => chooseStatus(opt.key)}
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

// Reasons offered when marking a document Failed. Mirrors the Figma spec
// on ICD-Import 4806:142581 — HCC-oriented rejection buckets used by the
// Support team when a document can't be accepted as evidence.
const FAIL_REASONS = [
  'Wrong Patient',
  'Wrong Date of Service',
  'Illegible / Poor Quality',
  'Incomplete / Missing Pages',
  'Missing Signature',
  'Wrong Document Type',
  'Duplicate Document',
  'Other',
];

// Inline fail-reason form — renders directly below the doc card whose Fail
// button was clicked. Keeps every other doc row and header action live so
// the reviewer can bail out (three-dots, hover on the status pill, etc.)
// without an overlay blocking the surface.
function FailReasonInline({ docName, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  // "Other" requires a note so a downstream reviewer can see the specific
  // reason. Every other reason keeps the note optional.
  const noteRequired = reason === 'Other';
  const canSubmit = !!reason && (!noteRequired || note.trim().length > 0);
  return (
    <div className={styles.failInline} onClick={(e) => e.stopPropagation()}>
      <div className={styles.failHeader}>
        <div className={styles.failTitle}>Mark document Failed</div>
        <div className={styles.failSubtitle}>{docName}</div>
      </div>
      <div className={styles.failBody}>
        <div className={styles.failIntro}>Select a reason for failing this document:</div>
        <div className={styles.failReasons}>
          {FAIL_REASONS.map((r) => (
            <RadioButton
              key={r}
              name="fail-reason"
              value={r}
              label={r}
              checked={reason === r}
              onChange={() => setReason(r)}
            />
          ))}
        </div>
        <div className={styles.failNoteLabel}>
          Note{noteRequired ? <span className={styles.failNoteRequired} aria-hidden="true"> *</span> : ' (optional)'}
        </div>
        <Textarea
          rows={3}
          placeholder={noteRequired ? 'Add a note explaining the reason' : 'Add a note'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className={styles.failActions}>
        <Button variant="danger" size="S" disabled={!canSubmit} onClick={() => onConfirm({ reason, note })}>Mark Failed</Button>
        <Button variant="secondary" size="S" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

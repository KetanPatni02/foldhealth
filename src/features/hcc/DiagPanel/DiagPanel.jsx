import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../../store/useAppStore';
import { Drawer } from '../../../components/Drawer/Drawer';
import { Icon } from '../../../components/Icon/Icon';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Avatar } from '../../../components/Avatar/Avatar';
import { PatientBanner } from '../../../components/PatientBanner/PatientBanner';
import { IcdSearch } from '../../../components/IcdSearch/IcdSearch';
import { Switch } from '../../../components/Switch/Switch';
import { IcdRow } from './IcdRow';
import { IcdDosCard } from './IcdDosCard';
import { HccSuspectGroup } from './HccSuspectGroup';
import { DosStatusMenu } from './DosStatusMenu';
import { LeftWorkspace } from './LeftWorkspace';
import {
  ReviewProgressPopover,
  ProgressRing,
  buildReviewStages,
  computeReviewProgress,
} from './ReviewProgressPopover';
import { SWEEP_ICD_DATA } from '../data/sweepIcds';
import { getIcdsForMember, getNotLinkedForMember } from '../data/icds';
import { RoleTooltip } from '../RoleTooltip';
import { resolveCurrentAssignee } from '../HccWorklistRow';
import { ROLE_LABEL, staffForRole } from '../assignment/astranaStaff';
import { dosKey } from '../assignment/dosState';
import styles from './DiagPanel.module.css';

// Initials-square avatar to the left of the DOS status pill. Reflects the
// SAME sequential resolver the worklist uses — shows whoever currently owns
// the DOS based on workflow stage, not "the coder if there's a coder". For
// records that have advanced past R2/R3 with no next assignee, shows a
// dashed-outline placeholder. For Billing Ready records, shows a green
// check chip. Hovering opens a RoleTooltip with the role label.
/**
 * UnassignedAssignTrigger — interactive dashed avatar slot.
 * Clicking opens a portal popover with candidates pulled from configured
 * Care Teams (members whose teamType matches the role) + Astrana staff in
 * the same role bucket. Selecting a candidate dispatches `hccReassignRole`
 * so the DOS gains an owner without leaving the DiagPanel.
 */
function UnassignedAssignTrigger({ role, memberId, dosDate }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);
  const teams = useAppStore(s => s.hccCareTeams);
  const reassign = useAppStore(s => s.hccReassignRole);
  const showToast = useAppStore(s => s.showToast);

  const candidates = (() => {
    const teamType = ROLE_LABEL[role];
    const fromTeams = (teams || [])
      .filter(t => t.kind === 'hcc' && t.teamType === teamType)
      .flatMap(t => (t.members || []).map(m => ({
        id: m.userId, name: m.name, initials: m.initials,
        roles: m.roles, source: 'team', teamName: t.name,
      })));
    const seen = new Set(fromTeams.map(c => c.id));
    const fromAstrana = staffForRole(role)
      .filter(s => !seen.has(s.id))
      .map(s => ({
        id: s.id, name: s.name, initials: s.initials,
        roles: ROLE_LABEL[s.role], source: 'astrana',
      }));
    return [...fromTeams, ...fromAstrana];
  })();

  useEffect(() => {
    if (!pos) return;
    const onDoc = (e) => {
      if (!btnRef.current?.contains(e.target)
          && !e.target.closest?.('[data-assign-menu]')) setPos(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPos(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 280) });
  };
  const onPick = (cand) => {
    if (!memberId || !dosDate) {
      showToast('Cannot assign — missing DOS context.');
      setPos(null);
      return;
    }
    reassign(memberId, dosDate, role, cand.id, 'current-user', 'Assigned from DiagPanel');
    showToast(`${cand.name} assigned as ${ROLE_LABEL[role]}.`);
    setPos(null);
  };

  return (
    <RoleTooltip
      name="Unassigned"
      role={`Awaiting ${ROLE_LABEL[role] || role} — click to assign`}
      initials="—"
      variant="provider"
    >
      <button
        type="button"
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); pos ? setPos(null) : open(); }}
        style={{
          width: 24, height: 24, borderRadius: 6,
          background: 'var(--neutral-50)',
          border: '0.5px dashed var(--neutral-200)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, cursor: 'pointer', padding: 0,
        }}
      >
        <Icon name="solar:user-plus-rounded-linear" size={14} color="var(--neutral-300)" />
      </button>
      {pos && createPortal(
        <div
          data-assign-menu
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            minWidth: 280, maxHeight: 280, overflowY: 'auto',
            background: 'var(--neutral-0)',
            border: '0.5px solid var(--neutral-150)',
            borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: 4, fontFamily: 'Inter, sans-serif',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--neutral-400)',
            padding: '6px 8px', borderBottom: '0.5px solid var(--neutral-100)',
            marginBottom: 4,
          }}>
            Assign {ROLE_LABEL[role]}
          </div>
          {candidates.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--neutral-300)', textAlign: 'center' }}>
              No candidates available.
            </div>
          ) : candidates.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', border: 'none', background: 'transparent',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                width: '100%', fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar variant="assignee" initials={c.initials} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--neutral-500)' }}>
                {c.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--neutral-300)' }}>
                {c.source === 'team' ? `Team: ${c.teamName}` : c.roles}
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </RoleTooltip>
  );
}

function AssigneeAvatar({ member, dosState, currentDos }) {
  const a = resolveCurrentAssignee(member, dosState);
  if (!a) return null;
  // Unassigned slot is interactive — opens a candidate picker so the user
  // can assign someone from this exact spot. Lives in its own subcomponent
  // because of the portal + outside-click bookkeeping.
  if (a.kind === 'unassigned') {
    return <UnassignedAssignTrigger role={a.role} memberId={member?.id} dosDate={currentDos} />;
  }

  // Billing Ready — every stage completed. Green check chip, no person.
  if (a.kind === 'billing') {
    return (
      <RoleTooltip name="Billing Ready" role="All reviews complete" initials="✓" variant="provider">
        <span
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--status-success-light)',
            border: '0.5px solid rgba(0, 155, 83, 0.3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: 'var(--status-success)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <Icon name="solar:check-circle-bold" size={14} color="var(--status-success)" />
        </span>
      </RoleTooltip>
    );
  }

  // Active assignee — colour the chip per role (Coder/Reviewers = orange
  // provider palette, Support stays purple to match the worklist's coder
  // vs support distinction).
  const isSupport = a.role === 'support';
  const bg = isSupport ? 'var(--primary-50)'  : 'var(--secondary-100)';
  const border = isSupport ? 'var(--primary-200)' : 'var(--secondary-200)';
  const color = isSupport ? 'var(--primary-300)' : 'var(--secondary-300)';
  return (
    <RoleTooltip
      name={a.name}
      role={ROLE_LABEL[a.role] || a.role}
      initials={a.initials}
      variant={isSupport ? 'patient' : 'provider'}
    >
      <span
        style={{
          width: 24, height: 24, borderRadius: 6,
          background: bg, border: `0.5px solid ${border}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 10, fontWeight: 500, color,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {a.initials}
      </span>
    </RoleTooltip>
  );
}

const isAISuggested = (icd) => ['Suspect', 'Recapture'].includes(icd.type || '');

// Keyboard shortcut legend — mirrors the handlers in DiagPanel's keydown
// effect. Rendered as the drawer's dark footer bar (Paper 1WXT).
const SHORTCUTS = [
  ['A', 'Accept'],
  ['X', 'Reject'],
  ['M', 'Missed opportunity'],
  ['D', 'Defer'],
  ['↑↓', 'Move'],
  ['Enter', 'Open Document'],
];
function ShortcutBar() {
  return (
    <div className={styles.shortcutBar}>
      {SHORTCUTS.map(([k, label]) => (
        <span key={k} className={styles.shortcutItem}>
          <kbd className={styles.shortcutKey}>{k}</kbd>
          <span className={styles.shortcutLabel}>{label}</span>
        </span>
      ))}
    </div>
  );
}

export function DiagPanel() {
  const memberId = useAppStore(s => s.diagPanelMemberId);
  const closeDiagPanel = useAppStore(s => s.closeDiagPanel);
  const member = useAppStore(s => s.hccMembers.find(m => m.id === memberId));
  const showToast = useAppStore(s => s.showToast);
  const fetchHccDiagnosisGaps = useAppStore(s => s.fetchHccDiagnosisGaps);
  const diagnosisGaps = useAppStore(s => s.hccDiagnosisGaps);
  const diagDosStatus = useAppStore(s => s.diagDosStatus);
  const setDiagDosStatus = useAppStore(s => s.setDiagDosStatus);
  // Assignment-engine read/write — drives the Coder stage pill below.
  const hccDosAssignments = useAppStore(s => s.hccDosAssignments);
  const initializeHccPatient = useAppStore(s => s.initializeHccPatient);
  const hccCompleteSupport = useAppStore(s => s.hccCompleteSupport);
  const hccCompleteCoder = useAppStore(s => s.hccCompleteCoder);
  const hccCompleteReviewer = useAppStore(s => s.hccCompleteReviewer);
  const hccCompleteReviewer2 = useAppStore(s => s.hccCompleteReviewer2);
  const hccRequestRecords = useAppStore(s => s.hccRequestRecords);
  const hccMarkInsufficient = useAppStore(s => s.hccMarkInsufficient);
  const hccRejectDos = useAppStore(s => s.hccRejectDos);
  const hccReturnDos = useAppStore(s => s.hccReturnDos);
  const hccMarkSupportInProgress = useAppStore(s => s.hccMarkSupportInProgress);
  const hccSetRoleStatus = useAppStore(s => s.hccSetRoleStatus);
  const diagLeftPanel = useAppStore(s => s.diagLeftPanel);
  const diagActivityIcd = useAppStore(s => s.diagActivityIcd);
  const setDiagLeftPanel = useAppStore(s => s.setDiagLeftPanel);
  const setDiagTab = useAppStore(s => s.setDiagTab);
  const setHccGapDosAction = useAppStore(s => s.setHccGapDosAction);
  const hccGapDosActions = useAppStore(s => s.hccGapDosActions);
  const addHccGap = useAppStore(s => s.addHccGap);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [overriddenOpen, setOverriddenOpen] = useState(false);
  const [closedOpen, setClosedOpen] = useState(false);
  // Expandable "ICDs Associated with N/M DOSs" section (Paper 1ZV3): a row
  // per DOS with a toggle. Toggling a DOS off hides its ICD rows.
  const [dosExpanded, setDosExpanded] = useState(false);
  const [disabledDos, setDisabledDos] = useState(() => new Set());
  const [addIcdOpen, setAddIcdOpen] = useState(false);
  const [openDismissKey, setOpenDismissKey] = useState(null);
  const addIcdRef = useRef(null);
  const [focusIdx, setFocusIdx] = useState(0);

  // Fetch diagnosis gaps from Supabase when member changes
  useEffect(() => {
    if (member?.name) fetchHccDiagnosisGaps(member.name);
  }, [member?.name, fetchHccDiagnosisGaps]);

  // Phase 2f — fall back to the local ICD mock when Supabase has no rows for
  // this member. Without the fallback, the panel would render empty for any
  // member that hasn't been seeded into `hcc_diagnosis_gaps` yet.
  const icdsRaw = useMemo(() => {
    const fromSupabase = diagnosisGaps.filter(g => g.isLinked !== false);
    if (fromSupabase.length > 0) return fromSupabase;
    return member?.name ? getIcdsForMember(member.name) : [];
  }, [diagnosisGaps, member?.name]);

  const notLinkedRaw = useMemo(() => {
    const fromSupabase = diagnosisGaps.filter(g => g.isLinked === false);
    if (fromSupabase.length > 0) return fromSupabase;
    return member?.name ? getNotLinkedForMember(member.name) : [];
  }, [diagnosisGaps, member?.name]);

  // Buckets (see docs/features/hcc-coding-workflow.md §4):
  //  - assocICDs → the ICD-first cards ("ICDs Associated with N/M DOSs").
  //  - allNotAssoc → AI suspects grouped per HCC (HccSuspectGroup).
  //  - overridden / closed → collapsed sections at the bottom.
  const assocICDs = useMemo(
    () => icdsRaw.filter(i => !isAISuggested(i) || i.status === 'Accepted'),
    [icdsRaw],
  );
  const allNotAssoc = useMemo(() => [
    ...icdsRaw.filter(i => isAISuggested(i) && i.status !== 'Accepted'),
    ...notLinkedRaw,
  ], [icdsRaw, notLinkedRaw]);
  const overriddenICDs = useMemo(
    () => [...icdsRaw, ...notLinkedRaw].filter(i => i.dismissReason),
    [icdsRaw, notLinkedRaw],
  );
  const closedICDs = useMemo(
    () => [...icdsRaw, ...notLinkedRaw].filter(i => ['Accepted', 'Dismissed'].includes(i.status)),
    [icdsRaw, notLinkedRaw],
  );

  // ── DOS list — from the member's dos_list, with a single-row stub fallback.
  const dosList = useMemo(() => {
    if (member?.dos_list?.length) return member.dos_list;
    if (member?.dos) return [{ date: member.dos, status: diagDosStatus }];
    return [];
  }, [member, diagDosStatus]);

  // Enabled DOS dates = all except the ones toggled off. Cards show only
  // entries whose DOS is enabled.
  const enabledDates = useMemo(
    () => dosList.map(d => d.date).filter(date => !disabledDos.has(date)),
    [dosList, disabledDos],
  );
  const currentDos = dosList[0]?.date || null;

  // Reset the per-DOS toggles when the member changes.
  useEffect(() => { setDisabledDos(new Set()); setDosExpanded(false); }, [memberId]);

  // Lazily seed the assignment engine for this patient — idempotent.
  useEffect(() => {
    if (member?.id) initializeHccPatient(member.id);
  }, [member?.id, initializeHccPatient]);

  // Live engine state for the currently-selected DOS (drives stage pill +
  // assignee avatar + status menu).
  const currentDosEntry = currentDos ? dosList.find(d => d.date === currentDos) : null;
  const dosStateKey = member && currentDos
    ? dosKey(member.id, currentDos, currentDosEntry?.provider, currentDosEntry?.pos)
    : null;
  const dosState = dosStateKey ? hccDosAssignments[dosStateKey] : null;

  const currentBucket = useMemo(
    () => resolveCurrentAssignee(member, dosState),
    [member, dosState],
  );

  const currentStatus = useMemo(() => {
    if (!currentBucket) return diagDosStatus || 'New';
    if (currentBucket.kind === 'billing')    return 'Completed';
    if (currentBucket.kind === 'unassigned') return 'Awaiting';
    return currentBucket.status || 'In Progress';
  }, [currentBucket, diagDosStatus]);

  // ── Review-progress stages + ring (drives the stage pill) ──
  const reviewStages = useMemo(
    () => buildReviewStages(member, dosState),
    [member, dosState],
  );
  const reviewProgress = useMemo(
    () => computeReviewProgress(reviewStages),
    [reviewStages],
  );
  // Pill shows the active stage name (design: "◑ Coder").
  const pillLabel = useMemo(() => {
    const active = reviewStages.find(s => s.state === 'active');
    if (active) return active.label;
    if (reviewStages.every(s => s.state === 'done')) return 'Billing Ready';
    const firstPending = reviewStages.find(s => s.state === 'pending');
    return firstPending ? `Awaiting ${firstPending.label}` : 'Coder';
  }, [reviewStages]);

  // Hover state for the Review Progress popover.
  const pillRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const [pillRect, setPillRect] = useState(null);
  const onPillEnter = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (pillRect) return;
    openTimer.current = setTimeout(() => {
      const r = pillRef.current?.getBoundingClientRect();
      if (r) setPillRect(r);
    }, 200);
  };
  const onPillLeave = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    closeTimer.current = setTimeout(() => setPillRect(null), 200);
  };
  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const requestClose = () => {
    closeTimer.current = setTimeout(() => setPillRect(null), 200);
  };
  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  // Bridge from the DosStatusMenu's onChange to the right lifecycle
  // transition for whichever role currently owns the DOS.
  const handleStatusChange = (next) => {
    // Completing a record with unactioned rows applies the default
    // auto-accept to each remaining row first (RA coder workflow plan §B4).
    if (next === 'Completed') {
      const unactioned = rowKeys.filter(k => !hccGapDosActions[k]);
      if (unactioned.length) {
        unactioned.forEach(k => {
          const [code, dos] = k.split('|');
          setHccGapDosAction(code, dos, 'accepted');
        });
        showToast(`${unactioned.length} unactioned ICD row${unactioned.length === 1 ? '' : 's'} auto-accepted`);
      }
    }
    if (!member || !currentDos) { setDiagDosStatus(next); return; }
    const role = currentBucket?.kind === 'active' ? currentBucket.role : null;
    if (!role) { setDiagDosStatus(next); return; }

    switch (next) {
      case 'Completed':
        if (role === 'support')       hccCompleteSupport(member.id, currentDos);
        else if (role === 'coder')    hccCompleteCoder(member.id, currentDos);
        else if (role === 'reviewer') hccCompleteReviewer(member.id, currentDos);
        else if (role === 'reviewer2')hccCompleteReviewer2(member.id, currentDos);
        else                          hccSetRoleStatus(member.id, currentDos, role, 'Completed');
        break;
      case 'Record Requested':
        if (role === 'coder')        hccRequestRecords(member.id, currentDos);
        else                         hccSetRoleStatus(member.id, currentDos, role, 'Record Requested');
        break;
      case 'Insufficient':
        if (role === 'support')      hccMarkInsufficient(member.id, currentDos, 'current-user', 'Docs incomplete');
        else                         hccSetRoleStatus(member.id, currentDos, role, 'Insufficient');
        break;
      case 'Reject':
        if (role === 'support')      hccRejectDos(member.id, currentDos, 'current-user', 'Docs failed checklist');
        else                         hccSetRoleStatus(member.id, currentDos, role, 'Reject');
        break;
      case 'Returned':
        if (role === 'reviewer' || role === 'reviewer2') {
          hccReturnDos(member.id, currentDos, role, 'current-user', `Returned from ${role}`);
        } else {
          hccSetRoleStatus(member.id, currentDos, role, 'Returned');
        }
        break;
      case 'In Progress':
        if (role === 'support')      hccMarkSupportInProgress(member.id, currentDos, 'current-user');
        else                         hccSetRoleStatus(member.id, currentDos, role, 'In Progress');
        break;
      case 'New':
      case 'Awaiting':
      case 'Record Received':
      default:
        hccSetRoleStatus(member.id, currentDos, role, next);
        break;
    }
    setDiagDosStatus(next);
  };

  // ── Card + suspect data assembly (search + DOS filters applied) ──
  const q = searchQuery.trim().toLowerCase();
  const matchQ = (icd) =>
    !q || icd.code.toLowerCase().includes(q) || (icd.desc || '').toLowerCase().includes(q);

  const sweepByCode = useMemo(() => {
    const m = new Map();
    // Only a member's OWN sweep mapping (design reference patients). No
    // `_default` fallback — otherwise generic dates would shadow the
    // dos_list-derived rows and break worklist grouping coherence.
    const own = member?.name ? SWEEP_ICD_DATA[member.name] : null;
    if (own) own.forEach(s => m.set(s.code, s));
    return m;
  }, [member?.name]);

  // Each ICD card lists a row per DOS the code appears on. Grouping mirrors
  // the worklist: a DOS = one document/encounter (member.dos_list), each
  // yielding several ICDs. When a member has an explicit sweep mapping
  // (Annette, design reference) we use it; otherwise we deterministically
  // spread each ICD across a subset of the record's own DOS dates so the
  // drawer's grouping always stays coherent with the worklist.
  const cardIcds = useMemo(() => {
    const dates = dosList.map(d => d.date).filter(Boolean);
    return assocICDs
      .filter(matchQ)
      .map((icd, idx) => {
        const sweep = sweepByCode.get(icd.code);
        let base;
        if (sweep?.dos_entries?.length) {
          base = sweep.dos_entries.map(e => ({ dos: e.dos, claimed: !!e.claimed }));
        } else if (dates.length) {
          // Chronic conditions (earlier codes) recur across more encounters;
          // later codes appear on fewer. Deterministic — stable per render.
          const count = Math.max(1, dates.length - (idx % dates.length));
          base = dates.slice(0, count).map((d, i) => ({
            dos: d,
            claimed: idx === 0 && i === 0,
            manual: icd.type === 'Manual',
          }));
        } else {
          base = [{ dos: member?.dos || '—', claimed: false, manual: icd.type === 'Manual' }];
        }
        const entries = base.filter(e => !disabledDos.has(e.dos));
        return { ...icd, entries };
      })
      .filter(c => c.entries.length > 0);
  }, [assocICDs, sweepByCode, dosList, disabledDos, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const suspectGroups = useMemo(() => {
    const m = new Map();
    for (const icd of allNotAssoc.filter(matchQ)) {
      const key = icd.hcc || 'HCC Not Linked';
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(icd);
    }
    return [...m.entries()].map(([hcc, icds]) => ({ hcc, icds }));
  }, [allNotAssoc, q]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard model — a focus ring walks the flat list of DOS rows;
  // A/X/M/D act on the focused row, Enter opens the Documents workspace.
  // Suppressed while typing in any input.
  const rowKeys = useMemo(
    () => cardIcds.flatMap(c => c.entries.map(e => `${c.code}|${e.dos}`)),
    [cardIcds],
  );
  const focusKey = rowKeys[Math.min(focusIdx, rowKeys.length - 1)] || null;

  useEffect(() => {
    if (focusIdx > 0 && focusIdx >= rowKeys.length) {
      setFocusIdx(Math.max(0, rowKeys.length - 1));
    }
  }, [rowKeys.length, focusIdx]);

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!rowKeys.length) return;
      const key = e.key;
      if (key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx(i => Math.min(i + 1, rowKeys.length - 1));
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx(i => Math.max(i - 1, 0));
      } else if (key === 'Enter') {
        e.preventDefault();
        setDiagLeftPanel('documents');
      } else if (/^[axmd]$/i.test(key)) {
        const focused = rowKeys[Math.min(focusIdx, rowKeys.length - 1)];
        if (!focused) return;
        e.preventDefault();
        const [code, dos] = focused.split('|');
        const k = key.toLowerCase();
        if (k === 'x') {
          // Reject opens the dismiss-reason form for the focused row
          // (Figma: X → reason picker, not a silent dismiss).
          setOpenDismissKey(focused);
        } else {
          setHccGapDosAction(code, dos, { a: 'accepted', m: 'missed', d: 'deferred' }[k]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rowKeys, focusIdx, setHccGapDosAction, setDiagLeftPanel]);

  // Focused row follows the mouse too, so keyboard and pointer agree.
  const focusRowByKey = (key) => {
    const idx = rowKeys.indexOf(key);
    if (idx >= 0) setFocusIdx(idx);
  };

  // ── Bulk selection (row checkboxes → bulk Accept / Reject bar) ──
  const toggleSelected = (key) => setSelectedKeys(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const bulkApply = (action) => {
    selectedKeys.forEach(k => {
      const [code, dos] = k.split('|');
      // Skip toggling rows already in the target state.
      if (hccGapDosActions[k] !== action) setHccGapDosAction(code, dos, action);
    });
    showToast(`${selectedKeys.size} row${selectedKeys.size === 1 ? '' : 's'} ${action === 'accepted' ? 'accepted' : 'rejected'}`);
    setSelectedKeys(new Set());
  };

  // Outside-click close for the +ICD popover.
  useEffect(() => {
    if (!addIcdOpen) return undefined;
    const onDoc = (e) => {
      if (!addIcdRef.current?.contains(e.target)) setAddIcdOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [addIcdOpen]);

  if (!member) return null;

  const rafImpact = (Number(member.ri) || 0).toFixed(3);
  const noop = (label) => () => showToast(`${label} — coming soon`);

  return (
    <Drawer
      title={<span className={styles.drawerTitle}>Diagnosis Gaps Details</span>}
      onClose={closeDiagPanel}
      className={[styles.panel, diagLeftPanel ? styles.panelExpanded : ''].join(' ')}
      bodyClassName={[styles.body, diagLeftPanel ? styles.bodyExpanded : ''].join(' ')}
      headerStyle={{ display: 'none' }}
      footer={<ShortcutBar />}
    >
      {/* ── Row 1: Title + Close — spans the FULL drawer width. ── */}
      <div className={styles.titleRow}>
        <span className={styles.titleText}>Diagnosis Gaps Details</span>
        <ActionButton size="L" tooltip="Close" onClick={closeDiagPanel}>
          <CloseIcon size={20} color="var(--neutral-300)" />
        </ActionButton>
      </div>

      <div className={styles.contentRow}>
      {/* Workspace (document preview etc.) sits on the LEFT of the ICD
          listing (Paper 1UD1 / 5IX) — rendered first so it's the left pane. */}
      {diagLeftPanel && (
        <LeftWorkspace
          active={diagLeftPanel}
          icdScope={diagActivityIcd}
          onChange={setDiagTab}
          onClose={() => setDiagLeftPanel(null)}
          member={member}
          currentDos={currentDos}
        />
      )}
      <div className={diagLeftPanel ? styles.rightPane : styles.rightPaneFull}>
      {/* ── Row 2: Patient Banner (shared component) ── */}
      <PatientBanner
        initials={member.in}
        name={member.name}
        gender={member.g === 'M' ? 'Male' : member.g === 'F' ? 'Female' : member.g}
        age={member.age || ''}
        memberId={member.memberId || `#${member.id}`}
        raf={member.raf}
        rafChange={rafImpact}
        rafUp={member.ru !== false}
        onCall={noop('Call')}
      />

      {/* ── Meta row: Created date + overdue + stage pill | assignee + status ── */}
      <div className={styles.dosRow}>
        <div className={styles.dosRowLeft}>
          <span className={styles.createdLabel}>Created :</span>
          <span className={styles.createdDate}>{member.date || '—'}</span>
          {member.due && (
            <span className={styles.dueTag} style={{ color: member.dueCol || 'var(--status-error)' }}>
              ({member.due})
            </span>
          )}
          <span className={styles.dosRowDivider} />
          {/* Stage pill — hover opens the Review Progress popover; the ring
              is a real progress indicator driven by the engine state. */}
          <span
            ref={pillRef}
            className={styles.withCoderPill}
            onMouseEnter={onPillEnter}
            onMouseLeave={onPillLeave}
            tabIndex={0}
            aria-label={`${pillLabel} — review ${Math.round(reviewProgress * 100)}% complete. Hover for details.`}
          >
            <ProgressRing progress={reviewProgress} size={16} stroke={2} />
            <span>{pillLabel}</span>
          </span>
          {pillRect && (
            <ReviewProgressPopover
              anchorRect={pillRect}
              stages={reviewStages}
              onEnter={cancelClose}
              onLeave={requestClose}
              onClose={() => setPillRect(null)}
            />
          )}
        </div>
        <div className={styles.dosRowRight}>
          <AssigneeAvatar member={member} dosState={dosState} currentDos={currentDos} />
          <span className={styles.dosRowDivider} />
          <DosStatusMenu
            value={currentStatus}
            onChange={handleStatusChange}
          />
        </div>
      </div>

      {/* ── Toolbar: bulk | inline search | + ICD, filter, docs, comments,
          history, more (Paper 1WXT). ── */}
      <div className={styles.toolbar}>
        <ActionButton
          icon="solar:check-square-linear"
          size="S"
          tooltip="Bulk Action"
          onClick={noop('Bulk Action')}
        />
        <span className={styles.divider} />
        <div className={styles.toolbarSearch}>
          <Icon name="solar:magnifer-linear" size={14} color="var(--neutral-300)" />
          <input
            type="text"
            placeholder="Search by code or description"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <Icon name="solar:close-linear" size={13} color="var(--neutral-300)" />
            </button>
          )}
        </div>

        <div className={styles.toolbarIcons}>
          <span className={styles.addIcdWrap} ref={addIcdRef}>
            <button type="button" className={styles.addIcdBtn} onClick={() => setAddIcdOpen(o => !o)}>
              <Icon name="solar:add-circle-linear" size={16} color="var(--primary-300)" />
              <span>ICD</span>
            </button>
            {addIcdOpen && (
              <span className={styles.addIcdPop}>
                <IcdSearch
                  autoFocus
                  placeholder="Search ICD to add"
                  excludeCodes={[...icdsRaw, ...notLinkedRaw].map(i => i.code)}
                  onSelect={(icd) => {
                    addHccGap({ code: icd.code, desc: icd.title, hcc: icd.hcc || '' });
                    setAddIcdOpen(false);
                    showToast(`Added ${icd.code} — Manually Added`);
                  }}
                />
              </span>
            )}
          </span>
          <span className={styles.divider} />
          <ActionButton
            icon="custom:filter"
            size="S"
            tooltip="Filter"
            notification
            count="1"
            onClick={noop('Filter')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:file-text-linear"
            size="S"
            tooltip="Documents"
            count={String(member?.docStatus?.length || member?.ch || 0)}
            className={diagLeftPanel === 'documents' && !diagActivityIcd ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'documents' && !diagActivityIcd ? null : 'documents')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:chat-square-linear"
            size="S"
            tooltip="Comments"
            count="6"
            className={diagLeftPanel === 'comments' && !diagActivityIcd ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'comments' && !diagActivityIcd ? null : 'comments')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:history-linear"
            size="S"
            tooltip="Activity Log"
            className={diagLeftPanel === 'activity' && !diagActivityIcd ? styles.activeIcon : ''}
            onClick={() => setDiagLeftPanel(diagLeftPanel === 'activity' && !diagActivityIcd ? null : 'activity')}
          />
          <span className={styles.divider} />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="S"
            tooltip="More"
            onClick={noop('More')}
          />
        </div>
      </div>

      {/* ── Body: ICD-first cards + HCC suspect groups + collapsed history ── */}
      <div className={styles.cardsList}>
        {/* Section header — the DOS badge expands an inline per-DOS panel
            with toggles (Paper 1ZV3). Toggling a DOS off hides its rows. */}
        <div className={styles.assocHeader}>
          <span className={styles.assocTitle}>ICDs Associated with</span>
          <button
            type="button"
            className={styles.dosBadge}
            onClick={() => setDosExpanded(o => !o)}
            aria-expanded={dosExpanded}
          >
            {enabledDates.length}/{dosList.length} DOSs
            <Icon name={dosExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} size={12} color="var(--primary-300)" />
          </button>
        </div>

        {dosExpanded && dosList.length > 0 && (
          <div className={styles.dosPanel}>
            {dosList.map(d => {
              const enabled = !disabledDos.has(d.date);
              const provider = d.provider || member.rp || '—';
              const pos = d.pos || d.posDesc || member.pos || member.posDesc || '—';
              const vt = d.vt || member.vt || 'HCC';
              return (
                <div key={d.date} className={styles.dosPanelRow}>
                  <div className={styles.dosPanelInfo}>
                    <div className={styles.dosPanelDate}>{d.date}</div>
                    <div className={styles.dosPanelMeta}>
                      Rendering Provider: {provider} <span className={styles.dosPanelSep}>•</span> POS: {pos} <span className={styles.dosPanelSep}>•</span> Visit Type: {vt}
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    ariaLabel={`Toggle DOS ${d.date}`}
                    onChange={() => setDisabledDos(prev => {
                      const next = new Set(prev);
                      if (next.has(d.date)) next.delete(d.date); else next.add(d.date);
                      return next;
                    })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {selectedKeys.size > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>{selectedKeys.size} selected</span>
            <button type="button" className={styles.bulkAction} onClick={() => bulkApply('accepted')}>
              <Icon name="solar:check-read-linear" size={14} />
              Accept
            </button>
            <button type="button" className={styles.bulkAction} onClick={() => bulkApply('rejected')}>
              <Icon name="solar:close-linear" size={14} />
              Reject
            </button>
            <button type="button" className={styles.bulkClear} onClick={() => setSelectedKeys(new Set())}>
              Clear
            </button>
          </div>
        )}

        <div className={styles.cardsFlow}>
          {cardIcds.length === 0 && suspectGroups.length === 0 && (
            <div className={styles.empty}>
              <Icon name="solar:file-text-linear" size={32} color="var(--neutral-200)" />
              <p>No diagnosis gaps {q ? 'match your search' : 'recorded yet for this member'}.</p>
            </div>
          )}
          {cardIcds.map((icd, i) => (
            <IcdDosCard
              key={`card-${icd.code}-${i}`}
              icd={icd}
              focusKey={focusKey}
              onFocusRow={focusRowByKey}
              selectedKeys={selectedKeys}
              onToggleSelect={toggleSelected}
              openDismissKey={openDismissKey}
              onOpenDismiss={setOpenDismissKey}
            />
          ))}

          {suspectGroups.length > 0 && (
            <div className={styles.assocHeader}>
              <span className={styles.assocTitle}>Suspects and Recaptures</span>
            </div>
          )}
          {suspectGroups.map((g, i) => (
            <HccSuspectGroup
              key={`${g.hcc}-${i}`}
              hcc={g.hcc}
              icds={g.icds}
              dosList={dosList}
              member={member}
              defaultOpen={i === 0}
            />
          ))}
        </div>

        {/* Collapsed history sections (pre-redesign behavior preserved). */}
        <div className={styles.icdSections}>
          <IcdSection
            title="Overridden ICDs"
            count={overriddenICDs.length}
            open={overriddenOpen}
            onToggle={() => setOverriddenOpen(o => !o)}
          >
            {overriddenICDs.length === 0
              ? <SectionEmpty label="No overridden ICDs" />
              : overriddenICDs.map((icd, i) => <IcdRow key={`o-${icd.code}-${i}`} icd={icd} />)
            }
          </IcdSection>
          <IcdSection
            title="Closed ICDs"
            count={closedICDs.length}
            open={closedOpen}
            onToggle={() => setClosedOpen(o => !o)}
          >
            {closedICDs.length === 0
              ? <SectionEmpty label="No closed ICDs" />
              : closedICDs.map((icd, i) => <IcdRow key={`c-${icd.code}-${i}`} icd={icd} />)
            }
          </IcdSection>
        </div>
      </div>
      </div>{/* ── /rightPane ── */}
      </div>{/* ── /contentRow ── */}
    </Drawer>
  );
}

// Section wrapper — collapsible header + content area
function IcdSection({ title, count, open, onToggle, badge, children }) {
  return (
    <section className={styles.icdSection}>
      <button type="button" className={styles.icdSectionHeader} onClick={onToggle}>
        <span className={styles.icdSectionTitle}>
          {title} ({count})
        </span>
        {badge}
        <Icon
          name={open ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
          size={12}
          color="var(--neutral-300)"
        />
      </button>
      {open && (
        <div className={styles.icdSectionBody}>
          {children}
        </div>
      )}
    </section>
  );
}

function SectionEmpty({ label }) {
  return <div className={styles.icdSectionEmpty}>{label}</div>;
}

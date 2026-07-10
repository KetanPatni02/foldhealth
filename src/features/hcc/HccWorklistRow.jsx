import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Checkbox } from '../../components/ui/checkbox';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Icon } from '../../components/Icon/Icon';
import {
  RafTooltip,
  VisitsPopover,
  ChartPopover,
  ActionsMenuPopover,
  OpenIcdsHoverPopover,
} from './RowPopovers';
import { ChartDetailDrawer } from './ChartDetailDrawer';
import { getIcdsForMember, getNotLinkedForMember } from './data/icds';
import { getStatusSpec } from './statusSpec';
import { StatusIcon } from './StatusIcon';
import { staffById, staffForRole, ROLE_LABEL, ROLES } from './assignment/astranaStaff';
import { createPortal } from 'react-dom';
import { dosKey } from './assignment/dosState';
import styles from './HccWorklistRow.module.css';

const RISK_VARIANT = { High: 'lace-high', Medium: 'lace-medium', Low: 'lace-low' };

function LastVisitCell({ dos, visits, fromClaim, onClickDate, onClickVisits }) {
  if (!dos) return <span className={styles.muted}>—</span>;
  // Two click targets in one cell:
  //   - The DATE opens the Claim Preview drawer (only when fromClaim).
  //   - The "X of Y Visits" sub-text always opens the all-DOSs popover for
  //     the patient — that behaviour is independent of the date's source.
  return (
    <span className={styles.lastVisitStack}>
      {fromClaim ? (
        <button
          type="button"
          className={styles.lastVisitDateBtn}
          onClick={onClickDate}
        >
          <span className={styles.lastVisitDate}>{dos}</span>
        </button>
      ) : (
        <span className={styles.lastVisitDateMuted}>{dos}</span>
      )}
      {visits && (
        <button
          type="button"
          className={styles.lastVisitVisitsBtn}
          onClick={onClickVisits}
        >
          <span className={styles.lastVisitMeta}>{visits}</span>
        </button>
      )}
    </span>
  );
}

function CreateDateCell({ date, due, dueCol }) {
  return (
    <div className={styles.stackCell}>
      <span className={styles.dateText}>{date}</span>
      {due && (
        <span className={styles.dueLine} style={{ color: dueCol }}>
          <Icon name="solar:clock-circle-linear" size={12} color={dueCol} />
          <span>{due}</span>
        </span>
      )}
    </div>
  );
}

function HccEvidenceCell({ count, docStatus, onClick, onUpload }) {
  // No chart on file yet → ghost "Upload" link button (Fold Button variant
  // ghost = transparent bg + neutral-300 text). Click opens the upload
  // drawer for this member.
  if (count == null) {
    return (
      <Button
        variant="ghost"
        size="S"
        leadingIcon="solar:upload-linear"
        onClick={(e) => { e.stopPropagation(); onUpload?.(); }}
      >
        Upload
      </Button>
    );
  }
  // Status line (Figma 4680:138476): when every chart shares a status,
  // show a single dot + "All Passed / Pending / Failed"; when mixed, show
  // per-status dots with counts (●2 ●1).
  const list = docStatus || [];
  const pass = list.filter(s => s === 'passed').length;
  const fail = list.filter(s => s === 'failed').length;
  const pend = list.filter(s => s === 'pending').length;
  const uniform = [pass, fail, pend].filter(n => n > 0).length <= 1;
  const uniformLabel = pass ? 'All Passed' : fail ? 'All Failed' : pend ? 'All Pending' : 'No Charts';
  const uniformColor = pass ? 'var(--status-success)' : fail ? 'var(--status-error)' : 'var(--neutral-300)';
  return (
    <button type="button" className={styles.evidenceTrigger} onClick={onClick}>
      <div className={styles.evidenceBadge}>
        <Icon name="solar:document-text-linear" size={12} color="var(--primary-300)" />
        <span>{count}</span>
        <Icon name="solar:alt-arrow-down-linear" size={10} color="var(--primary-300)" />
      </div>
      <div className={styles.evidenceStatus}>
        {uniform ? (
          <>
            <span className={styles.evidenceDot} style={{ background: uniformColor }} />
            <span>{uniformLabel}</span>
          </>
        ) : (
          <span className={styles.evidenceDots}>
            {pass > 0 && <span className={styles.evidenceDotCount}><span className={styles.evidenceDot} style={{ background: 'var(--status-success)' }} />{pass}</span>}
            {fail > 0 && <span className={styles.evidenceDotCount}><span className={styles.evidenceDot} style={{ background: 'var(--status-error)' }} />{fail}</span>}
            {pend > 0 && <span className={styles.evidenceDotCount}><span className={styles.evidenceDot} style={{ background: 'var(--neutral-300)' }} />{pend}</span>}
          </span>
        )}
      </div>
    </button>
  );
}

// Progress stepper (Figma 4680:138476) — one dot per workflow stage
// (Support → Coder → QA → Compliance), coloured by that stage's status:
// completed = green, active/in-progress = amber, pending = grey. Dots are
// joined by short connector lines.
const PROGRESS_TERMINAL = new Set(['Completed', 'Billing Ready']);
const PROGRESS_ACTIVE = new Set(['In Progress', 'New', 'Records Requested', 'Record Received', 'Rebuttal', 'Insufficient', 'Returned']);
function progressTone(status) {
  if (!status || status === 'Assign') return 'pending';
  if (PROGRESS_TERMINAL.has(status)) return 'done';
  if (PROGRESS_ACTIVE.has(status)) return 'active';
  return 'pending';
}
function ProgressStepper({ member }) {
  const stages = [member.supS, member.cdrS, member.r1s, member.r2s];
  return (
    <span className={styles.progress}>
      {stages.map((st, i) => {
        const tone = progressTone(st);
        return (
          <span key={i} className={styles.progressSeg}>
            {i > 0 && <span className={styles.progressLine} />}
            <span className={[styles.progressDot, styles[`progressDot_${tone}`]].join(' ')} />
          </span>
        );
      })}
    </span>
  );
}

/**
 * Render role-status cell (Support / Coder / Rev 1-3).
 *
 * Two states:
 *   - Unassigned ("Assign" / null status) → user-add icon + "Assign" muted label.
 *   - Assigned → `name` on top, `[status icon] [role-offset date]` below.
 *
 * The icon's COLOR encodes the status (success / warning / secondary / error
 * etc. per STATUS_SPEC). The visible bottom-line text is the *date* the role
 * is expected to complete, computed by offsetting member.date by a fixed
 * number of days per role (Support=+0, Coder=+7, Reviewer=+14, Reviewer 2=+21).
 * The status itself isn't spelled out — the row legend at the bottom of the
 * worklist explains the icon meanings.
 */
function RoleStatusCell({ name, status, date, role, memberId, dosDate }) {
  if (!name || !status || status === 'Assign') {
    return <RoleAssignTrigger role={role} memberId={memberId} dosDate={dosDate} />;
  }
  const spec = getStatusSpec(status);
  return (
    <div className={styles.stackCell}>
      <span className={styles.roleName}>{name}</span>
      <span className={styles.roleStatusLine}>
        <StatusIcon status={status} size={12} color={spec.color} />
        {date && <span className={styles.roleDate}>{date}</span>}
      </span>
    </div>
  );
}

/**
 * Clickable "Assign" cell. Opens a portal popover listing candidate users
 * for the role (configured Care Team members + Astrana staff for the
 * matching role). Selecting one dispatches hccReassignRole.
 */
function RoleAssignTrigger({ role, memberId, dosDate }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null);
  const teams = useAppStore(s => s.hccCareTeams);
  const reassign = useAppStore(s => s.hccReassignRole);
  const showToast = useAppStore(s => s.showToast);

  // role here is the engine key ('support' | 'coder' | 'reviewer' | 'reviewer2').
  // Pool = members of HCC teams whose teamType matches this role + Astrana
  // staff in the same role bucket. Deduped by id; configured teams win.
  const candidates = (() => {
    const teamType = ROLE_LABEL[role];
    const fromTeams = (teams || [])
      .filter(t => t.kind === 'hcc' && t.teamType === teamType)
      .flatMap(t => (t.members || []).map(m => ({
        id: m.userId,
        name: m.name,
        initials: m.initials,
        roles: m.roles,
        source: 'team',
        teamName: t.name,
      })));
    const seen = new Set(fromTeams.map(c => c.id));
    const fromAstrana = staffForRole(role)
      .filter(s => !seen.has(s.id))
      .map(s => ({
        id: s.id,
        name: s.name,
        initials: s.initials,
        roles: ROLE_LABEL[s.role],
        source: 'astrana',
      }));
    return [...fromTeams, ...fromAstrana];
  })();

  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, left: r.left });
  };
  const close = () => setPos(null);

  // Close on outside click / escape.
  useEffect(() => {
    if (!pos) return;
    const onDoc = (e) => {
      if (!btnRef.current?.contains(e.target) && !e.target.closest?.(`.${styles.roleAssignMenu}`)) {
        close();
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pos]);

  const onPick = (cand) => {
    if (!memberId || !dosDate) {
      showToast('Cannot assign — missing patient or DOS context.');
      close();
      return;
    }
    reassign(memberId, dosDate, role, cand.id, 'current-user', `Assigned via worklist`);
    showToast(`${cand.name} assigned as ${ROLE_LABEL[role]}.`);
    close();
  };

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={styles.roleUnassigned}
        onClick={(e) => { e.stopPropagation(); pos ? close() : open(); }}
      >
        <Icon name="solar:user-plus-rounded-linear" size={14} color="var(--neutral-200)" />
        <span>Assign</span>
      </button>
      {pos && createPortal(
        <div
          className={styles.roleAssignMenu}
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.roleAssignTitle}>Assign {ROLE_LABEL[role]}</div>
          {candidates.length === 0 ? (
            <div className={styles.roleAssignEmpty}>No candidates available.</div>
          ) : candidates.map(c => (
            <button
              key={c.id}
              type="button"
              className={styles.roleAssignItem}
              onClick={() => onPick(c)}
            >
              <Avatar variant="assignee" initials={c.initials} />
              <span className={styles.roleAssignName}>{c.name}</span>
              <span className={styles.roleAssignRole}>
                {c.source === 'team' ? `Team: ${c.teamName}` : c.roles}
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

// Derive role-offset date "MM/DD/YYYY" from a base date "MM/DD/YYYY".
// Matches the prototype's addDaysToDate helper (line 3490).
function addDaysToDate(dateStr, days) {
  if (!dateStr) return '';
  const [mm, dd, yyyy] = dateStr.split('/').map((s) => parseInt(s, 10));
  if (!mm || !dd || !yyyy) return '';
  const d = new Date(yyyy, mm - 1, dd);
  d.setDate(d.getDate() + (days || 0));
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
const ROLE_OFFSET = { sup: 0, cdr: 7, r1: 14, r2: 21 };

function OpenIcdsCell({ count, member, onOpenWithCode }) {
  const cellRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const [rect, setRect] = useState(null);
  const [hovered, setHovered] = useState(false);

  const recordRect = () => {
    const r = cellRef.current?.getBoundingClientRect();
    if (r) setRect(r);
  };

  const onEnter = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (hovered) return;
    openTimer.current = setTimeout(() => { recordRect(); setHovered(true); }, 200);
  };
  const onLeave = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    closeTimer.current = setTimeout(() => setHovered(false), 200);
  };
  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const requestClose = () => { closeTimer.current = setTimeout(() => setHovered(false), 200); };

  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  if (count == null) return <span className={styles.muted}>—</span>;

  return (
    <>
      <div
        ref={cellRef}
        className={styles.openIcdsTrigger}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <Badge variant="status-queued" label={String(count)} />
      </div>
      {hovered && rect && (
        <OpenIcdsHoverPopover
          anchorRect={rect}
          member={member}
          icds={getIcdsForMember(member?.name)}
          notLinked={getNotLinkedForMember(member?.name)}
          onIcdClick={onOpenWithCode}
          onEnter={cancelClose}
          onLeave={requestClose}
        />
      )}
    </>
  );
}

function RafImpactCell({ value, ru }) {
  if (value == null) return <span className={styles.muted}>—</span>;
  const positive = ru !== false; // default to positive/up unless explicitly false
  const color = positive ? 'var(--status-success)' : 'var(--status-error)';
  const bg    = positive ? 'var(--status-success-light)' : 'var(--status-error-light)';
  const border = positive ? 'rgba(0,155,83,0.2)' : 'rgba(215,40,37,0.2)';
  const arrow = positive ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear';
  return (
    <span className={styles.rafImpactBadge} style={{ color, background: bg, borderColor: border }}>
      <span>{value}</span>
      <Icon name={arrow} size={12} color={color} />
    </span>
  );
}

// Skip rendering a `<td>` entirely if the parent column-config has hidden it.
function Cell({ colKey, hidden, children, ...rest }) {
  if (hidden) return null;
  return (
    <td data-col={colKey} {...rest}>
      {children}
    </td>
  );
}

// Statuses that count as "this role is done with the DOS" — they hand the
// work off downstream. The DOS must complete the current stage before it
// can be picked up by the next role; we never skip backward to a prior
// completed assignee even if the next stage hasn't been assigned yet.
const TERMINAL_STATUSES = new Set(['Completed', 'Reject', 'Rejected', 'Billing Ready']);

// Sequential workflow order. The first role whose status is NOT terminal
// is where the DOS currently sits (HCC reality: Support → Coder → Reviewer →
// Reviewer 2 → Billing). If a stage has no status / 'Assign' placeholder
// that means it's waiting for someone to pick it up — that's the
// current bucket but with no assignee yet.
const STAGES_LOW_TO_HIGH = ['support', 'coder', 'reviewer', 'reviewer2'];

/**
 * Resolves who currently holds a DOS based on real HCC workflow rules.
 * Returns one of three shapes:
 *
 *   { kind: 'active',     name, initials, role }   // a real person owns it
 *   { kind: 'unassigned', role }                   // current bucket, no pick yet
 *   { kind: 'billing' }                            // every stage completed
 *
 * Walks LOW→HIGH and stops at the first non-terminal stage. Engine state
 * wins; legacy `member.sup/cdr/r1/r2/r3` + status fields are the fallback.
 */
export function resolveCurrentAssignee(member, dosState) {
  // ── Engine path ────────────────────────────────────────────────────
  if (dosState) {
    for (const role of STAGES_LOW_TO_HIGH) {
      const rs = dosState[role];
      const status = rs?.status;
      const hasReachedStage = !!(status || rs?.assignee);
      // If this stage hasn't started AND a prior stage was active, the
      // DOS is sitting at the previous stage — the outer loop already
      // returned. So reaching here means we're at the next bucket
      // that's awaiting handoff.
      if (!hasReachedStage || !status || status === 'Assign') {
        // Bucket waiting for assignment. If there's an assignee but no
        // status, treat as active (just-assigned, no work logged yet).
        if (rs?.assignee && status && status !== 'Assign') {
          return makeActive(rs.assignee, role, status);
        }
        return { kind: 'unassigned', role };
      }
      // Stage has a non-terminal status → DOS lives here right now.
      if (!TERMINAL_STATUSES.has(status)) {
        return makeActive(rs?.assignee, role, status);
      }
      // Otherwise terminal → continue down the chain.
    }
    // All four stages terminal → Billing Ready.
    return { kind: 'billing' };
  }

  // ── Legacy fallback (no engine state yet) ──────────────────────────
  // Reads from the unrenamed legacy member fields (member.r1/.r1s etc.)
  // but reports the engine's role vocabulary so ROLE_LABEL lookups agree
  // with the engine path above.
  const legacy = [
    { role: 'support',   name: member.sup, status: member.supS },
    { role: 'coder',     name: member.cdr, status: member.cdrS },
    { role: 'reviewer',  name: member.r1,  status: member.r1s },
    { role: 'reviewer2', name: member.r2,  status: member.r2s },
  ];
  for (const r of legacy) {
    if (!r.name && (!r.status || r.status === 'Assign')) {
      return { kind: 'unassigned', role: r.role };
    }
    if (!r.status || r.status === 'Assign') {
      return makeActiveLegacy(r.name, r.role, r.status);
    }
    if (!TERMINAL_STATUSES.has(r.status)) {
      return makeActiveLegacy(r.name, r.role, r.status);
    }
  }
  return { kind: 'billing' };
}

function makeActive(staffId, role, status) {
  const staff = staffById(staffId);
  return {
    kind: 'active',
    name: staff?.name || staffId || null,
    initials: staff?.initials || (staffId || '').slice(0, 2),
    role,
    status,
  };
}
function makeActiveLegacy(name, role, status) {
  return {
    kind: 'active',
    name: name || null,
    initials: nameToInitials(name || ''),
    role,
    status,
  };
}

function nameToInitials(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Renders the current assignee cell with three visual variants:
 *   - 'active'     → orange provider avatar + name + role (current behaviour)
 *   - 'unassigned' → empty grey avatar slot + "Unassigned" + role hint
 *   - 'billing'    → green check chip + "Billing Ready"
 */
function AssigneeCell({ member, dosState }) {
  const a = resolveCurrentAssignee(member, dosState);

  if (!a || (a.kind === 'active' && !a.name)) {
    return <span className={styles.muted}>—</span>;
  }

  if (a.kind === 'billing') {
    return (
      <div className={styles.assigneeCell}>
        <span className={styles.billingBadge}>
          <Icon name="solar:check-circle-bold" size={16} color="var(--status-success)" />
        </span>
        <div className={styles.assigneeText}>
          <span className={styles.assigneeName}>Billing Ready</span>
          <span className={styles.assigneeRole}>All reviews complete</span>
        </div>
      </div>
    );
  }

  if (a.kind === 'unassigned') {
    return (
      <div className={styles.assigneeCell}>
        <span className={styles.unassignedSlot} aria-hidden="true">
          <Icon name="solar:user-rounded-linear" size={18} color="var(--neutral-200)" />
        </span>
        <div className={styles.assigneeText}>
          <span className={styles.assigneeNameMuted}>Unassigned</span>
          <span className={styles.assigneeRole}>Awaiting {ROLE_LABEL[a.role] || a.role}</span>
        </div>
      </div>
    );
  }

  // active
  return (
    <div className={styles.assigneeCell}>
      <Avatar variant="provider" initials={a.initials} />
      <div className={styles.assigneeText}>
        <span className={styles.assigneeName}>{a.name}</span>
        <span className={styles.assigneeRole}>{ROLE_LABEL[a.role] || a.role}</span>
      </div>
    </div>
  );
}

// DOS-level columns (Figma 4680:138476) — their value varies per visit
// within a record's dos_list. In the collapsed row only the primary
// (entry 0) shows; expanding reveals every entry stacked inside a
// bordered box spanning these columns. Every other column is a flat,
// record-level fact rendered once (top-aligned).
const DOS_LEVEL_COLS = new Set(['dos', 'open', 'vt', 'rp', 'pos']);

// Small circular source badge next to the DOS date (D=Document,
// C=Claim, M=Manual). Deterministic per date so the demo is stable.
const DOS_SOURCES = ['D', 'C', 'M'];
function dosSourceLetter(date) {
  let h = 0;
  const s = String(date || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return DOS_SOURCES[Math.abs(h) % DOS_SOURCES.length];
}
function DosSourceBadge({ date }) {
  return <span className={styles.dosSrcBadge} aria-hidden="true">{dosSourceLetter(date)}</span>;
}

// Inner content (NOT the <td>) for each DOS-level column, given one
// dos_list entry. The main row wraps these in a stacked `<td>`.
const DOS_INNER = {
  dos: (entry, { openClaimPreview, member }) => (
    <span className={styles.dosItem}>
      <button type="button" className={styles.lastVisitDateBtn} onClick={() => openClaimPreview?.(member, entry.date)}>
        <span className={styles.lastVisitDate}>{entry.date}</span>
      </button>
      <DosSourceBadge date={entry.date} />
    </span>
  ),
  open: (entry, { openDiagPanel, member }) => (
    <OpenIcdsCell
      count={entry.open ?? member.open}
      member={member}
      onOpenWithCode={(code) => openDiagPanel(member.id, { highlightCode: code, initialDos: entry.date })}
    />
  ),
  vt: (entry, { member }) => (
    <span className={styles.vtText}>{entry.vt || member.visitType || member.vt || 'HCC'}</span>
  ),
  rp: (entry, { member }) => (
    <span className={styles.providerText}>{entry.provider || member.rp}</span>
  ),
  pos: (entry) => (
    entry.pos
      ? <span className={styles.posText}>{entry.pos}{entry.posDesc ? ` - ${entry.posDesc}` : ''}</span>
      : <span className={styles.muted}>—</span>
  ),
};

// Per-column cell renderers for the RECORD-LEVEL columns (everything not
// in DOS_LEVEL_COLS). Each receives the record `member` and returns a
// populated `<td>`, rendered once per row (top-aligned).
const CELL_RENDERERS = {
  date: ({ member }) => (
    <td key="date" data-col="date" className={styles.colDate}>
      <CreateDateCell date={member.date} due={member.due} dueCol={member.dueCol} />
    </td>
  ),
  evidence: ({ member, openChart, openUpload }) => (
    <td key="evidence" data-col="evidence" className={styles.colEvidence} onClick={(e) => e.stopPropagation()}>
      <HccEvidenceCell
        count={member.ch}
        docStatus={member.docStatus || []}
        onClick={openChart}
        onUpload={openUpload}
      />
    </td>
  ),
  assignee: ({ member, dosStateFor }) => (
    <td key="assignee" data-col="assignee" className={styles.colAssignee}>
      <AssigneeCell member={member} dosState={dosStateFor(member)} />
    </td>
  ),
  // Role columns — bottom-line date = member.date + per-role offset.
  sup: ({ member }) => (
    <td key="sup" data-col="sup" className={styles.colRole}>
      <RoleStatusCell name={member.sup} status={member.supS} date={addDaysToDate(member.date, ROLE_OFFSET.sup)}
        role="support" memberId={member.id} dosDate={member.date} />
    </td>
  ),
  cdr: ({ member }) => (
    <td key="cdr" data-col="cdr" className={styles.colRole}>
      <RoleStatusCell name={member.cdr} status={member.cdrS} date={addDaysToDate(member.date, ROLE_OFFSET.cdr)}
        role="coder" memberId={member.id} dosDate={member.date} />
    </td>
  ),
  r1: ({ member }) => (
    <td key="r1" data-col="r1" className={styles.colRole}>
      <RoleStatusCell name={member.r1} status={member.r1s} date={addDaysToDate(member.date, ROLE_OFFSET.r1)}
        role="reviewer" memberId={member.id} dosDate={member.date} />
    </td>
  ),
  r2: ({ member }) => (
    <td key="r2" data-col="r2" className={styles.colRole}>
      <RoleStatusCell name={member.r2} status={member.r2s} date={addDaysToDate(member.date, ROLE_OFFSET.r2)}
        role="reviewer2" memberId={member.id} dosDate={member.date} />
    </td>
  ),
  r3: ({ member }) => (
    <td key="r3" data-col="r3" className={styles.colRole}>
      <RoleStatusCell name={member.r3} status={member.r3s} date={addDaysToDate(member.date, ROLE_OFFSET.r3)}
        role="r3" memberId={member.id} dosDate={member.date} />
    </td>
  ),
  posDesc: ({ member }) => (
    <td key="posDesc" data-col="posDesc" className={styles.colPosDesc}>
      <span className={styles.codeText}>{member.posDesc}</span>
    </td>
  ),
  raf: ({ member }) => (
    <td key="raf" data-col="raf" className={styles.colRaf}>
      <RafTooltip memberName={member.name}>
        <span className={styles.numText}>{member.raf}</span>
      </RafTooltip>
    </td>
  ),
  ri: ({ member }) => (
    <td key="ri" data-col="ri" className={styles.colRi}>
      <RafTooltip memberName={member.name}>
        <RafImpactCell value={member.ri} ru={member.ru} />
      </RafTooltip>
    </td>
  ),
  ipa: ({ member }) => (
    <td key="ipa" data-col="ipa" className={styles.colIpa}>
      <span className={styles.codeText}>{member.ipa}</span>
    </td>
  ),
  hp: ({ member }) => (
    <td key="hp" data-col="hp" className={styles.colHp}>
      <span className={styles.codeText}>{member.hp}</span>
    </td>
  ),
  progress: ({ member }) => (
    <td key="progress" data-col="progress" className={styles.colProgress}>
      <ProgressStepper member={member} />
    </td>
  ),
  pcp: ({ member }) => (
    <td key="pcp" data-col="pcp" className={styles.colPcp}>
      <div className={styles.pcpCell}>
        <span className={styles.providerText}>{member.pcp}</span>
        <span className={styles.pcpMore}>+2 More</span>
      </div>
    </td>
  ),
  dec: ({ member }) => (
    <td key="dec" data-col="dec" className={styles.colDec}>
      <span className={styles.numText}>{member.dec}</span>
    </td>
  ),
  coh: ({ member }) => (
    <td key="coh" data-col="coh" className={styles.colCoh}>
      <span className={styles.codeText}>{member.coh}</span>
    </td>
  ),
  rl: ({ member }) => (
    <td key="rl" data-col="rl" className={styles.colRl}>
      {member.rl
        ? <span className={styles.codeText}>{member.rl}</span>
        : <span className={styles.muted}>—</span>}
    </td>
  ),
  ad: ({ member }) => (
    <td key="ad" data-col="ad" className={styles.colAd}>
      <span className={styles.numText}>{member.ad}</span>
    </td>
  ),
  fr: ({ member }) => (
    <td key="fr" data-col="fr" className={styles.colFr}>
      <span className={styles.numText}>{member.fr}</span>
    </td>
  ),
};

/**
 * One worklist row per record (Figma 4680:138476). Renders as a single
 * `<tr>`:
 *   - Member identity + all record-level columns (Created Date,
 *     Documents, Support Team, Coder, RAF, …) render once, top-aligned.
 *   - The DOS-level columns (DOS · Open ICDs · Visit Type · Provider ·
 *     POS) render a vertical STACK: collapsed shows only the primary
 *     visit + a "View More N ⌄" link under the DOS; expanding reveals
 *     every visit in the record's dos_list, enclosed in a bordered box
 *     with a "View Less ⌃" link at the bottom.
 * The same patient can appear in multiple records — the member identity
 * simply repeats, matching the design.
 */
export function HccWorklistRow({ member, hiddenCols, columns }) {
  const selectedHccIds = useAppStore(s => s.selectedHccIds);
  const selectHccMember = useAppStore(s => s.selectHccMember);
  const openDiagPanel = useAppStore(s => s.openDiagPanel);
  const diagPanelMemberId = useAppStore(s => s.diagPanelMemberId);
  const openQuickView = useAppStore(s => s.openQuickView);
  const showToast = useAppStore(s => s.showToast);
  const openHccUploadDrawer = useAppStore(s => s.openHccUploadDrawer);
  const openAddDos = useAppStore(s => s.openHccAddDos);
  const openClaimPreview = useAppStore(s => s.openHccClaimPreview);
  const hccDosAssignments = useAppStore(s => s.hccDosAssignments);
  const dosStateFor = (m) => (m?.id && m?.dos ? hccDosAssignments[dosKey(m.id, m.dos, m.rp, m.pos)] : null);

  const checked = selectedHccIds.includes(member.id);
  const isOpenInDrawer = diagPanelMemberId === member.id;
  const isHidden = (k) => hiddenCols?.has(k);

  const dosEntries = Array.isArray(member.dos_list) && member.dos_list.length > 0
    ? member.dos_list
    : [{ date: member.dos, label: member.due, labelColor: member.dueCol, vt: member.vt, provider: member.rp, pos: member.pos, posDesc: member.posDesc, open: member.open }];
  const extraCount = dosEntries.length - 1;
  const [expanded, setExpanded] = useState(false);
  const visibleEntries = expanded ? dosEntries : dosEntries.slice(0, 1);

  const [chartRect, setChartRect] = useState(null);
  const [chartDetail, setChartDetail] = useState(null);
  const [actionsRect, setActionsRect] = useState(null);
  const openChart = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setChartRect(prev => prev ? null : rect);
  };
  const openActions = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActionsRect(prev => prev ? null : rect);
  };

  const innerCtx = { member, openClaimPreview, openDiagPanel };

  return (
    <>
    <tr
      className={[
        styles.row,
        checked ? styles.rowChecked : '',
        isOpenInDrawer ? styles.rowActive : '',
        expanded ? styles.rowExpanded : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Sticky left: checkbox */}
      <td className={`${styles.checkTd} ${styles.stickyLeft} ${styles.stickyCheck}`} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={checked}
          onCheckedChange={() => selectHccMember(member.id)}
          aria-label={`Select ${member.name}`}
        />
      </td>

      {/* Sticky left: member identity — renders once, top-aligned. */}
      <td className={`${styles.memberTd} ${styles.stickyLeft} ${styles.stickyMember} ${styles.colMember}`}>
        <div className={styles.patientCell}>
          <Avatar variant="patient" initials={member.in} />
          <div>
            <div className={styles.patientName}>
              <button
                className={styles.patientNameLink}
                onClick={e => { e.stopPropagation(); openQuickView({ id: member.id, name: member.name, initials: member.in, gender: member.g, age: member.age, memberId: member.memberId, language: member.language, raf: member.raf }); }}
              >{member.name}</button>{' '}
              <span className={styles.patientDemo}>({member.g}&bull;{member.age})</span>
            </div>
            <div className={styles.patientMeta}>
              {member.memberId} &bull;{' '}
              <button type="button" className={styles.langBadge} onClick={(e) => e.stopPropagation()}>
                {(member.language || 'en').toUpperCase()}
                <span className={styles.langTooltip}>Preferred Language: English</span>
              </button>
            </div>
          </div>
        </div>
      </td>

      {/* Body cells — order driven by `columns`. DOS-level columns stack;
          the rest render once (top-aligned). */}
      {(columns || []).map((col) => {
        if (isHidden(col.k)) return null;

        if (DOS_LEVEL_COLS.has(col.k)) {
          const inner = DOS_INNER[col.k];
          const isDos = col.k === 'dos';
          // The DOS group (DOS · Open ICDs · Visit Type · Provider · POS)
          // is bracketed by full-height vertical divider lines — the left
          // one is the Member column's right border; the right one is the
          // POS column's right border (styles.dosTdLast). Within a mini-
          // sweep the visits stack with horizontal dividers. No rounded
          // box — matches Figma 4672:131830.
          return (
            <td
              key={col.k}
              data-col={col.k}
              className={[
                styles.dosTd,
                col.k === 'pos' ? styles.dosTdLast : '',
              ].filter(Boolean).join(' ')}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.dosStack}>
                {visibleEntries.map((entry, i) => (
                  <div key={`${col.k}-${i}`} className={styles.dosStackItem}>
                    {inner(entry, innerCtx)}
                  </div>
                ))}
                {/* Footer row rendered in EVERY DOS-level column (empty in
                    all but DOS) so the box stays the same height across
                    columns and its bottom border/divider stays aligned. */}
                {extraCount > 0 && (
                  <div className={styles.dosFooter}>
                    {isDos && (
                      <button
                        type="button"
                        className={styles.viewMoreBtn}
                        onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                      >
                        {expanded ? 'View Less' : `View More ${extraCount}`}
                        <Icon name={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} size={12} color="var(--neutral-300)" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </td>
          );
        }

        const render = CELL_RENDERERS[col.k];
        if (!render) return null;
        return render({ member, dosStateFor, openChart, openDiagPanel, openUpload: (m) => openHccUploadDrawer(m) });
      })}

      {/* Sticky right: actions */}
      <td className={`${styles.actionsCell} ${styles.stickyRight} ${styles.colActions}`}>
        <div className={styles.actionsRow}>
          <ActionButton
            icon="solar:eye-linear"
            size="L"
            tooltip="View Diagnosis Gaps"
            onClick={(e) => { e.stopPropagation(); openDiagPanel(member.id); }}
          />
          <span className={styles.actionsDivider} />
          <ActionButton
            icon="solar:document-add-linear"
            size="L"
            tooltip="Add DOS"
            onClick={(e) => { e.stopPropagation(); openAddDos(member); }}
          />
          <span className={styles.actionsDivider} />
          <ActionButton
            icon="solar:menu-dots-linear"
            size="L"
            tooltip="More actions"
            onClick={openActions}
          />
        </div>
      </td>
    </tr>

    {chartRect && (
      <ChartPopover
        anchorRect={chartRect}
        member={member}
        onClose={() => setChartRect(null)}
        onUpload={() => openHccUploadDrawer(member)}
        onSelectChart={(chart) => setChartDetail(chart)}
      />
    )}
    {chartDetail && (
      <ChartDetailDrawer
        chart={chartDetail}
        member={member}
        onClose={() => setChartDetail(null)}
      />
    )}
    {actionsRect && (
      <ActionsMenuPopover
        anchorRect={actionsRect}
        onClose={() => setActionsRect(null)}
        onAction={(label) => showToast(`${label} — coming soon`)}
      />
    )}
    </>
  );
}

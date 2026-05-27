import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { COMMENTS, DOCUMENTS, NOTES, CLAIMS, OUTREACH } from '../data/ancillary';
import { ACTIVITY } from '../data/activity';
import { getIcdsForMember } from '../data/icds';
import styles from './LeftWorkspace.module.css';

// Two tab sets depending on scope:
//   • ICD-level (opened from an ICD code) — Figma 1:45936:
//       Activity Log, Notes, Comments, Documents, Claims, History
//   • DOS-level (opened from the toolbar Activity Log icon) — Figma 1:48023:
//       Activity Log, Notes, Comments, Documents, Claims, Outreach, Worklog
const ICD_TABS = [
  { key: 'activity',  label: 'Activity Log',  countFor: () => null },
  { key: 'notes',     label: 'Notes',         countFor: () => NOTES.length },
  { key: 'comments',  label: 'Comments',      countFor: () => COMMENTS.length },
  { key: 'documents', label: 'Documents',     countFor: () => DOCUMENTS.length },
  { key: 'claims',    label: 'Claims',        countFor: () => CLAIMS.length },
  { key: 'history',   label: 'History',       countFor: () => null },
];
const DOS_TABS = [
  { key: 'activity',  label: 'Activity Log',  countFor: () => null },
  { key: 'notes',     label: 'Notes',         countFor: () => NOTES.length },
  { key: 'comments',  label: 'Comments',      countFor: () => COMMENTS.length },
  { key: 'documents', label: 'Documents',     countFor: () => DOCUMENTS.length },
  { key: 'claims',    label: 'Claims',        countFor: () => CLAIMS.length },
  { key: 'outreach',  label: 'Outreach',      countFor: () => null },
  { key: 'worklog',   label: 'Worklog',       countFor: () => null },
];

// Tabs that carry the filter row (Activity / Notes / Comments / Documents).
const FILTERED_TABS = new Set(['activity', 'notes', 'comments', 'documents']);

/**
 * LeftWorkspace — appears when the DiagPanel expands. Hosts a tab nav across
 * the top and a content area below. The tab set + filter set depend on scope:
 *   • DOS-level (icdScope == null): 7 tabs incl. Outreach + Worklog; filter
 *     row carries DOS / HCC / ICD / Recorded By / Date.
 *   • ICD-level (icdScope set):     6 tabs incl. History; filter row carries
 *     Recorded By / Date only.
 *
 * Props:
 *  - active    (string)        Currently selected tab key.
 *  - icdScope  (string|null)   ICD code when scoped to one ICD; null = DOS-level.
 *  - onChange  (fn(string))    Switch tabs (scope preserved by the parent).
 *  - onClose   (fn)            Collapse the left workspace.
 *  - member    (member shape)  Data lookup for the tab-content components.
 */
export function LeftWorkspace({ active, icdScope = null, onChange, onClose, member }) {
  const isDosLevel = !icdScope;
  const tabs = isDosLevel ? DOS_TABS : ICD_TABS;
  // Worklog uses a DOS-only filter; the other filtered tabs use the full set.
  const showFilterRow = FILTERED_TABS.has(active) || (isDosLevel && active === 'worklog');

  return (
    <div className={styles.wrap}>
      <div className={styles.tabBar}>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onClose}
          aria-label="Collapse workspace"
          title="Collapse"
        >
          <Icon name="solar:alt-arrow-right-linear" size={12} color="var(--neutral-300)" />
        </button>
        <span className={styles.tabBarDivider} />
        <div className={styles.tabRow}>
          {tabs.map((t) => {
            const isActive = active === t.key;
            const count = t.countFor?.();
            return (
              <button
                key={t.key}
                type="button"
                className={[styles.tab, isActive ? styles.tabActive : ''].join(' ')}
                onClick={() => onChange(t.key)}
              >
                <span>{count != null ? `${t.label}(${count})` : t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.body}>
        {/* Filter row. DOS-level → DOS/HCC/ICD/Recorded By/Date + Clear All.
            ICD-level → Recorded By/Date. Worklog → DOS only. */}
        {showFilterRow && (
          <FilterRow
            variant={active === 'worklog' ? 'worklog' : (isDosLevel ? 'dos' : 'icd')}
          />
        )}

        {active === 'activity'  && <ActivityTab  member={member} />}
        {active === 'comments'  && <CommentsTab  member={member} />}
        {active === 'documents' && <DocumentsTab member={member} />}
        {active === 'notes'     && <NotesTab     member={member} />}
        {active === 'claims'    && <ClaimsTab    member={member} />}
        {active === 'outreach'  && <OutreachTab  member={member} />}
        {active === 'worklog'   && <WorklogTab   member={member} />}
        {active === 'history'   && <ComingSoonTab label="History"  />}
      </div>
    </div>
  );
}

// Filter row — chip set depends on scope (Figma 1:45950 / 1:48023):
//   • 'icd'     → Recorded By, Date
//   • 'dos'     → DOS, HCC Code, ICD Code, Recorded By, Date  (+ Clear All)
//   • 'worklog' → DOS only
const FILTER_CHIPS = {
  icd:     ['Recorded By', 'Date'],
  dos:     ['DOS', 'HCC Code', 'ICD Code', 'Recorded By', 'Date'],
  worklog: ['DOS'],
};

function FilterRow({ variant = 'icd' }) {
  const chips = FILTER_CHIPS[variant] || FILTER_CHIPS.icd;
  const showClear = variant === 'dos';
  return (
    <div className={styles.filterRow}>
      <Icon name="solar:filter-linear" size={20} color="var(--neutral-300)" />
      <div className={styles.filterChips}>
        {chips.map((label) => <FilterChip key={label} label={label} />)}
      </div>
      {showClear && (
        <button type="button" className={styles.filterClearAll}>
          Clear All
        </button>
      )}
    </div>
  );
}

function FilterChip({ label }) {
  return (
    <button type="button" className={styles.filterChip}>
      <span>{label}</span>
      <Icon name="solar:alt-arrow-down-linear" size={16} color="var(--neutral-300)" />
    </button>
  );
}

// ── Activity Log tab — timeline view with connected vertical line ───────
//
// Matches the prototype's TLItem (lines 887–1019). Each non-group entry has
// a left rail with [top connector] + [icon bubble] + [bottom connector],
// keeping the whole timeline visually linked. Group rows ("JAN 2026") break
// the rail and render as a section header.

const ACT_ICON = {
  outreach:    { icon: 'solar:phone-linear',                 color: 'var(--secondary-300)',     bg: 'var(--secondary-100)',      border: 'rgba(244,122,62,0.2)',    dashed: false },
  status_dos:  { icon: 'solar:eye-scan-linear',              color: 'var(--status-warning)',     bg: 'var(--status-warning-light)', border: 'rgba(217,165,11,0.2)',    dashed: false },
  status_hcc:  { icon: 'solar:eye-scan-linear',              color: 'var(--status-warning)',     bg: 'var(--status-warning-light)', border: 'rgba(217,165,11,0.2)',    dashed: false },
  accept:      { icon: 'solar:check-read-linear',            color: 'var(--status-success)',     bg: 'var(--status-success-light)', border: 'rgba(0,155,83,0.2)',      dashed: false },
  dismiss:     { icon: 'solar:close-circle-linear',          color: 'var(--status-error)',       bg: 'var(--status-error-light)',   border: 'rgba(215,40,37,0.2)',     dashed: false },
  delete:      { icon: 'solar:trash-bin-trash-linear',       color: 'var(--status-error)',       bg: 'var(--status-error-light)',   border: 'rgba(215,40,37,0.2)',     dashed: false },
  upload:      { icon: 'solar:upload-minimalistic-linear',   color: 'var(--primary-300)',        bg: 'var(--primary-50)',           border: 'var(--primary-200)',      dashed: false },
  create:      { icon: 'solar:add-circle-linear',            color: 'var(--secondary-300)',      bg: 'var(--secondary-100)',        border: 'rgba(244,122,62,0.2)',    dashed: false },
  override:    { icon: 'solar:refresh-square-linear',        color: 'var(--secondary-300)',      bg: 'var(--secondary-100)',        border: 'rgba(244,122,62,0.2)',    dashed: false },
  comment:     { icon: 'solar:chat-round-linear',            color: 'var(--neutral-300)',        bg: 'var(--neutral-0)',            border: 'var(--neutral-150)',      dashed: false },
  assign_coder:{ icon: 'solar:user-plus-rounded-linear',     color: 'var(--neutral-300)',        bg: 'var(--neutral-0)',            border: 'var(--neutral-150)',      dashed: false },
};

const TRANS_BADGE = {
  Accepted:  'pillAccepted',
  Dismissed: 'pillDismissed',
  Deleted:   'pillDeleted',
  None:      'pillNone',
  Open:      'pillOpen',
  Returned:  'pillReturned',
  New:       'pillNew',
  Completed: 'pillCompleted',
  Audited:   'pillAudited',
  'In Progress': 'pillInProgress',
};

function ActivityTab({ member }) {
  const rawEntries = ACTIVITY[member?.name] || ACTIVITY._default || [];
  // ICD-level scope — when the Activity Log was opened by clicking an ICD
  // code, only show entries that touch that code. null = DOS-level (all).
  const activityIcd = useAppStore(s => s.diagActivityIcd);
  const clearIcd = useAppStore(s => s.clearDiagActivityIcd);

  // Filter to the selected ICD (keep group headers; drop items that don't
  // reference the code), then strip group headers left with no items.
  const entries = (() => {
    if (!activityIcd) return rawEntries;
    const kept = rawEntries.filter(e =>
      e.t === 'group' || (Array.isArray(e.icds) && e.icds.includes(activityIcd))
    );
    // Remove a group header immediately followed by another group or by EOL.
    return kept.filter((e, i) => {
      if (e.t !== 'group') return true;
      const next = kept[i + 1];
      return next && next.t !== 'group';
    });
  })();

  const hasItems = entries.some(e => e.t !== 'group');

  // Pre-compute first/last per visual group — needed so the timeline rail
  // can omit the top connector on the first item below a group header and
  // the bottom connector on the last item before the next group / EOL.
  const items = entries.map((item, i) => {
    if (item.t === 'group') return { kind: 'group', item, key: `g${i}` };
    const prev = entries[i - 1];
    const next = entries[i + 1];
    const isFirst = !prev || prev.t === 'group';
    const isLast = !next || next.t === 'group';
    return { kind: 'item', item, key: `i${i}`, isFirst, isLast };
  });

  return (
    <div className={styles.scroll}>
      {/* ICD scope header — shows which ICD is filtered + a clear-to-DOS link. */}
      {activityIcd && (
        <div className={styles.activityScopeBar}>
          <span className={styles.activityScopeChip}>
            <Icon name="solar:document-text-linear" size={12} color="var(--primary-300)" />
            Activity · {activityIcd}
          </span>
          <button type="button" className={styles.activityScopeClear} onClick={clearIcd}>
            <Icon name="solar:close-circle-linear" size={13} color="var(--neutral-300)" />
            <span>Show all DOS activity</span>
          </button>
        </div>
      )}

      {!hasItems ? (
        <Empty label={activityIcd ? `No activity recorded for ${activityIcd}.` : 'No activity recorded yet.'} />
      ) : (
        <div className={styles.timeline}>
          {items.map((it) => it.kind === 'group' ? (
            <div key={it.key} className={styles.activityGroup}>
              <span>{it.item.label}</span>
              <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-400)" />
            </div>
          ) : (
            <ActivityEntry key={it.key} item={it.item} isFirst={it.isFirst} isLast={it.isLast} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityEntry({ item, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACT_ICON[item.t] || ACT_ICON.accept;
  const meta = [
    item.date,
    item.time,
    item.by + (item.role ? ` (${item.role})` : ''),
    item.dos ? `DOS (${item.dos})` : null,
  ].filter(Boolean).join(' • ');

  return (
    <div className={styles.tlRow}>
      <div className={styles.tlRail}>
        {!isFirst && <span className={styles.tlConnectorTop} />}
        <span
          className={[styles.tlIcon, cfg.dashed ? styles.tlIconDashed : ''].join(' ')}
          style={{ background: cfg.bg, borderColor: cfg.border }}
        >
          <Icon name={cfg.icon} size={14} color={cfg.color} />
        </span>
        {!isLast && <span className={styles.tlConnectorBottom} />}
      </div>

      <div className={[styles.tlBody, isFirst ? styles.tlBodyFirst : '', isLast ? styles.tlBodyLast : ''].join(' ')}>
        <div className={styles.tlMeta}>{meta}</div>
        <div className={styles.tlHeadlineRow}>
          <span className={styles.tlHeadline}>{item.headline}</span>
          {item.details && item.t !== 'accept' && (
            <button
              type="button"
              className={styles.tlDetailsToggle}
              onClick={() => setExpanded(v => !v)}
            >
              <span className={styles.tlDot}>•</span>
              <span>Details</span>
              <Icon
                name={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                size={10}
                color="var(--neutral-300)"
              />
            </button>
          )}
        </div>

        {/* Accept entries get an "Undo All" affordance (Figma 278:169610)
            instead of a Details expander — matches the inline review flow. */}
        {item.t === 'accept' && (
          <button type="button" className={styles.tlUndoAll}>
            <Icon name="solar:undo-left-round-linear" size={12} color="var(--primary-300)" />
            <span>Undo All</span>
          </button>
        )}

        {/* Status transition (from → to) pills */}
        {(item.t === 'status_dos' || item.t === 'status_hcc') && item.from && item.to && (
          <div className={styles.tlTransition}>
            <span className={[styles.tlPill, styles[TRANS_BADGE[item.from] || 'pillOpen']].join(' ')}>
              {item.from}
            </span>
            <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
            <span className={[styles.tlPill, styles[TRANS_BADGE[item.to] || 'pillNew']].join(' ')}>
              {item.to}
            </span>
          </div>
        )}

        {/* Outreach tag */}
        {item.tag && (
          <div className={styles.tlTag}>{item.tag}</div>
        )}

        {/* Document attachment card */}
        {item.file && (
          <div className={styles.tlAttachment}>
            <span className={styles.tlFileBubble}>
              <Icon name="solar:file-text-linear" size={14} color="var(--neutral-300)" />
            </span>
            <div className={styles.tlFileText}>
              <div className={styles.tlFileName}>{item.file}</div>
              {item.fileType && <div className={styles.tlFileType}>{item.fileType}</div>}
            </div>
            <button type="button" className={styles.tlFilePreview} aria-label="Preview">
              <Icon name="solar:eye-linear" size={14} color="var(--neutral-300)" />
            </button>
          </div>
        )}

        {/* Coder/assignee avatar transition */}
        {item.fromAvatar && item.toAvatar && (
          <div className={styles.tlAvatarTransition}>
            <AvatarPill {...item.fromAvatar} />
            <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
            <AvatarPill {...item.toAvatar} />
          </div>
        )}

        {/* Expanded details — per-ICD card */}
        {expanded && item.details && (
          <div className={styles.tlDetailsCard}>
            {item.details.map((d, i) => (
              <div key={i} className={styles.tlDetailRow}>
                <div className={styles.tlDetailText}>
                  <div className={styles.tlDetailHcc}>{d.hcc}</div>
                  <div className={styles.tlDetailIcd}>{d.icd}</div>
                  {d.reason && <div className={styles.tlDetailReason}>Reason: {d.reason}</div>}
                  {d.note && <div className={styles.tlDetailNote}>Note: {d.note}</div>}
                </div>
                {d.from && d.to && (
                  <div className={styles.tlDetailBadges}>
                    <span className={[styles.tlPill, styles[TRANS_BADGE[d.from] || 'pillNone']].join(' ')}>
                      {d.from}
                    </span>
                    <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
                    <span className={[styles.tlPill, styles[TRANS_BADGE[d.to] || 'pillAccepted']].join(' ')}>
                      {d.to}
                    </span>
                  </div>
                )}
                {!d.from && !d.to && (
                  <span className={[styles.tlPill, styles.pillDeleted].join(' ')}>Deleted</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarPill({ initials, name }) {
  return (
    <span className={styles.avatarPill}>
      <span className={styles.avatarBubble}>{initials}</span>
      <span className={styles.avatarName}>{name}</span>
    </span>
  );
}

// ── Comments tab ─────────────────────────────────────────────────────────
function CommentsTab() {
  const [items, setItems] = useState(COMMENTS);
  const [draft, setDraft] = useState('');

  const addComment = () => {
    const body = draft.trim();
    if (!body) return;
    setItems(prev => [
      { id: `c${Date.now()}`, author: 'You', role: 'Coder', time: 'just now', body },
      ...prev,
    ]);
    setDraft('');
  };

  return (
    <div className={styles.scroll}>
      <div className={styles.composer}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment for the care team…"
          className={styles.composerInput}
          rows={3}
        />
        <div className={styles.composerActions}>
          <Button variant="primary" size="S" disabled={!draft.trim()} onClick={addComment}>
            Post Comment
          </Button>
        </div>
      </div>
      <ul className={styles.commentList}>
        {items.map((c) => (
          <li key={c.id} className={styles.comment}>
            <div className={styles.commentHeader}>
              <span className={styles.commentAuthor}>{c.author}</span>
              <span className={styles.commentRole}>{c.role}</span>
              <span className={styles.commentTime}>· {c.time}</span>
            </div>
            <div className={styles.commentBody}>{c.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Documents tab ────────────────────────────────────────────────────────
function DocumentsTab() {
  return (
    <div className={styles.scroll}>
      <ul className={styles.docList}>
        {DOCUMENTS.map((d) => (
          <li key={d.id} className={styles.docRow}>
            <span className={[styles.docStatusDot, styles[`dotStatus_${d.status}`]].join(' ')} />
            <div className={styles.docText}>
              <div className={styles.docName}>{d.name}</div>
              <div className={styles.docMeta}>
                {d.type} · {d.size} · uploaded by {d.uploadedBy} on {d.uploadedAt}
              </div>
            </div>
            <ActionButton icon="solar:eye-linear" size="S" tooltip="Preview" onClick={() => {}} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Notes tab ────────────────────────────────────────────────────────────
function NotesTab() {
  return (
    <div className={styles.scroll}>
      <ul className={styles.noteList}>
        {NOTES.map((n) => (
          <li key={n.id} className={styles.note}>
            <div className={styles.noteHeader}>
              <span className={styles.noteAvatar}>{n.initials}</span>
              <span className={styles.noteAuthor}>{n.author}</span>
              <span className={styles.noteTime}>· {n.time}</span>
            </div>
            <p className={styles.noteBody}>{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Claims tab ───────────────────────────────────────────────────────────
function ClaimsTab() {
  return (
    <div className={styles.scroll}>
      <ul className={styles.claimsList}>
        {CLAIMS.map((c) => (
          <li key={c.id} className={styles.claim}>
            <div className={styles.claimHeader}>
              <span className={styles.claimNumber}>{c.number || c.id}</span>
              <span className={[styles.claimStatus, styles[`claim_${(c.status || '').toLowerCase()}`]].join(' ')}>
                {c.status}
              </span>
            </div>
            <div className={styles.claimMeta}>
              DOS: {c.dos} · Submitted: {c.submittedAt}
              {c.provider ? ` · ${c.provider}` : ''}
            </div>
            {c.amount != null && (
              <div className={styles.claimAmount}>{c.amount}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Outreach tab (DOS-level) ─────────────────────────────────────────────
// Outreach attempts logged against the ICDs of the selected DOS (Figma 1:48023).
function OutreachTab() {
  const OUTREACH_ICON = {
    'Phone Call': { icon: 'solar:phone-linear',          color: 'var(--secondary-300)', bg: 'var(--secondary-100)' },
    SMS:          { icon: 'solar:chat-round-line-linear', color: 'var(--primary-300)',   bg: 'var(--primary-50)' },
    Email:        { icon: 'solar:letter-linear',          color: 'var(--status-info)',   bg: 'var(--status-info-light)' },
  };
  return (
    <div className={styles.scroll}>
      <ul className={styles.outreachList}>
        {OUTREACH.map((o) => {
          const cfg = OUTREACH_ICON[o.type] || OUTREACH_ICON['Phone Call'];
          return (
            <li key={o.id} className={styles.outreachRow}>
              <span className={styles.outreachIcon} style={{ background: cfg.bg }}>
                <Icon name={cfg.icon} size={14} color={cfg.color} />
              </span>
              <div className={styles.outreachText}>
                <div className={styles.outreachHeader}>
                  <span className={styles.outreachType}>{o.type}</span>
                  <span className={styles.outreachTime}>· {o.time}</span>
                </div>
                <div className={styles.outreachOutcome}>{o.outcome}</div>
                <div className={styles.outreachBy}>by {o.by}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Worklog tab (DOS-level) ──────────────────────────────────────────────
// Table of every ICD on the selected DOS × work done by each Coder / Reviewer
// 1–3 (Support intentionally excluded — Figma 42:368051). Cells show a ✓ + the
// person + date once a role has acted, or "—" while still pending.
const WORKLOG_ROLES = ['Coder', 'Reviewer 1', 'Reviewer 2', 'Reviewer 3'];

// Parse the trailing "(Role)" off an ICD's `by` field → role index, or -1.
function roleIndexFromBy(by = '') {
  const m = by.match(/\(([^)]+)\)/);
  const role = (m?.[1] || '').trim();
  return WORKLOG_ROLES.indexOf(role);
}

function nameFromBy(by = '') {
  return by.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// How far through the chain an ICD has progressed. The role that last touched
// it (and every earlier role) is considered done; -1 means a support-only
// touch, so no Coder/Reviewer column is filled yet.
function reachedRole(icd) {
  return roleIndexFromBy(icd.by);
}

function WorklogTab({ member }) {
  const icds = getIcdsForMember(member?.name);
  const open = icds.filter((i) => i.status !== 'Accepted' && i.status !== 'Dismissed');
  const closed = icds.filter((i) => i.status === 'Accepted' || i.status === 'Dismissed');

  if (!icds.length) {
    return <Empty label="No ICDs recorded for this DOS." />;
  }

  const renderRows = (rows) => rows.map((icd) => {
    const reached = reachedRole(icd);
    const actorIdx = roleIndexFromBy(icd.by);
    return (
      <tr key={icd.code} className={styles.wlRow}>
        <td className={styles.wlIcd}>
          <span className={styles.wlCode}>{icd.code}</span>
          <span className={styles.wlDesc}>{icd.desc}</span>
        </td>
        {WORKLOG_ROLES.map((role, ri) => {
          const done = ri <= reached;
          const isActor = ri === actorIdx;
          return (
            <td key={role} className={styles.wlCell}>
              {done ? (
                <div className={styles.wlDone}>
                  <Icon name="solar:check-read-linear" size={12} color="var(--status-success)" />
                  {isActor && (
                    <span className={styles.wlDoneText}>
                      <span className={styles.wlWho}>{nameFromBy(icd.by)}</span>
                      <span className={styles.wlWhen}>{icd.last}</span>
                    </span>
                  )}
                </div>
              ) : (
                <span className={styles.wlPending}>—</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  });

  return (
    <div className={styles.scroll}>
      <div className={styles.wlTableWrap}>
        <table className={styles.wlTable}>
          <thead>
            <tr>
              <th className={styles.wlIcdHead}>ICD Code</th>
              {WORKLOG_ROLES.map((r) => <th key={r}>{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {open.length > 0 && (
              <>
                <tr className={styles.wlGroupRow}><td colSpan={WORKLOG_ROLES.length + 1}>Open ICDs</td></tr>
                {renderRows(open)}
              </>
            )}
            {closed.length > 0 && (
              <>
                <tr className={styles.wlGroupRow}><td colSpan={WORKLOG_ROLES.length + 1}>Closed ICDs</td></tr>
                {renderRows(closed)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Generic placeholder for tabs we haven't wired data for ──────────────
function ComingSoonTab({ label }) {
  return <Empty label={`${label} — coming in Phase 3+`} />;
}

function Empty({ label }) {
  return (
    <div className={styles.empty}>
      <Icon name="solar:gallery-edit-linear" size={28} color="var(--neutral-200)" />
      <p>{label}</p>
    </div>
  );
}

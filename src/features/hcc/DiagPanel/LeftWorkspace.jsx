import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { COMMENTS, DOCUMENTS, NOTES, CLAIMS } from '../data/ancillary';
import { ACTIVITY } from '../data/activity';
import styles from './LeftWorkspace.module.css';

// Tab spec — text-only labels with optional `(N)` count baked in. Matches
// the prototype's ACT_TABS array (line 1880) — Activity Log doesn't show a
// count, Comments/Documents/Notes/Claims do, Outreach/History don't.
const TABS = [
  { key: 'activity',  label: 'Activity Log',                                  countFor: () => null },
  { key: 'comments',  label: 'Comments',                                       countFor: () => COMMENTS.length },
  { key: 'documents', label: 'Documents',                                      countFor: () => DOCUMENTS.length },
  { key: 'notes',     label: 'Notes',                                          countFor: () => NOTES.length },
  { key: 'claims',    label: 'Claims',                                         countFor: () => CLAIMS.length },
  { key: 'outreach',  label: 'Outreach',                                       countFor: () => null },
  { key: 'history',   label: 'History',                                        countFor: () => null },
];

/**
 * LeftWorkspace — appears when the DiagPanel expands to 70vw. Hosts a tab nav
 * across the top and a content area below. Each tab renders a feature-local
 * tab-content component (Phase 3b).
 *
 * Props:
 *  - active   (string)        Currently selected tab key (drives content).
 *  - onChange (fn(string))    Switch tabs.
 *  - onClose  (fn)            Collapse the left workspace.
 *  - member   (member shape)  Used by the tab-content components for header/data lookup.
 */
export function LeftWorkspace({ active, onChange, onClose, member }) {
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
          {TABS.map((t) => {
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
        {active === 'activity'  && <ActivityTab  member={member} />}
        {active === 'comments'  && <CommentsTab  member={member} />}
        {active === 'documents' && <DocumentsTab member={member} />}
        {active === 'notes'     && <NotesTab     member={member} />}
        {active === 'claims'    && <ClaimsTab    member={member} />}
        {active === 'outreach'  && <ComingSoonTab label="Outreach" />}
        {active === 'history'   && <ComingSoonTab label="History"  />}
      </div>
    </div>
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
  status_dos:  { icon: 'solar:refresh-linear',               color: 'var(--status-warning)',     bg: 'var(--status-warning-light)', border: 'rgba(217,165,11,0.2)',    dashed: false },
  status_hcc:  { icon: 'solar:refresh-linear',               color: 'var(--status-warning)',     bg: 'var(--status-warning-light)', border: 'rgba(217,165,11,0.2)',    dashed: false },
  accept:      { icon: 'solar:check-circle-linear',          color: 'var(--status-success)',     bg: 'var(--status-success-light)', border: 'rgba(0,155,83,0.2)',      dashed: false },
  dismiss:     { icon: 'solar:close-circle-linear',          color: 'var(--status-error)',       bg: 'var(--status-error-light)',   border: 'rgba(215,40,37,0.2)',     dashed: false },
  delete:      { icon: 'solar:trash-bin-trash-linear',       color: 'var(--status-error)',       bg: 'var(--status-error-light)',   border: 'rgba(215,40,37,0.2)',     dashed: false },
  upload:      { icon: 'solar:upload-minimalistic-linear',   color: 'var(--primary-300)',        bg: 'var(--primary-50)',           border: 'var(--primary-200)',      dashed: false },
  create:      { icon: 'solar:add-circle-linear',            color: 'var(--primary-300)',        bg: 'var(--primary-50)',           border: 'var(--primary-200)',      dashed: true  },
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
  const entries = ACTIVITY[member?.name] || ACTIVITY._default || [];
  if (!entries.length) return <Empty label="No activity recorded yet." />;

  // Pre-compute first/last per visual group — needed so the timeline rail
  // can omit the top connector on the first item below a group header and
  // the bottom connector on the last item before the next group / EOL.
  const items = entries.map((item, i) => {
    if (item.t === 'group') return { kind: 'group', item, key: `g${i}` };
    // Find the surrounding group boundaries
    let isFirst = true;
    for (let j = i - 1; j >= 0; j--) {
      if (entries[j].t === 'group') break;
      isFirst = false; break;
    }
    let isLast = true;
    for (let j = i + 1; j < entries.length; j++) {
      if (entries[j].t === 'group') break;
      isLast = false; break;
    }
    return { kind: 'item', item, key: `i${i}`, isFirst, isLast };
  });

  return (
    <div className={styles.scroll}>
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
          {item.details && (
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

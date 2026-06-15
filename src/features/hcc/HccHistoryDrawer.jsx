import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import { EVENTS } from './activityLog';
// Reuse the rich timeline + filter chip primitives from DiagPanel's ActivityTab.
// Importing the same CSS module ensures every visual (rail / icon bubble /
// transition pills / file card / avatar swap) renders identically to the
// per-encounter timeline shown in the DiagPanel — per spec §2 we want one
// timeline component, four views.
import styles from './DiagPanel/LeftWorkspace.module.css';

// ── Per-event icon + tone treatment ──────────────────────────────────
// Maps an event_name to the visual params used by .tlIcon (background +
// border + icon color). Falls back to severity-driven tones when an
// event isn't listed.
const EVENT_ICON = {
  // Intake
  'file.uploaded':                  { icon: 'solar:upload-minimalistic-linear', tone: 'neutral' },
  'sftp.file.detected':             { icon: 'solar:upload-square-linear',       tone: 'info'    },
  'batch.created':                  { icon: 'solar:layers-linear',              tone: 'info'    },
  'batch.processing_started':       { icon: 'solar:layers-linear',              tone: 'info'    },
  'batch.processing_completed':     { icon: 'solar:check-read-linear',          tone: 'success' },
  'batch.processing_partial_failure':{icon: 'solar:danger-circle-linear',       tone: 'warning' },
  'file.rejected.non_pdf':          { icon: 'solar:close-circle-linear',        tone: 'warning' },
  'file.rejected.invalid_filename': { icon: 'solar:close-circle-linear',        tone: 'warning' },
  // OCR
  'ocr.started':                    { icon: 'solar:scanner-linear',             tone: 'neutral' },
  'ocr.completed':                  { icon: 'solar:scanner-linear',             tone: 'success' },
  'ocr.failed':                     { icon: 'solar:close-circle-linear',        tone: 'error'   },
  'ocr.low_confidence':             { icon: 'solar:danger-circle-linear',       tone: 'warning' },
  // Matching
  'patient.matched':                { icon: 'solar:check-read-linear',          tone: 'success' },
  'patient.match_failed':           { icon: 'solar:danger-circle-linear',       tone: 'warning' },
  'patient.match_manual':           { icon: 'solar:user-plus-rounded-linear',   tone: 'info'    },
  'patient.identity_changed':       { icon: 'solar:users-group-rounded-linear', tone: 'warning' },
  // Review
  'encounter.approved':             { icon: 'solar:check-read-linear',          tone: 'success' },
  'encounter.rejected':             { icon: 'solar:close-circle-linear',        tone: 'error'   },
  'encounter.field_corrected':      { icon: 'solar:refresh-square-linear',      tone: 'warning' },
  'encounter.restored':             { icon: 'solar:undo-left-round-linear',     tone: 'info'    },
  'encounter.removed':              { icon: 'solar:trash-bin-trash-linear',     tone: 'error'   },
  // Worklist
  'worklist.row_created':           { icon: 'solar:add-circle-linear',          tone: 'success' },
  'worklist.row_merged':            { icon: 'solar:layers-linear',              tone: 'info'    },
  'assignee.changed':               { icon: 'solar:user-plus-rounded-linear',   tone: 'neutral' },
  'role.status_changed':            { icon: 'solar:eye-scan-linear',            tone: 'warning' },
  // ICD ops
  'icd.accepted':                   { icon: 'solar:check-read-linear',          tone: 'success' },
  'icd.dismissed':                  { icon: 'solar:close-circle-linear',        tone: 'error'   },
  'icd.created_manual':             { icon: 'solar:add-circle-linear',          tone: 'warning' },
  'icd.deleted':                    { icon: 'solar:trash-bin-trash-linear',     tone: 'error'   },
  'icd.overridden':                 { icon: 'solar:refresh-square-linear',      tone: 'warning' },
  'icd.merged':                     { icon: 'solar:layers-linear',              tone: 'info'    },
  'icd.status_changed':             { icon: 'solar:eye-scan-linear',            tone: 'warning' },
  'icd.comment_added':              { icon: 'solar:chat-round-linear',          tone: 'neutral' },
  'document.uploaded_for_icd':      { icon: 'solar:upload-minimalistic-linear', tone: 'neutral' },
  // Dedup
  'dedup.dos_match_found':          { icon: 'solar:layers-linear',              tone: 'info'    },
  'dedup.icd_net_new_merged':       { icon: 'solar:layers-linear',              tone: 'success' },
  'dedup.related_dos_created':      { icon: 'solar:add-circle-linear',          tone: 'info'    },
  'dedup.duplicate_detected':       { icon: 'solar:close-circle-linear',        tone: 'warning' },
  // Claim / ASM
  'claim.attached':                 { icon: 'solar:dollar-linear',              tone: 'info'    },
  'claim.matched':                  { icon: 'solar:check-read-linear',          tone: 'success' },
  'claim.not_found':                { icon: 'solar:danger-circle-linear',       tone: 'warning' },
  'asm.reevaluated':                { icon: 'solar:refresh-square-linear',      tone: 'info'    },
  'asm.file_generated':             { icon: 'solar:check-read-linear',          tone: 'success' },
  'asm.delete_entry_created':       { icon: 'solar:trash-bin-trash-linear',     tone: 'warning' },
  // Audit
  'patient.dos_changed':            { icon: 'solar:calendar-linear',            tone: 'warning' },
  'patient.field_edited':           { icon: 'solar:settings-linear',            tone: 'warning' },
};

// Visual params for tlIcon — mirrors the ACT_ICON table inside
// LeftWorkspace.jsx so the bubble looks identical across views.
const TONE = {
  success: { bg: 'var(--status-success-light)', color: 'var(--status-success)', border: 'rgba(0,155,83,0.2)' },
  error:   { bg: 'var(--status-error-light)',   color: 'var(--status-error)',   border: 'rgba(215,40,37,0.2)' },
  warning: { bg: 'var(--status-warning-light)', color: 'var(--status-warning)', border: 'rgba(217,165,11,0.2)' },
  info:    { bg: 'var(--status-info-light)',    color: 'var(--status-info)',    border: 'rgba(20,94,204,0.2)' },
  neutral: { bg: 'var(--neutral-0)',            color: 'var(--neutral-300)',    border: 'var(--neutral-150)' },
};

// Status-string → CSS pill class. Matches TRANS_BADGE inside
// LeftWorkspace.jsx so a "Completed" pill looks the same in both views.
const TRANS_BADGE = {
  Accepted:      'pillAccepted',
  Dismissed:     'pillDismissed',
  Deleted:       'pillDeleted',
  None:          'pillNone',
  Open:          'pillOpen',
  Returned:      'pillReturned',
  New:           'pillNew',
  Completed:     'pillCompleted',
  Audited:       'pillAudited',
  'In Progress': 'pillInProgress',
  Insufficient:  'pillDismissed',
  Reject:        'pillDeleted',
};

// Two-letter initials from "First Last" / "F. Last".
const initialsOf = (name = '') =>
  String(name).split(/\s+/).filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();

function formatTs(iso) {
  if (!iso) return { date: '', time: '', monthLabel: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '', monthLabel: '' };
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  const hours = d.getHours();
  const time = `${((hours + 11) % 12) + 1}:${pad(d.getMinutes())} ${hours >= 12 ? 'PM' : 'AM'}`;
  const monthLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  return { date, time, monthLabel };
}

// ── Filter primitives ────────────────────────────────────────────────
// Reproduces the FilterChip/FilterRow from LeftWorkspace.jsx with the
// same CSS classes so the visual chrome matches the per-encounter view.

function FilterChip({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const isSelected = value != null && value !== '';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className={styles.filterChipWrap} ref={wrapRef}>
      <button
        type="button"
        className={[styles.filterChip, isSelected ? styles.filterChipSelected : ''].join(' ')}
        onClick={() => setOpen(o => !o)}
      >
        <span>{isSelected ? `${label} · ${value}` : label}</span>
        <Icon
          name="solar:alt-arrow-down-linear"
          size={16}
          color={isSelected ? 'var(--primary-300)' : 'var(--neutral-300)'}
        />
      </button>
      {open && (
        <div className={styles.filterMenu} role="listbox">
          {options.length === 0 ? (
            <div className={styles.filterMenuEmpty}>No options</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={opt === value}
                className={[styles.filterMenuItem, opt === value ? styles.filterMenuItemActive : ''].join(' ')}
                onClick={() => { onChange?.(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))
          )}
          {isSelected && (
            <button
              type="button"
              className={styles.filterMenuClear}
              onClick={() => { onChange?.(null); setOpen(false); }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const DATE_PRESETS = ['Today', 'Last 7 days', 'Last 30 days', 'This month'];

// Compute filter dropdown options from the loaded feed so chips only show
// values that actually exist. Patient / Recorded By / DOS get deduped &
// sorted; Category & Date come from static lists.
function buildFilterOptions(feed) {
  const dos = new Set();
  const patient = new Set();
  const by = new Set();
  const category = new Set();
  feed.forEach(r => {
    if (r.dos) dos.add(r.dos);
    if (r.payload?.patientName) patient.add(r.payload.patientName);
    if (r.actor_name) by.add(r.actor_name);
    if (r.category) category.add(r.category);
  });
  const cmp = (a, b) => a.localeCompare(b);
  return {
    dos:      [...dos].sort(cmp),
    patient:  [...patient].sort(cmp),
    by:       [...by].sort(cmp),
    category: [...category].sort(cmp),
    date:     DATE_PRESETS,
  };
}

function parseUiDate(str) {
  const m = String(str || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(+m[3], +m[1] - 1, +m[2]);
}

function matchesDatePreset(d, preset) {
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const today = startOfDay(now);
  const that = startOfDay(d);
  if (preset === 'Today') return that.getTime() === today.getTime();
  if (preset === 'Last 7 days')  return today - that >= 0 && today - that <= 7  * 86400000;
  if (preset === 'Last 30 days') return today - that >= 0 && today - that <= 30 * 86400000;
  if (preset === 'This month')   return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  return true;
}

function rowMatchesFilters(row, filters) {
  if (filters.dos      && row.dos !== filters.dos) return false;
  if (filters.patient  && (row.payload?.patientName || null) !== filters.patient) return false;
  if (filters.by       && row.actor_name !== filters.by) return false;
  if (filters.category && row.category !== filters.category) return false;
  if (filters.date) {
    const { date } = formatTs(row.ts);
    const d = parseUiDate(date);
    if (!d || !matchesDatePreset(d, filters.date)) return false;
  }
  return true;
}

// ── Avatar pill (matches LeftWorkspace `.avatarPill`) ──────────────────
function AvatarPill({ initials, name }) {
  return (
    <span className={styles.avatarPill}>
      <span className={styles.avatarBubble}>{initials}</span>
      <span className={styles.avatarName}>{name}</span>
    </span>
  );
}

// ── Entry renderer ──────────────────────────────────────────────────
// Mirrors LeftWorkspace.ActivityEntry but reads from the row schema in
// activityLog.js (event_name + payload) rather than the legacy `t`-based
// entry shape used by DiagPanel.
function HistoryEntry({ row, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const def = EVENTS[row.event_name];
  const fallbackTone = { info: 'info', success: 'success', warning: 'warning', error: 'error' }[row.severity || def?.severity] || 'neutral';
  const iconCfg = EVENT_ICON[row.event_name] || { icon: 'solar:history-linear', tone: fallbackTone };
  const tone = TONE[iconCfg.tone] || TONE.neutral;
  const { date, time } = formatTs(row.ts);

  // Meta — `MM/DD/YYYY • H:MM AM/PM • Actor (Role) • DOS (date) • Patient`.
  const metaParts = [
    date,
    time,
    row.actor_name ? `${row.actor_name}${row.actor_role ? ` (${row.actor_role})` : ''}` : null,
    row.dos ? `DOS (${row.dos})` : null,
    row.payload?.patientName,
  ].filter(Boolean);

  // ── Per-event extras: pills / avatars / file card / inline body ──
  const fromStatus = row.payload?.fromStatus;
  const toStatus   = row.payload?.toStatus || row.payload?.status;
  const hasStatusTransition = fromStatus && toStatus;
  const singleStatus = !fromStatus && toStatus;

  const fromName = row.payload?.fromName;
  const toName   = row.payload?.toName;
  const hasAvatarTransition = (row.event_name === 'assignee.changed' || row.event_name === 'patient.match_manual')
    && fromName && toName;

  const fileName = row.payload?.fileName || row.payload?.file;
  const hasFileCard = ['file.uploaded', 'sftp.file.detected', 'document.uploaded_for_icd', 'ocr.completed'].includes(row.event_name) && fileName;

  const commentBody = row.event_name === 'icd.comment_added' ? row.payload?.body : null;

  // Details rows — generic key/value list for payload entries we haven't
  // pulled into the primary visuals. Used for events with rich metadata
  // the headline doesn't capture.
  const hiddenKeys = new Set(['actor', 'actorId', 'actorRole', 'patientName', 'fromName', 'toName', 'fromStatus', 'toStatus', 'status', 'fileName', 'file', 'body', 'roleLabel', 'dos']);
  const detailRows = Object.entries(row.payload || {}).filter(([k, v]) => !hiddenKeys.has(k) && v != null && v !== '');
  const hasDetails = detailRows.length > 0;

  return (
    <div className={styles.tlRow}>
      <div className={styles.tlRail}>
        {!isFirst && <span className={styles.tlConnectorTop} />}
        <span
          className={styles.tlIcon}
          style={{ background: tone.bg, borderColor: tone.border }}
        >
          <Icon name={iconCfg.icon} size={14} color={tone.color} />
        </span>
        {!isLast && <span className={styles.tlConnectorBottom} />}
      </div>

      <div className={[styles.tlBody, isFirst ? styles.tlBodyFirst : '', isLast ? styles.tlBodyLast : ''].join(' ')}>
        <div className={styles.tlMeta}>{metaParts.join(' • ')}</div>

        <div className={styles.tlHeadlineRow}>
          <span className={styles.tlHeadline}>{row.headline}</span>
          {hasDetails && (
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

        {/* Comment body — paragraph under the headline. */}
        {commentBody && <div className={styles.tlCommentBody}>{commentBody}</div>}

        {/* Status transition — from → to pills. */}
        {hasStatusTransition && (
          <div className={styles.tlTransition}>
            <span className={[styles.tlPill, styles[TRANS_BADGE[fromStatus] || 'pillOpen']].join(' ')}>{fromStatus}</span>
            <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
            <span className={[styles.tlPill, styles[TRANS_BADGE[toStatus] || 'pillNew']].join(' ')}>{toStatus}</span>
          </div>
        )}
        {/* Single-status events (role.status_changed) — one pill, no arrow. */}
        {!hasStatusTransition && singleStatus && (
          <div className={styles.tlTransition}>
            <span className={[styles.tlPill, styles[TRANS_BADGE[toStatus] || 'pillNew']].join(' ')}>{toStatus}</span>
          </div>
        )}

        {/* File attachment card */}
        {hasFileCard && (
          <div className={styles.tlAttachment}>
            <span className={styles.tlFileBubble}>
              <Icon name="solar:file-text-linear" size={14} color="var(--neutral-300)" />
            </span>
            <div className={styles.tlFileText}>
              <div className={styles.tlFileName}>{fileName}</div>
              {row.payload?.fileType && <div className={styles.tlFileType}>{row.payload.fileType}</div>}
            </div>
            <button type="button" className={styles.tlFilePreview} aria-label="Preview">
              <Icon name="solar:eye-linear" size={14} color="var(--neutral-300)" />
            </button>
          </div>
        )}

        {/* Avatar transition — assignee changed (DH → NR). */}
        {hasAvatarTransition && (
          <div className={styles.tlAvatarTransition}>
            <AvatarPill initials={initialsOf(fromName)} name={fromName} />
            <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
            <AvatarPill initials={initialsOf(toName)} name={toName} />
          </div>
        )}

        {/* Expanded details — generic key/value dump for payload fields.
            Arrays of {patientName, dos} (e.g. acceptedList / rejectedList
            on batch.processing_completed) render as a per-row list so the
            "accepted vs rejected" summary is scannable instead of JSON. */}
        {expanded && hasDetails && (
          <div className={styles.tlDetailsCard}>
            {detailRows.map(([k, v], i) => {
              const isPatientList = Array.isArray(v) && v.length > 0
                && typeof v[0] === 'object' && ('patientName' in v[0] || 'dos' in v[0]);
              return (
                <div key={i} className={styles.tlDetailRow}>
                  <div className={styles.tlDetailText}>
                    <div className={styles.tlDetailHcc}>{k}{Array.isArray(v) ? ` (${v.length})` : ''}</div>
                    {isPatientList ? (
                      <div className={styles.tlDetailIcd}>
                        {v.map((item, j) => (
                          <div key={j}>
                            {item.patientName || '(unmatched)'}
                            {item.dos ? ` · DOS ${item.dos}` : ''}
                            {item.kind ? ` · ${item.kind}` : ''}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.tlDetailIcd}>
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main drawer ─────────────────────────────────────────────────────
export function HccHistoryDrawer() {
  const open = useAppStore(s => s.hccHistoryDrawerOpen);
  const close = useAppStore(s => s.closeHccHistoryDrawer);
  const feed = useAppStore(s => s.hccActivityFeed);
  const loading = useAppStore(s => s.hccActivityFeedLoading);
  const fetchFeed = useAppStore(s => s.fetchHccActivityFeed);

  // FilterChip state — empty / null = unset.
  const [filters, setFilters] = useState({ dos: null, patient: null, by: null, category: null, date: null });
  const setFilter = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));
  const clearAll = () => setFilters({ dos: null, patient: null, by: null, category: null, date: null });
  const hasAnyFilter = Object.values(filters).some(v => v != null && v !== '');

  // Collapsible month groups — empty set = everything expanded.
  const [collapsed, setCollapsed] = useState(() => new Set());
  const toggleGroup = (label) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });

  useEffect(() => {
    if (open && feed.length === 0 && !loading) fetchFeed();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(() => buildFilterOptions(feed), [feed]);
  const filteredRows = useMemo(
    () => feed.filter(r => rowMatchesFilters(r, filters)),
    [feed, filters],
  );

  // Group by month, mirroring LeftWorkspace.ActivityTab's month sections.
  const groups = useMemo(() => {
    const out = [];
    let cur = null;
    filteredRows.forEach(r => {
      const { monthLabel } = formatTs(r.ts);
      if (!cur || cur.monthLabel !== monthLabel) {
        cur = { monthLabel, items: [] };
        out.push(cur);
      }
      cur.items.push(r);
    });
    return out;
  }, [filteredRows]);

  if (!open) return null;

  const hasItems = filteredRows.length > 0;

  return (
    <Drawer title="HCC Activity History" onClose={close}>
      {/* Filter row — DOS · Patient · Category · Recorded By · Date + Clear All. */}
      <div className={styles.filterRow}>
        <Icon name="solar:filter-linear" size={20} color="var(--neutral-300)" />
        <div className={styles.filterChips}>
          <FilterChip label="DOS"         value={filters.dos}      options={options.dos}      onChange={(v) => setFilter('dos', v)} />
          <FilterChip label="Patient"     value={filters.patient}  options={options.patient}  onChange={(v) => setFilter('patient', v)} />
          <FilterChip label="Category"    value={filters.category} options={options.category} onChange={(v) => setFilter('category', v)} />
          <FilterChip label="Recorded By" value={filters.by}       options={options.by}       onChange={(v) => setFilter('by', v)} />
          <FilterChip label="Date"        value={filters.date}     options={options.date}     onChange={(v) => setFilter('date', v)} />
          <button
            type="button"
            className={styles.filterClearAll}
            onClick={clearAll}
            disabled={!hasAnyFilter}
          >
            <Icon
              name="solar:close-circle-linear"
              size={12}
              color={hasAnyFilter ? 'var(--primary-300)' : 'var(--neutral-200)'}
            />
            Clear All
          </button>
        </div>
      </div>

      {loading && feed.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--neutral-300)' }}>
          <Icon name="solar:history-linear" size={32} color="var(--neutral-200)" />
          <p>Loading activity…</p>
        </div>
      ) : !hasItems ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--neutral-300)' }}>
          <Icon name="solar:history-linear" size={32} color="var(--neutral-200)" />
          <p>{hasAnyFilter ? 'No activity matches the selected filters.' : 'No activity recorded yet.'}</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {groups.map((g) => {
            const isCollapsed = collapsed.has(g.monthLabel);
            return (
              <div key={g.monthLabel}>
                <button
                  type="button"
                  className={[
                    styles.activityGroup,
                    isCollapsed ? styles.activityGroupCollapsed : '',
                  ].join(' ')}
                  onClick={() => toggleGroup(g.monthLabel)}
                  aria-expanded={!isCollapsed}
                >
                  <span>{g.monthLabel}</span>
                  <span className={styles.activityGroupChevron}>
                    <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-400)" />
                  </span>
                </button>
                {!isCollapsed && g.items.map((row, i) => (
                  <HistoryEntry
                    key={row.id || `${g.monthLabel}-${i}`}
                    row={row}
                    isFirst={i === 0}
                    isLast={i === g.items.length - 1}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
